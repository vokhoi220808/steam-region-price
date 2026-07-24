import { computeGap, computeStatus, getCheapestRegion, getDiscount } from './tracker-status.js';

function includesText(value, query) {
  return String(value || '').toLocaleLowerCase('vi').includes(query);
}

function matchesSearch(game, query, collectionMap) {
  if (!query) return true;
  const q = query.toLocaleLowerCase('vi').trim();
  return [
    game.name,
    game.customName,
    game.appId,
    game.edition,
    game.note,
    game.preferredRegion,
    ...(game.comparisonRegions || []),
    ...(game.tags || []),
    ...(game.collectionIds || []).map((id) => collectionMap.get(id))
  ].some((value) => includesText(value, q));
}

function matchesStatus(game, status) {
  if (!status || status === 'all') return true;
  if (status === 'on_sale') return getDiscount(game) > 0;
  if (status === 'price_up') return game.priceTrend === 'up';
  if (status === 'price_down') return game.priceTrend === 'down';
  if (status === 'favorite') return Boolean(game.pinned);
  return game.status === status;
}

function matchesPriceRange(game, range) {
  if (!range || range === 'all') return true;
  const amount = Number(game.latestPrice?.amount);
  if (!Number.isFinite(amount)) return false;
  if (range === 'under_300') return amount < 300_000;
  if (range === '300_700') return amount >= 300_000 && amount <= 700_000;
  if (range === 'over_700') return amount > 700_000;
  return true;
}

export function filterGames(games, filters, collections = []) {
  const collectionMap = new Map(collections.map((item) => [item.id, item.name]));
  return games.filter((game) => (
    matchesSearch(game, filters.search, collectionMap)
    && matchesStatus(game, filters.status)
    && (!filters.region || filters.region === 'all'
      || game.preferredRegion === filters.region
      || game.comparisonRegions.includes(filters.region))
    && (!filters.tag || filters.tag === 'all' || game.tags.includes(filters.tag))
    && (!filters.collectionId || filters.collectionId === 'all'
      || game.collectionIds.includes(filters.collectionId))
    && (!filters.pinned || game.pinned)
    && matchesPriceRange(game, filters.priceRange)
  ));
}

function targetDistance(game) {
  const gap = computeGap(game);
  if (!gap) return Number.POSITIVE_INFINITY;
  return Math.abs(gap.percent);
}

function amount(game, fallback) {
  const value = Number(game.latestPrice?.amount);
  return Number.isFinite(value) ? value : fallback;
}

const attentionScore = {
  error: 0,
  unavailable: 1,
  near_target: 2,
  no_target: 3,
  tracking: 4,
  target_reached: 5
};

export function sortGames(games, sort = 'attention') {
  return [...games].sort((a, b) => {
    if (sort === 'attention') {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const statusDifference = attentionScore[a.status] - attentionScore[b.status];
      return statusDifference || targetDistance(a) - targetDistance(b);
    }
    if (sort === 'nearest_target') return targetDistance(a) - targetDistance(b);
    if (sort === 'price_low') return amount(a, Infinity) - amount(b, Infinity);
    if (sort === 'price_high') return amount(b, -Infinity) - amount(a, -Infinity);
    if (sort === 'discount') return getDiscount(b) - getDiscount(a);
    if (sort === 'recently_updated') return new Date(b.updatedAt) - new Date(a.updatedAt);
    if (sort === 'recently_added') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'name_az') {
      return (a.customName || a.name).localeCompare(b.customName || b.name, 'vi');
    }
    if (sort === 'target_low') {
      const aTarget = Number(a.targetPrice?.amount);
      const bTarget = Number(b.targetPrice?.amount);
      return (Number.isFinite(aTarget) ? aTarget : Infinity) - (Number.isFinite(bTarget) ? bTarget : Infinity);
    }
    if (sort === 'cheapest_region') {
      return String(getCheapestRegion(a)?.regionName || 'zzz')
        .localeCompare(String(getCheapestRegion(b)?.regionName || 'zzz'), 'vi');
    }
    return 0;
  });
}

export function applyFiltersAndSort(games, filters, collections = []) {
  const withStatus = games.map((game) => ({ ...game, status: computeStatus(game) }));
  return sortGames(filterGames(withStatus, filters, collections), filters.sort);
}
