import express from "express";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cloudDatabaseConfigured, supabaseRequest } from "./cloud-alerts.js";

const SESSION_COOKIE = "steam_price_session";
const STATE_COOKIE = "steam_openid_state";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function config() {
  return {
    sessionSecret: String(process.env.SESSION_SECRET || ""),
    steamApiKey: String(process.env.STEAM_API_KEY || ""),
    publicBaseUrl: String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, ""),
    adminSteamIds: new Set(String(process.env.ADMIN_STEAM_IDS || "").split(",").map((id) => id.trim()).filter(Boolean))
  };
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(value) {
  return createHmac("sha256", config().sessionSecret).update(value).digest("base64url");
}

function signedToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return Number(payload.exp) > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function cookieOptions(req, maxAge = SESSION_MAX_AGE) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: maxAge * 1000 };
}

function baseUrl(req) {
  return config().publicBaseUrl || `${req.protocol}://${req.get("host")}`;
}

function requireAuth(req, res, next) {
  if (!req.account) return res.status(401).json({ error: "Bạn cần đăng nhập Steam." });
  next();
}

function requireSameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (origin && origin !== baseUrl(req)) return res.status(403).json({ error: "Origin không hợp lệ." });
  next();
}

async function steamProfile(steamId) {
  if (!config().steamApiKey) return { steamid: steamId, personaname: `Steam ${steamId}`, profileurl: `https://steamcommunity.com/profiles/${steamId}` };
  const params = new URLSearchParams({ key: config().steamApiKey, steamids: steamId });
  const response = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Steam profile HTTP ${response.status}`);
  const data = await response.json();
  return data?.response?.players?.[0] || null;
}

async function upsertAccount(steamId) {
  const profile = await steamProfile(steamId).catch(() => null);
  const now = new Date().toISOString();
  const rows = await supabaseRequest("user_accounts?on_conflict=steam_id", {
    method: "POST",
    body: {
      steam_id: steamId,
      display_name: profile?.personaname || `Steam ${steamId}`,
      avatar_url: profile?.avatarfull || profile?.avatarmedium || null,
      profile_url: profile?.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
      updated_at: now,
      last_login_at: now
    },
    prefer: "resolution=merge-duplicates,return=representation"
  });
  return rows?.[0];
}

function accountView(account) {
  return {
    id: account.id,
    steamId: account.steam_id,
    displayName: account.display_name,
    avatarUrl: account.avatar_url,
    profileUrl: account.profile_url,
    isAdmin: config().adminSteamIds.has(account.steam_id)
  };
}

export async function getWishlist(steamId) {
  const all = [];
  for (let page = 0; page < 20; page += 1) {
    const response = await fetch(`https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=${page}`, {
      headers: { Accept: "application/json", "User-Agent": "Steam-Regional-Price-Comparator/1.0" },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 404 || response.status === 302) {
        throw new Error("Wishlist Steam đang để riêng tư hoặc không tồn tại.");
      }
      throw new Error(`Steam wishlist HTTP ${response.status}`);
    }
    
    let pageData;
    try {
      pageData = await response.json();
    } catch (err) {
      break; // Not JSON (probably rate limited or Steam error page)
    }

    if (pageData && pageData.success === 2) {
      throw new Error("Wishlist Steam đang để riêng tư (Steam trả về success: 2).");
    }

    const entries = Object.entries(pageData || {});
    if (!entries.length) break;
    
    for (const [appIdStr, item] of entries) {
      const appId = Number(appIdStr);
      if (Number.isInteger(appId) && appId > 0) {
        all.push({ 
          appId, 
          priority: Number(item.priority || 0), 
          addedAt: item.added ? new Date(item.added * 1000).toISOString() : null, 
          metadata: item 
        });
      }
    }
    
    if (entries.length < 100) break;
  }
  return all;
}

function normalizeTracker(games) {
  const unique = new Map();
  for (const raw of Array.isArray(games) ? games.slice(0, 500) : []) {
    const appId = Number(raw.appId);
    if (!Number.isInteger(appId) || appId <= 0) continue;
    const productType = raw.productType === "sub" ? "sub" : "app";
    unique.set(`${productType}:${appId}`, {
      app_id: appId,
      product_type: productType,
      game_data: raw,
      target_amount: Number.isFinite(Number(raw.targetPrice?.amount ?? raw.targetAmount)) ? Number(raw.targetPrice?.amount ?? raw.targetAmount) : null,
      target_currency: String(raw.targetPrice?.currency || raw.targetCurrency || raw.currency || "VND").toUpperCase().slice(0, 3),
      region_code: String(raw.preferredRegion || raw.regionCode || "vn").toLowerCase().slice(0, 2),
      updated_at: raw.updatedAt && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : new Date().toISOString()
    });
  }
  return [...unique.values()];
}

function normalizeChannels(input = {}) {
  const email = String(input.email || "").trim().toLowerCase();
  const discordWebhook = String(input.discordWebhook || "").trim();
  const telegramChatId = String(input.telegramChatId || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Địa chỉ email không hợp lệ."), { statusCode: 400 });
  if (discordWebhook) {
    let url;
    try { url = new URL(discordWebhook); } catch { throw Object.assign(new Error("Discord Webhook URL không hợp lệ."), { statusCode: 400 }); }
    if (url.protocol !== "https:" || !["discord.com", "discordapp.com"].includes(url.hostname) || !url.pathname.startsWith("/api/webhooks/")) throw Object.assign(new Error("Discord Webhook URL không hợp lệ."), { statusCode: 400 });
  }
  if (telegramChatId && !/^-?\d{5,20}$/.test(telegramChatId)) throw Object.assign(new Error("Telegram Chat ID không hợp lệ."), { statusCode: 400 });
  return { email: email || null, discordWebhook: discordWebhook || null, telegramChatId: telegramChatId || null };
}

async function syncTracker(account, body) {
  const games = normalizeTracker(body.games);
  const now = new Date().toISOString();
  const existing = await supabaseRequest(`cloud_tracker?user_id=eq.${account.id}&select=id,app_id,product_type`);
  if (games.length) {
    await supabaseRequest("cloud_tracker?on_conflict=user_id,app_id,product_type", {
      method: "POST", body: games.map((game) => ({ ...game, user_id: account.id })), prefer: "resolution=merge-duplicates,return=minimal"
    });
  }
  const incoming = new Set(games.map((game) => `${game.product_type}:${game.app_id}`));
  await Promise.all((existing || []).filter((row) => !incoming.has(`${row.product_type}:${row.app_id}`)).map((row) => supabaseRequest(`cloud_tracker?id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" })));
  const channels = normalizeChannels(body.channels);
  await supabaseRequest(`user_accounts?id=eq.${account.id}`, {
    method: "PATCH",
    body: {
      email: channels.email,
      discord_webhook: channels.discordWebhook,
      telegram_chat_id: channels.telegramChatId,
      updated_at: now
    },
    prefer: "return=minimal"
  });
  let clients = await supabaseRequest(`alert_clients?user_id=eq.${account.id}&select=*&limit=1`);
  let client = clients?.[0];
  const secretHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  if (!client) {
    clients = await supabaseRequest("alert_clients", {
      method: "POST",
      body: { user_id: account.id, secret_hash: secretHash, email: channels.email || null, discord_webhook: channels.discordWebhook || null, telegram_chat_id: channels.telegramChatId || null, enabled: true },
      prefer: "return=representation"
    });
    client = clients?.[0];
  } else {
    await supabaseRequest(`alert_clients?id=eq.${client.id}`, { method: "PATCH", body: { email: channels.email || null, discord_webhook: channels.discordWebhook || null, telegram_chat_id: channels.telegramChatId || null, enabled: true, updated_at: now }, prefer: "return=minimal" });
  }
  const targets = games.filter((game) => game.target_amount !== null && game.target_amount >= 0);
  if (client) {
    await supabaseRequest(`price_alerts?client_id=eq.${client.id}`, { method: "PATCH", body: { enabled: false, updated_at: now }, prefer: "return=minimal" });
  }
  if (client && targets.length) {
    await supabaseRequest("price_alerts?on_conflict=client_id,app_id,product_type,region_code,target_currency", {
      method: "POST",
      body: targets.map((game) => ({ client_id: client.id, app_id: game.app_id, product_type: game.product_type, game_name: String(game.game_data?.name || `Steam ${game.app_id}`).slice(0, 180), target_amount: game.target_amount, target_currency: game.target_currency, region_code: game.region_code, enabled: true, updated_at: now })),
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }
  return { synced: games.length, targets: targets.length, syncedAt: now };
}

export function attachAccountSession(req, _res, next) {
  if (!config().sessionSecret) return next();
  const session = verifyToken(parseCookies(req)[SESSION_COOKIE]);
  if (session) req.account = session;
  next();
}

export function createAccountRouter() {
  const router = express.Router();

  router.get("/auth/steam", (req, res) => {
    if (!config().sessionSecret || !cloudDatabaseConfigured()) {
      return res.redirect(`/?login=error&message=${encodeURIComponent("Máy chủ chưa cấu hình SESSION_SECRET hoặc Supabase Database.")}`);
    }
    const nonce = randomBytes(16).toString("hex");
    const stateToken = signedToken({ nonce, exp: Date.now() + 10 * 60 * 1000 });
    res.cookie(STATE_COOKIE, stateToken, cookieOptions(req, 600));
    const returnTo = `${baseUrl(req)}/api/auth/steam/callback?state=${encodeURIComponent(stateToken)}`;
    const query = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": returnTo,
      "openid.realm": baseUrl(req),
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select"
    });
    res.redirect(`https://steamcommunity.com/openid/login?${query}`);
  });

  router.get("/auth/steam/callback", async (req, res) => {
    try {
      const stateFromQuery = verifyToken(req.query.state);
      const stateCookie = verifyToken(parseCookies(req)[STATE_COOKIE]);
      if (!stateFromQuery && !stateCookie) throw new Error("Phiên đăng nhập đã hết hạn hoặc không hợp lệ.");
      const verification = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) if (key.startsWith("openid.")) verification.set(key, String(value));
      verification.set("openid.mode", "check_authentication");
      const response = await fetch("https://steamcommunity.com/openid/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: verification, signal: AbortSignal.timeout(15000) });
      const result = await response.text();
      if (!response.ok || !/is_valid\s*:\s*true/i.test(result)) throw new Error("Steam không xác thực được thông tin đăng nhập.");
      const match = String(req.query["openid.claimed_id"] || "").match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
      if (!match) throw new Error("Steam ID không hợp lệ.");
      const account = await upsertAccount(match[1]);
      if (!account) throw new Error("Không thể tạo tài khoản cloud trên database.");
      getWishlist(match[1]).then(async (wishlist) => {
        if (wishlist?.length) {
          await supabaseRequest("user_wishlist?on_conflict=user_id,app_id", {
            method: "POST",
            body: wishlist.map((item) => ({ user_id: account.id, app_id: item.appId, priority: item.priority, added_at: item.addedAt, metadata: item.metadata, synced_at: new Date().toISOString() })),
            prefer: "resolution=merge-duplicates,return=minimal"
          }).catch(() => {});
        }
      }).catch(() => {});
      res.cookie(SESSION_COOKIE, signedToken({ ...accountView(account), exp: Date.now() + SESSION_MAX_AGE * 1000 }), cookieOptions(req));
      res.clearCookie(STATE_COOKIE, { path: "/" });
      res.redirect("/?login=success");
    } catch (error) {
      res.redirect(`/?login=error&message=${encodeURIComponent(error.message || "Đăng nhập thất bại")}`);
    }
  });

  router.get("/auth/me", async (req, res) => {
    if (!req.account) return res.json({ authenticated: false, cloudConfigured: cloudDatabaseConfigured() });
    const rows = await supabaseRequest(`user_accounts?id=eq.${req.account.id}&select=*&limit=1`).catch(() => []);
    const account = rows?.[0];
    if (!account) return res.json({ authenticated: false, cloudConfigured: cloudDatabaseConfigured() });
    res.json({ authenticated: true, account: accountView(account), cloudConfigured: true });
  });

  router.post("/auth/logout", requireSameOrigin, (req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true });
  });

  router.get("/account/data", requireAuth, async (req, res, next) => {
    try {
      const [tracker, wishlist, accounts, clients] = await Promise.all([
        supabaseRequest(`cloud_tracker?user_id=eq.${req.account.id}&select=*&order=updated_at.desc`),
        supabaseRequest(`user_wishlist?user_id=eq.${req.account.id}&select=*&order=priority.asc&limit=500`),
        supabaseRequest(`user_accounts?id=eq.${req.account.id}&select=*&limit=1`),
        supabaseRequest(`alert_clients?user_id=eq.${req.account.id}&select=id&limit=1`)
      ]);
      const events = clients?.[0]?.id
        ? await supabaseRequest(`alert_events?client_id=eq.${clients[0].id}&select=*&order=created_at.desc&limit=20`).catch(() => [])
        : [];
      const account = accounts?.[0] || {};
      res.json({
        games: (tracker || []).map((row) => ({ ...row.game_data, appId: Number(row.app_id), productType: row.product_type, targetAmount: row.target_amount, targetCurrency: row.target_currency, regionCode: row.region_code, updatedAt: row.updated_at })),
        wishlist: (wishlist || []).map((row) => ({ appId: Number(row.app_id), priority: row.priority, addedAt: row.added_at, ...row.metadata })),
        channels: { email: account.email || "", discordWebhook: account.discord_webhook || "", telegramChatId: account.telegram_chat_id || "" },
        events: events || []
      });
    } catch (error) { next(error); }
  });

  router.post("/account/sync", requireAuth, requireSameOrigin, async (req, res, next) => {
    try { res.json(await syncTracker(req.account, req.body || {})); } catch (error) { next(error); }
  });

  router.post("/account/wishlist/sync", requireAuth, requireSameOrigin, async (req, res, next) => {
    try {
      const wishlist = await getWishlist(req.account.steamId);
      if (wishlist.length) await supabaseRequest("user_wishlist?on_conflict=user_id,app_id", { method: "POST", body: wishlist.map((item) => ({ user_id: req.account.id, app_id: item.appId, priority: item.priority, added_at: item.addedAt, metadata: item.metadata, synced_at: new Date().toISOString() })), prefer: "resolution=merge-duplicates,return=minimal" });
      res.json({ synced: wishlist.length, wishlist });
    } catch (error) { next(error); }
  });

  return router;
}

export { requireAuth, requireSameOrigin, accountView };
