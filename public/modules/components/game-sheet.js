import trackerStore from '../tracker/tracker-store.js';
import steamService from '../services/steam-service.js';
import { CURRENCIES, formatCurrency } from '../utils/currency.js';
import { createFocusTrap, escapeHtml, focusableElements } from '../utils/dom.js';

const REGIONS = [
  ['vn', 'Việt Nam'], ['cn', 'Trung Quốc'], ['hk', 'Hồng Kông'],
  ['us', 'Hoa Kỳ'], ['jp', 'Nhật Bản'], ['kr', 'Hàn Quốc'],
  ['sg', 'Singapore'], ['th', 'Thái Lan'], ['de', 'Châu Âu']
];

export class GameSheet {
  constructor({ onSaved, onOpenExisting } = {}) {
    this.sheet = document.getElementById('tpSheet');
    this.overlay = document.getElementById('tpSheetOverlay');
    this.header = document.getElementById('tpSheetHeader');
    this.body = document.getElementById('tpSheetBody');
    this.footer = document.getElementById('tpSheetFooter');
    this.onSaved = onSaved;
    this.onOpenExisting = onOpenExisting;
    this.mode = 'add';
    this.gameId = null;
    this.selected = null;
    this.returnFocus = null;
    this.removeFocusTrap = null;
    this.searchRequest = 0;

    this.overlay?.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
  }

  open(mode = 'add', gameId = null) {
    if (!this.sheet || !this.overlay) return;
    this.mode = mode;
    this.gameId = gameId;
    this.returnFocus = document.activeElement;
    this.sheet.classList.add('is-open');
    this.overlay.classList.add('is-open');
    this.sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tp-modal-open');
    this.removeFocusTrap?.();
    this.removeFocusTrap = createFocusTrap(this.sheet, () => this.close());

    if (mode === 'edit') {
      const game = trackerStore.getGame(gameId);
      if (!game) return this.close();
      this.selected = game;
      this._renderSetup(game);
    } else {
      this.selected = null;
      this._renderSearch();
    }
  }

  close() {
    if (!this.sheet || !this.overlay) return;
    steamService.searchController?.abort();
    this.sheet.classList.remove('is-open');
    this.overlay.classList.remove('is-open');
    this.sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tp-modal-open');
    this.removeFocusTrap?.();
    this.removeFocusTrap = null;
    this.returnFocus?.focus?.();
  }

  _renderHeader(step, title, description) {
    this.header.innerHTML = `
      <div>
        <p class="tp-sheet-step">${escapeHtml(step)}</p>
        <h2 id="tpSheetTitle">${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
      <button type="button" class="tp-sheet-close" data-sheet-action="close" aria-label="Đóng">×</button>
    `;
    this.header.querySelector('[data-sheet-action="close"]').addEventListener('click', () => this.close());
  }

  _renderSearch() {
    this._renderHeader(
      'BƯỚC 1 / 2',
      'Chọn game',
      'Tìm bằng tên game, Steam App ID hoặc đường dẫn Steam.'
    );
    this.body.innerHTML = `
      <div class="tp-sheet-search-step">
        <label class="tp-field">
          <span>Tên game, App ID hoặc Steam URL</span>
          <div class="tp-sheet-search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
            <input id="tpGameSearch" type="search" placeholder="Ví dụ: ELDEN RING hoặc 1245620" autocomplete="off">
          </div>
          <small class="tp-field-hint">Kết quả được lấy từ Steam khi bạn nhập ít nhất 2 ký tự.</small>
        </label>
        <div class="tp-search-results" id="tpGameSearchResults" aria-live="polite">
          <div class="tp-sheet-search-idle">
            <span aria-hidden="true">⌕</span>
            <strong>Tìm game bạn muốn lưu</strong>
            <p>Thông tin giá sẽ được lấy sau khi bạn chọn game.</p>
          </div>
        </div>
      </div>
    `;
    this.footer.innerHTML = `
      <button type="button" class="tp-button-secondary" data-sheet-action="cancel">Hủy</button>
    `;
    this.footer.querySelector('[data-sheet-action="cancel"]').addEventListener('click', () => this.close());

    const input = this.body.querySelector('#tpGameSearch');
    const results = this.body.querySelector('#tpGameSearchResults');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const query = input.value.trim();
      if (query.length < 2) {
        results.innerHTML = '<p class="tp-inline-note">Nhập thêm để bắt đầu tìm kiếm.</p>';
        return;
      }
      timer = setTimeout(() => this._search(query, results), 350);
    });
    requestAnimationFrame(() => input.focus());
  }

  async _search(query, container) {
    const requestId = ++this.searchRequest;
    container.innerHTML = `
      <div class="tp-inline-loading">
        <span aria-hidden="true"></span>
        Đang tìm trên Steam…
      </div>
    `;

    try {
      const results = await steamService.search(query);
      if (requestId !== this.searchRequest) return;
      if (!results.length) {
        container.innerHTML = `
          <div class="tp-sheet-search-idle">
            <strong>Không tìm thấy game phù hợp</strong>
            <p>Thử kiểm tra lại tên, App ID hoặc đường dẫn Steam.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = results.map((result) => {
        const existing = trackerStore.getAllGames().find((game) => game.appId === result.appId);
        return `
          <article class="tp-search-result${existing ? ' is-existing' : ''}">
            <img src="${escapeHtml(result.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${result.appId}/header.jpg`)}" alt="" loading="lazy">
            <div>
              <strong>${escapeHtml(result.name)}</strong>
              <span>App ID ${result.appId}</span>
              <small>
                ${result.currentPrice !== null ? escapeHtml(formatCurrency(result.currentPrice, result.currency || 'VND')) : 'Chưa có giá'}
                ${result.discount > 0 ? ` · Giảm ${result.discount}%` : ''}
              </small>
            </div>
            ${existing ? `
              <div class="tp-result-existing">
                <span>Game này đã có trong danh sách.</span>
                <button type="button" data-open-existing="${escapeHtml(existing.id)}">Mở game</button>
              </div>
            ` : `
              <button type="button" class="tp-result-select" data-select-app="${result.appId}">Chọn</button>
            `}
          </article>
        `;
      }).join('');

      container.querySelectorAll('[data-open-existing]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.dataset.openExisting;
          this.close();
          this.onOpenExisting?.(id);
        });
      });
      container.querySelectorAll('[data-select-app]').forEach((button) => {
        button.addEventListener('click', () => {
          const result = results.find((item) => item.appId === Number(button.dataset.selectApp));
          if (result) this._selectResult(result);
        });
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      container.innerHTML = `
        <div class="tp-inline-error">
          <strong>Chưa thể tìm game.</strong>
          <span>${escapeHtml(error.message)}</span>
          <button type="button" data-retry-search>Thử lại</button>
        </div>
      `;
      container.querySelector('[data-retry-search]')?.addEventListener('click', () => this._search(query, container));
    }
  }

  async _selectResult(result) {
    this._renderHeader('BƯỚC 2 / 2', 'Thiết lập game', 'Đang lấy giá hiện tại tại các khu vực đã chọn.');
    this.body.innerHTML = `
      <div class="tp-inline-loading tp-inline-loading-large">
        <span aria-hidden="true"></span>
        Đang chuẩn bị dữ liệu cho ${escapeHtml(result.name)}…
      </div>
    `;
    this.footer.innerHTML = '';

    const base = {
      ...result,
      name: result.name,
      appId: result.appId,
      headerImage: result.headerImage,
      steamUrl: `https://store.steampowered.com/app/${result.appId}`,
      targetPrice: null,
      preferredRegion: 'vn',
      comparisonRegions: ['vn', 'cn', 'hk', 'us'],
      tags: [],
      collectionIds: [],
      note: '',
      pinned: false
    };

    try {
      const response = await steamService.getPrices(result.appId, {
        regions: base.comparisonRegions,
        currency: 'VND'
      });
      this.selected = { ...base, ...steamService.normalizePriceData(base, response), steamVerified: true };
    } catch (error) {
      this.body.innerHTML = `
        <div class="tp-inline-error">
          <strong>Không thể thêm game này.</strong>
          <span>${escapeHtml(error.message || 'App ID không tồn tại trên Steam Store.')}</span>
          <button type="button" data-retry-selection>Thử lại</button>
        </div>
      `;
      this.footer.innerHTML = '<button type="button" class="tp-button-secondary" data-sheet-action="back">Quay lại</button>';
      this.body.querySelector('[data-retry-selection]')?.addEventListener('click', () => this._selectResult(result));
      this.footer.querySelector('[data-sheet-action="back"]')?.addEventListener('click', () => this._renderSearch());
      return;
    }
    this._renderSetup(this.selected);
  }

  _renderSetup(game) {
    this._renderHeader(
      this.mode === 'edit' ? 'CHỈNH SỬA' : 'BƯỚC 2 / 2',
      this.mode === 'edit' ? 'Chỉnh sửa game' : 'Thiết lập game',
      'Mọi thay đổi được lưu trực tiếp trên thiết bị này.'
    );
    const targetCurrency = game.targetPrice?.currency || game.latestPrice?.currency || 'VND';
    const comparisonRegions = new Set(game.comparisonRegions || ['vn', 'cn', 'hk', 'us']);
    const collections = trackerStore.collections || [];

    this.body.innerHTML = `
      <form id="tpGameForm" novalidate>
        <div class="tp-selected-game">
          <img src="${escapeHtml(game.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`)}" alt="">
          <div>
            <strong>${escapeHtml(game.name)}</strong>
            <span>Steam App ID ${game.appId}</span>
            <small>${game.latestPrice ? `Giá hiện tại ${escapeHtml(formatCurrency(game.latestPrice.amount, game.latestPrice.currency))}` : 'Chưa có dữ liệu giá tại vùng ưu tiên'}</small>
          </div>
        </div>

        <div class="tp-form-grid">
          <label class="tp-field">
            <span>Tên hiển thị tùy chỉnh</span>
            <input name="customName" type="text" value="${escapeHtml(game.customName || '')}" placeholder="${escapeHtml(game.name)}">
          </label>
          <label class="tp-field">
            <span>Edition</span>
            <input name="edition" type="text" value="${escapeHtml(game.edition || 'Standard')}" placeholder="Standard">
          </label>
        </div>

        <fieldset class="tp-fieldset">
          <legend>Giá mục tiêu</legend>
          <div class="tp-target-row">
            <label class="tp-field">
              <span>Số tiền</span>
              <input name="targetAmount" type="number" min="0" step="1" value="${game.targetPrice?.amount ?? ''}" inputmode="decimal" placeholder="700000">
              <small class="tp-field-error" data-error-for="targetAmount"></small>
            </label>
            <label class="tp-field">
              <span>Tiền tệ</span>
              <select name="targetCurrency">
                ${CURRENCIES.map((currency) => `
                  <option value="${currency.code}"${currency.code === targetCurrency ? ' selected' : ''}>${currency.code} · ${escapeHtml(currency.name)}</option>
                `).join('')}
              </select>
            </label>
          </div>
        </fieldset>

        <label class="tp-field">
          <span>Khu vực ưu tiên</span>
          <select name="preferredRegion">
            ${REGIONS.map(([code, name]) => `<option value="${code}"${code === game.preferredRegion ? ' selected' : ''}>${escapeHtml(name)} · ${code.toUpperCase()}</option>`).join('')}
          </select>
        </label>

        <fieldset class="tp-fieldset">
          <legend>Khu vực so sánh</legend>
          <div class="tp-region-checks">
            ${REGIONS.map(([code, name]) => `
              <label>
                <input type="checkbox" name="comparisonRegions" value="${code}"${comparisonRegions.has(code) ? ' checked' : ''}>
                <span>${escapeHtml(name)}</span>
              </label>
            `).join('')}
          </div>
          <small class="tp-field-error" data-error-for="comparisonRegions"></small>
        </fieldset>

        <div class="tp-form-grid">
          <label class="tp-field">
            <span>Tag</span>
            <input name="tags" type="text" value="${escapeHtml((game.tags || []).join(', '))}" placeholder="RPG, Co-op, Sinh tồn">
            <small class="tp-field-hint">Phân tách nhiều tag bằng dấu phẩy.</small>
          </label>
          <fieldset class="tp-fieldset tp-collection-fieldset">
            <legend>Bộ sưu tập</legend>
            <div class="tp-collection-checks">
              ${collections.length ? collections.map((collection) => `
                <label>
                  <input type="checkbox" name="collectionIds" value="${escapeHtml(collection.id)}"${game.collectionIds?.includes(collection.id) ? ' checked' : ''}>
                  <span>${escapeHtml(collection.name)}</span>
                </label>
              `).join('') : '<p>Chưa có bộ sưu tập tùy chỉnh.</p>'}
            </div>
          </fieldset>
        </div>

        <label class="tp-field">
          <span>Ghi chú cá nhân</span>
          <textarea name="note" rows="4" placeholder="Ví dụ: mua để chơi co-op cuối tuần">${escapeHtml(game.note || '')}</textarea>
        </label>

        <label class="tp-switch-field">
          <input name="pinned" type="checkbox"${game.pinned ? ' checked' : ''}>
          <span>
            <strong>Ghim game</strong>
            <small>Đưa game lên đầu danh sách khi sắp xếp theo mức ưu tiên.</small>
          </span>
        </label>
      </form>
    `;

    this.footer.innerHTML = `
      <button type="button" class="tp-button-secondary" data-sheet-action="back">${this.mode === 'edit' ? 'Hủy' : 'Quay lại'}</button>
      <button type="submit" form="tpGameForm" class="tp-button-primary">Lưu game</button>
    `;
    this.footer.querySelector('[data-sheet-action="back"]').addEventListener('click', () => {
      if (this.mode === 'edit') this.close();
      else this._renderSearch();
    });
    this.body.querySelector('#tpGameForm').addEventListener('submit', (event) => this._save(event, game));
    requestAnimationFrame(() => focusableElements(this.body)[0]?.focus());
  }

  _save(event, game) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const targetValue = String(data.get('targetAmount') || '').trim();
    const targetAmount = targetValue === '' ? null : Number(targetValue);
    const comparisonRegions = data.getAll('comparisonRegions').map(String);
    const errors = {};

    if (this.mode !== 'edit' && !game.steamVerified) {
      errors.game = 'Game chưa được Steam xác thực nên không thể lưu.';
    }

    if (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount < 0)) {
      errors.targetAmount = 'Giá mục tiêu phải là số không âm.';
    }
    if (!comparisonRegions.length) errors.comparisonRegions = 'Chọn ít nhất một khu vực.';

    this.body.querySelectorAll('.tp-field-error').forEach((element) => {
      element.textContent = errors[element.dataset.errorFor] || '';
    });
    if (Object.keys(errors).length) {
      if (errors.game) {
        const inline = document.createElement('p');
        inline.className = 'tp-form-submit-error';
        inline.textContent = errors.game;
        form.prepend(inline);
      }
      const firstField = form.querySelector(`[name="${Object.keys(errors)[0]}"]`);
      firstField?.focus();
      return;
    }

    const preferredRegion = String(data.get('preferredRegion') || 'vn');
    if (!comparisonRegions.includes(preferredRegion)) comparisonRegions.unshift(preferredRegion);
    const targetCurrency = String(data.get('targetCurrency') || 'VND');
    const tags = [...new Set(String(data.get('tags') || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean))];

    const changes = {
      customName: String(data.get('customName') || '').trim() || null,
      edition: String(data.get('edition') || '').trim() || 'Standard',
      targetPrice: targetAmount === null ? null : { amount: targetAmount, currency: targetCurrency },
      preferredRegion,
      comparisonRegions,
      tags,
      collectionIds: data.getAll('collectionIds').map(String),
      note: String(data.get('note') || ''),
      pinned: data.get('pinned') === 'on'
    };

    const priceContextChanged = (
      game.latestPrice
      && (
        game.latestPrice.currency !== targetCurrency
        || game.preferredRegion !== preferredRegion
        || [...(game.comparisonRegions || [])].sort().join(',') !== [...comparisonRegions].sort().join(',')
      )
    );
    if (priceContextChanged) {
      changes.latestPrice = null;
      changes.regionalPrices = [];
      changes.lastCheckedAt = null;
      changes.errorData = null;
    }

    try {
      const saved = this.mode === 'edit'
        ? trackerStore.updateGame(this.gameId, changes)
        : trackerStore.addGame({ ...game, ...changes });
      this.close();
      this.onSaved?.(saved);
    } catch (error) {
      const inline = document.createElement('p');
      inline.className = 'tp-form-submit-error';
      inline.textContent = error.message || 'Không thể lưu game.';
      form.prepend(inline);
      inline.focus?.();
    }
  }
}

export default GameSheet;
