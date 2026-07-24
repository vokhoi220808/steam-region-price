import { formatCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/dom.js';
import { getCheapestRegion } from '../tracker/tracker-status.js';

export function renderPriceScale(game) {
  const currency = game.latestPrice?.currency || game.targetPrice?.currency || 'VND';
  const cheapest = getCheapestRegion(game);
  const markers = [
    cheapest && { id: 'lowest', label: 'Thấp nhất', value: Number(cheapest.convertedAmount) },
    game.targetPrice && { id: 'target', label: 'Mục tiêu', value: Number(game.targetPrice.amount) },
    game.latestPrice && { id: 'current', label: 'Hiện tại', value: Number(game.latestPrice.amount) },
    game.latestPrice?.originalAmount && {
      id: 'original',
      label: 'Niêm yết',
      value: Number(game.latestPrice.originalAmount)
    }
  ].filter((marker) => marker && Number.isFinite(marker.value));

  if (markers.length < 2) {
    return `<p class="tp-scale-fallback">Chưa đủ dữ liệu để hiển thị thang so sánh.</p>`;
  }

  const values = markers.map((marker) => marker.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return `<p class="tp-scale-fallback">Các mốc giá hiện bằng nhau ở ${escapeHtml(formatCurrency(min, currency))}.</p>`;
  }

  const uniqueMarkers = markers.filter((marker, index) => (
    markers.findIndex((candidate) => candidate.id === marker.id) === index
  )).map((marker) => ({
    ...marker,
    position: Math.min(96, Math.max(4, ((marker.value - min) / (max - min)) * 100))
  })).sort((left, right) => left.position - right.position);

  const markerGroups = uniqueMarkers.reduce((groups, marker) => {
    const previous = groups.at(-1);
    if (previous && Math.abs(previous.position - marker.position) <= 6) {
      previous.markers.push(marker);
      previous.position = previous.markers.reduce(
        (total, item) => total + item.position,
        0
      ) / previous.markers.length;
      return groups;
    }
    groups.push({ position: marker.position, markers: [marker] });
    return groups;
  }, []);

  return `
    <div class="tp-price-scale" aria-label="Thang so sánh giá">
      <div class="tp-price-scale-track"></div>
      ${markerGroups.map((group) => {
        const labels = group.markers.map((marker) => marker.label);
        const descriptions = group.markers.map(
          (marker) => `${marker.label}: ${formatCurrency(marker.value, currency)}`
        );
        const edgeClass = group.position <= 12
          ? 'is-edge-left'
          : (group.position >= 88 ? 'is-edge-right' : '');
        const typeClasses = group.markers.map((marker) => `is-${marker.id}`).join(' ');
        const combinedClass = group.markers.length > 1 ? 'is-combined' : '';
        return `
          <span
            class="tp-price-marker ${typeClasses} ${combinedClass} ${edgeClass}"
            style="--marker-position:${group.position}%"
            title="${escapeHtml(descriptions.join(' · '))}"
            aria-label="${escapeHtml(descriptions.join(', '))}"
          >
            <span aria-hidden="true"></span>
            <small aria-hidden="true">${escapeHtml(labels.join(' = '))}</small>
          </span>
        `;
      }).join('')}
    </div>
  `;
}

export default renderPriceScale;
