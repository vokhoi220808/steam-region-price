import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key)
};

const { default: TrackerRepository } = await import('../public/modules/storage/storage-repository.js');

test('repository writes verified data, deduplicates and stores changed price history only', () => {
  TrackerRepository.init();
  const game = TrackerRepository.create({
    appId: 1245620,
    name: 'ELDEN RING',
    targetPrice: { amount: 700000, currency: 'VND' }
  });

  assert.equal(TrackerRepository.create({ appId: 1245620, name: 'ELDEN RING' }).id, game.id);
  assert.equal(TrackerRepository.getAll().length, 1);
  assert.equal(TrackerRepository.validate().valid, true);
  assert.equal(memory.has('steamPriceCompare.tracker.temp'), false);

  const snapshot = {
    region: 'vn',
    currency: 'VND',
    amount: 690000,
    convertedCurrency: 'VND',
    convertedAmount: 690000,
    available: true
  };
  TrackerRepository.recordPriceSnapshots(game.id, [snapshot], '2026-07-20T10:00:00.000Z');
  TrackerRepository.recordPriceSnapshots(game.id, [snapshot], '2026-07-21T10:00:00.000Z');
  TrackerRepository.recordPriceSnapshots(game.id, [{ ...snapshot, amount: 650000, convertedAmount: 650000 }], '2026-07-22T10:00:00.000Z');

  assert.equal(TrackerRepository.getHistory(game.id).length, 2);
  assert.equal(TrackerRepository.getHistory(game.id)[0].convertedAmount, 650000);
});

test('backup and import preview expose valid recoverable data', () => {
  const backup = TrackerRepository.createBackup();
  const exported = TrackerRepository.exportData();
  const preview = TrackerRepository.previewImport(exported);

  assert.equal(backup.gameCount, 1);
  assert.equal(preview.valid, true);
  assert.equal(preview.validCount, 1);
  assert.match(TrackerRepository.exportBackup(), /ELDEN RING/);
});
