import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFiltersAndSort } from '../public/modules/tracker/tracker-filters.js';

const baseFilters = {
  search: '',
  status: 'all',
  region: 'all',
  tag: 'all',
  collectionId: 'all',
  priceRange: 'all',
  pinned: false,
  sort: 'attention'
};

const games = [
  {
    id: 'a',
    appId: 10,
    name: 'Alpha',
    customName: null,
    edition: 'Standard',
    note: '',
    targetPrice: { amount: 100000, currency: 'VND' },
    latestPrice: { amount: 105000, currency: 'VND', discount: 20 },
    preferredRegion: 'vn',
    comparisonRegions: ['vn', 'us'],
    regionalPrices: [],
    tags: ['RPG'],
    collectionIds: ['wish'],
    pinned: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z'
  },
  {
    id: 'b',
    appId: 20,
    name: 'Beta',
    customName: null,
    edition: 'Standard',
    note: 'co-op',
    targetPrice: null,
    latestPrice: { amount: 240000, currency: 'VND', discount: 0 },
    preferredRegion: 'us',
    comparisonRegions: ['us'],
    regionalPrices: [],
    tags: ['Co-op'],
    collectionIds: [],
    pinned: false,
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z'
  }
];

test('filters search all supported fields and compute statuses', () => {
  const collections = [{ id: 'wish', name: 'Muốn mua' }];
  assert.equal(applyFiltersAndSort(games, { ...baseFilters, search: 'muốn' }, collections).length, 1);
  assert.equal(applyFiltersAndSort(games, { ...baseFilters, status: 'near_target' }, collections).length, 1);
  assert.equal(applyFiltersAndSort(games, { ...baseFilters, status: 'on_sale' }, collections).length, 1);
  assert.equal(applyFiltersAndSort(games, { ...baseFilters, tag: 'Co-op' }, collections)[0].id, 'b');
});
