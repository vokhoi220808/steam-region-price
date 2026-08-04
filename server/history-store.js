import { cloudDatabaseConfigured, supabaseRequest } from "./cloud-alerts.js";

export async function recordPriceSnapshot(snapshot) {
  if (!cloudDatabaseConfigured() || !snapshot?.available || !Number.isFinite(Number(snapshot.priceAmount))) return false;
  const appId = Number(snapshot.appId);
  const productType = snapshot.productType === "sub" ? "sub" : "app";
  const regionCode = String(snapshot.regionCode || "vn").toLowerCase();
  const recent = await supabaseRequest(`price_snapshots?app_id=eq.${appId}&product_type=eq.${productType}&region_code=eq.${regionCode}&select=price_amount,discount_percent,captured_at&order=captured_at.desc&limit=1`);
  const last = recent?.[0];
  const amount = Number(snapshot.priceAmount);
  const fresh = last && Date.now() - Date.parse(last.captured_at) < 20 * 60 * 60 * 1000;
  if (fresh && Number(last.price_amount) === amount && Number(last.discount_percent) === Number(snapshot.discountPercent || 0)) return false;
  await supabaseRequest("price_snapshots", {
    method: "POST",
    body: {
      app_id: appId,
      product_type: productType,
      region_code: regionCode,
      price_amount: amount,
      original_amount: Number.isFinite(Number(snapshot.originalAmount)) ? Number(snapshot.originalAmount) : amount,
      currency: String(snapshot.currency || "VND").toUpperCase(),
      discount_percent: Number(snapshot.discountPercent || 0),
      available: true
    },
    prefer: "return=minimal"
  });
  return true;
}

function salePrediction(points) {
  if (points.length < 3) return { probability: null, confidence: "insufficient", label: "Chưa đủ dữ liệu", basis: "Cần ít nhất 3 snapshot." };
  const ordered = [...points].sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at));
  const saleStarts = [];
  for (let i = 1; i < ordered.length; i += 1) {
    if (Number(ordered[i].discount_percent) > 0 && Number(ordered[i - 1].discount_percent) === 0) saleStarts.push(Date.parse(ordered[i].captured_at));
  }
  if (!saleStarts.length) return { probability: 20, confidence: "low", label: "Khả năng giảm thấp", basis: "Chưa ghi nhận chu kỳ sale lặp lại." };
  const intervals = saleStarts.slice(1).map((time, index) => (time - saleStarts[index]) / 86400000);
  const cycleDays = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 60;
  const daysSinceSale = (Date.now() - saleStarts.at(-1)) / 86400000;
  const closeness = Math.min(1, daysSinceSale / Math.max(cycleDays, 14));
  const probability = Math.round(25 + closeness * 55);
  return { probability, confidence: saleStarts.length >= 3 ? "medium" : "low", label: probability >= 65 ? "Có thể sắp giảm" : "Chưa gần chu kỳ giảm", basis: `Ước tính từ ${saleStarts.length} đợt giảm, chu kỳ khoảng ${Math.round(cycleDays)} ngày. Đây là heuristic, không phải cam kết.` };
}

export async function getInternalHistory(appId, { regionCode = "vn", productType = "app", days = 365 } = {}) {
  if (!cloudDatabaseConfigured()) {
    const error = new Error("Lịch sử nội bộ chưa được cấu hình Supabase.");
    error.statusCode = 503;
    throw error;
  }
  const normalizedRegion = String(regionCode).toLowerCase();
  if (!/^[a-z]{2}$/.test(normalizedRegion)) throw Object.assign(new Error("Mã khu vực không hợp lệ."), { statusCode: 400 });
  const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 365, 1), 730) * 86400000).toISOString();
  const points = await supabaseRequest(`price_snapshots?app_id=eq.${Number(appId)}&product_type=eq.${productType === "sub" ? "sub" : "app"}&region_code=eq.${normalizedRegion}&captured_at=gte.${encodeURIComponent(since)}&select=price_amount,original_amount,currency,discount_percent,captured_at&order=captured_at.asc&limit=2000`);
  const values = (points || []).map((point) => Number(point.price_amount)).filter(Number.isFinite);
  const recent90Since = Date.now() - 90 * 86400000;
  const recent90 = (points || []).filter((point) => Date.parse(point.captured_at) >= recent90Since).map((point) => Number(point.price_amount)).filter(Number.isFinite);
  const current = values.at(-1) ?? null;
  const average90 = recent90.length ? recent90.reduce((a, b) => a + b, 0) / recent90.length : null;
  return {
    appId: Number(appId), regionCode: normalizedRegion, productType,
    points: points || [],
    stats: {
      current,
      historicalLow: values.length ? Math.min(...values) : null,
      historicalHigh: values.length ? Math.max(...values) : null,
      average90,
      versusAverage90Percent: current !== null && average90 ? ((current - average90) / average90) * 100 : null,
      samples: values.length
    },
    prediction: salePrediction(points || [])
  };
}

export async function runTrackedHistorySweep({ getQuote, concurrency = 4 } = {}) {
  if (!cloudDatabaseConfigured() || typeof getQuote !== "function") return { games: 0, checked: 0, stored: 0, failed: 0 };
  const limit = Math.min(Math.max(Number(process.env.HISTORY_BATCH_SIZE) || 20, 1), 100);
  const rows = await supabaseRequest(`cloud_tracker?select=*&order=last_history_scan_at.asc.nullsfirst&limit=${limit}`);
  const tasks = [];
  for (const row of rows || []) {
    const regions = [...new Set([row.region_code, ...(Array.isArray(row.game_data?.comparisonRegions) ? row.game_data.comparisonRegions : [])])]
      .map((code) => String(code || "").toLowerCase()).filter((code) => /^[a-z]{2}$/.test(code)).slice(0, 6);
    for (const regionCode of regions) tasks.push({ row, regionCode });
  }
  let cursor = 0;
  const summary = { games: (rows || []).length, checked: 0, stored: 0, failed: 0 };
  async function worker() {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      try {
        const quote = await getQuote({ app_id: task.row.app_id, product_type: task.row.product_type, region_code: task.regionCode, target_currency: task.row.target_currency || "VND" });
        summary.checked += 1;
        if (quote?.available && await recordPriceSnapshot({ appId: task.row.app_id, productType: task.row.product_type, regionCode: task.regionCode, priceAmount: quote.rawAmount ?? quote.amount, originalAmount: quote.originalAmount, currency: quote.currency || task.row.target_currency || "VND", discountPercent: quote.discountPercent, available: true })) summary.stored += 1;
      } catch { summary.failed += 1; }
    }
  }
  const finishedAt = new Date().toISOString();
  await Promise.all((rows || []).map((row) => supabaseRequest(`cloud_tracker?id=eq.${row.id}`, { method: "PATCH", body: { last_history_scan_at: finishedAt }, prefer: "return=minimal" }).catch(() => {})));
  return { ...summary, finishedAt };
}



export function getPurchaseAdvice({ currentPrice, originalPrice, discountPercent, stats, checkedAt = null } = {}) {
  const discount = Number(discountPercent || 0);
  const isHistoricalLow = stats?.historicalLow !== null && currentPrice !== null && Number(currentPrice) <= Number(stats?.historicalLow) * 1.02;

  let confidenceScore = 95;
  if (checkedAt) {
    const ageMinutes = (Date.now() - new Date(checkedAt).getTime()) / 60000;
    if (ageMinutes > 720) confidenceScore -= 20;
    else if (ageMinutes > 120) confidenceScore -= 10;
  }
  if (!stats || !stats.recordedCount || stats.recordedCount < 3) {
    confidenceScore -= 15;
  }
  confidenceScore = Math.max(50, Math.min(99, Math.round(confidenceScore)));
  const confidenceLabel = confidenceScore >= 85 ? "Cao" : confidenceScore >= 70 ? "Trung bình" : "Thấp";

  if (discount >= 70 || isHistoricalLow) {
    return {
      action: "BUY_NOW",
      badge: "🔥 NÊN MUA NGAY",
      color: "#10b981",
      reason: isHistoricalLow ? "Giá hiện tại đang ở mốc thấp nhất lịch sử!" : "Game đang có mức giảm giá cực sâu (từ 70% trở lên).",
      confidenceScore,
      confidenceLabel
    };
  }
  if (discount >= 40) {
    return {
      action: "GOOD_DEAL",
      badge: "✅ MỨC GIÁ TỐT",
      color: "#3b82f6",
      reason: "Mức giảm khá tốt. Nếu bạn muốn trải nghiệm ngay thì đây là mức giá hợp lý.",
      confidenceScore,
      confidenceLabel
    };
  }
  return {
    action: "WAIT_FOR_SALE",
    badge: "⏳ NÊN ĐỢI SALE LỚN",
    color: "#f59e0b",
    reason: "Mức giảm hiện tại chưa sâu. Khuyến nghị đợi đợt Steam Seasonal Sale tiếp theo.",
    confidenceScore,
    confidenceLabel
  };
}
