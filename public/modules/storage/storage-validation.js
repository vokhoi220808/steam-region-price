import {
  SCHEMA_VERSION,
  SUPPORTED_CURRENCIES,
  SUPPORTED_REGIONS,
  createGame,
  createTrackerStore
} from './storage-schema.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validateMoney(value, fieldName, errors) {
  if (value === null) return;
  if (!isObject(value)) {
    errors.push(`${fieldName} phải là object hoặc null`);
    return;
  }
  if (!Number.isFinite(value.amount) || value.amount < 0) {
    errors.push(`${fieldName}.amount phải là số không âm`);
  }
  if (!SUPPORTED_CURRENCIES.includes(String(value.currency || '').toUpperCase())) {
    errors.push(`${fieldName}.currency không hợp lệ`);
  }
}

export function validateGame(game) {
  const errors = [];

  if (!isObject(game)) return { valid: false, errors: ['Bản ghi game không hợp lệ'] };
  if (typeof game.id !== 'string' || !game.id.trim()) errors.push('Thiếu id');
  if (!Number.isInteger(game.appId) || game.appId <= 0) errors.push('appId không hợp lệ');
  if (typeof game.name !== 'string' || !game.name.trim()) errors.push('Tên game không được để trống');

  validateMoney(game.targetPrice, 'targetPrice', errors);
  validateMoney(game.latestPrice, 'latestPrice', errors);

  if (!SUPPORTED_REGIONS.includes(String(game.preferredRegion || '').toLowerCase())) {
    errors.push('preferredRegion không hợp lệ');
  }

  for (const key of ['comparisonRegions', 'regionalPrices', 'tags', 'collectionIds']) {
    if (!Array.isArray(game[key])) errors.push(`${key} phải là mảng`);
  }

  for (const key of ['createdAt', 'updatedAt']) {
    if (!isIsoDate(game[key])) errors.push(`${key} không đúng định dạng ISO`);
  }
  if (game.lastCheckedAt !== null && !isIsoDate(game.lastCheckedAt)) {
    errors.push('lastCheckedAt không đúng định dạng ISO');
  }

  return { valid: errors.length === 0, errors };
}

export function validateStore(store) {
  const errors = [];
  if (!isObject(store)) return { valid: false, errors: ['Kho dữ liệu không hợp lệ'] };
  if (!Number.isInteger(store.schemaVersion) || store.schemaVersion < 0) {
    errors.push('schemaVersion không hợp lệ');
  }
  if (!Array.isArray(store.games)) {
    errors.push('games phải là mảng');
    return { valid: false, errors };
  }

  const ids = new Set();
  const appIds = new Set();
  store.games.forEach((game, index) => {
    const result = validateGame(game);
    if (!result.valid) errors.push(`Game ${index + 1}: ${result.errors.join(', ')}`);
    if (game?.id && ids.has(game.id)) errors.push(`Trùng id: ${game.id}`);
    if (game?.appId && appIds.has(game.appId) && !game.duplicateOf) errors.push(`Trùng appId: ${game.appId}`);
    ids.add(game?.id);
    appIds.add(game?.appId);
  });

  return { valid: errors.length === 0, errors };
}

function normalizeMoney(value, fallbackCurrency = 'VND') {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || typeof value === 'string') {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0
      ? { amount, currency: fallbackCurrency }
      : null;
  }

  const amount = Number(value.amount ?? value.final ?? value.convertedValue);
  const currency = String(value.currency || fallbackCurrency).toUpperCase();
  if (!Number.isFinite(amount) || amount < 0 || !SUPPORTED_CURRENCIES.includes(currency)) return null;
  return {
    amount,
    currency,
    ...(value.region ? { region: String(value.region).toLowerCase() } : {}),
    ...(value.checkedAt ? { checkedAt: value.checkedAt } : {}),
    ...(Number.isFinite(Number(value.originalAmount)) ? { originalAmount: Number(value.originalAmount) } : {}),
    ...(Number.isFinite(Number(value.discount)) ? { discount: Number(value.discount) } : {})
  };
}

export function sanitizeGame(source) {
  if (!isObject(source)) return null;

  const appId = Number(source.appId ?? source.id);
  const name = String(source.name || source.customName || '').trim();
  if (!Number.isInteger(appId) || appId <= 0 || !name) return null;

  const currency = String(
    source.targetPrice?.currency || source.targetCurrency || source.latestPrice?.currency || 'VND'
  ).toUpperCase();
  const safeCurrency = SUPPORTED_CURRENCIES.includes(currency) ? currency : 'VND';

  const game = createGame({
    ...source,
    appId,
    name,
    id: typeof source.id === 'string' && source.id.trim() ? source.id : undefined,
    targetPrice: normalizeMoney(source.targetPrice, safeCurrency),
    latestPrice: normalizeMoney(
      source.latestPrice ?? (
        Number.isFinite(Number(source.currentPrice))
          ? { amount: Number(source.currentPrice), currency: safeCurrency, region: source.preferredRegion || 'vn' }
          : null
      ),
      safeCurrency
    )
  });

  if (!SUPPORTED_REGIONS.includes(game.preferredRegion)) game.preferredRegion = 'vn';
  game.comparisonRegions = game.comparisonRegions.filter((region) => SUPPORTED_REGIONS.includes(region));
  if (!game.comparisonRegions.length) game.comparisonRegions = ['vn', 'cn', 'hk', 'us'];

  game.createdAt = isIsoDate(game.createdAt) ? game.createdAt : new Date().toISOString();
  game.updatedAt = isIsoDate(game.updatedAt) ? game.updatedAt : new Date().toISOString();
  game.lastCheckedAt = isIsoDate(game.lastCheckedAt) ? game.lastCheckedAt : null;
  game.errorData = isObject(game.errorData) ? game.errorData : null;

  return game;
}

export function salvageStore(input) {
  const sourceGames = Array.isArray(input)
    ? input
    : (Array.isArray(input?.games) ? input.games : []);
  const recovery = Array.isArray(input?.recovery) ? [...input.recovery] : [];
  const games = [];
  const seenIds = new Set();
  const seenAppIds = new Set();

  sourceGames.forEach((raw, index) => {
    const game = sanitizeGame(raw);
    if (!game || seenIds.has(game.id) || (seenAppIds.has(game.appId) && !game.duplicateOf)) {
      recovery.push({
        recoveredAt: new Date().toISOString(),
        index,
        reason: !game ? 'Bản ghi không hợp lệ' : 'Bản ghi trùng lặp',
        record: raw
      });
      return;
    }
    seenIds.add(game.id);
    seenAppIds.add(game.appId);
    games.push(game);
  });

  return createTrackerStore(games, recovery);
}

export function validateImportBundle(bundle) {
  const tracker = bundle?.tracker || bundle;
  const store = salvageStore(tracker);
  const validation = validateStore(store);
  return {
    valid: validation.valid,
    schemaVersion: Number(tracker?.schemaVersion || SCHEMA_VERSION),
    store,
    errors: validation.errors,
    invalidCount: store.recovery.length
  };
}
