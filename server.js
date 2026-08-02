import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, timingSafeEqual } from "node:crypto";
import "dotenv/config";
import {
  disableCloudAlerts,
  getCloudAlertCapabilities,
  runCloudAlertChecks,
  runRetryQueue,
  sendCloudAlertTest,
  syncCloudAlerts
} from "./server/cloud-alerts.js";
import { attachAccountSession, createAccountRouter } from "./server/account.js";
import { createPushRouter, sendUserPush } from "./server/push.js";
import { getInternalHistory, recordPriceSnapshot, runTrackedHistorySweep } from "./server/history-store.js";
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
const PRICE_TTL = 20 * 60 * 1000;
const FX_TTL = 6 * 60 * 60 * 1000;
const DEALS_TTL = 5 * 60 * 1000;
const METADATA_TTL = 6 * 60 * 60 * 1000;
const LIVE_STATS_TTL = 5 * 60 * 1000;

const STEAM_SALE_EVENTS = [
  { id: "cyberpunk-2026", name: "Cyberpunk Fest", kind: "festival", start: "2026-08-03T17:00:00Z", end: "2026-08-10T17:00:00Z" },
  { id: "pins-pegs-2026", name: "Pins & Pegs Fest", kind: "festival", start: "2026-08-17T17:00:00Z", end: "2026-08-20T17:00:00Z" },
  { id: "pve-survival-2026", name: "PvE Survival Crafting Fest", kind: "festival", start: "2026-08-31T17:00:00Z", end: "2026-09-07T17:00:00Z" },
  { id: "programming-2026", name: "Programming Fest", kind: "festival", start: "2026-09-10T17:00:00Z", end: "2026-09-14T17:00:00Z" },
  { id: "party-rpg-2026", name: "Party-Based RPG Fest", kind: "festival", start: "2026-09-14T17:00:00Z", end: "2026-09-21T17:00:00Z" },
  { id: "autumn-2026", name: "Steam Autumn Sale", kind: "seasonal", start: "2026-10-01T17:00:00Z", end: "2026-10-08T17:00:00Z" },
  { id: "cooking-2026", name: "Cooking Fest", kind: "festival", start: "2026-10-12T17:00:00Z", end: "2026-10-19T17:00:00Z" },
  { id: "next-oct-2026", name: "Steam Next Fest", kind: "next_fest", start: "2026-10-19T17:00:00Z", end: "2026-10-26T17:00:00Z" },
  { id: "scream-2026", name: "Steam Scream V", kind: "festival", start: "2026-10-26T17:00:00Z", end: "2026-11-02T18:00:00Z" },
  { id: "auto-battler-2026", name: "Auto-Battler RPG Fest", kind: "festival", start: "2026-11-16T18:00:00Z", end: "2026-11-23T18:00:00Z" },
  { id: "winter-2026", name: "Steam Winter Sale", kind: "seasonal", start: "2026-12-17T18:00:00Z", end: "2027-01-04T18:00:00Z" },
  { id: "spring-2027", name: "Steam Spring Sale", kind: "seasonal", start: "2027-03-18T17:00:00Z", end: "2027-03-25T17:00:00Z" },
  { id: "summer-2027", name: "Steam Summer Sale", kind: "seasonal", start: "2027-06-24T17:00:00Z", end: "2027-07-08T17:00:00Z" }
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
      totalReviews: reviews?.total_reviews || 0
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

  const normalized = prices.map((item) => {
    let convertedValue = null;
    if (item.available && !item.isFree && rates && item.currency) {
      const rate = rates[item.currency];
      if (Number.isFinite(rate) && rate > 0) {
        convertedValue = item.final / rate;
      }
    } else if (item.isFree) {
      convertedValue = 0;
    }
    return { ...item, convertedValue };
  });

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
  res.json({
    appId: Number(appId),
    productType,
    gameName: firstValue("gameName"),
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
  const cacheKey = `deals:${cc}`;
  let cached = getCache(cacheKey);
  if (!cached) cached = await distributedCacheGet(cacheKey);
  if (cached) {
    setCache(cacheKey, cached, DEALS_TTL);
    return cached;
  }
  const data = await fetchJson(`https://store.steampowered.com/api/featuredcategories?cc=${cc}`);
  if (!data) throw new Error("Invalid data from Steam");
  setCache(cacheKey, data, DEALS_TTL);
  distributedCacheSet(cacheKey, data, Math.floor(DEALS_TTL / 1000));
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
  if (!STEAM_API_KEY) {
    return res.status(503).json({ error: "STEAM_API_KEY chưa được cấu hình trên máy chủ." });
  }
  try {
    const steamId = await resolveSteamId(req.query.profile);
    if (!steamId) return res.status(400).json({ error: "Steam ID hoặc Profile Link không hợp lệ." });
    const params = new URLSearchParams({ key: STEAM_API_KEY, steamid: steamId });
    const wishlist = await fetchJson(`https://api.steampowered.com/IWishlistService/GetWishlist/v1/?${params.toString()}`);
    const rawItems = wishlist?.response?.items || wishlist?.response?.apps || [];
    const ids = [...new Set(rawItems.map((item) => Number(item.appid || item.app_id || item)).filter(Number.isInteger))];
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
    res.status(502).json({ error: "Không thể đồng bộ wishlist. Hãy kiểm tra quyền riêng tư và Steam API key." });
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

app.get('/api/cron/check-alerts', handleCloudAlertCron);
app.post('/api/cron/check-alerts', handleCloudAlertCron);

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
