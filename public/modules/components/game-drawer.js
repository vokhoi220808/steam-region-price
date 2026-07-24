import trackerStore from '../tracker/tracker-store.js';
import TrackerRepository from '../storage/storage-repository.js';
import { downloadJson } from '../storage/storage-import-export.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDateTime, formatRelative } from '../utils/dates.js';
import { createFocusTrap, escapeHtml } from '../utils/dom.js';
import { computeGap, computeStatus, getCheapestRegion, getDiscount, STATUS_META } from '../tracker/tracker-status.js';

const TABS = [
  ['overview', 'Tổng quan'],
  ['regions', 'Khu vực'],
  ['history', 'Lịch sử cục bộ'],
  ['storage', 'Thông tin lưu trữ']
];

export class GameDrawer {
  constructor(callbacks = {}) {
    this.drawer = document.getElementById('tpDrawer');
    this.overlay = document.getElementById('tpDrawerOverlay');
    this.header = document.getElementById('tpDrawerHeader');
    this.tabs = document.getElementById('tpDrawerTabs');
    this.content = document.getElementById('tpDrawerContent');
    this.callbacks = callbacks;
    this.gameId = null;
    this.activeTab = 'overview';
    this.returnFocus = null;
    this.removeFocusTrap = null;

    this.overlay?.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
    this.tabs?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-drawer-tab]');
      if (!button) return;
      this.activeTab = button.dataset.drawerTab;
      this.render();
    });
    this.drawer?.addEventListener('click', (event) => this._handleAction(event));
  }

  open(gameId) {
    const game = trackerStore.getGame(gameId);
    if (!game || !this.drawer || !this.overlay) return;
    this.gameId = gameId;
    this.activeTab = 'overview';
    this.returnFocus = document.activeElement;
    this.drawer.classList.add('is-open');
    this.overlay.classList.add('is-open');
    this.drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tp-modal-open');
    this.removeFocusTrap?.();
    this.removeFocusTrap = createFocusTrap(this.drawer, () => this.close());
    this.render();
    requestAnimationFrame(() => this.drawer.querySelector('.tp-drawer-close')?.focus());
  }

  close() {
    if (!this.drawer || !this.overlay) return;
    this.drawer.classList.remove('is-open');
    this.overlay.classList.remove('is-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tp-modal-open');
    this.removeFocusTrap?.();
    this.removeFocusTrap = null;
    this.gameId = null;
    this.returnFocus?.focus?.();
  }

  render() {
    const game = trackerStore.getGame(this.gameId);
    if (!game) return this.close();
    const name = game.customName || game.name;
    this.header.innerHTML = `
      <img src="${escapeHtml(game.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`)}" alt="">
      <div>
        <span>STEAM APP ${game.appId}</span>
        <h2 id="tpDrawerTitle">${escapeHtml(name)}</h2>
        <p>${escapeHtml(game.edition)} · ${game.preferredRegion.toUpperCase()} · ${game.lastCheckedAt ? escapeHtml(formatRelative(game.lastCheckedAt)) : 'chưa kiểm tra giá'}</p>
      </div>
      <button type="button" class="tp-drawer-close" data-drawer-action="close" aria-label="Đóng">×</button>
    `;
    this.tabs.innerHTML = TABS.map(([id, label]) => `
      <button
        type="button"
        role="tab"
        id="tpTab-${id}"
        data-drawer-tab="${id}"
        aria-selected="${this.activeTab === id}"
        aria-controls="tpDrawerContent"
        class="${this.activeTab === id ? 'is-active' : ''}"
      >${escapeHtml(label)}</button>
    `).join('');
    this.content.setAttribute('aria-labelledby', `tpTab-${this.activeTab}`);
    this.content.innerHTML = this._renderTab(game);
  }

  _renderTab(game) {
    if (this.activeTab === 'regions') return this._renderRegions(game);
    if (this.activeTab === 'history') return this._renderHistory(game);
    if (this.activeTab === 'storage') return this._renderStorage(game);
    return this._renderOverview(game);
  }

  _renderOverview(game) {
    const status = computeStatus(game);
    const meta = STATUS_META[status];
    const gap = computeGap(game);
    const currency = game.latestPrice?.currency || game.targetPrice?.currency || 'VND';
    const collections = (game.collectionIds || [])
      .map((id) => trackerStore.collections.find((item) => item.id === id)?.name)
      .filter(Boolean);

    return `
      <div class="tp-drawer-section">
        ${game.errorData ? `
          <div class="tp-game-inline-error">
            <div>
              <strong>Chưa thể cập nhật giá game này.</strong>
              <span>Đang hiển thị dữ liệu gần nhất · ${escapeHtml(formatDateTime(game.lastCheckedAt))}</span>
            </div>
            <button type="button" data-drawer-action="refresh">Thử lại</button>
          </div>
        ` : ''}
        <div class="tp-drawer-price-hero">
          <div>
            <span>Giá hiện tại</span>
            <strong>${game.latestPrice ? escapeHtml(formatCurrency(game.latestPrice.amount, currency)) : 'Chưa có dữ liệu'}</strong>
            <small>${game.latestPrice ? `Khu vực ${escapeHtml(game.latestPrice.region.toUpperCase())}` : 'Tại khu vực ưu tiên'}</small>
          </div>
          <span class="tp-status-badge is-${meta.tone}"><span aria-hidden="true">${meta.icon}</span>${escapeHtml(meta.label)}</span>
        </div>

        <dl class="tp-drawer-stats">
          <div><dt>Giá mục tiêu</dt><dd>${game.targetPrice ? escapeHtml(formatCurrency(game.targetPrice.amount, game.targetPrice.currency)) : 'Chưa đặt'}</dd></div>
          <div><dt>Chênh lệch</dt><dd>${gap ? escapeHtml(formatCurrency(gap.difference, currency)) : '—'}${gap ? `<small>${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(gap.percent)}%</small>` : ''}</dd></div>
          <div><dt>Mức giảm</dt><dd>${getDiscount(game) > 0 ? `−${getDiscount(game)}%` : 'Không giảm'}</dd></div>
          <div><dt>Giá niêm yết</dt><dd>${game.latestPrice?.originalAmount ? escapeHtml(formatCurrency(game.latestPrice.originalAmount, currency)) : '—'}</dd></div>
          <div><dt>Khu vực ưu tiên</dt><dd>${escapeHtml(game.preferredRegion.toUpperCase())}</dd></div>
          <div><dt>Kiểm tra gần nhất</dt><dd>${escapeHtml(formatDateTime(game.lastCheckedAt))}</dd></div>
        </dl>

        <div class="tp-drawer-copy-block">
          <h3>Ghi chú</h3>
          <p>${game.note ? escapeHtml(game.note) : 'Chưa có ghi chú cá nhân.'}</p>
        </div>
        <div class="tp-drawer-copy-block">
          <h3>Tag & bộ sưu tập</h3>
          <div class="tp-drawer-chips">
            ${(game.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            ${collections.map((name) => `<span class="is-collection">${escapeHtml(name)}</span>`).join('')}
            ${!(game.tags?.length || collections.length) ? '<small>Chưa phân loại game này.</small>' : ''}
          </div>
        </div>

        <div class="tp-drawer-primary-actions">
          <button type="button" class="tp-button-primary" data-drawer-action="edit">${game.targetPrice ? 'Chỉnh sửa' : 'Đặt mục tiêu'}</button>
          <button type="button" class="tp-button-secondary" data-drawer-action="refresh" ${navigator.onLine ? '' : 'disabled'}>Cập nhật giá</button>
        </div>
      </div>
    `;
  }

  _renderRegions(game) {
    const cheapest = getCheapestRegion(game);
    if (!game.regionalPrices?.length) {
      return `
        <div class="tp-drawer-empty">
          <strong>Chưa có dữ liệu khu vực</strong>
          <p>Cập nhật giá để lưu mức giá hiện tại ở các khu vực đã chọn.</p>
          <button type="button" class="tp-button-primary" data-drawer-action="refresh" ${navigator.onLine ? '' : 'disabled'}>Cập nhật giá</button>
        </div>
      `;
    }

    const preferredPrice = game.regionalPrices.find((price) => price.region === game.preferredRegion);
    return `
      <div class="tp-drawer-section">
        <div class="tp-table-scroll">
          <table class="tp-region-table">
            <thead>
              <tr>
                <th>Khu vực</th>
                <th>Tiền tệ</th>
                <th class="tp-numeric">Giá Steam</th>
                <th class="tp-numeric">Giá quy đổi</th>
                <th class="tp-numeric">Chênh lệch</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${game.regionalPrices.map((price) => {
                const isCheapest = cheapest?.region === price.region;
                const isPreferred = game.preferredRegion === price.region;
                const isVietnam = price.region === 'vn';
                const difference = price.available && preferredPrice?.available
                  ? Number(price.convertedAmount) - Number(preferredPrice.convertedAmount)
                  : null;
                return `
                  <tr class="${isCheapest ? 'is-cheapest ' : ''}${isPreferred ? 'is-preferred ' : ''}${!price.available ? 'is-unavailable' : ''}">
                    <td>
                      <strong>${escapeHtml(price.regionName || price.region.toUpperCase())}</strong>
                      <small>
                        ${isCheapest ? 'Rẻ nhất' : ''}
                        ${isPreferred ? ' · Ưu tiên' : ''}
                        ${isVietnam ? ' · Việt Nam' : ''}
                      </small>
                    </td>
                    <td>${escapeHtml(price.currency || '—')}</td>
                    <td class="tp-numeric">${price.available ? escapeHtml(formatCurrency(price.amount, price.currency)) : 'Không khả dụng'}</td>
                    <td class="tp-numeric">${price.available ? escapeHtml(formatCurrency(price.convertedAmount, price.convertedCurrency)) : '—'}</td>
                    <td class="tp-numeric">${difference !== null ? escapeHtml(formatCurrency(difference, price.convertedCurrency)) : '—'}</td>
                    <td>${price.error ? 'Lỗi dữ liệu' : (price.available ? 'Có giá' : 'Không có giá')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderHistory(game) {
    const history = TrackerRepository.getHistory(game.id);
    if (!history.length) {
      return `
        <div class="tp-drawer-empty">
          <strong>Chưa có đủ dữ liệu giá đã lưu.</strong>
          <p>Lịch sử chỉ được tạo khi bạn mở trang và cập nhật được một mức giá mới.</p>
        </div>
      `;
    }
    return `
      <div class="tp-drawer-section">
        <p class="tp-local-history-label">Lịch sử được lưu trên thiết bị này</p>
        <div class="tp-table-scroll">
          <table class="tp-history-table">
            <thead><tr><th>Ngày</th><th>Giá</th><th>Khu vực</th><th>Tiền tệ</th><th>Giá quy đổi</th></tr></thead>
            <tbody>
              ${history.map((record) => `
                <tr>
                  <td>${escapeHtml(formatDateTime(record.checkedAt))}</td>
                  <td class="tp-numeric">${escapeHtml(formatCurrency(record.amount, record.currency))}</td>
                  <td>${escapeHtml(record.region.toUpperCase())}</td>
                  <td>${escapeHtml(record.currency)}</td>
                  <td class="tp-numeric">${escapeHtml(formatCurrency(record.convertedAmount, record.convertedCurrency))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderStorage(game) {
    const size = new Blob([JSON.stringify(game)]).size;
    return `
      <div class="tp-drawer-section">
        <dl class="tp-storage-list">
          <div><dt>ID local</dt><dd><code>${escapeHtml(game.id)}</code></dd></div>
          <div><dt>App ID</dt><dd><code>${game.appId}</code></dd></div>
          <div><dt>Ngày thêm</dt><dd>${escapeHtml(formatDateTime(game.createdAt))}</dd></div>
          <div><dt>Lần sửa gần nhất</dt><dd>${escapeHtml(formatDateTime(game.updatedAt))}</dd></div>
          <div><dt>Lần kiểm tra giá gần nhất</dt><dd>${escapeHtml(formatDateTime(game.lastCheckedAt))}</dd></div>
          <div><dt>Phiên bản schema</dt><dd>1</dd></div>
          <div><dt>Dung lượng ước tính</dt><dd>${new Intl.NumberFormat('vi-VN').format(size)} byte</dd></div>
        </dl>
        <div class="tp-storage-actions">
          <button type="button" class="tp-button-secondary" data-drawer-action="export">Xuất game này</button>
          <button type="button" class="tp-button-secondary" data-drawer-action="duplicate">Nhân bản</button>
          <button type="button" class="tp-button-danger" data-drawer-action="delete">Xóa game</button>
        </div>
      </div>
    `;
  }

  _handleAction(event) {
    const action = event.target.closest('[data-drawer-action]')?.dataset.drawerAction;
    if (!action || !this.gameId) {
      if (action === 'close') this.close();
      return;
    }
    if (action === 'close') this.close();
    if (action === 'edit') {
      const id = this.gameId;
      this.close();
      this.callbacks.onEdit?.(id);
    }
    if (action === 'refresh') this.callbacks.onRefresh?.(this.gameId);
    if (action === 'delete') this.callbacks.onDelete?.(this.gameId, () => this.close());
    if (action === 'duplicate') this.callbacks.onDuplicate?.(this.gameId);
    if (action === 'export') {
      const content = TrackerRepository.exportGame(this.gameId);
      const game = trackerStore.getGame(this.gameId);
      if (content && game) downloadJson(content, `steam-game-${game.appId}.json`);
    }
  }
}

export default GameDrawer;
