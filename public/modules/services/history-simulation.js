function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function seedFor(appId, region) {
  return `${appId}:${region}`.split('').reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
}

export function buildSimulatedHistorySeries({
  appId,
  prices = [],
  months = 12,
  locale = 'vi-VN'
} = {}) {
  const pointCount = clamp(Number(months) || 12, 3, 12);
  const available = prices
    .filter((price) => price.available && Number(price.convertedValue) > 0)
    .sort((left, right) => left.convertedValue - right.convertedValue);

  if (!available.length) return { labels: [], series: [] };

  const preferred = available.find((price) => price.code === 'vn');
  const candidates = [available[0], preferred, available.at(-1)]
    .filter(Boolean)
    .filter((price, index, list) => (
      list.findIndex((item) => item.code === price.code) === index
    ));

  const labels = Array.from({ length: pointCount }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (pointCount - 1 - index));
    return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  });

  const series = candidates.map((price) => {
    const currentPrice = Number(price.convertedValue);
    const seed = seedFor(appId, price.code);
    const values = labels.map((_, index) => {
      if (index === labels.length - 1) return currentPrice;

      const ageRatio = (labels.length - 1 - index) / (labels.length - 1);
      const baseline = 1 + ageRatio * (0.08 + (seed % 7) / 100);
      const promoCycle = (index + seed) % 5;
      const promoFactor = promoCycle === 0 ? 0.78 : (promoCycle === 3 ? 0.9 : 1);
      return Math.max(0, Math.round(currentPrice * baseline * promoFactor));
    });

    return {
      code: price.code,
      label: price.name || price.code.toUpperCase(),
      values
    };
  });

  return { labels, series };
}
