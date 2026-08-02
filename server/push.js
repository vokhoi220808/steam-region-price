import express from "express";
import webpush from "web-push";
import { supabaseRequest } from "./cloud-alerts.js";
import { requireAuth, requireSameOrigin } from "./account.js";

function pushConfig() {
  return { publicKey: String(process.env.VAPID_PUBLIC_KEY || ""), privateKey: String(process.env.VAPID_PRIVATE_KEY || ""), subject: String(process.env.VAPID_SUBJECT || "mailto:admin@example.com") };
}

export function pushConfigured() {
  const cfg = pushConfig();
  return Boolean(cfg.publicKey && cfg.privateKey && cfg.subject);
}

function configure() {
  const cfg = pushConfig();
  if (!pushConfigured()) throw Object.assign(new Error("Web Push chưa được cấu hình VAPID."), { statusCode: 503 });
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  return cfg;
}

export async function sendUserPush(userId, message) {
  configure();
  const rows = await supabaseRequest(`push_subscriptions?user_id=eq.${userId}&enabled=eq.true&select=*`);
  const results = await Promise.all((rows || []).map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ title: message.subject, body: message.text, url: message.steamUrl, tag: `price-${message.steamUrl}` }), { TTL: 86400, urgency: "high" });
      await supabaseRequest(`push_subscriptions?id=eq.${row.id}`, { method: "PATCH", body: { last_success_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }, prefer: "return=minimal" });
      return { channel: "webpush", success: true, error: null };
    } catch (error) {
      const expired = error.statusCode === 404 || error.statusCode === 410;
      await supabaseRequest(`push_subscriptions?id=eq.${row.id}`, { method: "PATCH", body: { enabled: !expired, last_error: String(error.message || error).slice(0, 500), updated_at: new Date().toISOString() }, prefer: "return=minimal" }).catch(() => {});
      return { channel: "webpush", success: false, error: String(error.message || error) };
    }
  }));
  return results;
}

export function createPushRouter() {
  const router = express.Router();
  router.get("/push/config", (req, res) => res.json({ configured: pushConfigured(), publicKey: pushConfigured() ? pushConfig().publicKey : null }));
  router.post("/push/subscribe", requireAuth, requireSameOrigin, async (req, res, next) => {
    try {
      configure();
      const subscription = req.body?.subscription;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({ error: "Push subscription không hợp lệ." });
      await supabaseRequest("push_subscriptions?on_conflict=endpoint", { method: "POST", body: { user_id: req.account.id, endpoint: subscription.endpoint, subscription, user_agent: String(req.get("user-agent") || "").slice(0, 500), enabled: true, updated_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates,return=minimal" });
      res.json({ subscribed: true });
    } catch (error) { next(error); }
  });
  router.delete("/push/subscribe", requireAuth, requireSameOrigin, async (req, res, next) => {
    try {
      const endpoint = String(req.body?.endpoint || "");
      await supabaseRequest(`push_subscriptions?user_id=eq.${req.account.id}&endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE", prefer: "return=minimal" });
      res.json({ subscribed: false });
    } catch (error) { next(error); }
  });
  return router;
}
