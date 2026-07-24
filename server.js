import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const PRICE_TTL = 20 * 60 * 1000;
const FX_TTL = 6 * 60 * 60 * 1000;

function getCache(key) {
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key, value, ttl) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
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

async function getRegionalPrice(appId, region) {
  const cacheKey = `price:${appId}:${region.code}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    appids: String(appId),
    cc: region.code,
    l: "vietnamese",
    filters: "basic,price_overview"
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
        image: game.header_image
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

app.get("/api/regions", (req, res) => {
  res.json(REGIONS);
});

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing search term" });
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
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
    Promise.all(selectedRegions.map((region) => getRegionalPrice(appId, region))),
    getExchangeRates(targetCurrency)
  ]);

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

  const sample = enriched.find((item) => item.gameName);
  res.json({
    appId: Number(appId),
    gameName: sample?.gameName || null,
    image: sample?.image || null,
    publisher: sample?.publisher || null,
    releaseDate: sample?.releaseDate || null,
    genres: sample?.genres || null,
    shortDescription: sample?.shortDescription || null,
    fxAvailable: Boolean(rates),
    checkedAt: new Date().toISOString(),
    prices: enriched
  });
});

const ITAD_API_KEY = process.env.ITAD_API_KEY || "";

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

app.get('/api/deals', async (req, res) => {
  try {
    const cc = req.query.cc || 'VN';
    const dealsUrl = `https://store.steampowered.com/api/featuredcategories?cc=${cc}`;
    const data = await fetchJson(dealsUrl);
    if (data) {
      res.json(data);
    } else {
      res.status(500).json({ error: "Invalid data from Steam" });
    }
  } catch (err) {
    console.error("Steam Deals API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch top deals" });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Steam Price Comparator: http://localhost:${PORT}`);
});
