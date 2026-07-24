import {
  DEFAULT_PREFERENCES,
  SCHEMA_VERSION,
  STORAGE_KEYS,
  createCollectionsStore,
  createGame,
  createHistoryStore,
  createTrackerStore,
  nowIso
} from './storage-schema.js';
import {
  salvageStore,
  sanitizeGame,
  validateGame,
  validateImportBundle,
  validateStore
} from './storage-validation.js';
import { migrate, migrateLegacySources } from './storage-migrations.js';
import { generateId } from '../utils/ids.js';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function mergePreferences(input = {}) {
  return {
    ...clone(DEFAULT_PREFERENCES),
    ...(input && typeof input === 'object' ? input : {}),
    filters: {
      ...DEFAULT_PREFERENCES.filters,
      ...(input?.filters || input?.filter || {})
    },
    schemaVersion: SCHEMA_VERSION
  };
}

function isQuotaError(error) {
  return error?.name === 'QuotaExceededError'
    || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error?.code === 22
    || error?.code === 1014;
}

export class TrackerRepository {
  static _initialized = false;
  static _tracker = createTrackerStore();
  static _preferences = mergePreferences();
  static _collections = createCollectionsStore();
  static _history = createHistoryStore();
  static _lastError = null;

  static init() {
    if (this._initialized) return this.getSnapshot();

    const mainRead = this._readJson(STORAGE_KEYS.TRACKER);
    const backupRead = this._readJson(STORAGE_KEYS.BACKUP);
    let shouldPersist = false;

    try {
      if (mainRead.value) {
        this._tracker = migrate(mainRead.value);
      } else if (mainRead.raw && mainRead.error) {
        const backupTracker = backupRead.value?.tracker || backupRead.value;
        if (backupTracker) {
          this._tracker = migrate(backupTracker);
          shouldPersist = true;
        } else {
          this._tracker = createTrackerStore([], [{
            recoveredAt: nowIso(),
            reason: 'Không thể đọc dữ liệu tracker',
            raw: String(mainRead.raw).slice(0, 20000)
          }]);
          shouldPersist = true;
        }
      } else {
        const legacy = this._loadLegacy();
        if (legacy.games.length) {
          this._tracker = legacy;
          shouldPersist = true;
        } else {
          shouldPersist = true;
        }
      }
    } catch (error) {
      const backupTracker = backupRead.value?.tracker || backupRead.value;
      this._lastError = this._normalizeError(error, 'Không thể khôi phục dữ liệu tracker');
      this._tracker = backupTracker ? salvageStore(backupTracker) : createTrackerStore();
      shouldPersist = true;
    }

    const validation = validateStore(this._tracker);
    if (!validation.valid) {
      this._tracker = salvageStore(this._tracker);
      shouldPersist = true;
    }

    this._preferences = mergePreferences(this._readJson(STORAGE_KEYS.PREFERENCES).value);

    const collections = this._readJson(STORAGE_KEYS.COLLECTIONS).value;
    this._collections = createCollectionsStore(
      Array.isArray(collections?.items)
        ? collections.items
            .filter((item) => item && typeof item.name === 'string')
            .map((item) => ({
              id: String(item.id || generateId()),
              name: item.name.trim(),
              createdAt: item.createdAt || nowIso()
            }))
        : []
    );

    const history = this._readJson(STORAGE_KEYS.HISTORY).value;
    this._history = createHistoryStore(history?.records);
    this._initialized = true;

    if (shouldPersist) this._persistTracker();
    this._persistPreferences();
    this._persistCollections();
    this._persistHistory();

    return this.getSnapshot();
  }

  static _loadLegacy() {
    const legacyKeys = [
      'steam_pic_tracked_games',
      'steam_tracked_games',
      'steam_tracker_games'
    ];
    const sources = legacyKeys.map((key) => this._readJson(key).value).filter(Boolean);
    return migrateLegacySources(...sources);
  }

  static _readJson(key) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
      return { value: raw ? JSON.parse(raw) : null, raw, error: null };
    } catch (error) {
      return { value: null, raw, error };
    }
  }

  static _writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static _remove(key) {
    localStorage.removeItem(key);
  }

  static _normalizeError(error, fallbackMessage) {
    return {
      code: isQuotaError(error) ? 'quota' : 'storage',
      message: isQuotaError(error)
        ? 'Không thể lưu thay đổi trên thiết bị này vì bộ nhớ trình duyệt đã đầy.'
        : fallbackMessage,
      detail: error?.message || String(error),
      occurredAt: nowIso()
    };
  }

  static _atomicWrite(key, value, validator = () => true, { backupTracker = false } = {}) {
    const tempKey = key === STORAGE_KEYS.TRACKER ? STORAGE_KEYS.TEMP : `${key}.temp`;
    const previous = this._readJson(key).value;

    try {
      if (backupTracker && previous) {
        const currentValidation = validateStore(previous);
        if (currentValidation.valid) this.createBackup({ automatic: true, trackerOverride: previous });
      }

      this._writeJson(tempKey, value);
      const temporary = this._readJson(tempKey);
      if (!temporary.value || !validator(temporary.value)) {
        throw new Error('Dữ liệu tạm không vượt qua bước kiểm tra');
      }

      this._writeJson(key, temporary.value);
      const written = this._readJson(key);
      if (!written.value || !validator(written.value)) {
        throw new Error('Dữ liệu chính không vượt qua bước kiểm tra');
      }

      this._remove(tempKey);
      this._lastError = null;
      return true;
    } catch (error) {
      try {
        if (previous) this._writeJson(key, previous);
        this._remove(tempKey);
      } catch {
        // Keep the original error as the actionable storage state.
      }
      this._lastError = this._normalizeError(error, 'Không thể lưu thay đổi trên thiết bị này.');
      return false;
    }
  }

  static _persistTracker() {
    this._tracker.updatedAt = nowIso();
    return this._atomicWrite(
      STORAGE_KEYS.TRACKER,
      this._tracker,
      (value) => validateStore(value).valid,
      { backupTracker: true }
    );
  }

  static _persistPreferences() {
    return this._atomicWrite(
      STORAGE_KEYS.PREFERENCES,
      this._preferences,
      (value) => value && typeof value === 'object' && value.filters
    );
  }

  static _persistCollections() {
    this._collections.updatedAt = nowIso();
    return this._atomicWrite(
      STORAGE_KEYS.COLLECTIONS,
      this._collections,
      (value) => value && Array.isArray(value.items)
    );
  }

  static _persistHistory() {
    this._history.updatedAt = nowIso();
    return this._atomicWrite(
      STORAGE_KEYS.HISTORY,
      this._history,
      (value) => value && value.records && typeof value.records === 'object'
    );
  }

  static getSnapshot() {
    return clone({
      tracker: this._tracker,
      preferences: this._preferences,
      collections: this._collections,
      history: this._history
    });
  }

  static getAll() {
    if (!this._initialized) this.init();
    return clone(this._tracker.games);
  }

  static getById(id) {
    if (!this._initialized) this.init();
    const game = this._tracker.games.find((item) => item.id === id);
    return game ? clone(game) : null;
  }

  static getByAppId(appId) {
    if (!this._initialized) this.init();
    const numericAppId = Number(appId);
    const game = this._tracker.games.find((item) => item.appId === numericAppId);
    return game ? clone(game) : null;
  }

  static create(input) {
    if (!this._initialized) this.init();
    const candidate = sanitizeGame(createGame(input));
    if (!candidate) throw new Error('Dữ liệu game không hợp lệ');

    const existing = this._tracker.games.find((game) => game.appId === candidate.appId);
    if (existing && !input?.allowDuplicate) return clone(existing);
    if (existing && input?.allowDuplicate) candidate.duplicateOf = existing.id;
    delete candidate.allowDuplicate;

    const validation = validateGame(candidate);
    if (!validation.valid) throw new Error(validation.errors.join(', '));

    this._tracker.games.push(candidate);
    if (!this._persistTracker()) throw new Error(this._lastError?.message || 'Không thể lưu game');
    return clone(candidate);
  }

  static update(id, changes) {
    if (!this._initialized) this.init();
    const index = this._tracker.games.findIndex((game) => game.id === id);
    if (index < 0) return null;

    const candidate = sanitizeGame({
      ...this._tracker.games[index],
      ...changes,
      id,
      updatedAt: nowIso()
    });
    if (!candidate) throw new Error('Dữ liệu game sau khi sửa không hợp lệ');

    const duplicate = this._tracker.games.find(
      (game, gameIndex) => gameIndex !== index && game.appId === candidate.appId
    );
    if (duplicate && !candidate.duplicateOf) throw new Error('Game này đã có trong danh sách');

    const previous = this._tracker.games[index];
    this._tracker.games[index] = candidate;
    if (!this._persistTracker()) {
      this._tracker.games[index] = previous;
      throw new Error(this._lastError?.message || 'Không thể lưu thay đổi');
    }
    return clone(candidate);
  }

  static remove(id) {
    if (!this._initialized) this.init();
    const previous = this._tracker.games;
    const next = previous.filter((game) => game.id !== id);
    if (next.length === previous.length) return false;
    this._tracker.games = next;
    if (!this._persistTracker()) {
      this._tracker.games = previous;
      return false;
    }
    delete this._history.records[id];
    this._persistHistory();
    return true;
  }

  static removeMany(ids) {
    const idSet = new Set(ids);
    const previous = this._tracker.games;
    const next = previous.filter((game) => !idSet.has(game.id));
    if (next.length === previous.length) return false;
    this._tracker.games = next;
    if (!this._persistTracker()) {
      this._tracker.games = previous;
      return false;
    }
    ids.forEach((id) => delete this._history.records[id]);
    this._persistHistory();
    return true;
  }

  static replaceAll(data) {
    if (!this._initialized) this.init();
    const next = salvageStore(Array.isArray(data) ? data : data?.games || []);
    const previous = this._tracker;
    this._tracker = next;
    if (!this._persistTracker()) {
      this._tracker = previous;
      return false;
    }
    return true;
  }

  static search(query) {
    const q = String(query || '').trim().toLocaleLowerCase('vi');
    if (!q) return this.getAll();
    const collectionNames = new Map(this._collections.items.map((item) => [item.id, item.name]));

    return this.getAll().filter((game) => {
      const haystack = [
        game.name,
        game.customName,
        game.appId,
        game.edition,
        game.note,
        game.preferredRegion,
        ...(game.tags || []),
        ...(game.collectionIds || []).map((id) => collectionNames.get(id))
      ].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      return haystack.includes(q);
    });
  }

  static clear() {
    return this.replaceAll([]);
  }

  static clearAll() {
    if (!this._initialized) this.init();
    const previous = this.getSnapshot();
    this._tracker = createTrackerStore();
    this._collections = createCollectionsStore();
    this._history = createHistoryStore();
    const saved = this._persistTracker() && this._persistCollections() && this._persistHistory();
    if (!saved) {
      this._tracker = previous.tracker;
      this._collections = previous.collections;
      this._history = previous.history;
      return false;
    }
    return true;
  }

  static getPreferences() {
    if (!this._initialized) this.init();
    return clone(this._preferences);
  }

  static savePreferences(changes) {
    if (!this._initialized) this.init();
    this._preferences = mergePreferences({
      ...this._preferences,
      ...changes,
      filters: {
        ...this._preferences.filters,
        ...(changes?.filters || {})
      }
    });
    this._persistPreferences();
    return this.getPreferences();
  }

  static getCollections() {
    if (!this._initialized) this.init();
    return clone(this._collections.items);
  }

  static createCollection(name) {
    if (!this._initialized) this.init();
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Tên bộ sưu tập không được để trống');
    const existing = this._collections.items.find(
      (item) => item.name.toLocaleLowerCase('vi') === normalized.toLocaleLowerCase('vi')
    );
    if (existing) return clone(existing);

    const collection = { id: generateId(), name: normalized, createdAt: nowIso() };
    this._collections.items.push(collection);
    if (!this._persistCollections()) throw new Error(this._lastError?.message || 'Không thể lưu bộ sưu tập');
    return clone(collection);
  }

  static removeCollection(id) {
    const previous = this._collections.items;
    const next = previous.filter((item) => item.id !== id);
    if (next.length === previous.length) return false;
    this._collections.items = next;
    this._tracker.games = this._tracker.games.map((game) => ({
      ...game,
      collectionIds: game.collectionIds.filter((collectionId) => collectionId !== id)
    }));
    const collectionsSaved = this._persistCollections();
    const gamesSaved = this._persistTracker();
    if (!collectionsSaved || !gamesSaved) {
      this._collections.items = previous;
      return false;
    }
    return true;
  }

  static recordPriceSnapshots(gameId, regionalPrices, checkedAt = nowIso()) {
    if (!this._initialized) this.init();
    const source = Array.isArray(regionalPrices) ? regionalPrices : [];
    const records = Array.isArray(this._history.records[gameId])
      ? this._history.records[gameId]
      : [];

    source.forEach((price) => {
      if (!price?.available || !Number.isFinite(Number(price.convertedAmount))) return;
      const region = String(price.region || '').toLowerCase();
      const latestForRegion = [...records].reverse().find((record) => record.region === region);
      const amount = Number(price.amount);
      const convertedAmount = Number(price.convertedAmount);
      const unchanged = latestForRegion
        && latestForRegion.amount === amount
        && latestForRegion.convertedAmount === convertedAmount
        && latestForRegion.currency === price.currency;

      if (unchanged) {
        latestForRegion.checkedAt = checkedAt;
        return;
      }

      records.push({
        id: generateId(),
        checkedAt,
        region,
        currency: String(price.currency || ''),
        amount,
        convertedCurrency: String(price.convertedCurrency || 'VND'),
        convertedAmount
      });
    });

    const limit = Math.min(Math.max(Number(this._preferences.historyLimit) || 365, 30), 365);
    const grouped = new Map();
    records
      .sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt))
      .forEach((record) => {
        const group = grouped.get(record.region) || [];
        group.push(record);
        grouped.set(record.region, group.slice(-limit));
      });

    this._history.records[gameId] = [...grouped.values()]
      .flat()
      .sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));
    this._persistHistory();
    return this.getHistory(gameId);
  }

  static getHistory(gameId) {
    if (!this._initialized) this.init();
    return clone(this._history.records[gameId] || []);
  }

  static exportData() {
    if (!this._initialized) this.init();
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      tracker: this._tracker,
      preferences: this._preferences,
      collections: this._collections,
      priceHistory: this._history
    }, null, 2);
  }

  static exportGame(id) {
    const game = this.getById(id);
    if (!game) return null;
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      tracker: createTrackerStore([game]),
      priceHistory: createHistoryStore({ [id]: this.getHistory(id) })
    }, null, 2);
  }

  static exportCollection(id) {
    if (!this._initialized) this.init();
    const collection = this._collections.items.find((item) => item.id === id);
    if (!collection) return null;
    const games = this._tracker.games.filter((game) => game.collectionIds.includes(id));
    const historyRecords = Object.fromEntries(
      games.map((game) => [game.id, this._history.records[game.id] || []])
    );
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      tracker: createTrackerStore(games),
      collections: createCollectionsStore([collection]),
      priceHistory: createHistoryStore(historyRecords)
    }, null, 2);
  }

  static exportRecovery() {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      recovery: clone(this._tracker.recovery || [])
    }, null, 2);
  }

  static previewImport(input) {
    let parsed = input;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch {
        return { valid: false, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: ['JSON không hợp lệ'] };
      }
    }

    const result = validateImportBundle(parsed);
    const duplicateCount = result.store.games.filter(
      (game) => this._tracker.games.some((current) => current.appId === game.appId || current.id === game.id)
    ).length;

    return {
      valid: result.store.games.length > 0 || result.invalidCount === 0,
      validCount: result.store.games.length,
      invalidCount: result.invalidCount,
      duplicateCount,
      schemaVersion: result.schemaVersion,
      errors: result.errors,
      parsed
    };
  }

  static importData(input, mode = 'merge') {
    const preview = this.previewImport(input);
    if (!preview.parsed) {
      return { imported: 0, updated: 0, skipped: 0, invalid: preview.invalidCount, errors: preview.errors };
    }

    const validated = validateImportBundle(preview.parsed);
    const incoming = validated.store.games;
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    if (mode === 'overwrite') {
      this._tracker = createTrackerStore(incoming, validated.store.recovery);
      imported = incoming.length;
    } else {
      incoming.forEach((game) => {
        const existingIndex = this._tracker.games.findIndex(
          (current) => current.appId === game.appId || current.id === game.id
        );
        if (existingIndex >= 0) {
          if (mode === 'update') {
            this._tracker.games[existingIndex] = {
              ...game,
              id: this._tracker.games[existingIndex].id,
              createdAt: this._tracker.games[existingIndex].createdAt,
              updatedAt: nowIso()
            };
            updated += 1;
          } else {
            skipped += 1;
          }
        } else {
          this._tracker.games.push({ ...game, id: generateId() });
          imported += 1;
        }
      });
      this._tracker.recovery.push(...validated.store.recovery);
    }

    const collections = preview.parsed?.collections?.items;
    if (Array.isArray(collections)) {
      collections.forEach((item) => {
        if (!item?.name) return;
        if (!this._collections.items.some((current) => current.id === item.id || current.name === item.name)) {
          this._collections.items.push({
            id: String(item.id || generateId()),
            name: String(item.name),
            createdAt: item.createdAt || nowIso()
          });
        }
      });
    }

    const importedHistory = preview.parsed?.priceHistory?.records;
    if (importedHistory && typeof importedHistory === 'object') {
      this._history.records = mode === 'overwrite'
        ? clone(importedHistory)
        : { ...this._history.records, ...clone(importedHistory) };
    }

    const saved = this._persistTracker();
    this._persistCollections();
    this._persistHistory();

    return {
      imported: saved ? imported : 0,
      updated: saved ? updated : 0,
      skipped,
      invalid: validated.store.recovery.length,
      errors: saved ? [] : [this._lastError?.message || 'Không thể lưu dữ liệu nhập']
    };
  }

  static createBackup({ automatic = false, trackerOverride = null } = {}) {
    if (!this._initialized && !trackerOverride) this.init();
    const bundle = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: nowIso(),
      automatic,
      tracker: clone(trackerOverride || this._tracker),
      preferences: clone(this._preferences),
      collections: clone(this._collections),
      priceHistory: clone(this._history)
    };
    try {
      this._writeJson(STORAGE_KEYS.BACKUP, bundle);
      return this.getBackupInfo(bundle);
    } catch (error) {
      this._lastError = this._normalizeError(error, 'Không thể tạo bản sao lưu');
      return null;
    }
  }

  static restoreBackup() {
    const raw = this._readJson(STORAGE_KEYS.BACKUP).value;
    if (!raw) return false;
    const tracker = raw.tracker || raw;
    const restored = migrate(tracker);
    if (!validateStore(restored).valid) return false;

    const previous = this.getSnapshot();
    this._tracker = restored;
    this._preferences = mergePreferences(raw.preferences || this._preferences);
    this._collections = raw.collections?.items
      ? createCollectionsStore(raw.collections.items)
      : this._collections;
    this._history = raw.priceHistory?.records
      ? createHistoryStore(raw.priceHistory.records)
      : this._history;

    if (!this._persistTracker()) {
      this._tracker = previous.tracker;
      this._preferences = previous.preferences;
      this._collections = previous.collections;
      this._history = previous.history;
      return false;
    }
    this._persistPreferences();
    this._persistCollections();
    this._persistHistory();
    return true;
  }

  static getBackupInfo(bundle = null) {
    const backup = bundle || this._readJson(STORAGE_KEYS.BACKUP).value;
    if (!backup) return null;
    const tracker = backup.tracker || backup;
    const size = new Blob([JSON.stringify(backup)]).size;
    return {
      createdAt: backup.createdAt || tracker.updatedAt || null,
      gameCount: Array.isArray(tracker.games) ? tracker.games.length : 0,
      bytes: size,
      schemaVersion: tracker.schemaVersion || SCHEMA_VERSION,
      automatic: Boolean(backup.automatic)
    };
  }

  static exportBackup() {
    const backup = this._readJson(STORAGE_KEYS.BACKUP).value;
    return backup ? JSON.stringify(backup, null, 2) : null;
  }

  static validate(data = null) {
    return validateStore(data || this._tracker);
  }

  static migrate() {
    this._tracker = migrate(this._tracker);
    this._persistTracker();
    return clone(this._tracker);
  }

  static getStorageStatus() {
    const trackerBytes = new Blob([JSON.stringify(this._tracker)]).size;
    return {
      error: this._lastError ? clone(this._lastError) : null,
      trackerBytes,
      recoveryCount: this._tracker.recovery?.length || 0,
      schemaVersion: SCHEMA_VERSION
    };
  }

  static retryLastWrite() {
    const trackerSaved = this._persistTracker();
    const preferencesSaved = this._persistPreferences();
    const collectionsSaved = this._persistCollections();
    const historySaved = this._persistHistory();
    return trackerSaved && preferencesSaved && collectionsSaved && historySaved;
  }
}

export default TrackerRepository;
