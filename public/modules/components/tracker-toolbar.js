import { debounce } from '../utils/debounce.js';
import { createFocusTrap, escapeHtml, focusableElements } from '../utils/dom.js';

const REGION_NAMES = {
  vn: 'Việt Nam', us: 'Hoa Kỳ', cn: 'Trung Quốc', hk: 'Hồng Kông',
  jp: 'Nhật Bản', kr: 'Hàn Quốc', sg: 'Singapore', th: 'Thái Lan',
  de: 'Châu Âu', gb: 'Anh', tr: 'Thổ Nhĩ Kỳ', in: 'Ấn Độ'
};

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

export class TrackerToolbar {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.bound = false;
  }

  render({ games, collections, preferences, filteredCount }) {
    if (!this.container) return;
    const filters = preferences.filters;
    const regions = [...new Set(games.flatMap((game) => [
      game.preferredRegion,
      ...(game.comparisonRegions || [])
    ]))].filter(Boolean).sort();
    const tags = [...new Set(games.flatMap((game) => game.tags || []))].sort((a, b) => a.localeCompare(b, 'vi'));

    this.container.innerHTML = `
      <div class="tp-toolbar-main">
        <label class="tp-search">
          <span class="tp-visually-hidden">Tìm trong danh sách</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <input id="tpSearchInput" type="search" value="${escapeHtml(filters.search)}" placeholder="Tìm game, App ID, khu vực hoặc tag..." autocomplete="off">
        </label>

        <button type="button" class="tp-toolbar-button tp-mobile-filter-button" data-action="toggle-filters" aria-expanded="false" aria-controls="tpFilterGroup">
          Bộ lọc
        </button>

        <div class="tp-filter-group" id="tpFilterGroup">
          <div class="tp-mobile-filter-head">
            <strong>Bộ lọc danh sách</strong>
            <button type="button" data-action="toggle-filters" aria-label="Đóng bộ lọc">×</button>
          </div>
          <label>
            <span>Trạng thái</span>
            <select data-filter="status">
              ${option('all', 'Tất cả trạng thái', filters.status)}
              ${option('target_reached', 'Đã đạt mục tiêu', filters.status)}
              ${option('near_target', 'Gần đạt', filters.status)}
              ${option('tracking', 'Đang theo dõi', filters.status)}
              ${option('no_target', 'Chưa đặt mục tiêu', filters.status)}
              ${option('on_sale', 'Đang sale', filters.status)}
              ${option('unavailable', 'Không khả dụng', filters.status)}
              ${option('error', 'Lỗi dữ liệu', filters.status)}
            </select>
          </label>
          <label>
            <span>Khu vực</span>
            <select data-filter="region">
              ${option('all', 'Tất cả khu vực', filters.region)}
              ${regions.map((region) => option(region, REGION_NAMES[region] || region.toUpperCase(), filters.region)).join('')}
            </select>
          </label>
          <label>
            <span>Tag</span>
            <select data-filter="tag">
              ${option('all', 'Tất cả tag', filters.tag)}
              ${tags.map((tag) => option(tag, tag, filters.tag)).join('')}
            </select>
          </label>
          <label>
            <span>Khoảng giá</span>
            <select data-filter="priceRange">
              ${option('all', 'Mọi mức giá', filters.priceRange)}
              ${option('under_300', 'Dưới 300.000₫', filters.priceRange)}
              ${option('300_700', '300.000₫ – 700.000₫', filters.priceRange)}
              ${option('over_700', 'Trên 700.000₫', filters.priceRange)}
            </select>
          </label>
          <label>
            <span>Sắp xếp</span>
            <select data-filter="sort">
              ${option('attention', 'Cần chú ý trước', filters.sort)}
              ${option('nearest_target', 'Gần mục tiêu nhất', filters.sort)}
              ${option('price_low', 'Giá thấp nhất', filters.sort)}
              ${option('price_high', 'Giá cao nhất', filters.sort)}
              ${option('discount', 'Giảm nhiều nhất', filters.sort)}
              ${option('recently_updated', 'Mới cập nhật', filters.sort)}
              ${option('recently_added', 'Mới thêm', filters.sort)}
              ${option('name_az', 'Tên A–Z', filters.sort)}
              ${option('target_low', 'Mục tiêu thấp nhất', filters.sort)}
              ${option('cheapest_region', 'Khu vực rẻ nhất', filters.sort)}
            </select>
          </label>
          <button type="button" class="tp-reset-filter" data-action="reset-filters">Đặt lại bộ lọc</button>
        </div>

        <div class="tp-toolbar-actions">
          <span class="tp-result-count">${filteredCount} / ${games.length} game</span>
          <button type="button" class="tp-toolbar-button" data-action="refresh" ${navigator.onLine ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5"></path><path d="M4 18v-5h5"></path><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9"></path><path d="M5.5 15A7 7 0 0 0 18 17.5L20 15"></path></svg>
            Cập nhật giá
          </button>
          <div class="tp-segment" aria-label="Chế độ xem">
            <button type="button" data-view="grid" aria-pressed="${preferences.viewMode === 'grid'}" class="${preferences.viewMode === 'grid' ? 'is-active' : ''}">Lưới</button>
            <button type="button" data-view="list" aria-pressed="${preferences.viewMode === 'list'}" class="${preferences.viewMode === 'list' ? 'is-active' : ''}">Danh sách</button>
          </div>
          <button type="button" class="tp-toolbar-button tp-density-button" data-action="density">
            ${preferences.density === 'compact' ? 'Gọn' : 'Thoáng'}
          </button>
          <button type="button" class="tp-add-button" data-action="add">+ Thêm game</button>
        </div>
      </div>
      <div class="tp-offline-line${navigator.onLine ? ' tp-hidden' : ''}" role="status">
        Ngoại tuyến · Đang hiển thị dữ liệu đã lưu
      </div>
    `;

    this._bind();
  }

  _bind() {
    if (!this.container || this.bound) return;
    this.bound = true;

    const onSearch = debounce((event) => {
      if (event.target.id === 'tpSearchInput') this.callbacks.onFilter?.({ search: event.target.value });
    }, 300);
    this.container.addEventListener('input', onSearch);

    this.container.addEventListener('change', (event) => {
      const key = event.target.dataset.filter;
      if (key) this.callbacks.onFilter?.({ [key]: event.target.value });
    });

    const closeMobileFilters = () => {
      const panel = this.container.querySelector('#tpFilterGroup');
      const button = this.container.querySelector('.tp-mobile-filter-button');
      panel?.classList.remove('is-open');
      button?.setAttribute('aria-expanded', 'false');
      this.releaseFilterTrap?.();
      this.releaseFilterTrap = null;
    };

    this.container.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileFilters();
    });

    this.container.addEventListener('click', (event) => {
      const view = event.target.closest('[data-view]')?.dataset.view;
      if (view) this.callbacks.onView?.(view);

      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'add') this.callbacks.onAdd?.();
      if (action === 'refresh') this.callbacks.onRefresh?.();
      if (action === 'reset-filters') this.callbacks.onReset?.();
      if (action === 'density') this.callbacks.onDensity?.();
      if (action === 'toggle-filters') {
        const panel = this.container.querySelector('#tpFilterGroup');
        const button = this.container.querySelector('.tp-mobile-filter-button');
        const isOpen = !panel?.classList.contains('is-open');
        if (isOpen) {
          panel?.classList.add('is-open');
          this.releaseFilterTrap?.();
          this.releaseFilterTrap = createFocusTrap(panel, closeMobileFilters);
          requestAnimationFrame(() => focusableElements(panel)[0]?.focus());
        } else {
          closeMobileFilters();
        }
        button?.setAttribute('aria-expanded', String(Boolean(isOpen)));
      }
    });
  }
}

export default TrackerToolbar;
