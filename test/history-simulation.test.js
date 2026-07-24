import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSimulatedHistorySeries } from '../public/modules/services/history-simulation.js';

test('simulated history is deterministic and ends at the current real price', () => {
  const input = {
    appId: 1245620,
    months: 6,
    locale: 'vi-VN',
    prices: [
      { code: 'tr', name: 'Thổ Nhĩ Kỳ', available: true, convertedValue: 40 },
      { code: 'vn', name: 'Việt Nam', available: true, convertedValue: 990000 },
      { code: 'us', name: 'Hoa Kỳ', available: true, convertedValue: 1500000 }
    ]
  };

  const first = buildSimulatedHistorySeries(input);
  const second = buildSimulatedHistorySeries(input);

  assert.deepEqual(first, second);
  assert.equal(first.labels.length, 6);
  assert.equal(first.series.length, 3);
  assert.deepEqual(
    first.series.map((series) => series.values.at(-1)),
    [40, 990000, 1500000]
  );
});
