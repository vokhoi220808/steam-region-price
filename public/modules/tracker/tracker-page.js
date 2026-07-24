import trackerStore from './tracker-store.js';
import TrackerRepository from '../storage/storage-repository.js';
import { applyFiltersAndSort } from './tracker-filters.js';
import { computeStatus, getDiscount } from './tracker-status.js';
import steamService from '../services/steam-service.js';
import SummaryStrip from '../components/summary-strip.js';
import TrackerToolbar from '../components/tracker-toolbar.js';
import GameCard from '../components/game-card.js';
import GameRow from '../components/game-row.js';
import GameSheet from '../components/game-sheet.js';
import GameDrawer from '../components/game-drawer.js';
import DataManager from '../components/data-manager.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { renderEmptyState } from '../components/empty-state.js';
import { downloadJson } from '../storage/storage-import-export.js';
import { formatCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/dom.js';

const SMART_FILTERS = [
  ['all', 'Tất cả'],
  ['target_reached', 'Đã đạt mục tiêu'],
  ['near_target', 'Gần đạt'],
  ['on_sale', 'Đang sale'],
  ['no_target', 'Chưa đặt mục tiêu'],
  ['price_up', 'Giá tăng'],
  ['price_down', 'Giá giảm'],
  ['favorite', 'Yêu thích']
];

export class TrackerPage {
  constructor(root) {
    this.root = root;
    this.overview = document.getElementById('tpOverview');
    this.summaryRoot = document.getElementById('tpSummary');
    this.toolbarRoot = document.getElementById('tpToolbar');
    this.collectionsRoot = document.getElementById('tpCollections');
    this.content = document.getElementById('tpContent');
    this.renderLimit = 200;
    this.mounted = false;
    this.refreshing = new Set();

    this.summary = new SummaryStrip(this.summaryRoot, (status) => {
      trackerStore.setFilters({ status });
    });
    this.toolbar = new TrackerToolbar(this.toolbarRoot, {
      onFilter: (changes) => trackerStore.setFilters(changes),
      onReset: () => trackerStore.resetFilters(),
      onView: (mode) => trackerStore.setViewMode(mode),
      onDensity: () => {
        const current = trackerStore.preferences.density;
        trackerStore.setDensity(current === 'compact' ? 'comfortable' : 'compact');
      },
      onAdd: () => this.sheet.open('add'),
      onRefresh: () => this.refreshPrices()
    });
    this.sheet = new GameSheet({
      onSaved: () => {},
      onOpenExisting: (id) => this.drawer.open(id)
    });
    this.drawer = new GameDrawer({
      onEdit: (id) => this.sheet.open('edit', id),
      onRefresh: (id) => this.refreshPrices([id]),
      onDelete: (id, onDone) => this._confirmDelete(id, onDone),
      onDuplicate: (id) => this._duplicate(id)
    });
    this.dataManager = new DataManager({
      onDataChanged: () => trackerStore.reload()
    });

    this._onStoreChange = this._onStoreChange.bind(this);
    this._onOnlineState = this._onOnlineState.bind(this);
    this._onExternalChange = this._onExternalChange.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    trackerStore.init();
    this.unsubscribe = trackerStore.subscribe(this._onStoreChange);
    window._trackerRepo = TrackerRepository;
    window._trackerPage = this;

    this.root.addEventListener('click', (event) => this._handleRootClick(event));
    this.content.addEventListener('click', (event) => this._handleContentAction(event));
    this.content.addEventListener('keydown', (event) => this._handleContentKeydown(event));
    this.content.addEventListener('error', (event) => this._handleImageError(event), true);
    window.addEventListener('online', this._onOnlineState);
    window.addEventListener('offline', this._onOnlineState);
    window.addEventListener('tracker:games-change', this._onExternalChange);
    window.addEventListener('resize', this._onResize);

    document.getElementById('tpAddBtn')?.addEventListener('click', () => this.sheet.open('add'));
    document.getElementById('tpImportBtn')?.addEventListener('click', () => {
      document.getElementById('tpTrackerFileInput')?.click();
    });
    document.getElementById('tpExportBtn')?.addEventListener('click', () => {
      downloadJson(TrackerRepository.exportData());
    });
    document.getElementById('tpDataBtn')?.addEventListener('click', () => this.dataManager.open());
    document.getElementById('tpTrackerFileInput')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) this.dataManager.previewFile(file);
      event.target.value = '';
    });

    this.render(trackerStore.getState(), { type: 'mount' });
  }

  unmount() {
    this.unsubscribe?.();
    window.removeEventListener('online', this._onOnlineState);
    window.removeEventListener('offline', this._onOnlineState);
    window.removeEventListener('tracker:games-change', this._onExternalChange);
    window.removeEventListener('resize', this._onResize);
    this.mounted = false;
  }

  refresh() {
    trackerStore.reload();
  }

  _onExternalChange() {
    trackerStore.reload();
  }

  _onOnlineState() {
    this.render(trackerStore.getState(), { type: 'online' });
  }

  _onResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.render(trackerStore.getState(), { type: 'resize' });
    }, 160);
  }

  _onStoreChange(state, change) {
    this.render(state, change);
    if (this.drawer.gameId && change.id === this.drawer.gameId) this.drawer.render();
  }

  render(state, change = { type: 'refresh' }) {
    const { games, preferences, collections } = state;
    const filtered = applyFiltersAndSort(games, preferences.filters, collections);
    this._renderOverview(games);
    this.summary.update(games, preferences.filters.status || 'all');
    this._renderCollections(collections, preferences.filters);
    this.toolbar.render({
      games,
      collections,
      preferences,
      filteredCount: filtered.length
    });
    this.root.dataset.density = preferences.density;
    this._renderContent(games, filtered, preferences, collections, change);
  }

  _renderOverview(games) {
    const reached = games.filter((game) => computeStatus(game) === 'target_reached').length;
    const near = games.filter((game) => computeStatus(game) === 'near_target').length;
    const targets = games.map((game) => game.targetPrice).filter(Boolean);
    const currencies = [...new Set(targets.map((target) => target.currency))];
    const targetTotal = currencies.length === 1
      ? formatCurrency(targets.reduce((sum, target) => sum + Number(target.amount), 0), currencies[0])
      : (targets.length ? `${targets.length} mức giá` : formatCurrency(0, 'VND'));

    this.overview.innerHTML = `
      <div><span>Đang lưu</span><strong>${games.length}</strong><small>game</small></div>
      <div><span>Đạt mục tiêu</span><strong>${reached}</strong><small>game</small></div>
      <div><span>Gần đạt</span><strong>${near}</strong><small>game</small></div>
      <div class="is-wide"><span>Tổng giá mục tiêu</span><strong>${escapeHtml(targetTotal)}</strong></div>
    `;
  }

  _renderCollections(collections, filters) {
    this.collectionsRoot.innerHTML = `
      <div class="tp-smart-label">
        <span>Bộ sưu tập thông minh</span>
        ${(filters.status !== 'all' || filters.collectionId !== 'all')
          ? '<button type="button" data-root-action="clear-smart">Xóa lọc</button>'
          : ''}
      </div>
      <div class="tp-smart-chips">
        ${SMART_FILTERS.map(([id, label]) => `
          <button
            type="button"
            data-smart-status="${id}"
            aria-current="${filters.status === id && filters.collectionId === 'all' ? 'true' : 'false'}"
            class="${filters.status === id && filters.collectionId === 'all' ? 'is-active' : ''}"
          >${escapeHtml(label)}</button>
        `).join('')}
        ${collections.map((collection) => `
          <button
            type="button"
            data-smart-collection="${escapeHtml(collection.id)}"
            aria-current="${filters.collectionId === collection.id ? 'true' : 'false'}"
            class="is-custom ${filters.collectionId === collection.id ? 'is-active' : ''}"
          >${escapeHtml(collection.name)}</button>
        `).join('')}
        <button type="button" class="tp-new-collection" data-root-action="manage-data">+ Bộ sưu tập</button>
      </div>
    `;
  }

  _renderContent(allGames, filtered, preferences, collections, change) {
    if (!allGames.length) {
      this.content.className = 'tp-content tp-content-state';
      this.content.innerHTML = renderEmptyState('empty');
      return;
    }
    if (!filtered.length) {
      this.content.className = 'tp-content tp-content-state';
      this.content.innerHTML = renderEmptyState('no-results');
      return;
    }

    const effectiveView = window.matchMedia('(max-width: 720px)').matches
      ? 'grid'
      : preferences.viewMode;
    const visibleGames = filtered.slice(0, this.renderLimit);
    const collectionMap = new Map(collections.map((item) => [item.id, item.name]));
    const canSync = (
      change.type === 'game:update'
      && this.content.dataset.view === effectiveView
      && this.content.querySelector('[data-game-list]')
    );

    if (!canSync) {
      this.content.className = `tp-content is-${effectiveView} density-${preferences.density}`;
      this.content.dataset.view = effectiveView;
      this.content.innerHTML = effectiveView === 'grid'
        ? '<div class="tp-game-grid" data-game-list></div>'
        : `
          <div class="tp-list-shell">
            <table class="tp-game-table">
              <thead>
                <tr>
                  <th><button type="button" data-action="sort" data-sort="name_az">Game</button></th>
                  <th><button type="button" data-action="sort" data-sort="attention">Trạng thái</button></th>
                  <th class="tp-numeric"><button type="button" data-action="sort" data-sort="price_low">Giá hiện tại</button></th>
                  <th class="tp-numeric"><button type="button" data-action="sort" data-sort="target_low">Giá mục tiêu</button></th>
                  <th class="tp-numeric"><button type="button" data-action="sort" data-sort="nearest_target">Chênh lệch</button></th>
                  <th class="tp-numeric"><button type="button" data-action="sort" data-sort="discount">Mức giảm</button></th>
                  <th><button type="button" data-action="sort" data-sort="cheapest_region">Khu vực rẻ nhất</button></th>
                  <th><button type="button" data-action="sort" data-sort="recently_updated">Cập nhật</button></th><th>Hành động</th>
                </tr>
              </thead>
              <tbody data-game-list></tbody>
            </table>
          </div>
        `;
    } else {
      this.content.className = `tp-content is-${effectiveView} density-${preferences.density}`;
    }

    const list = this.content.querySelector('[data-game-list]');
    const existing = new Map(
      [...list.querySelectorAll('[data-game-id]')].map((element) => [element.dataset.gameId, element])
    );
    const fragment = document.createDocumentFragment();

    visibleGames.forEach((game) => {
      let node = existing.get(game.id);
      if (!node || game.id === change.id || node.tagName !== (effectiveView === 'grid' ? 'ARTICLE' : 'TR')) {
        const template = document.createElement('template');
        template.innerHTML = effectiveView === 'grid'
          ? GameCard(game, collectionMap).trim()
          : GameRow(game).trim();
        node = template.content.firstElementChild;
      }
      fragment.appendChild(node);
      existing.delete(game.id);
    });
    existing.forEach((node) => node.remove());
    list.appendChild(fragment);

    this.content.querySelector('.tp-large-list-footer')?.remove();
    if (filtered.length > this.renderLimit) {
      this.content.insertAdjacentHTML('beforeend', `
        <div class="tp-large-list-footer">
          <span>Đang hiển thị ${this.renderLimit} / ${filtered.length} game để giữ trang phản hồi nhanh.</span>
          <button type="button" data-action="load-more">Hiển thị thêm</button>
        </div>
      `);
    }
  }

  _handleRootClick(event) {
    const summaryStatus = event.target.closest('[data-smart-status]')?.dataset.smartStatus;
    if (summaryStatus) trackerStore.setFilters({ status: summaryStatus, collectionId: 'all' });

    const collectionId = event.target.closest('[data-smart-collection]')?.dataset.smartCollection;
    if (collectionId) trackerStore.setFilters({ collectionId, status: 'all' });

    const action = event.target.closest('[data-root-action]')?.dataset.rootAction;
    if (action === 'clear-smart') trackerStore.setFilters({ status: 'all', collectionId: 'all' });
    if (action === 'manage-data') this.dataManager.open();
  }

  _handleContentKeydown(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    const item = event.target.closest('[data-game-id]');
    if (item && !event.target.closest('button, summary, a, input, select')) {
      event.preventDefault();
      this.drawer.open(item.dataset.gameId);
    }
  }

  _handleContentAction(event) {
    const actionElement = event.target.closest('[data-action]');
    const card = event.target.closest('[data-game-id]');
    if (!actionElement && card && !event.target.closest('button, summary, details, a')) {
      this.drawer.open(card.dataset.gameId);
      return;
    }
    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const id = actionElement.dataset.gameId || card?.dataset.gameId;
    if (action === 'add') this.sheet.open('add');
    if (action === 'reset-filters') trackerStore.resetFilters();
    if (action === 'open-deals') document.getElementById('navDealsBtn')?.click();
    if (action === 'details' && id) this.drawer.open(id);
    if ((action === 'edit' || action === 'tag') && id) this.sheet.open('edit', id);
    if (action === 'pin' && id) {
      const game = trackerStore.getGame(id);
      if (game) trackerStore.updateGame(id, { pinned: !game.pinned });
    }
    if (action === 'duplicate' && id) this._duplicate(id);
    if (action === 'delete' && id) this._confirmDelete(id);
    if (action === 'compare' && id) this._openCompare(id);
    if (action === 'sort') trackerStore.setFilters({ sort: actionElement.dataset.sort });
    if (action === 'load-more') {
      this.renderLimit += 100;
      this.render(trackerStore.getState(), { type: 'limit' });
    }
  }

  _handleImageError(event) {
    if (!event.target.matches('[data-game-image]')) return;
    event.target.hidden = true;
    event.target.parentElement?.classList.add('has-image-error');
  }

  _duplicate(id) {
    try {
      trackerStore.duplicateGame(id);
    } catch (error) {
      const game = trackerStore.getGame(id);
      if (game) this.sheet.open('edit', game.id);
    }
  }

  _confirmDelete(id, onDone) {
    const game = trackerStore.getGame(id);
    if (!game) return;
    this.drawer.close();
    showConfirmDialog({
      title: 'Xóa game khỏi danh sách?',
      message: `"${game.customName || game.name}" cùng lịch sử giá cục bộ của game sẽ bị xóa.`,
      confirmLabel: 'Xóa game',
      cancelLabel: 'Hủy',
      isDanger: true,
      onConfirm: () => {
        trackerStore.removeGame(id);
        onDone?.();
      }
    });
  }

  _openCompare(id) {
    const game = trackerStore.getGame(id);
    if (!game) return;
    document.getElementById('navCompareBtn')?.click();
    const search = document.getElementById('searchInput');
    if (search) search.value = String(game.appId);
    document.getElementById('searchForm')?.requestSubmit();
  }

  async refreshPrices(ids = null) {
    if (!navigator.onLine) return;
    const games = ids
      ? ids.map((id) => trackerStore.getGame(id)).filter(Boolean)
      : trackerStore.getAllGames();
    const queue = [...games];
    const worker = async () => {
      while (queue.length) {
        const game = queue.shift();
        await this._refreshOne(game);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
  }

  async _refreshOne(game) {
    if (!game || this.refreshing.has(game.id)) return;
    this.refreshing.add(game.id);
    this.root.dataset.refreshing = 'true';
    try {
      const currency = game.targetPrice?.currency || game.latestPrice?.currency || 'VND';
      const response = await steamService.getPrices(game.appId, {
        regions: game.comparisonRegions,
        currency
      });
      const changes = steamService.normalizePriceData(game, response);
      TrackerRepository.recordPriceSnapshots(game.id, changes.regionalPrices, changes.lastCheckedAt);
      trackerStore.updateGame(game.id, changes);
    } catch (error) {
      if (error.name !== 'AbortError') {
        trackerStore.updateGame(game.id, {
          errorData: { message: error.message, occurredAt: new Date().toISOString() }
        });
      }
    } finally {
      this.refreshing.delete(game.id);
      if (!this.refreshing.size) delete this.root.dataset.refreshing;
    }
  }
}

export function init() {
  const root = document.getElementById('trackerView');
  if (!root) return null;
  const page = new TrackerPage(root);
  page.mount();
  return page;
}

init();
