import express from "express";
import { cloudDatabaseConfigured, supabaseRequest } from "./cloud-alerts.js";
import { pushConfigured } from "./push.js";

const windows = new Map();

function redisConfig() {
  return { url: String(process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, ""), token: String(process.env.UPSTASH_REDIS_REST_TOKEN || "") };
}

export function getProductionReadiness() {
  const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || "");
  const sessionSecret = String(process.env.SESSION_SECRET || "");
  const checks = {
    publicBaseUrl: /^https:\/\//i.test(publicBaseUrl),
    sessionSecret: sessionSecret.length >= 32 && !sessionSecret.startsWith("replace-with"),
    steamApi: Boolean(process.env.STEAM_API_KEY),
    supabase: cloudDatabaseConfigured(),
    cronSecret: String(process.env.CRON_SECRET || "").length >= 24
  };
  const optional = {
    redis: Boolean(redisConfig().url && redisConfig().token),
    webPush: pushConfigured(),
    email: Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL),
    admin: Boolean(process.env.ADMIN_TOKEN || process.env.ADMIN_STEAM_IDS)
  };
  const missing = Object.entries(checks).filter(([, ready]) => !ready).map(([name]) => name);
  return { ready: missing.length === 0, checks, optional, missing };
}

export async function redisCommand(...command) {
  const cfg = redisConfig();
  if (!cfg.url || !cfg.token) return null;
  const response = await fetch(cfg.url, { method: "POST", headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Redis HTTP ${response.status}`);
  const data = await response.json();
  return data.result;
}

export async function distributedCacheGet(key) {
  const raw = await redisCommand("GET", key).catch(() => null);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function distributedCacheSet(key, value, ttlSeconds) {
  return redisCommand("SET", key, JSON.stringify(value), "EX", String(ttlSeconds)).catch(() => null);
}

export function rateLimit({ limit = 180, windowMs = 60000 } = {}) {
  return async (req, res, next) => {
    const ip = String(req.ip || req.socket.remoteAddress || "unknown");
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `rate:${ip}:${bucket}`;
    const redisReady = Boolean(redisConfig().url && redisConfig().token);
    try {
      let count;
      if (redisReady) {
        count = Number(await redisCommand("INCR", key));
        if (count === 1) await redisCommand("PEXPIRE", key, String(windowMs));
      } else {
        const entry = windows.get(key) || 0;
        count = entry + 1;
        windows.set(key, count);
        if (windows.size > 5000) for (const storedKey of windows.keys()) if (!storedKey.endsWith(`:${bucket}`)) windows.delete(storedKey);
      }
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
      if (count > limit) return res.status(429).json({ error: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau." });
    } catch {
      // A cache outage must not take the app down; continue with application requests.
    }
    next();
  };
}

export async function startCronRun(jobName) {
  if (!cloudDatabaseConfigured()) return null;
  const rows = await supabaseRequest("cron_runs", { method: "POST", body: { job_name: jobName, status: "running" }, prefer: "return=representation" });
  return rows?.[0]?.id || null;
}

export async function finishCronRun(id, summary, error) {
  if (!id) return;
  await supabaseRequest(`cron_runs?id=eq.${id}`, { method: "PATCH", body: { status: error ? "failed" : "success", checked_count: Number(summary?.checked || 0), triggered_count: Number(summary?.triggered || 0), sent_count: Number(summary?.sent || 0), failed_count: Number(summary?.failed || 0), details: error ? { error: String(error.message || error) } : summary || {}, finished_at: new Date().toISOString() }, prefer: "return=minimal" }).catch(() => {});
}

export async function updateServiceHealth(service, status, message, latencyMs) {
  if (!cloudDatabaseConfigured()) return;
  await supabaseRequest("service_health?on_conflict=service", { method: "POST", body: { service, status, message: String(message || "").slice(0, 500) || null, latency_ms: Number.isFinite(latencyMs) ? Math.round(latencyMs) : null, checked_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates,return=minimal" }).catch(() => {});
}

function adminOnly(req, res, next) {
  const bearer = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const tokenAllowed = process.env.ADMIN_TOKEN && bearer === process.env.ADMIN_TOKEN;
  if (!req.account?.isAdmin && !tokenAllowed) return res.status(403).json({ error: "Không có quyền quản trị." });
  next();
}

export function createReliabilityRouter({ cacheStats, cacheSize }) {
  const router = express.Router();
  router.get("/readiness", (_req, res) => {
    const readiness = getProductionReadiness();
    res.status(readiness.ready ? 200 : 503).json({
      status: readiness.ready ? "ready" : "configuration_required",
      checkedAt: new Date().toISOString(),
      ...readiness
    });
  });
  router.get("/health", async (_req, res) => {
    let services = cloudDatabaseConfigured() ? await supabaseRequest("service_health?select=*&order=service.asc").catch(() => []) : [];
    if (!services.some((s) => s.service === "steam_api")) {
      const start = Date.now();
      let steamStatus = "operational";
      let message = "Steam Store API responsive";
      try {
        const ping = await fetch("https://store.steampowered.com/api/appdetails?appids=730&cc=us", { signal: AbortSignal.timeout(4000) });
        if (!ping.ok) { steamStatus = "degraded"; message = `HTTP ${ping.status}`; }
      } catch (err) {
        steamStatus = "down";
        message = err.message || "Timeout";
      }
      const latencyMs = Date.now() - start;
      const steamHealth = { service: "steam_api", status: steamStatus, message, latency_ms: latencyMs, checked_at: new Date().toISOString() };
      services = [...services, steamHealth];
      updateServiceHealth("steam_api", steamStatus, message, latencyMs);
    }
    res.json({ status: services.some((item) => item.status === "down") ? "degraded" : "operational", checkedAt: new Date().toISOString(), capabilities: { supabase: cloudDatabaseConfigured(), redis: Boolean(redisConfig().url && redisConfig().token), webPush: pushConfigured(), email: Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL) }, services });
  });
  router.get("/admin/status", adminOnly, async (_req, res, next) => {
    try {
      const [cronRuns, retryJobs, services, events] = cloudDatabaseConfigured() ? await Promise.all([
        supabaseRequest("cron_runs?select=*&order=started_at.desc&limit=30"),
        supabaseRequest("retry_jobs?select=*&order=created_at.desc&limit=50"),
        supabaseRequest("service_health?select=*&order=service.asc"),
        supabaseRequest("alert_events?select=*&order=created_at.desc&limit=50")
      ]) : [[], [], [], []];
      res.json({ generatedAt: new Date().toISOString(), cache: { ...cacheStats, entries: cacheSize() }, capabilities: { supabase: cloudDatabaseConfigured(), redis: Boolean(redisConfig().url && redisConfig().token), webPush: pushConfigured() }, cronRuns, retryJobs, services, notificationEvents: events });
    } catch (error) { next(error); }
  });
  return router;
}
