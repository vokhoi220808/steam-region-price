import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const MAX_ALERTS_PER_CLIENT = 200;
const MAX_ALERTS_PER_RUN = Math.min(Math.max(Number(process.env.ALERT_BATCH_SIZE) || 80, 1), 500);
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function env() {
  return {
    supabaseUrl: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    supabaseKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ""),
    telegramToken: String(process.env.TELEGRAM_BOT_TOKEN || ""),
    resendKey: String(process.env.RESEND_API_KEY || ""),
    fromEmail: String(process.env.ALERT_FROM_EMAIL || "")
  };
}

export function getCloudAlertCapabilities() {
  const config = env();
  return {
    configured: Boolean(config.supabaseUrl && config.supabaseKey),
    channels: {
      discord: true,
      telegram: Boolean(config.telegramToken),
      email: Boolean(config.resendKey && config.fromEmail)
    },
    maxAlerts: MAX_ALERTS_PER_CLIENT
  };
}

function requireDatabase() {
  const config = env();
  if (!config.supabaseUrl || !config.supabaseKey) {
    const error = new Error("Cloud Alerts chưa được cấu hình Supabase.");
    error.statusCode = 503;
    throw error;
  }
  return config;
}

export async function supabaseRequest(resource, { method = "GET", body, prefer, headers = {} } = {}) {
  const config = requireDatabase();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${resource}`, {
    method,
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });

  const text = await response.text();
  const data = text ? (() => {
    try { return JSON.parse(text); } catch { return text; }
  })() : null;
  if (!response.ok) {
    const message = data?.message || data?.hint || `Supabase HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export function cloudDatabaseConfigured() {
  const config = env();
  return Boolean(config.supabaseUrl && config.supabaseKey);
}

function hashSecret(secret) {
  return createHash("sha256").update(String(secret)).digest("hex");
}

function secretsMatch(secret, expectedHash) {
  const actual = Buffer.from(hashSecret(secret));
  const expected = Buffer.from(String(expectedHash || ""));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cleanChannels(input = {}) {
  const email = String(input.email || "").trim().toLowerCase();
  const discordWebhook = String(input.discordWebhook || "").trim();
  const telegramChatId = String(input.telegramChatId || "").trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Địa chỉ email không hợp lệ.");
  }
  if (discordWebhook) {
    let url;
    try { url = new URL(discordWebhook); } catch { throw new Error("Discord Webhook URL không hợp lệ."); }
    const validHost = url.hostname === "discord.com" || url.hostname === "discordapp.com";
    if (url.protocol !== "https:" || !validHost || !url.pathname.startsWith("/api/webhooks/")) {
      throw new Error("Discord Webhook URL không hợp lệ.");
    }
  }
  if (telegramChatId && !/^-?\d{5,20}$/.test(telegramChatId)) {
    throw new Error("Telegram Chat ID không hợp lệ.");
  }
  if (!email && !discordWebhook && !telegramChatId) {
    throw new Error("Hãy cấu hình ít nhất một kênh nhận thông báo.");
  }
  const capabilities = getCloudAlertCapabilities().channels;
  if (email && !capabilities.email) throw new Error("Email chưa sẵn sàng trên máy chủ. Hãy cấu hình Resend.");
  if (telegramChatId && !capabilities.telegram) throw new Error("Telegram chưa sẵn sàng trên máy chủ. Hãy cấu hình TELEGRAM_BOT_TOKEN.");
  return { email: email || null, discordWebhook: discordWebhook || null, telegramChatId: telegramChatId || null };
}

function cleanGames(input = []) {
  if (!Array.isArray(input)) throw new Error("Danh sách theo dõi không hợp lệ.");
  const unique = new Map();
  input.slice(0, MAX_ALERTS_PER_CLIENT).forEach((game) => {
    const appId = Number(game.appId);
    const targetAmount = Number(game.targetAmount);
    const regionCode = String(game.regionCode || "vn").toLowerCase();
    const targetCurrency = String(game.targetCurrency || "VND").toUpperCase();
    const productType = String(game.productType || "app") === "sub" ? "sub" : "app";
    if (!Number.isInteger(appId) || appId <= 0 || !Number.isFinite(targetAmount) || targetAmount < 0) return;
    if (!/^[a-z]{2}$/.test(regionCode) || !/^[A-Z]{3}$/.test(targetCurrency)) return;
    const key = `${appId}:${productType}:${regionCode}:${targetCurrency}`;
    unique.set(key, {
      app_id: appId,
      product_type: productType,
      game_name: String(game.name || `Steam ${appId}`).trim().slice(0, 180),
      target_amount: targetAmount,
      target_currency: targetCurrency,
      region_code: regionCode,
      enabled: true,
      updated_at: new Date().toISOString()
    });
  });
  return [...unique.values()];
}

async function findClient(publicId) {
  if (!publicId || !/^[0-9a-f-]{36}$/i.test(publicId)) return null;
  const rows = await supabaseRequest(`alert_clients?public_id=eq.${encodeURIComponent(publicId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function authenticateClient(publicId, secret) {
  const client = await findClient(publicId);
  if (!client || !secret || !secretsMatch(secret, client.secret_hash)) {
    const error = new Error("Thông tin xác thực Cloud Alerts không hợp lệ.");
    error.statusCode = 401;
    throw error;
  }
  return client;
}

export async function syncCloudAlerts(input = {}) {
  const channels = cleanChannels(input.channels);
  const games = cleanGames(input.games);
  if (!games.length) throw new Error("Chưa có game nào được đặt giá mục tiêu.");

  const now = new Date().toISOString();
  let client = await findClient(input.clientId);
  let clientSecret = String(input.clientSecret || "");

  if (client) {
    if (!secretsMatch(clientSecret, client.secret_hash)) {
      const error = new Error("Khóa Cloud Alerts trên thiết bị không hợp lệ.");
      error.statusCode = 401;
      throw error;
    }
    await supabaseRequest(`alert_clients?id=eq.${client.id}`, {
      method: "PATCH",
      body: {
        email: channels.email,
        discord_webhook: channels.discordWebhook,
        telegram_chat_id: channels.telegramChatId,
        enabled: true,
        updated_at: now
      },
      prefer: "return=minimal"
    });
  } else {
    const publicId = randomUUID();
    clientSecret = randomBytes(32).toString("base64url");
    const rows = await supabaseRequest("alert_clients", {
      method: "POST",
      body: {
        public_id: publicId,
        secret_hash: hashSecret(clientSecret),
        email: channels.email,
        discord_webhook: channels.discordWebhook,
        telegram_chat_id: channels.telegramChatId,
        enabled: true,
        updated_at: now
      },
      prefer: "return=representation"
    });
    client = rows?.[0];
    if (!client) throw new Error("Không thể tạo cấu hình Cloud Alerts.");
  }

  await supabaseRequest(`price_alerts?client_id=eq.${client.id}`, {
    method: "PATCH",
    body: { enabled: false, updated_at: now },
    prefer: "return=minimal"
  });
  await supabaseRequest("price_alerts?on_conflict=client_id,app_id,product_type,region_code,target_currency", {
    method: "POST",
    body: games.map((game) => ({ ...game, client_id: client.id })),
    prefer: "resolution=merge-duplicates,return=minimal"
  });

  return {
    clientId: client.public_id,
    clientSecret,
    synced: games.length,
    channels: {
      email: Boolean(channels.email),
      discord: Boolean(channels.discordWebhook),
      telegram: Boolean(channels.telegramChatId)
    },
    syncedAt: now
  };
}

export async function disableCloudAlerts(publicId, secret) {
  const client = await authenticateClient(publicId, secret);
  const now = new Date().toISOString();
  await Promise.all([
    supabaseRequest(`alert_clients?id=eq.${client.id}`, {
      method: "PATCH", body: { enabled: false, updated_at: now }, prefer: "return=minimal"
    }),
    supabaseRequest(`price_alerts?client_id=eq.${client.id}`, {
      method: "PATCH", body: { enabled: false, updated_at: now }, prefer: "return=minimal"
    })
  ]);
  return { disabled: true };
}

function formatAmount(amount, currency) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(amount);
  } catch {
    return `${Number(amount).toLocaleString("vi-VN")} ${currency}`;
  }
}

function notificationMessage(alert, currentAmount) {
  const productPath = alert.product_type === "sub" ? "sub" : "app";
  const steamUrl = `https://store.steampowered.com/${productPath}/${alert.app_id}?cc=${alert.region_code}`;
  return {
    subject: `🎯 ${alert.game_name} đã đạt giá mục tiêu`,
    text: [
      `🎯 ${alert.game_name} đã đạt giá mục tiêu!`,
      `Giá hiện tại: ${formatAmount(currentAmount, alert.target_currency)}`,
      `Giá mục tiêu: ${formatAmount(alert.target_amount, alert.target_currency)}`,
      `Khu vực: ${String(alert.region_code).toUpperCase()}`,
      steamUrl
    ].join("\n"),
    steamUrl
  };
}

async function sendDiscord(webhook, message) {
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message.text, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Discord HTTP ${response.status}`);
}

async function sendTelegram(chatId, message) {
  const { telegramToken } = env();
  if (!telegramToken) throw new Error("TELEGRAM_BOT_TOKEN chưa được cấu hình");
  const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message.text, disable_web_page_preview: false }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

async function sendEmail(email, message) {
  const { resendKey, fromEmail } = env();
  if (!resendKey || !fromEmail) throw new Error("Resend chưa được cấu hình");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": createHash("sha256").update(`${email}:${message.text}`).digest("hex") },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: message.subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${escapeHtml(message.subject)}</h2><p>${escapeHtml(message.text).replace(/\n/g, "<br>")}</p><p><a href="${escapeHtml(message.steamUrl)}">Mở trên Steam</a></p></div>`
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
}

async function dispatchNotifications(client, message, sendPush, onlyChannel = null) {
  const jobs = [];
  if ((!onlyChannel || onlyChannel === "discord") && client.discord_webhook) jobs.push(["discord", () => sendDiscord(client.discord_webhook, message)]);
  if ((!onlyChannel || onlyChannel === "telegram") && client.telegram_chat_id) jobs.push(["telegram", () => sendTelegram(client.telegram_chat_id, message)]);
  if ((!onlyChannel || onlyChannel === "email") && client.email) jobs.push(["email", () => sendEmail(client.email, message)]);
  if ((!onlyChannel || onlyChannel === "webpush") && client.user_id && typeof sendPush === "function") jobs.push(["webpush", () => sendPush(client.user_id, message)]);
  const settled = await Promise.allSettled(jobs.map(([, send]) => send()));
  return settled.flatMap((result, index) => {
    const channel = jobs[index][0];
    if (channel === "webpush" && result.status === "fulfilled") return Array.isArray(result.value) ? result.value : [];
    return [{
      channel,
      success: result.status === "fulfilled",
      error: result.status === "rejected" ? String(result.reason?.message || result.reason) : null
    }];
  });
}

export async function sendCloudAlertTest(publicId, secret) {
  const client = await authenticateClient(publicId, secret);
  const message = {
    subject: "✅ Cloud Alerts đã kết nối",
    text: "✅ Steam Price Compare đã kết nối kênh thông báo thành công.",
    steamUrl: "https://store.steampowered.com/"
  };
  const results = await dispatchNotifications(client, message);
  return { success: results.some((item) => item.success), results };
}

async function recordEvent(alert, currentAmount, results) {
  const rows = results.map((result) => ({
    alert_id: alert.id,
    client_id: alert.client_id,
    channel: result.channel,
    status: result.success ? "sent" : "failed",
    price_amount: currentAmount,
    currency: alert.target_currency,
    error_message: result.error
  }));
  if (rows.length) {
    await supabaseRequest("alert_events", { method: "POST", body: rows, prefer: "return=minimal" });
    await Promise.all(results.map((result) => supabaseRequest("service_health?on_conflict=service", {
      method: "POST",
      body: { service: `notification-${result.channel}`, status: result.success ? "operational" : "down", message: result.error, checked_at: new Date().toISOString() },
      prefer: "resolution=merge-duplicates,return=minimal"
    }).catch(() => {})));
  }
}

async function queueRetry(jobType, payload, error) {
  await supabaseRequest("retry_jobs", {
    method: "POST",
    body: { job_type: jobType, payload, last_error: String(error || "").slice(0, 500), next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() },
    prefer: "return=minimal"
  }).catch(() => {});
}

export async function runCloudAlertChecks({ getQuote, onQuote, sendPush, concurrency = 4 } = {}) {
  if (typeof getQuote !== "function") throw new Error("Price provider is required");
  const [alerts, clients] = await Promise.all([
    supabaseRequest(`price_alerts?enabled=eq.true&select=*&order=last_checked_at.asc.nullsfirst&limit=${MAX_ALERTS_PER_RUN}`),
    supabaseRequest("alert_clients?enabled=eq.true&select=*&limit=500")
  ]);
  const clientMap = new Map((clients || []).map((client) => [client.id, client]));
  let cursor = 0;
  const summary = { checked: 0, triggered: 0, sent: 0, failed: 0, unavailable: 0 };

  async function worker() {
    while (cursor < (alerts || []).length) {
      const alert = alerts[cursor++];
      const checkedAt = new Date().toISOString();
      try {
        const quote = await getQuote(alert);
        if (!quote?.available || !Number.isFinite(quote.amount)) {
          summary.unavailable += 1;
          await supabaseRequest(`price_alerts?id=eq.${alert.id}`, {
            method: "PATCH", body: { last_checked_at: checkedAt, last_error: "Giá không khả dụng", updated_at: checkedAt }, prefer: "return=minimal"
          });
          continue;
        }

        summary.checked += 1;
        const currentAmount = Number(quote.amount);
        if (typeof onQuote === "function") await onQuote(alert, quote).catch(() => {});
        const previousAmount = alert.current_amount === null ? Number.NaN : Number(alert.current_amount);
        const targetAmount = Number(alert.target_amount);
        const belowTarget = currentAmount <= targetAmount;
        const crossedTarget = !Number.isFinite(previousAmount) || previousAmount > targetAmount;
        const lastAlertAt = alert.last_alerted_at ? new Date(alert.last_alerted_at).getTime() : 0;
        const cooldownElapsed = Date.now() - lastAlertAt >= ALERT_COOLDOWN_MS;
        const previousAlertPrice = alert.last_alerted_price === null ? Number.NaN : Number(alert.last_alerted_price);
        const lowerThanLastAlert = !Number.isFinite(previousAlertPrice) || currentAmount < previousAlertPrice;
        const shouldNotify = belowTarget && (crossedTarget || !lastAlertAt || (cooldownElapsed && lowerThanLastAlert));
        const update = {
          current_amount: currentAmount,
          current_currency: alert.target_currency,
          discount_percent: Number(quote.discountPercent || 0),
          last_checked_at: checkedAt,
          last_error: null,
          updated_at: checkedAt
        };

        if (shouldNotify) {
          summary.triggered += 1;
          const client = clientMap.get(alert.client_id);
          if (client) {
            const results = await dispatchNotifications(client, notificationMessage(alert, currentAmount), sendPush);
            await recordEvent(alert, currentAmount, results);
            await Promise.all(results.filter((item) => !item.success && item.channel !== "webpush").map((item) => queueRetry("notification", { alertId: alert.id, clientId: alert.client_id, channel: item.channel, priceAmount: currentAmount }, item.error)));
            const sent = results.filter((item) => item.success).length;
            summary.sent += sent;
            summary.failed += results.length - sent;
            if (sent) {
              update.last_alerted_at = checkedAt;
              update.last_alerted_price = currentAmount;
            }
            if (!sent && results.length) update.last_error = results.map((item) => item.error).filter(Boolean).join("; ").slice(0, 500);
          }
        }

        await supabaseRequest(`price_alerts?id=eq.${alert.id}`, {
          method: "PATCH", body: update, prefer: "return=minimal"
        });
      } catch (error) {
        summary.failed += 1;
        await supabaseRequest(`price_alerts?id=eq.${alert.id}`, {
          method: "PATCH",
          body: { last_checked_at: checkedAt, last_error: String(error.message || error).slice(0, 500), updated_at: checkedAt },
          prefer: "return=minimal"
        }).catch(() => {});
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max((alerts || []).length, 1)) }, worker));
  return { ...summary, total: (alerts || []).length, partial: (alerts || []).length === MAX_ALERTS_PER_RUN, checkedAt: new Date().toISOString() };
}

export async function runRetryQueue({ sendPush } = {}) {
  const now = new Date().toISOString();
  const jobs = await supabaseRequest(`retry_jobs?status=in.(pending,failed)&attempts=lt.5&next_attempt_at=lte.${encodeURIComponent(now)}&select=*&order=next_attempt_at.asc&limit=30`);
  const summary = { processed: 0, completed: 0, failed: 0 };
  for (const job of jobs || []) {
    summary.processed += 1;
    const attempts = Number(job.attempts || 0) + 1;
    await supabaseRequest(`retry_jobs?id=eq.${job.id}`, { method: "PATCH", body: { status: "processing", attempts, updated_at: now }, prefer: "return=minimal" });
    try {
      if (job.job_type !== "notification") throw new Error(`Unsupported retry job: ${job.job_type}`);
      const [alerts, clients] = await Promise.all([
        supabaseRequest(`price_alerts?id=eq.${job.payload.alertId}&select=*&limit=1`),
        supabaseRequest(`alert_clients?id=eq.${job.payload.clientId}&select=*&limit=1`)
      ]);
      const alert = alerts?.[0];
      const client = clients?.[0];
      if (!alert || !client) throw new Error("Alert or client no longer exists");
      const results = await dispatchNotifications(client, notificationMessage(alert, Number(job.payload.priceAmount)), sendPush, job.payload.channel);
      await recordEvent(alert, Number(job.payload.priceAmount), results);
      if (!results.some((item) => item.success)) throw new Error(results.map((item) => item.error).filter(Boolean).join("; ") || "No active channel");
      await supabaseRequest(`retry_jobs?id=eq.${job.id}`, { method: "PATCH", body: { status: "done", last_error: null, updated_at: new Date().toISOString() }, prefer: "return=minimal" });
      summary.completed += 1;
    } catch (error) {
      await supabaseRequest(`retry_jobs?id=eq.${job.id}`, { method: "PATCH", body: { status: "failed", last_error: String(error.message || error).slice(0, 500), next_attempt_at: new Date(Date.now() + Math.min(24 * 60, 15 * 2 ** attempts) * 60000).toISOString(), updated_at: new Date().toISOString() }, prefer: "return=minimal" }).catch(() => {});
      summary.failed += 1;
    }
  }
  return summary;
}
