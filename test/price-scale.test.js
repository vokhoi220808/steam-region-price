import test from 'node:test';
import assert from 'node:assert/strict';

test('price scale merges overlapping lowest and current markers', async () => {
  globalThis.document = {
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  globalThis.Node = class {};
  const { renderPriceScale } = await import(
    '../public/modules/components/price-scale.js'
  );
  const html = renderPriceScale({
    targetPrice: { amount: 150000, currency: 'VND' },
    latestPrice: { amount: 385000, currency: 'VND' },
    regionalPrices: [{
      region: 'vn',
      regionName: 'Việt Nam',
      convertedAmount: 385000,
      convertedCurrency: 'VND',
      available: true
    }]
  });

  assert.equal((html.match(/class="tp-price-marker/g) || []).length, 2);
  assert.match(html, /is-lowest is-current is-combined is-edge-right/);
  assert.match(html, /Thấp nhất = Hiện tại/);
});
