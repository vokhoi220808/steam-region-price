import { computeStatus, getDiscount } from '../tracker/tracker-status.js';
import { escapeHtml } from '../utils/dom.js';

const ITEMS = [
  { id: 'all', label: 'Tất cả game', detail: 'Toàn bộ danh sách', icon: '▦' },
  { id: 'target_reached', label: 'Đã đạt mục tiêu', detail: 'Giá hiện tại ≤ mục tiêu', icon: '✓' },
  { id: 'near_target', label: 'Gần đạt mục tiêu', detail: 'Chênh lệch không quá 10%', icon: '◌' },
  { id: 'on_sale', label: 'Đang giảm giá', detail: 'Có ưu đãi tại ít nhất một vùng', icon: '↓' },
  { id: 'no_target', label: 'Chưa đặt mục tiêu', detail: 'Cần bổ sung mức giá', icon: '—' }
];

export class SummaryStrip {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.container?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-summary-filter]');
      if (button) this.onSelect?.(button.dataset.summaryFilter);
    });
  }

  update(games, activeStatus = 'all') {
    if (!this.container) return;
    const counts = { all: games.length, target_reached: 0, near_target: 0, on_sale: 0, no_target: 0 };
    games.forEach((game) => {
      const status = computeStatus(game);
      if (counts[status] !== undefined) counts[status] += 1;
      if (getDiscount(game) > 0) counts.on_sale += 1;
    });

    this.container.innerHTML = ITEMS.map((item) => `
      <button
        type="button"
        class="tp-summary-item${activeStatus === item.id ? ' is-active' : ''}"
        data-summary-filter="${item.id}"
        role="tab"
        aria-selected="${activeStatus === item.id}"
      >
        <span class="tp-summary-icon" aria-hidden="true">${item.icon}</span>
        <span class="tp-summary-copy">
          <span class="tp-summary-label">${escapeHtml(item.label)}</span>
          <strong class="tp-summary-value">${counts[item.id]}</strong>
          <span class="tp-summary-detail">${escapeHtml(item.detail)}</span>
        </span>
      </button>
    `).join('');
  }
}

export default SummaryStrip;
