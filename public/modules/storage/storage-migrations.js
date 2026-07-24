import { SCHEMA_VERSION, createTrackerStore } from './storage-schema.js';
import { salvageStore } from './storage-validation.js';

export const migrations = Object.freeze({
  1: migrateFromV0ToV1
});

export function migrateFromV0ToV1(input) {
  return salvageStore(input);
}

export function migrate(input) {
  if (!input) return createTrackerStore();

  let current = input;
  let version = Number.isInteger(current.schemaVersion) ? current.schemaVersion : 0;

  while (version < SCHEMA_VERSION) {
    const nextVersion = version + 1;
    const migration = migrations[nextVersion];
    if (typeof migration !== 'function') {
      throw new Error(`Không tìm thấy migration lên schema ${nextVersion}`);
    }
    current = migration(current);
    current.schemaVersion = nextVersion;
    version = nextVersion;
  }

  return salvageStore(current);
}

export function migrateLegacySources(...sources) {
  const records = [];

  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      records.push(...source);
      continue;
    }
    if (Array.isArray(source.games)) {
      records.push(...source.games);
      continue;
    }
    if (typeof source === 'object') {
      for (const [appId, value] of Object.entries(source)) {
        records.push({
          ...(value && typeof value === 'object' ? value : {}),
          appId: Number(value?.appId || appId),
          name: value?.name || `Steam App ${appId}`,
          headerImage: value?.headerImage || value?.image || '',
          targetPrice: value?.targetPrice ?? null,
          createdAt: value?.createdAt || value?.addedAt
        });
      }
    }
  }

  return salvageStore(records);
}
