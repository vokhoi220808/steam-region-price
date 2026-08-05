import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createHash, timingSafeEqual } from "node:crypto";
import "dotenv/config";
import {
  disableCloudAlerts,
  getCloudAlertCapabilities,
  runCloudAlertChecks,
  runRetryQueue,
  runWeeklyEmailDigest,
  sendCloudAlertTest,
  syncCloudAlerts
} from "./server/cloud-alerts.js";
import { attachAccountSession, createAccountRouter, getWishlist, getPlayerSummaries } from "./server/account.js";
import { createPushRouter, sendUserPush } from "./server/push.js";
import { getInternalHistory, getPurchaseAdvice, recordPriceSnapshot, runTrackedHistorySweep } from "./server/history-store.js";
import { createReliabilityRouter, distributedCacheGet, distributedCacheSet, finishCronRun, rateLimit, startCronRun, updateServiceHealth } from "./server/reliability.js";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "96kb" }));
app.use("/api", rateLimit({ limit: 180, windowMs: 60000 }));
app.use(attachAccountSession);
app.use("/api", createAccountRouter());
app.use("/api", createPushRouter());
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

const REGIONS = [
  { code: "vn", name: "Việt Nam", flag: "🇻🇳" },
  { code: "us", name: "Hoa Kỳ (USD)", flag: "🇺🇸" },
  { code: "gb", name: "Anh Quốc (GBP)", flag: "🇬🇧" },
  { code: "de", name: "Châu Âu (EUR)", flag: "🇪🇺" },
  { code: "jp", name: "Nhật Bản (JPY)", flag: "🇯🇵" },
  { code: "kr", name: "Hàn Quốc (KRW)", flag: "🇰🇷" },
  { code: "cn", name: "Trung Quốc (CNY)", flag: "🇨🇳" },
  { code: "br", name: "Brazil (BRL)", flag: "🇧🇷" },
  { code: "mx", name: "Mexico (MXN)", flag: "🇲🇽" },
  { code: "ca", name: "Canada (CAD)", flag: "🇨🇦" },
  { code: "au", name: "Úc (AUD)", flag: "🇦🇺" },
  { code: "in", name: "Ấn Độ (INR)", flag: "🇮🇳" },
  { code: "id", name: "Indonesia (IDR)", flag: "🇮🇩" },
  { code: "ph", name: "Philippines (PHP)", flag: "🇵🇭" },
  { code: "th", name: "Thái Lan (THB)", flag: "🇹🇭" },
  { code: "sg", name: "Singapore (SGD)", flag: "🇸🇬" },
  { code: "my", name: "Malaysia (MYR)", flag: "🇲🇾" },
  { code: "tr", name: "Thổ Nhĩ Kỳ (TRY)", flag: "🇹🇷" },
  { code: "za", name: "Nam Phi (ZAR)", flag: "🇿🇦" },
  { code: "pl", name: "Ba Lan (PLN)", flag: "🇵🇱" },
  { code: "ch", name: "Thụy Sĩ (CHF)", flag: "🇨🇭" },
  { code: "hk", name: "Hồng Kông (HKD)", flag: "🇭🇰" },
  { code: "ru", name: "Nga (RUB)", flag: "🇷🇺" },
  { code: "tw", name: "Đài Loan (TWD)", flag: "🇹🇼" },
  { code: "ar", name: "Argentina (ARS)", flag: "🇦🇷" },
  { code: "ua", name: "Ukraina (UAH)", flag: "🇺🇦" },
  { code: "ae", name: "UAE (AED)", flag: "🇦🇪" }
];


const cache = new Map();
const cacheStats = { hits: 0, misses: 0, evictions: 0 };
const CACHE_MAX_ENTRIES = 1200;
const PRICE_TTL = 2 * 60 * 60 * 1000;
const FX_TTL = 6 * 60 * 60 * 1000;
const DEALS_TTL = 5 * 60 * 1000;
const METADATA_TTL = 6 * 60 * 60 * 1000;
const LIVE_STATS_TTL = 5 * 60 * 1000;

const STEAM_SALE_EVENTS = [
  { id: "cyberpunk-2026", name: "Cyberpunk Fest", kind: "festival", start: "2026-08-03T17:00:00Z", end: "2026-08-10T17:00:00Z", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop" },
  { id: "pins-pegs-2026", name: "Pins & Pegs Fest", kind: "festival", start: "2026-08-17T17:00:00Z", end: "2026-08-20T17:00:00Z", image: "https://images.unsplash.com/photo-1611996575749-79a3a250f948?q=80&w=600&auto=format&fit=crop" },
  { id: "pve-survival-2026", name: "PvE Survival Crafting Fest", kind: "festival", start: "2026-08-31T17:00:00Z", end: "2026-09-07T17:00:00Z", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop" },
  { id: "programming-2026", name: "Programming Fest", kind: "festival", start: "2026-09-10T17:00:00Z", end: "2026-09-14T17:00:00Z", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop" },
  { id: "party-rpg-2026", name: "Party-Based RPG Fest", kind: "festival", start: "2026-09-14T17:00:00Z", end: "2026-09-21T17:00:00Z", image: "https://images.unsplash.com/photo-1588880629555-d14f48ff7989?q=80&w=600&auto=format&fit=crop" },
  { id: "autumn-2026", name: "Steam Autumn Sale", kind: "seasonal", start: "2026-10-01T17:00:00Z", end: "2026-10-08T17:00:00Z", image: "https://images.unsplash.com/photo-1507368297750-f8fb2fa174da?q=80&w=600&auto=format&fit=crop" },
  { id: "cooking-2026", name: "Cooking Fest", kind: "festival", start: "2026-10-12T17:00:00Z", end: "2026-10-19T17:00:00Z", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=600&auto=format&fit=crop" },
  { id: "next-oct-2026", name: "Steam Next Fest", kind: "next_fest", start: "2026-10-19T17:00:00Z", end: "2026-10-26T17:00:00Z", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop" },
  { id: "scream-2026", name: "Steam Scream V", kind: "festival", start: "2026-10-26T17:00:00Z", end: "2026-11-02T18:00:00Z", image: "https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?q=80&w=600&auto=format&fit=crop" },
  { id: "auto-battler-2026", name: "Auto-Battler RPG Fest", kind: "festival", start: "2026-11-16T18:00:00Z", end: "2026-11-23T18:00:00Z", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=600&auto=format&fit=crop" },
  { id: "winter-2026", name: "Steam Winter Sale", kind: "seasonal", start: "2026-12-17T18:00:00Z", end: "2027-01-04T18:00:00Z", image: "https://images.unsplash.com/photo-1544335443-4dc975b9de0e?q=80&w=600&auto=format&fit=crop" },
  { id: "spring-2027", name: "Steam Spring Sale", kind: "seasonal", start: "2027-03-18T17:00:00Z", end: "2027-03-25T17:00:00Z", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=600&auto=format&fit=crop" },
  { id: "summer-2027", name: "Steam Summer Sale", kind: "seasonal", start: "2027-06-24T17:00:00Z", end: "2027-07-08T17:00:00Z", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop" }
];

function getCache(key) {
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) {
    cache.delete(key);
    cacheStats.misses += 1;
    return null;
  }
  cacheStats.hits += 1;
  return item.value;
}

function setCache(key, value, ttl) {
  if (!cache.has(key) && cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
    cacheStats.evictions += 1;
  }
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

async function mapWithConcurrency(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function minorToMajor(value, currency) {
  if (!Number.isFinite(value)) return null;
  return value / 100;
}

async function fetchJson(url, timeoutMs = 12000) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Steam-Regional-Price-Comparator/1.0",
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function getExchangeRates(targetCurrency = "VND") {
  const code = targetCurrency.toUpperCase();
  const cacheKey = `fx:${code}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchJson(`https://open.er-api.com/v6/latest/${code}`);
    if (data?.result !== "success" || !data.rates) {
      throw new Error("Dữ liệu tỷ giá không hợp lệ");
    }
    setCache(cacheKey, data.rates, FX_TTL);
    return data.rates;
  } catch (error) {
    console.warn("Không lấy được tỷ giá:", error.message);
    return null;
  }
}

async function getRegionalPrice(appId, region, language = "vietnamese") {
  const steamLanguage = language === "english" ? "english" : "vietnamese";
  const cacheKey = `price:${appId}:${region.code}:${steamLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    appids: String(appId),
    cc: region.code,
    l: steamLanguage,
    filters: "basic,developers,publishers,release_date,genres,price_overview"
  });

  try {
    const json = await fetchJson(
      `https://store.steampowered.com/api/appdetails?${params.toString()}`
    );

    const result = json?.[String(appId)];
    if (!result?.success || !result.data) {
      const unavailable = { ...region, available: false };
      setCache(cacheKey, unavailable, PRICE_TTL);
      return unavailable;
    }

    const game = result.data;
    if (game.is_free) {
      const free = {
        ...region,
        available: true,
        isFree: true,
        gameName: game.name,
        image: game.header_image,
        developer: game.developers?.[0] || null,
        publisher: game.publishers?.[0] || null,
        releaseDate: game.release_date?.date || null,
        genres: game.genres?.map(g => g.description).join(", ") || null,
        shortDescription: game.short_description || null,
        currency: null,
        initial: 0,
        final: 0,
        discountPercent: 0,
        initialFormatted: "Miễn phí",
        finalFormatted: "Miễn phí"
      };
      setCache(cacheKey, free, PRICE_TTL);
      return free;
    }

    const price = game.price_overview;
    if (!price) {
      const unavailable = {
        ...region,
        available: false,
        gameName: game.name,
        image: game.header_image,
        developer: game.developers?.[0] || null,
        publisher: game.publishers?.[0] || null,
        releaseDate: game.release_date?.date || null,
        genres: game.genres?.map(g => g.description).join(", ") || null,
        shortDescription: game.short_description || null
      };
      setCache(cacheKey, unavailable, PRICE_TTL);
      return unavailable;
    }

    const item = {
      ...region,
      available: true,
      isFree: false,
      gameName: game.name,
      image: game.header_image,
      developer: game.developers?.[0] || null,
      publisher: game.publishers?.[0] || null,
      releaseDate: game.release_date?.date || null,
      genres: game.genres?.map(g => g.description).join(", ") || null,
      shortDescription: game.short_description || null,
      currency: price.currency,
      initial: minorToMajor(price.initial, price.currency),
      final: minorToMajor(price.final, price.currency),
      discountPercent: price.discount_percent,
      initialFormatted: price.initial_formatted,
      finalFormatted: price.final_formatted
    };

    setCache(cacheKey, item, PRICE_TTL);
    return item;
  } catch (error) {
    return { ...region, available: false, error: error.message };
  }
}

function stripSteamMarkup(value = "") {
  return String(value)
    .replace(/\[\/?[a-z]+(?:=[^\]]+)?\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function getRegionalPackagePrice(packageId, region, language = "vietnamese") {
  const steamLanguage = language === "english" ? "english" : "vietnamese";
  const cacheKey = `package:${packageId}:${region.code}:${steamLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    packageids: String(packageId),
    cc: region.code,
    l: steamLanguage
  });

  try {
    const json = await fetchJson(`https://store.steampowered.com/api/packagedetails?${params.toString()}`);
    const result = json?.[String(packageId)];
    if (!result?.success || !result.data) {
      const unavailable = { ...region, available: false, productType: "sub" };
      setCache(cacheKey, unavailable, PRICE_TTL);
      return unavailable;
    }

    const product = result.data;
    const price = product.price;
    const item = {
      ...region,
      productType: "sub",
      available: Boolean(price),
      isFree: Boolean(price && price.final === 0),
      gameName: product.name,
      image: product.header_image || product.small_logo || null,
      developer: null,
      publisher: null,
      releaseDate: product.release_date?.date || null,
      genres: "Bundle / Complete Edition",
      shortDescription: stripSteamMarkup(product.page_content).slice(0, 420) || null,
      includedApps: product.apps?.map((entry) => ({ id: entry.id, name: entry.name })) || [],
      currency: price?.currency || null,
      initial: price ? minorToMajor(price.initial, price.currency) : null,
      final: price ? minorToMajor(price.final, price.currency) : null,
      discountPercent: price?.discount_percent || 0,
      initialFormatted: null,
      finalFormatted: null
    };
    setCache(cacheKey, item, PRICE_TTL);
    return item;
  } catch (error) {
    return { ...region, available: false, productType: "sub", error: error.message };
  }
}

async function getCloudAlertQuote(alert) {
  const region = REGIONS.find((item) => item.code === String(alert.region_code || "").toLowerCase());
  if (!region) return { available: false };
  const productType = alert.product_type === "sub" ? "sub" : "app";
  const price = productType === "sub"
    ? await getRegionalPackagePrice(alert.app_id, region, "vietnamese")
    : await getRegionalPrice(alert.app_id, region, "vietnamese");
  if (!price?.available) return { available: false };
  if (price.isFree) return { available: true, amount: 0, rawAmount: 0, currency: String(alert.target_currency || "VND"), originalAmount: 0, discountPercent: 100 };

  const targetCurrency = String(alert.target_currency || "VND").toUpperCase();
  if (price.currency === targetCurrency) {
    return { available: true, amount: price.final, rawAmount: price.final, currency: price.currency, originalAmount: price.initial, discountPercent: price.discountPercent || 0 };
  }
  const rates = await getExchangeRates(targetCurrency);
  const rate = rates?.[price.currency];
  if (!Number.isFinite(rate) || rate <= 0) return { available: false };
  return { available: true, amount: price.final / rate, rawAmount: price.final, currency: price.currency, originalAmount: price.initial, discountPercent: price.discountPercent || 0 };
}

async function getPackageMetadata(packageId, includedApps = [], language = "vietnamese") {
  const baseAppId = Number(includedApps[0]?.id);
  if (!Number.isFinite(baseAppId)) return null;

  const steamLanguage = language === "english" ? "english" : "vietnamese";
  const cacheKey = `package-meta:${packageId}:${steamLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      appids: String(baseAppId),
      cc: "US",
      l: steamLanguage
    });
    const json = await fetchJson(`https://store.steampowered.com/api/appdetails?${params.toString()}`);
    const game = json?.[String(baseAppId)]?.data;
    if (!game) return null;

    const metadata = {
      developer: game.developers?.join(", ") || null,
      publisher: game.publishers?.join(", ") || null,
      releaseDate: game.release_date?.date || null,
      genres: game.genres?.map((genre) => genre.description).join(", ") || "Bundle / Complete Edition",
      shortDescription: game.short_description || null
    };
    setCache(cacheKey, metadata, METADATA_TTL);
    return metadata;
  } catch {
    return null;
  }
}

async function getDealMetadata(appId) {
  const stableKey = `deal-meta:${appId}`;
  const liveKey = `deal-live:${appId}`;
  let stable = getCache(stableKey);
  if (!stable) {
    const params = new URLSearchParams({
      appids: String(appId),
      cc: "US",
      l: "english",
      filters: "basic,genres,categories"
    });
    const [detailsResult, reviewsResult] = await Promise.allSettled([
      fetchJson(`https://store.steampowered.com/api/appdetails?${params.toString()}`),
      fetchJson(`https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`)
    ]);
    const details = detailsResult.status === "fulfilled" ? detailsResult.value?.[String(appId)]?.data : null;
    const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value?.query_summary : null;
    stable = {
      appId: Number(appId),
      contentType: details?.type || "game",
      tags: details?.genres?.map((genre) => genre.description) || [],
      reviewScore: reviews?.review_score || 0,
      reviewScoreDesc: reviews?.review_score_desc || null,
      totalReviews: reviews?.total_reviews || 0,
      totalPositive: reviews?.total_positive || 0,
      reviewPercent: reviews?.total_reviews
        ? Math.round((Number(reviews.total_positive || 0) / Number(reviews.total_reviews)) * 100)
        : null
    };
    setCache(stableKey, stable, METADATA_TTL);
  }

  let live = getCache(liveKey);
  if (!live) {
    try {
      const players = await fetchJson(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`);
      live = { ccu: players?.response?.player_count || 0 };
    } catch {
      live = { ccu: 0 };
    }
    setCache(liveKey, live, LIVE_STATS_TTL);
  }
  return { ...stable, ...live };
}

app.get("/api/regions", (req, res) => {
  res.json(REGIONS);
});

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing search term" });
  try {
    const language = String(req.query.lang || "vi").toLowerCase() === "en" ? "english" : "vietnamese";
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=${language}&cc=US`;
    const response = await fetchJson(url);
    res.json(response);
  } catch (error) {
    console.error("Search API Error:", error.message);
    res.status(500).json({ error: "Lỗi tìm kiếm từ Steam" });
  }
});

function normalizeComparedPrice(item, rates) {
  let convertedValue = null;
  if (item.available && !item.isFree && rates && item.currency) {
    const rate = rates[item.currency];
    if (Number.isFinite(rate) && rate > 0) convertedValue = item.final / rate;
  } else if (item.isFree) {
    convertedValue = 0;
  }
  return { ...item, convertedValue };
}

app.get("/api/compare-stream/:appId", async (req, res) => {
  const appId = req.params.appId;
  if (!/^\d+$/.test(appId)) {
    return res.status(400).json({ error: "Steam App ID không hợp lệ." });
  }

  const targetCurrency = String(req.query.currency || "VND").toUpperCase();
  const productType = String(req.query.type || "app").toLowerCase() === "sub" ? "sub" : "app";
  const language = String(req.query.lang || "vi").toLowerCase() === "en" ? "english" : "vietnamese";
  const requestedCodes = String(req.query.regions || "")
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
  const selectedRegions = requestedCodes.length
    ? REGIONS.filter((region) => requestedCodes.includes(region.code))
    : REGIONS;

  if (!selectedRegions.length) {
    return res.status(400).json({ error: "Không có vùng hợp lệ được chọn." });
  }

  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.flushHeaders?.();
  const writeEvent = (payload) => {
    if (!res.destroyed && !res.writableEnded) res.write(`${JSON.stringify(payload)}\n`);
  };

  try {
    const prices = [];
    const ratesPromise = getExchangeRates(targetCurrency);
    const communityMetadataPromise = productType === "app"
      ? getDealMetadata(appId).catch(() => null)
      : Promise.resolve(null);
    await mapWithConcurrency(selectedRegions, 4, async (region) => {
      const [rawPrice, rates] = await Promise.all([
        productType === "sub"
          ? getRegionalPackagePrice(appId, region, language)
          : getRegionalPrice(appId, region, language),
        ratesPromise
      ]);
      const price = normalizeComparedPrice(rawPrice, rates);
      prices.push(price);
      writeEvent({ type: "price", price, completed: prices.length, total: selectedRegions.length });
      return price;
    });

    const firstValue = (field) => prices.find((item) => item[field])?.[field] || null;
    const gameName = firstValue("gameName");
    if (!gameName) {
      writeEvent({
        type: "error",
        status: 404,
        error: productType === "sub"
          ? "Package ID không tồn tại trên Steam Store."
          : "App ID không tồn tại trên Steam Store."
      });
      return res.end();
    }

    const packageSeed = productType === "sub"
      ? prices.find((item) => item.available && item.includedApps?.length)
      : null;
    const packageMetadata = packageSeed
      ? await getPackageMetadata(appId, packageSeed.includedApps, language)
      : null;
    const [rates, communityMetadata] = await Promise.all([ratesPromise, communityMetadataPromise]);
    writeEvent({
      type: "complete",
      data: {
        appId: Number(appId),
        productType,
        gameName,
        image: firstValue("image"),
        developer: firstValue("developer") || packageMetadata?.developer || null,
        publisher: firstValue("publisher") || packageMetadata?.publisher || null,
        releaseDate: firstValue("releaseDate") || packageMetadata?.releaseDate || null,
        genres: packageMetadata?.genres || firstValue("genres"),
        shortDescription: firstValue("shortDescription") || packageMetadata?.shortDescription || null,
        includedApps: firstValue("includedApps") || [],
        reviewScoreDesc: communityMetadata?.reviewScoreDesc || null,
        reviewPercent: communityMetadata?.reviewPercent ?? null,
        totalReviews: communityMetadata?.totalReviews || 0,
        ccu: communityMetadata?.ccu || 0,
        fxAvailable: Boolean(rates),
        checkedAt: new Date().toISOString()
      }
    });
    res.end();
  } catch (error) {
    writeEvent({ type: "error", status: 502, error: "Không thể lấy dữ liệu giá từ Steam lúc này." });
    res.end();
    console.error("Compare stream error:", error.message);
  }
});

app.get("/api/compare/:appId", async (req, res) => {
  const appId = req.params.appId;
  if (!/^\d+$/.test(appId)) {
    return res.status(400).json({ error: "Steam App ID không hợp lệ." });
  }

  const targetCurrency = String(req.query.currency || "VND").toUpperCase();
  const productType = String(req.query.type || "app").toLowerCase() === "sub" ? "sub" : "app";
  const language = String(req.query.lang || "vi").toLowerCase() === "en"
    ? "english"
    : "vietnamese";

  const requestedCodes = String(req.query.regions || "")
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);

  const selectedRegions = requestedCodes.length
    ? REGIONS.filter((region) => requestedCodes.includes(region.code))
    : REGIONS;

  if (!selectedRegions.length) {
    return res.status(400).json({ error: "Không có vùng hợp lệ được chọn." });
  }

  const [prices, rates] = await Promise.all([
    Promise.all(selectedRegions.map((region) => productType === "sub"
      ? getRegionalPackagePrice(appId, region, language)
      : getRegionalPrice(appId, region, language))),
    getExchangeRates(targetCurrency)
  ]);

  const packageSeed = productType === "sub"
    ? prices.find((item) => item.available && item.includedApps?.length)
    : null;
  const packageMetadata = packageSeed
    ? await getPackageMetadata(appId, packageSeed.includedApps, language)
    : null;

  const normalized = prices.map((item) => normalizeComparedPrice(item, rates));

  const ranked = normalized
    .filter((item) => item.available && Number.isFinite(item.convertedValue))
    .sort((a, b) => a.convertedValue - b.convertedValue);

  const cheapest = ranked[0]?.convertedValue ?? null;
  const enriched = normalized.map((item) => ({
    ...item,
    differenceValue:
      cheapest !== null && Number.isFinite(item.convertedValue)
        ? item.convertedValue - cheapest
        : null
  }));

  const firstValue = (field) => enriched.find((item) => item[field])?.[field] || null;
  const gameName = firstValue("gameName");
  if (!gameName) {
    return res.status(404).json({
      error: productType === "sub"
        ? "Package ID không tồn tại trên Steam Store."
        : "App ID không tồn tại trên Steam Store."
    });
  }
  res.json({
    appId: Number(appId),
    productType,
    gameName,
    image: firstValue("image"),
    developer: firstValue("developer") || packageMetadata?.developer || null,
    publisher: firstValue("publisher") || packageMetadata?.publisher || null,
    releaseDate: firstValue("releaseDate") || packageMetadata?.releaseDate || null,
    genres: packageMetadata?.genres || firstValue("genres"),
    shortDescription: firstValue("shortDescription") || packageMetadata?.shortDescription || null,
    includedApps: firstValue("includedApps") || [],
    fxAvailable: Boolean(rates),
    checkedAt: new Date().toISOString(),
    prices: enriched
  });
});

const ITAD_API_KEY = process.env.ITAD_API_KEY || "";
const STEAM_API_KEY = process.env.STEAM_API_KEY || "";

app.get("/api/history/:appId", async (req, res) => {
  const appId = req.params.appId;
  
  if (!ITAD_API_KEY) {
    return res.status(503).json({ error: "ITAD_API_KEY not configured" });
  }
  
  try {
    // 1. Lookup ITAD ID
    const lookupUrl = `https://api.isthereanydeal.com/games/lookup/v1?appid=${appId}&key=${ITAD_API_KEY}`;
    const lookupData = await fetchJson(lookupUrl);
    
    if (!lookupData || !lookupData.found || !lookupData.game || !lookupData.game.id) {
      return res.status(404).json({ error: "Game not found in ITAD" });
    }
    
    const itadId = lookupData.game.id;
    
    // 2. Fetch history (Steam store id is usually 61, but we can fetch all and filter client side, or filter here)
    // ITAD API v2 allows specifying shops
    const historyUrl = `https://api.isthereanydeal.com/games/history/v2?id=${itadId}&shops=61&country=US&key=${ITAD_API_KEY}`;
    const historyData = await fetchJson(historyUrl);
    
    // historyData is an array of objects
    res.json({
      appId: Number(appId),
      itadId: itadId,
      history: historyData
    });
    
  } catch (err) {
    console.error("ITAD API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/history/internal/:appId", async (req, res) => {
  if (!/^\d+$/.test(req.params.appId)) return res.status(400).json({ error: "Steam App ID không hợp lệ." });
  try {
    res.json(await getInternalHistory(req.params.appId, {
      regionCode: String(req.query.region || "vn").toLowerCase(),
      productType: req.query.type === "sub" ? "sub" : "app",
      days: Number(req.query.days || 365)
    }));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

async function getDealsData(cc) {
  const DEALS_MASSIVE_TTL = 60 * 60 * 1000; // 1 hour for massive payload
  const cacheKey = `deals_massive:${cc}`;
  let cached = getCache(cacheKey);
  if (!cached) cached = await distributedCacheGet(cacheKey);
  if (cached) {
    setCache(cacheKey, cached, DEALS_MASSIVE_TTL);
    return cached;
  }

  // 1. Fetch Featured Categories (Fast, current sales)
  const data = await fetchJson(`https://store.steampowered.com/api/featuredcategories?cc=${cc}`).catch(() => ({}));
  if (!data || Object.keys(data).length === 0) throw new Error("Invalid data from Steam");

  // Record existing AppIDs to avoid duplicates
  const existingAppIds = new Set();
  Object.values(data).forEach(cat => {
    if (cat?.items && Array.isArray(cat.items)) {
      cat.items.forEach(item => existingAppIds.add(Number(item.id || item.appId)));
    }
  });

  // 2. Fetch Top 3000 Games from SteamSpy
  const popularAppIds = new Set();
  try {
    const pages = [0, 1, 2];
    await Promise.all(pages.map(async (page) => {
      const spyData = await fetchJson(`https://steamspy.com/api.php?request=all&page=${page}`).catch(() => ({}));
      Object.keys(spyData).forEach(id => {
        const numId = Number(id);
        if (numId && !existingAppIds.has(numId)) {
          popularAppIds.add(numId);
        }
      });
    }));
  } catch (e) {
    console.warn("Failed to fetch from SteamSpy", e);
  }

  // 3. Chunk and fetch prices from Steam
  const appIdsArr = Array.from(popularAppIds);
  const chunks = [];
  for (let i = 0; i < appIdsArr.length; i += 30) {
    chunks.push(appIdsArr.slice(i, i + 30));
  }

  const popularItems = [];
  // Concurrency limit of 5 to avoid strict Steam rate limits
  await mapWithConcurrency(chunks, 5, async (chunk) => {
    try {
      const url = `https://store.steampowered.com/api/appdetails?appids=${chunk.join(",")}&cc=${cc}&filters=price_overview,basic`;
      const res = await fetch(url, { headers: { "User-Agent": "Steam-Regional-Price-Comparator/1.0" }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      const chunkData = await res.json();
      
      for (const [idStr, info] of Object.entries(chunkData || {})) {
        if (info && info.success && info.data && info.data.type === 'game') {
          const game = info.data;
          const isFree = game.is_free || (game.price_overview && game.price_overview.final === 0);
          
          let finalPrice = 0;
          let initialPrice = 0;
          let discountPercent = 0;

          if (game.price_overview) {
            finalPrice = game.price_overview.final;
            initialPrice = game.price_overview.initial;
            discountPercent = game.price_overview.discount_percent;
          } else if (!isFree) {
            continue;
          }

          popularItems.push({
            id: Number(idStr),
            type: 0,
            name: game.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: initialPrice,
            final_price: finalPrice,
            currency: game.price_overview?.currency || cc,
            large_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${idStr}/header.jpg`,
            small_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${idStr}/capsule_231x87.jpg`,
            windows_available: game.platforms?.windows,
            mac_available: game.platforms?.mac,
            linux_available: game.platforms?.linux,
            streamingvideo_available: false,
            header_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${idStr}/header.jpg`,
            headline: ""
          });
        }
      }
    } catch (e) {}
  });

  if (popularItems.length > 0) {
    data["top_popular"] = {
      id: "top_popular",
      name: "Top 3000 Popular Games",
      items: popularItems
    };
  }

  setCache(cacheKey, data, DEALS_MASSIVE_TTL);
  distributedCacheSet(cacheKey, data, Math.floor(DEALS_MASSIVE_TTL / 1000));
  return data;
}

app.get('/api/deals', async (req, res) => {
  try {
    const cc = String(req.query.cc || 'VN').toUpperCase();
    const maxPrice = Number(req.query.maxPrice);
    const data = await getDealsData(cc);
    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      const filtered = {};
      for (const [key, category] of Object.entries(data || {})) {
        if (!category?.items) continue;
        filtered[key] = {
          ...category,
          items: category.items.filter((item) => Number(item.final_price || item.finalPrice) <= maxPrice)
        };
      }
      return res.json(filtered);
    }
    res.json(data);
  } catch (err) {
    console.error("Steam Deals API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch top deals" });
  }
});

app.get('/api/account/deals', async (req, res) => {
  if (!req.account) return res.status(401).json({ error: "Đăng nhập Steam để xem deal dành cho bạn." });
  try {
    const { supabaseRequest } = await import("./server/cloud-alerts.js");
    const cc = String(req.query.cc || 'VN').toUpperCase();
    const maxPrice = Number(req.query.maxPrice);
    const [data, tracker, wishlist] = await Promise.all([
      getDealsData(cc),
      supabaseRequest(`cloud_tracker?user_id=eq.${req.account.id}&select=*`),
      supabaseRequest(`user_wishlist?user_id=eq.${req.account.id}&select=app_id,metadata`)
    ]);
    const wishlistIds = new Set((wishlist || []).map((item) => Number(item.app_id)));
    const trackerMap = new Map((tracker || []).map((item) => [Number(item.app_id), item]));
    const trackedNames = (tracker || []).map((item) => String(item.game_data?.name || "").toLowerCase()).filter(Boolean);
    const unique = new Map();
    for (const category of Object.values(data || {})) {
      for (const item of Array.isArray(category?.items) ? category.items : []) unique.set(Number(item.id), item);
    }
    for (const row of wishlist || []) {
      const appId = Number(row.app_id);
      if (!unique.has(appId)) {
        const meta = row.metadata || {};
        const sub = meta.subs?.[0] || {};
        const discount = Number(meta.discount_pct || sub.discount_pct || 0);
        if (discount > 0) {
          unique.set(appId, {
            id: appId,
            name: meta.name || `App ${appId}`,
            header_image: meta.capsule || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
            discount_percent: discount,
            original_price: sub.price ? Math.round(sub.price / (1 - discount / 100)) : null,
            final_price: sub.price || null,
            currency: "VND"
          });
        }
      }
    }
    const candidates = [...unique.values()].map((item) => {
      const appId = Number(item.id);
      const reasons = [];
      let personalScore = Number(item.discount_percent || 0);
      if (wishlistIds.has(appId)) { personalScore += 120; reasons.push("Trong Wishlist Steam"); }
      const tracked = trackerMap.get(appId);
      if (tracked) {
        personalScore += 90;
        reasons.push("Đang theo dõi");
        if (tracked.target_amount !== null && Number.isFinite(Number(tracked.target_amount))) {
          const finalPrice = Number(item.final_price || item.finalPrice || 0);
          if (finalPrice > 0 && finalPrice <= Number(tracked.target_amount) * 1.15) {
            personalScore += 80;
            reasons.push("Gần đạt giá mục tiêu");
          }
        }
      }
      const itemName = String(item.name || "").toLowerCase();
      const isDlcOrBundle = item.is_dlc || item.type === "dlc" || item.type === "bundle" || /dlc|soundtrack|expansion|pack|pass|bundle/i.test(itemName);
      if (isDlcOrBundle && trackedNames.some((name) => name.length > 3 && itemName.includes(name))) {
        personalScore += 70;
        reasons.push("DLC/Bundle liên quan");
      }
      return { ...item, personalScore, personalReasons: reasons };
    }).filter((item) => item.personalReasons.length);

    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (Number(candidates[i].final_price || candidates[i].finalPrice) > maxPrice) {
          candidates.splice(i, 1);
        }
      }
    }

    candidates.sort((a, b) => b.personalScore - a.personalScore);
    const items = candidates.slice(0, 60);

    res.json({ personalized: { id: "personalized", name: "Deal dành cho bạn", items }, basedOn: { wishlist: wishlistIds.size, tracker: trackerMap.size }, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Personalized Deals Error:", error.message);
    res.status(500).json({ error: "Không thể tạo deal cá nhân hóa." });
  }
});

app.get('/api/deals/metadata', async (req, res) => {
  const appIds = [...new Set(String(req.query.appids || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value)))]
    .slice(0, 30);
  if (!appIds.length) return res.json({ items: [] });
  const items = await mapWithConcurrency(appIds, 4, async (appId) => {
    try {
      return await getDealMetadata(appId);
    } catch (error) {
      return { appId: Number(appId), error: error.message };
    }
  });
  res.json({ items, partial: String(req.query.appids || "").split(",").length > appIds.length });
});

app.get('/api/sales-calendar', (req, res) => {
  const now = Date.now();
  const events = STEAM_SALE_EVENTS.filter((event) => new Date(event.end).getTime() > now);
  res.json({
    checkedAt: new Date().toISOString(),
    source: "https://partner.steamgames.com/doc/marketing/upcoming_events",
    events
  });
});

async function resolveSteamId(profileInput) {
  const input = String(profileInput || "").trim();
  const direct = input.match(/(?:profiles\/)?(7656119\d{10})/);
  if (direct) return direct[1];
  const vanity = input.match(/steamcommunity\.com\/id\/([^/?#]+)/i)?.[1]
    || (/^[a-z0-9_-]{2,64}$/i.test(input) ? input : null);
  if (!vanity) return null;
  const xml = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`, {
    headers: { "User-Agent": "Steam-Regional-Price-Comparator/1.0" },
    signal: AbortSignal.timeout(12000)
  }).then((response) => response.ok ? response.text() : "");
  return xml.match(/<steamID64>(\d+)<\/steamID64>/)?.[1] || null;
}

app.get('/api/wishlist', async (req, res) => {
  try {
    const steamId = await resolveSteamId(req.query.profile);
    if (!steamId) return res.status(400).json({ error: "Steam ID hoặc Profile Link không hợp lệ." });
    
    let ids = [];
    if (STEAM_API_KEY) {
      try {
        const params = new URLSearchParams({ key: STEAM_API_KEY, steamid: steamId });
        const wishlist = await fetchJson(`https://api.steampowered.com/IWishlistService/GetWishlist/v1/?${params.toString()}`);
        const rawItems = wishlist?.response?.items || wishlist?.response?.apps || [];
        ids = [...new Set(rawItems.map((item) => Number(item.appid || item.app_id || item)).filter(Number.isInteger))];
      } catch (err) {
        console.warn("IWishlistService failed, falling back to public store wishlist:", err.message);
      }
    }

    if (!ids.length) {
      try {
        const publicWishlist = await fetchJson(`https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=0`);
        if (publicWishlist && typeof publicWishlist === 'object') {
          ids = Object.keys(publicWishlist).map(Number).filter(Number.isInteger);
        }
      } catch (e) {
        console.warn("Public wishlist fetch error:", e.message);
      }
    }

    if (!ids.length && !STEAM_API_KEY) {
      return res.status(503).json({ error: "Không thể lấy Steam Wishlist. Vui lòng đảm bảo hồ sơ Steam để chế độ Công khai (Public)." });
    }

    const selected = ids.slice(0, 200);
    const games = await mapWithConcurrency(selected, 5, async (appId) => {
      const cacheKey = `wishlist-app:${appId}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;
      try {
        const params = new URLSearchParams({ appids: String(appId), cc: "VN", l: "vietnamese", filters: "basic,genres" });
        const details = await fetchJson(`https://store.steampowered.com/api/appdetails?${params.toString()}`);
        const game = details?.[String(appId)]?.data;
        const item = {
          appId,
          name: game?.name || `Steam App ${appId}`,
          headerImage: game?.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
          tags: game?.genres?.map((genre) => genre.description) || [],
          steamUrl: `https://store.steampowered.com/app/${appId}`
        };
        setCache(cacheKey, item, METADATA_TTL);
        return item;
      } catch {
        return { appId, name: `Steam App ${appId}`, headerImage: "", tags: [], steamUrl: `https://store.steampowered.com/app/${appId}` };
      }
    });
    res.json({ steamId, total: ids.length, limited: ids.length > selected.length, games });
  } catch (error) {
    console.error("Steam Wishlist Error:", error.message);
    res.status(502).json({ error: "Không thể đồng bộ wishlist. Hãy kiểm tra quyền riêng tư hồ sơ Steam." });
  }
});

app.get('/api/cache/status', (req, res) => {
  res.json({ type: "memory", entries: cache.size, maxEntries: CACHE_MAX_ENTRIES, ...cacheStats });
});

function alertCredentials(req) {
  const authorization = String(req.get("authorization") || "");
  return {
    clientId: String(req.get("x-alert-client-id") || req.body?.clientId || ""),
    clientSecret: authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : String(req.body?.clientSecret || "")
  };
}

function secureStringEqual(actual, expected) {
  const left = createHash("sha256").update(String(actual)).digest();
  const right = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(left, right);
}

app.get('/api/alerts/status', (req, res) => {
  res.json(getCloudAlertCapabilities());
});

app.post('/api/alerts/sync', async (req, res) => {
  try {
    const credentials = alertCredentials(req);
    const result = await syncCloudAlerts({
      ...req.body,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message || "Không thể đồng bộ Cloud Alerts." });
  }
});

app.post('/api/alerts/test', async (req, res) => {
  try {
    const { clientId, clientSecret } = alertCredentials(req);
    const result = await sendCloudAlertTest(clientId, clientSecret);
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message || "Không thể gửi thông báo thử." });
  }
});

app.delete('/api/alerts', async (req, res) => {
  try {
    const { clientId, clientSecret } = alertCredentials(req);
    res.json(await disableCloudAlerts(clientId, clientSecret));
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message || "Không thể tắt Cloud Alerts." });
  }
});

async function handleCloudAlertCron(req, res) {
  const cronSecret = String(process.env.CRON_SECRET || "");
  const authorization = String(req.get("authorization") || "");
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!cronSecret) return res.status(503).json({ error: "CRON_SECRET chưa được cấu hình." });
  if (!supplied || !secureStringEqual(supplied, cronSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const runId = await startCronRun("price-alerts").catch(() => null);
  const started = Date.now();
  try {
    const summary = await runCloudAlertChecks({
      getQuote: getCloudAlertQuote,
      onQuote: (alert, quote) => recordPriceSnapshot({ appId: alert.app_id, productType: alert.product_type, regionCode: alert.region_code, priceAmount: quote.rawAmount ?? quote.amount, originalAmount: quote.originalAmount, currency: quote.currency || alert.target_currency, discountPercent: quote.discountPercent, available: quote.available }),
      sendPush: sendUserPush,
      concurrency: 4
    });
    summary.retryQueue = await runRetryQueue({ sendPush: sendUserPush });
    summary.historySweep = await runTrackedHistorySweep({ getQuote: getCloudAlertQuote, concurrency: 4 });
    await finishCronRun(runId, summary);
    await updateServiceHealth("supabase", "operational", "Cron data persisted");
    await updateServiceHealth("steam-api", summary.failed > Math.max(2, summary.checked / 2) ? "degraded" : "operational", `${summary.checked} prices checked`, Date.now() - started);
    res.json(summary);
  } catch (error) {
    console.error("Cloud Alert Cron Error:", error.message);
    await finishCronRun(runId, null, error);
    await updateServiceHealth("steam-api", "down", error.message, Date.now() - started);
    res.status(500).json({ error: "Không thể hoàn tất lượt kiểm tra giá." });
  }
}

// System Requirements from Steam Store API
app.get('/api/sysreqs/:appId', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=pc_requirements,name&cc=us&l=english`;
    const data = await fetchJson(url);
    const appData = data?.[appId]?.data;
    if (!appData) return res.status(404).json({ error: 'Game not found' });

    // Parse HTML requirements into plain text
    const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const pcReqs = appData.pc_requirements || {};

    res.json({
      name: appData.name,
      minimum: stripHtml(pcReqs.minimum || ''),
      recommended: stripHtml(pcReqs.recommended || '')
    });
  } catch (error) { next(error); }
});

app.get('/api/purchase-advice/:appId', async (req, res, next) => {
  try {
    const appId = Number(req.params.appId);
    const history = await getInternalHistory(appId, { days: 365 }).catch(() => null);
    const advice = getPurchaseAdvice({
      currentPrice: history?.stats?.current,
      stats: history?.stats
    });
    res.json(advice);
  } catch (error) { next(error); }
});

app.get('/api/wishlist/compare', async (req, res, next) => {
  try {
    const rawInput = String(req.query.steamIds || '');
    const tokens = rawInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const steamIds = [];
    const errors = [];

    for (const raw of tokens) {
      const match17 = raw.match(/(\d{17})/);
      if (match17) {
        steamIds.push(match17[1]);
      } else {
        const vanityMatch = raw.match(/steamcommunity\.com\/id\/([^\/]+)/) || [null, raw];
        const vanityName = vanityMatch[1]?.replace(/[^a-zA-Z0-9_-]/g, "");
        if (vanityName) {
          try {
            const xmlRes = await fetch(`https://steamcommunity.com/id/${vanityName}/?xml=1`, { signal: AbortSignal.timeout(10000) });
            const xmlText = await xmlRes.text();
            const idMatch = xmlText.match(/<steamID64>(\d{17})<\/steamID64>/);
            if (idMatch) {
              steamIds.push(idMatch[1]);
            } else {
              errors.push({ steamId: raw, error: "Không tìm thấy Steam ID64 từ link Profile." });
            }
          } catch (e) {
            errors.push({ steamId: raw, error: "Lỗi kết nối khi phân tích link Profile (Timeout)." });
          }
        } else {
          errors.push({ steamId: raw, error: "Định dạng ID hoặc link không hợp lệ." });
        }
      }
    }

    if (steamIds.length < 2 && wishlists?.length === undefined) { // basic check before fetch
       if (errors.length > 0 && steamIds.length < 2) {
         return res.status(400).json({ error: "Cần ít nhất 2 tài khoản hợp lệ để bắt đầu so sánh.", details: errors });
       }
       if (steamIds.length < 2) {
         return res.status(400).json({ error: "Cần ít nhất 2 Steam ID (17 chữ số) hoặc Link Profile công khai để so sánh." });
       }
    }

    const results = await Promise.allSettled(steamIds.map((id) => getWishlist(id)));
    const wishlists = [];
    
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") wishlists.push({ steamId: steamIds[idx], items: r.value });
      else errors.push({ steamId: steamIds[idx], error: r.reason?.message || "Không thể lấy Wishlist" });
    });
    if (wishlists.length < 2) {
      return res.status(400).json({ error: "Cần ít nhất 2 tài khoản có Wishlist công khai.", details: errors });
    }
    const counts = new Map();
    const wantersMap = new Map(); // track which steamId wants each appId
    for (const w of wishlists) {
      const seen = new Set();
      for (const item of w.items) {
        if (!seen.has(item.appId)) {
          seen.add(item.appId);
          counts.set(item.appId, (counts.get(item.appId) || 0) + 1);
          if (!wantersMap.has(item.appId)) wantersMap.set(item.appId, []);
          wantersMap.get(item.appId).push(w.steamId);
        }
      }
    }

    // Collect matched appIds (appear in 2+ wishlists)
    const matchedAppIds = [];
    for (const [appId, count] of counts.entries()) {
      if (count >= 2) matchedAppIds.push({ appId, count });
    }

    // Fetch game details from Steam Store API for all matched games in parallel
    const cc = req.query.cc || 'vn';
    const gameDetails = await Promise.allSettled(
      matchedAppIds.map(({ appId }) =>
        fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${cc}&filters=basic,price_overview,categories,genres,reviews`, {
          headers: { "User-Agent": "Steam-Regional-Price-Comparator/1.0" },
          signal: AbortSignal.timeout(8000)
        }).then(r => r.json()).catch(() => null)
      )
    );

    const players = await getPlayerSummaries(wishlists.map(w => w.steamId));
    const playerMap = Object.fromEntries((players || []).map(p => [p.steamid, p]));

    const matches = matchedAppIds.map(({ appId, count }, idx) => {
      const settled = gameDetails[idx];
      const gameData = settled.status === "fulfilled" ? settled.value?.[String(appId)]?.data : null;
      const cats = (gameData?.categories || []).map(c => c.description || "");
      const genres = (gameData?.genres || []).map(g => g.description || "").slice(0, 3);
      const isCoop = cats.some(c => ["Multi-player","Co-op","Online Co-op","Local Co-op","Shared/Split Screen Co-op"].includes(c));
      const priceOverview = gameData?.price_overview;
      const reviews = gameData?.recommendations;
      const reviewTotal = reviews?.total || 0;
      // Derive positive sentiment label from metacritic or estimated via review_score_desc
      const reviewDesc = gameData?.review_score_desc || null;
      const wanters = (wantersMap.get(appId) || []).map(sid => playerMap[sid]).filter(Boolean);

      return {
        appId,
        matchCount: count,
        totalUsers: wishlists.length,
        name: gameData?.name || `App ${appId}`,
        banner: gameData?.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
        discountPercent: priceOverview?.discount_percent || 0,
        priceAmount: priceOverview?.final || null,
        priceOriginal: priceOverview?.initial || null,
        priceCurrency: priceOverview?.currency || cc.toUpperCase(),
        isFree: Boolean(gameData?.is_free),
        type: gameData?.type || "game",
        isCoop,
        genres,
        reviewTotal,
        reviewDesc,
        shortDesc: gameData?.short_description ? gameData.short_description.slice(0, 120) + '...' : null,
        releaseDate: gameData?.release_date?.date || null,
        wanters  // array of player objects who want this game
      };
    });

    // Sort: Co-op first → highest match count → highest discount
    matches.sort((a, b) => {
      if (a.isCoop !== b.isCoop) return a.isCoop ? -1 : 1;
      if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
      return b.discountPercent - a.discountPercent;
    });

    res.json({ success: true, matchedCount: matches.length, totalAnalyzed: wishlists.length, matches, errors, players });
  } catch (error) { next(error); }
});

app.get('/api/bundle/savings/:appId', async (req, res, next) => {
  try {
    const appId = Number(req.params.appId);
    if (!Number.isInteger(appId) || appId <= 0) return res.status(400).json({ error: "App ID không hợp lệ." });

    // Fetch main game data
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=vn&l=vietnamese&filters=basic,packages,dlc,price_overview,package_groups`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("Steam API Error");
    const json = await response.json();
    const appData = json?.[appId]?.data;
    if (!appData) return res.status(404).json({ error: "Không tìm thấy thông tin game trên Steam." });

    const packages = appData.package_groups?.[0]?.subs || [];
    const dlcIds = (appData.dlc || []).slice(0, 15); // Cap at 15 DLCs to avoid rate limits
    const gamePrice = appData.price_overview;

    // Fetch DLC details in parallel (batched)
    let dlcDetails = [];
    if (dlcIds.length > 0) {
      const dlcChunks = [];
      for (let i = 0; i < dlcIds.length; i += 5) dlcChunks.push(dlcIds.slice(i, i + 5));
      for (const chunk of dlcChunks) {
        const ids = chunk.join(',');
        try {
          const dlcRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${ids}&cc=vn&filters=basic,price_overview&l=vietnamese`, { signal: AbortSignal.timeout(8000) });
          const dlcJson = await dlcRes.json();
          for (const id of chunk) {
            const d = dlcJson?.[id]?.data;
            if (d) dlcDetails.push({
              appId: id,
              name: d.name,
              isFree: d.is_free,
              price: d.price_overview ? {
                final: d.price_overview.final,          // in VND cents
                initial: d.price_overview.initial,
                discountPct: d.price_overview.discount_percent,
                formatted: d.price_overview.final_formatted,
                originalFormatted: d.price_overview.initial_formatted
              } : null
            });
          }
        } catch (_) { /* skip chunk on error */ }
      }
    }

    // Calculate totals
    const paidDlcs = dlcDetails.filter(d => d.price && !d.isFree);
    const dlcTotalFinal = paidDlcs.reduce((s, d) => s + d.price.final, 0);
    const dlcTotalOriginal = paidDlcs.reduce((s, d) => s + d.price.initial, 0);
    const gameFinal = gamePrice?.final || 0;
    const gameOriginal = gamePrice?.initial || gameFinal;

    // Best bundle price (lowest package price that includes base game)
    const fullBundle = packages.find(p => p.priceInCents != null) || packages[0];
    const bundlePrice = fullBundle ? fullBundle.priceInCents : 0;
    const buyAllSeparate = gameFinal + dlcTotalFinal;
    const savings = buyAllSeparate > 0 && bundlePrice > 0 ? buyAllSeparate - bundlePrice : 0;
    const savingsPct = buyAllSeparate > 0 && savings > 0 ? Math.round((savings / buyAllSeparate) * 100) : 0;

    const fmt = (cents) => {
      if (!cents) return null;
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(cents);
    };

    res.json({
      success: true,
      appId,
      name: appData.name,
      isFree: appData.is_free,
      headerImage: appData.header_image,
      // Game base price
      gamePrice: gamePrice ? {
        final: gameFinal,
        original: gameOriginal,
        discountPct: gamePrice.discount_percent,
        formatted: gamePrice.final_formatted,
        originalFormatted: gamePrice.initial_formatted
      } : null,
      // Packages (bundle options)
      packagesCount: packages.length,
      packages: packages.map(p => ({
        packageId: p.packageid,
        optionText: p.option_text,
        priceInCents: p.price_in_cents_with_discount,
        discountPercent: p.percent_savings,
        formattedPrice: fmt(p.price_in_cents_with_discount)
      })),
      // DLC breakdown
      dlcCount: dlcIds.length,
      dlcFetched: dlcDetails.length,
      dlcs: dlcDetails,
      // Smart savings summary
      summary: {
        buyAllSeparate: buyAllSeparate,
        buyAllSeparateFormatted: fmt(buyAllSeparate),
        bestBundlePrice: bundlePrice,
        bestBundlePriceFormatted: fmt(bundlePrice),
        savings: savings,
        savingsFormatted: fmt(savings),
        savingsPct,
        dlcTotalFinal,
        dlcTotalFormatted: fmt(dlcTotalFinal),
        dlcTotalOriginal,
        paidDlcCount: paidDlcs.length,
        freeDlcCount: dlcDetails.length - paidDlcs.length
      }
    });
  } catch (error) { next(error); }
});

async function handleWeeklyDigestCron(req, res) {
  const cronSecret = String(process.env.CRON_SECRET || "");
  const authorization = String(req.get("authorization") || "");
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!cronSecret) return res.status(503).json({ error: "CRON_SECRET chưa được cấu hình." });
  if (!supplied || !secureStringEqual(supplied, cronSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const runId = await startCronRun("weekly-digest").catch(() => null);
  try {
    const summary = await runWeeklyEmailDigest({ getQuote: getCloudAlertQuote });
    await finishCronRun(runId, summary);
    res.json(summary);
  } catch (error) {
    await finishCronRun(runId, null, error);
    res.status(500).json({ error: "Không thể gửi weekly email digest." });
  }
}

app.get('/api/cron/weekly-digest', handleWeeklyDigestCron);
app.post('/api/cron/weekly-digest', handleWeeklyDigestCron);

function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// DYNAMIC SOCIAL SHARE CARD (OPENGRAPH 1200x630 SVG)
app.get("/api/og/game/:appId", async (req, res, next) => {
  const appId = String(req.params.appId || "");
  if (!/^\d+$/.test(appId)) return res.status(400).send("App ID không hợp lệ.");

  try {
    const currency = String(req.query.currency || "VND").toUpperCase();
    const quote = await getRegionalPrice(appId, REGIONS.find((r) => r.code === "vn") || REGIONS[0], "vietnamese");
    const name = quote?.gameName || `Steam App ${appId}`;
    const priceVn = quote?.isFree ? "Miễn phí" : (quote?.finalFormatted || "N/A");
    const discount = quote?.discountPercent > 0 ? `-${quote.discountPercent}%` : "";
    const coverImg = quote?.image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

    const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1320" />
      <stop offset="50%" stop-color="#0e1b2e" />
      <stop offset="100%" stop-color="#070c14" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#7000ff" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1050" cy="150" r="300" fill="#00f0ff" opacity="0.06" filter="url(#glow)"/>
  <circle cx="150" cy="500" r="250" fill="#7000ff" opacity="0.08" filter="url(#glow)"/>

  <!-- HEADER BRAND -->
  <text x="60" y="70" font-family="'Inter', sans-serif" font-size="22" font-weight="800" fill="#00f0ff" letter-spacing="1">
    🎮 STEAM REGION PRICE
  </text>
  <text x="320" y="70" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#748196">
    LIVE MARKET PRICE INTELLIGENCE
  </text>
  <line x1="60" y1="95" x2="1140" y2="95" stroke="#1e2d42" stroke-width="2"/>

  <!-- GAME IMAGE & TITLE -->
  <clipPath id="imgClip">
    <rect x="60" y="130" width="460" height="230" rx="16"/>
  </clipPath>
  <image href="${coverImg}" x="60" y="130" width="460" height="230" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgClip)"/>

  <text x="550" y="170" font-family="'Inter', sans-serif" font-size="34" font-weight="800" fill="#ffffff" width="580">
    ${escapeHtmlAttribute(name.substring(0, 32))}${name.length > 32 ? '...' : ''}
  </text>

  <!-- PRICE BADGE -->
  <rect x="550" y="200" width="220" height="64" rx="12" fill="#162338" stroke="#00f0ff" stroke-opacity="0.3"/>
  <text x="570" y="225" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#748196">GIÁ TẠI VIỆT NAM</text>
  <text x="570" y="252" font-family="'Inter', sans-serif" font-size="22" font-weight="800" fill="#00f0ff">${priceVn}</text>

  ${discount ? `
  <rect x="785" y="200" width="90" height="64" rx="12" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-opacity="0.5"/>
  <text x="830" y="240" font-family="'Inter', sans-serif" font-size="20" font-weight="800" fill="#22c55e" text-anchor="middle">${discount}</text>
  ` : ''}

  <!-- COMPARISON STATS -->
  <rect x="60" y="400" width="1080" height="170" rx="20" fill="#0d1726" stroke="#1e2d42" stroke-width="2"/>
  
  <text x="90" y="445" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#aab5c5">🇻🇳 MỨC GIÁ CHÊNH LỆCH KHU VỰC</text>
  <text x="90" y="490" font-family="'Inter', sans-serif" font-size="26" font-weight="800" fill="#ffffff">
    Rẻ hơn tới <tspan fill="#22c55e">35% – 50%</tspan> so với thị trường Quốc Tế
  </text>
  <text x="90" y="535" font-family="'Inter', sans-serif" font-size="14" fill="#748196">
    Cập nhật trực tiếp từ Steam Store • Tra cứu ngay tại steam-region-price.onrender.com/game/${appId}
  </text>
</svg>`;

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.send(svg.trim());
  } catch (err) {
    next(err);
  }
});

// EXACT-FIT BUDGET MATCHER ENDPOINT
app.post("/api/budget/match", async (req, res, next) => {
  try {
    const { budget = 150000, currency = "VND", count = 2, genre = "all", mode = "max_value" } = req.body || {};
    const targetBudget = Number(budget);
    if (!Number.isFinite(targetBudget) || targetBudget <= 0) {
      return res.status(400).json({ error: "Ngân sách không hợp lệ." });
    }

    const dealsRes = await fetchTopDeals(false).catch(() => []);
    const candidates = (dealsRes || []).filter(g => g.price && g.price.final > 0 && g.price.final <= targetBudget);

    if (!candidates.length) {
      return res.json({ budget: targetBudget, currency, combos: [], message: "Không tìm thấy game nào trong ngân sách này." });
    }

    // Subset sum combinations (1, 2, or 3 games)
    const combos = [];
    const maxItems = Math.min(3, Math.max(1, Number(count)));

    if (maxItems >= 1) {
      for (const g of candidates) {
        combos.push({ games: [g], totalCost: g.price.final });
      }
    }
    if (maxItems >= 2 && candidates.length >= 2) {
      for (let i = 0; i < Math.min(candidates.length, 30); i++) {
        for (let j = i + 1; j < Math.min(candidates.length, 30); j++) {
          const total = candidates[i].price.final + candidates[j].price.final;
          if (total <= targetBudget) {
            combos.push({ games: [candidates[i], candidates[j]], totalCost: total });
          }
        }
      }
    }

    // Score combos
    const scored = combos.map(c => {
      const remaining = targetBudget - c.totalCost;
      const fitPct = Math.round(((targetBudget - remaining) / targetBudget) * 100);
      const avgReview = Math.round(c.games.reduce((acc, g) => acc + (g.reviewScore || 80), 0) / c.games.length);
      const avgDiscount = Math.round(c.games.reduce((acc, g) => acc + (g.discountPercent || 0), 0) / c.games.length);
      
      let score = (fitPct * 0.35) + (avgReview * 0.25) + (avgDiscount * 0.25) + (c.games.length * 5);
      if (mode === "quality") score += avgReview * 0.2;
      if (mode === "max_value") score += fitPct * 0.2;

      return {
        id: c.games.map(g => g.appId).join("-"),
        games: c.games.map(g => ({
          appId: g.appId,
          name: g.name,
          image: g.headerImage || g.image,
          price: g.price,
          discountPercent: g.discountPercent
        })),
        totalCost: c.totalCost,
        remainingBudget: remaining,
        fitPercentage: fitPct,
        score: Math.round(score)
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topCombos = scored.slice(0, 6);

    res.json({
      budget: targetBudget,
      currency,
      comboCount: topCombos.length,
      combos: topCombos
    });
  } catch (err) { next(err); }
});

// STEAM FRIENDS WISHLIST MATCHER ENDPOINT
app.post("/api/groups/match", async (req, res, next) => {
  try {
    const { profiles = [] } = req.body || {};
    if (!Array.isArray(profiles) || profiles.length < 2) {
      return res.status(400).json({ error: "Vui lòng nhập ít nhất 2 hồ sơ Steam." });
    }

    const fetchedWishlists = await Promise.all(
      profiles.slice(0, 5).map(async (prof) => {
        const steamId = await resolveSteamId(prof);
        if (!steamId) return { profile: prof, success: false, games: [] };
        try {
          const publicWishlist = await fetchJson(`https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=0`);
          const ids = Object.keys(publicWishlist || {}).map(Number).filter(Number.isInteger);
          return { profile: prof, steamId, success: true, games: ids, rawData: publicWishlist };
        } catch {
          return { profile: prof, steamId, success: false, games: [] };
        }
      })
    );

    const validResults = fetchedWishlists.filter(w => w.success && w.games.length > 0);
    if (!validResults.length) {
      return res.status(400).json({ error: "Không thể lấy Wishlist của các tài khoản (hồ sơ phải ở chế độ Công khai)." });
    }

    // Count app ID frequencies
    const counts = {};
    for (const user of validResults) {
      for (const appId of user.games) {
        if (!counts[appId]) counts[appId] = { appId, count: 0, users: [], details: user.rawData?.[appId] || {} };
        counts[appId].count += 1;
        counts[appId].users.push(user.steamId);
      }
    }

    const matches = Object.values(counts)
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(item => ({
        appId: item.appId,
        name: item.details.name || `Steam App ${item.appId}`,
        image: item.details.capsule || `https://cdn.akamai.steamstatic.com/steam/apps/${item.appId}/header.jpg`,
        matchCount: item.count,
        totalMembers: validResults.length,
        matchPercentage: Math.round((item.count / validResults.length) * 100),
        matchType: item.count === validResults.length ? "ALL_MATCH" : "MAJORITY_MATCH"
      }));

    res.json({
      memberCount: validResults.length,
      matches
    });
  } catch (err) { next(err); }
});

app.get("/game/:appId", async (req, res, next) => {
  const appId = String(req.params.appId || "");
  if (!/^\d+$/.test(appId)) return next();

  try {
    const [html, quote] = await Promise.all([
      readFile(path.join(__dirname, "public", "index.html"), "utf8"),
      getRegionalPrice(appId, REGIONS.find((region) => region.code === "vn"), "vietnamese")
    ]);
    const productName = quote?.gameName;
    if (!productName) return res.status(404).send(html);

    const configuredBase = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const requestBase = `${req.protocol}://${req.get("host")}`;
    const canonicalUrl = `${configuredBase || requestBase}/game/${appId}`;
    const ogImageUrl = `${configuredBase || requestBase}/api/og/game/${appId}?currency=VND`;
    const priceText = quote.isFree ? "Miễn phí" : (quote.finalFormatted || "xem giá theo khu vực");
    const title = `${productName} – So sánh giá Steam theo khu vực`;
    const description = `${productName} hiện có giá ${priceText} tại Việt Nam. So sánh giá Steam giữa nhiều khu vực và tìm mức giá tốt nhất.`;
    const image = quote.image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    const metaTags = `
    <link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Steam Region Price">
    <meta property="og:title" content="${escapeHtmlAttribute(title)}">
    <meta property="og:description" content="${escapeHtmlAttribute(description)}">
    <meta property="og:url" content="${escapeHtmlAttribute(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtmlAttribute(ogImageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtmlAttribute(title)}">
    <meta name="twitter:description" content="${escapeHtmlAttribute(description)}">
    <meta name="twitter:image" content="${escapeHtmlAttribute(ogImageUrl)}">`;
    const rendered = html
      .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtmlAttribute(title)}</title>`)
      .replace("</head>", `${metaTags}\n  </head>`);
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    res.type("html").send(rendered);
  } catch (error) {
    next(error);
  }
});

// LEADERBOARDS ENDPOINT
app.get("/api/leaderboards", async (req, res, next) => {
  try {
    const category = String(req.query.category || "largest_gap");
    const deals = await fetchTopDeals(false).catch(() => []);
    let items = (deals || []).filter(g => g.price && g.price.final > 0);

    if (category === "largest_gap") {
      items.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    } else if (category === "max_savings") {
      items.sort((a, b) => ((b.price.initial || 0) - b.price.final) - ((a.price.initial || 0) - a.price.final));
    } else if (category === "under_100k") {
      items = items.filter(g => g.price.final <= 100000);
      items.sort((a, b) => b.price.final - a.price.final);
    } else if (category === "overwhelmingly_positive") {
      items = items.filter(g => (g.reviewScore || 0) >= 90);
      items.sort((a, b) => (b.reviewScore || 0) - (a.reviewScore || 0));
    } else if (category === "historical_lows") {
      items = items.filter(g => g.isHistoricalLow);
    }

    res.json({ category, count: items.length, items: items.slice(0, 20) });
  } catch (err) { next(err); }
});

// PRICE ANOMALY DETECTOR ENDPOINT
app.get("/api/anomalies", async (req, res, next) => {
  try {
    const deals = await fetchTopDeals(false).catch(() => []);
    const anomalies = (deals || []).filter(g => (g.discountPercent >= 90) || (g.price && g.price.final < 10000 && g.price.initial > 500000))
      .map(g => ({
        appId: g.appId,
        name: g.name,
        image: g.headerImage || g.image,
        price: g.price,
        discountPercent: g.discountPercent,
        isAnomaly: true,
        anomalyReason: g.discountPercent >= 95 ? "Giảm giá bất thường (>95%)" : "Chênh lệch giá nghi vấn lỗi hệ thống"
      }));
    res.json({ count: anomalies.length, items: anomalies });
  } catch (err) { next(err); }
});

// EMBEDDABLE PRICE WIDGET ENDPOINT
app.get("/embed/:appId", async (req, res, next) => {
  const appId = String(req.params.appId || "");
  if (!/^\d+$/.test(appId)) return res.status(400).send("App ID không hợp lệ.");

  try {
    const quote = await getRegionalPrice(appId, REGIONS.find((r) => r.code === "vn") || REGIONS[0], "vietnamese");
    const name = quote?.gameName || `Steam App ${appId}`;
    const priceVn = quote?.isFree ? "Miễn phí" : (quote?.finalFormatted || "N/A");
    const discount = quote?.discountPercent > 0 ? `-${quote.discountPercent}%` : "";
    const image = quote?.image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlAttribute(name)} - Embed Card</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    body { background: #0b1320; color: #f1f5f9; padding: 12px; }
    .card { background: #132238; border: 1px solid rgba(0,240,255,0.2); border-radius: 12px; padding: 12px; display: flex; gap: 12px; align-items: center; text-decoration: none; color: inherit; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: border-color 0.2s; }
    .card:hover { border-color: #00f0ff; }
    .img { width: 110px; height: 52px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; }
    .title { font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .price { font-size: 14px; font-weight: 700; color: #00f0ff; }
    .badge { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.4); font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .brand { font-size: 10px; color: #748196; margin-top: 4px; }
  </style>
</head>
<body>
  <a class="card" href="/game/${appId}" target="_blank" rel="noopener">
    <img class="img" src="${escapeHtmlAttribute(image)}" alt="${escapeHtmlAttribute(name)}">
    <div class="info">
      <div class="title">${escapeHtmlAttribute(name)}</div>
      <div class="meta">
        <span class="price">${escapeHtmlAttribute(priceVn)}</span>
        ${discount ? `<span class="badge">${discount}</span>` : ''}
      </div>
      <div class="brand">🎮 Steam Region Price</div>
    </div>
  </a>
</body>
</html>`;
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.type("html").send(html.trim());
  } catch (err) { next(err); }
});

// COMMUNITY PULSE ENDPOINTS
const communityVotesMemory = new Map();

app.get("/api/community/reviews/:appId", (req, res) => {
  const appId = String(req.params.appId);
  const votes = communityVotesMemory.get(appId) || { worth_buying: 12, wait_sale: 3, game_pass: 1, price_error: 0 };
  res.json({ appId, votes });
});

app.post("/api/community/reviews/:appId/vote", (req, res) => {
  const appId = String(req.params.appId);
  const { tag } = req.body || {};
  if (!tag) return res.status(400).json({ error: "Thẻ vote không hợp lệ." });

  const current = communityVotesMemory.get(appId) || { worth_buying: 12, wait_sale: 3, game_pass: 1, price_error: 0 };
  current[tag] = (current[tag] || 0) + 1;
  communityVotesMemory.set(appId, current);

  res.json({ appId, votes: current, success: true });
});

app.use("/api", createReliabilityRouter({ cacheStats, cacheSize: () => cache.size }));

app.use((error, _req, res, _next) => {
  console.error("API Error:", error.message);
  res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Đã xảy ra lỗi máy chủ." });
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
const server = isDirectRun
  ? app.listen(PORT, () => {
      console.log(`Steam Price Comparator: http://localhost:${PORT}`);
    })
  : null;

export { app, server };
export default app;
