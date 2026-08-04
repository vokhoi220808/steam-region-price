const DEFAULT_REGIONS = ['vn', 'cn', 'hk', 'us'];

export class SteamService {
  constructor() {
    this.searchController = null;
    this.priceControllers = new Map();
  }

  extractAppId(value) {
    const input = String(value || '').trim();
    const match = input.match(/(?:store\.steampowered\.com\/app\/)?(\d{2,10})/i);
    return match ? Number(match[1]) : null;
  }

  async search(query) {
    const normalized = String(query || '').trim();
    if (!normalized) return [];

    this.searchController?.abort();
    this.searchController = new AbortController();

    const directAppId = this.extractAppId(normalized);
    if (directAppId) {
      try {
        const detail = await this.getPrices(directAppId, {
          regions: ['vn'],
          currency: 'VND',
          signal: this.searchController.signal
        });
        if (!detail.gameName) return [];
        return [{
          appId: directAppId,
          name: detail.gameName,
          headerImage: detail.image || '',
          currentPrice: detail.prices?.find((price) => price.code === 'vn')?.convertedValue ?? null,
          discount: detail.prices?.find((price) => price.code === 'vn')?.discountPercent || 0
        }];
      } catch (error) {
        if (error.name === 'AbortError') return [];
      }
    }

    const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
      signal: this.searchController.signal
    });
    if (!response.ok) throw new Error('Chưa thể tìm game trên Steam.');
    const data = await response.json();
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    return items.slice(0, 8).map((item) => ({
      appId: Number(item.id || item.appid || item.appId),
      name: item.name || 'Game chưa xác định',
      headerImage: item.tiny_image || item.thumbnail || item.headerImage || '',
      currentPrice: item.price?.final ? item.price.final / 100 : null,
      currency: item.price?.currency || 'USD',
      discount: Number(item.price?.discount_percent || 0)
    })).filter((item) => Number.isInteger(item.appId));
  }

  async getPrices(appId, { regions = DEFAULT_REGIONS, currency = 'VND', signal } = {}) {
    const key = String(appId);
    if (!signal) {
      this.priceControllers.get(key)?.abort();
      const controller = new AbortController();
      this.priceControllers.set(key, controller);
      signal = controller.signal;
    }

    const response = await fetch(
      `/api/compare/${appId}?currency=${encodeURIComponent(currency)}&regions=${regions.join(',')}`,
      { signal }
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Chưa thể cập nhật giá game này.');
    }
    const payload = await response.json();
    if (!payload?.gameName) throw new Error('App ID không tồn tại trên Steam Store.');
    return payload;
  }

  normalizePriceData(game, response) {
    const targetCurrency = game.targetPrice?.currency || game.latestPrice?.currency || 'VND';
    const checkedAt = response.checkedAt || new Date().toISOString();
    const regionalPrices = (response.prices || []).map((price) => ({
      region: price.code,
      regionName: price.name || price.code.toUpperCase(),
      flag: price.flag || '',
      currency: price.currency || '',
      amount: Number(price.final),
      originalAmount: Number(price.initial),
      convertedCurrency: targetCurrency,
      convertedAmount: Number(price.convertedValue),
      convertedOriginalAmount: Number(price.final) > 0
        ? Number(price.convertedValue) * (Number(price.initial) / Number(price.final))
        : Number(price.convertedValue),
      discount: Number(price.discountPercent || 0),
      available: Boolean(price.available && Number.isFinite(Number(price.convertedValue))),
      checkedAt,
      error: price.error || null
    }));
    const preferred = regionalPrices.find((price) => price.region === game.preferredRegion && price.available);
    const previousAmount = Number(game.latestPrice?.amount);
    const nextAmount = Number(preferred?.convertedAmount);

    return {
      name: response.gameName || game.name,
      headerImage: response.image || game.headerImage,
      steamUrl: game.steamUrl || `https://store.steampowered.com/app/${game.appId}`,
      latestPrice: preferred ? {
        amount: preferred.convertedAmount,
        currency: targetCurrency,
        region: preferred.region,
        checkedAt,
        originalAmount: preferred.convertedOriginalAmount,
        discount: preferred.discount
      } : null,
      regionalPrices,
      lastCheckedAt: checkedAt,
      priceTrend: Number.isFinite(previousAmount) && Number.isFinite(nextAmount)
        ? (nextAmount > previousAmount ? 'up' : (nextAmount < previousAmount ? 'down' : 'same'))
        : 'same',
      errorData: null
    };
  }
}

export default new SteamService();
