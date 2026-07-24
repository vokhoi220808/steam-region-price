export const STATUS = Object.freeze({
  TARGET_REACHED: 'target_reached',
  NEAR_TARGET: 'near_target',
  TRACKING: 'tracking',
  NO_TARGET: 'no_target',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error'
});

export const STATUS_META = Object.freeze({
  target_reached: { label: 'Đã đạt mục tiêu', icon: '✓', tone: 'success' },
  near_target: { label: 'Gần đạt', icon: '◌', tone: 'warning' },
  tracking: { label: 'Đang theo dõi', icon: '●', tone: 'primary' },
  no_target: { label: 'Chưa đặt mục tiêu', icon: '—', tone: 'neutral' },
  unavailable: { label: 'Không khả dụng', icon: '×', tone: 'neutral' },
  error: { label: 'Lỗi dữ liệu', icon: '!', tone: 'danger' }
});

export function computeStatus(game) {
  if (game?.errorData) return STATUS.ERROR;
  if (!game?.latestPrice) return game?.targetPrice ? STATUS.UNAVAILABLE : STATUS.NO_TARGET;
  if (!game?.targetPrice) return STATUS.NO_TARGET;

  const current = Number(game.latestPrice.amount);
  const target = Number(game.targetPrice.amount);
  if (!Number.isFinite(current)) return STATUS.UNAVAILABLE;
  if (!Number.isFinite(target) || target < 0) return STATUS.NO_TARGET;
  if (current <= target) return STATUS.TARGET_REACHED;
  if (target > 0 && (current - target) / target <= 0.1) return STATUS.NEAR_TARGET;
  return STATUS.TRACKING;
}

export function computeGap(game) {
  if (!game?.latestPrice || !game?.targetPrice) return null;
  const current = Number(game.latestPrice.amount);
  const target = Number(game.targetPrice.amount);
  if (!Number.isFinite(current) || !Number.isFinite(target)) return null;
  const difference = current - target;
  return {
    difference,
    percent: target > 0 ? (difference / target) * 100 : 0,
    reached: difference <= 0
  };
}

export function getDiscount(game) {
  return Math.max(
    Number(game?.latestPrice?.discount || 0),
    ...((game?.regionalPrices || []).map((price) => Number(price.discount || 0)))
  );
}

export function getCheapestRegion(game) {
  return (game?.regionalPrices || [])
    .filter((price) => price.available && Number.isFinite(Number(price.convertedAmount)))
    .sort((a, b) => Number(a.convertedAmount) - Number(b.convertedAmount))[0] || null;
}
