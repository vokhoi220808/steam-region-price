import { generateId } from '../utils/ids.js';

export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = Object.freeze({
  TRACKER: 'steamPriceCompare.tracker.v1',
  PREFERENCES: 'steamPriceCompare.preferences.v1',
  COLLECTIONS: 'steamPriceCompare.collections.v1',
  HISTORY: 'steamPriceCompare.priceHistory.v1',
  BACKUP: 'steamPriceCompare.backup.v1',
  TEMP: 'steamPriceCompare.tracker.temp'
});

export const SUPPORTED_CURRENCIES = Object.freeze([
  'VND', 'USD', 'EUR', 'GBP', 'CNY', 'JPY', 'KRW', 'HKD', 'TWD',
  'SGD', 'THB', 'MYR', 'IDR', 'INR', 'AUD', 'CAD', 'BRL', 'MXN',
  'TRY', 'RUB', 'PLN', 'CHF', 'AED', 'UAH', 'ZAR', 'PHP', 'ARS'
]);

export const SUPPORTED_REGIONS = Object.freeze([
  'vn', 'us', 'gb', 'de', 'jp', 'kr', 'cn', 'br', 'mx', 'ca', 'au',
  'in', 'id', 'ph', 'th', 'sg', 'my', 'tr', 'za', 'pl', 'ch', 'hk',
  'ru', 'tw', 'ar', 'ua', 'ae'
]);

export const DEFAULT_PREFERENCES = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  viewMode: 'grid',
  density: 'comfortable',
  historyLimit: 365,
  filters: {
    search: '',
    status: 'all',
    region: 'all',
    tag: 'all',
    collectionId: 'all',
    priceRange: 'all',
    pinned: false,
    sort: 'attention'
  }
});

export function nowIso() {
  return new Date().toISOString();
}

export function createGame(partial = {}) {
  const now = nowIso();
  const game = {
    id: generateId(),
    appId: null,
    name: '',
    customName: null,
    edition: 'Standard',
    headerImage: '',
    steamUrl: '',
    targetPrice: null,
    preferredRegion: 'vn',
    comparisonRegions: ['vn', 'cn', 'hk', 'us'],
    latestPrice: null,
    regionalPrices: [],
    tags: [],
    collectionIds: [],
    note: '',
    pinned: false,
    alertEnabled: true,
    duplicateOf: null,
    errorData: null,
    createdAt: now,
    updatedAt: now,
    lastCheckedAt: null,
    ...partial
  };

  game.id = String(game.id || generateId());
  game.appId = Number.isFinite(Number(game.appId)) ? Number(game.appId) : null;
  game.name = String(game.name || '').trim();
  game.customName = game.customName ? String(game.customName).trim() : null;
  game.edition = String(game.edition || 'Standard').trim() || 'Standard';
  game.headerImage = String(game.headerImage || game.thumbnail || game.image || '');
  game.steamUrl = String(game.steamUrl || (game.appId ? `https://store.steampowered.com/app/${game.appId}` : ''));
  game.preferredRegion = String(game.preferredRegion || 'vn').toLowerCase();
  game.comparisonRegions = Array.isArray(game.comparisonRegions)
    ? [...new Set(game.comparisonRegions.map((region) => String(region).toLowerCase()))]
    : ['vn', 'cn', 'hk', 'us'];
  game.tags = Array.isArray(game.tags)
    ? [...new Set(game.tags.map((tag) => String(tag).trim()).filter(Boolean))]
    : [];
  game.collectionIds = Array.isArray(game.collectionIds)
    ? [...new Set(game.collectionIds.map(String))]
    : [];
  game.regionalPrices = Array.isArray(game.regionalPrices) ? game.regionalPrices : [];
  game.note = String(game.note ?? game.notes ?? '');
  game.pinned = Boolean(game.pinned ?? game.isPinned);
  game.alertEnabled = game.alertEnabled !== false;
  game.duplicateOf = game.duplicateOf ? String(game.duplicateOf) : null;
  game.createdAt = game.createdAt || now;
  game.updatedAt = game.updatedAt || now;
  game.lastCheckedAt = game.lastCheckedAt || game.lastChecked || null;
  delete game.alerts;
  delete game.notifications;
  delete game.priceHistory;
  delete game.targetCurrency;
  delete game.notes;
  delete game.thumbnail;
  delete game.image;
  delete game.isPinned;

  return game;
}

export function createTrackerStore(games = [], recovery = []) {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: nowIso(),
    games: Array.isArray(games) ? games : [],
    recovery: Array.isArray(recovery) ? recovery : []
  };
}

export function createCollectionsStore(items = []) {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: nowIso(),
    items: Array.isArray(items) ? items : []
  };
}

export function createHistoryStore(records = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: nowIso(),
    records: records && typeof records === 'object' ? records : {}
  };
}
