import trackerStore from '../tracker/tracker-store.js';
import TrackerRepository from '../storage/storage-repository.js';
import { downloadCsv, downloadJson, readJsonFile } from '../storage/storage-import-export.js';
import { formatDateTime } from '../utils/dates.js';
import { createFocusTrap, escapeHtml } from '../utils/dom.js';

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} byte`;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1024)} KB`;
}

export class DataManager {
  constructor({ onDataChanged } = {}) {
    this.modal = document.getElementById('tpDataModal');
    this.overlay = document.getElementById('tpDataOverlay');
    this.onDataChanged = onDataChanged;
    this.importRaw = null;
    this.importPreview = null;
    this.importResult = null;
    this.inlineMessage = '';
    this.confirmReset = false;
    this.returnFocus = null;
    this.removeFocusTrap = null;

    this.overlay?.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
    this.modal?.addEventListener('click', (event) => this._handleClick(event));
    this.modal?.addEventListener('submit', (event) => this._handleSubmit(event));
    this.modal?.addEventListener('change', (event) => this._handleChange(event));
  }

  open() {
    if (!this.modal || !this.overlay) return;
    this.returnFocus = document.activeElement;
    this.modal.classList.add('is-open');
    this.overlay.classList.add('is-open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tp-modal-open');
    this.removeFocusTrap?.();
    this.removeFocusTrap = createFocusTrap(this.modal, () => this.close());
    this.render();
    requestAnimationFrame(() => this.modal.querySelector('.tp-data-close')?.focus());
  }

  close() {
    if (!this.modal || !this.overlay) return;
    this.modal.classList.remove('is-open');
    this.overlay.classList.remove('is-open');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tp-modal-open');
    this.removeFocusTrap?.();
    this.removeFocusTrap = null;
    this.confirmReset = false;
    this.returnFocus?.focus?.();
  }

  async previewFile(file) {
    this.open();
    try {
      this.importRaw = await readJsonFile(file);
      this.importPreview = TrackerRepository.previewImport(this.importRaw);
      this.importResult = null;
      this.inlineMessage = '';
    } catch (error) {
      this.importRaw = null;
      this.importPreview = null;
      this.inlineMessage = error.message;
    }
    this.render();
  }

  render() {
    if (!this.modal) return;
    const games = trackerStore.getAllGames();
    const backup = TrackerRepository.getBackupInfo();
    const storage = TrackerRepository.getStorageStatus();
    const preferences = TrackerRepository.getPreferences();
    const collections = trackerStore.collections || [];

    this.modal.innerHTML = `
      <header class="tp-data-header">
        <div>
          <p class="tp-eyebrow">LOCAL DATA</p>
          <h2 id="tpDataTitle">Quản lý dữ liệu cục bộ</h2>
          <p>Game, mức giá mục tiêu và lịch sử được lưu trên thiết bị này.</p>
        </div>
        <button type="button" class="tp-data-close" data-data-action="close" aria-label="Đóng">×</button>
      </header>

      <div class="tp-data-body">
        ${storage.error ? `
          <section class="tp-data-error" aria-labelledby="tpStorageErrorTitle">
            <div>
              <h3 id="tpStorageErrorTitle">${escapeHtml(storage.error.message)}</h3>
              <p>Kiểm tra dung lượng trình duyệt hoặc xuất dữ liệu trước khi thử lại.</p>
            </div>
            <div>
              <button type="button" data-data-action="retry-save">Thử lưu lại</button>
              <button type="button" data-data-action="export-json">Xuất dữ liệu hiện tại</button>
              ${backup ? '<button type="button" data-data-action="restore">Khôi phục backup</button>' : ''}
            </div>
          </section>
        ` : ''}

        ${this.inlineMessage ? `<p class="tp-data-inline-message" role="status">${escapeHtml(this.inlineMessage)}</p>` : ''}

        <section class="tp-data-overview" aria-label="Tổng quan dữ liệu">
          <div><span>Số game</span><strong>${games.length}</strong></div>
          <div><span>Dung lượng tracker</span><strong>${formatBytes(storage.trackerBytes)}</strong></div>
          <div><span>Schema</span><strong>v${storage.schemaVersion}</strong></div>
          <div><span>Backup gần nhất</span><strong>${backup ? escapeHtml(formatDateTime(backup.createdAt)) : 'Chưa có'}</strong></div>
        </section>

        <div class="tp-data-grid">
          <section class="tp-data-panel">
            <div class="tp-data-panel-head">
              <div>
                <h3>Nhập & xuất</h3>
                <p>Sao chép danh sách sang thiết bị khác bằng JSON hoặc CSV.</p>
              </div>
            </div>
            <div class="tp-data-actions">
              <button type="button" data-data-action="choose-file">Nhập JSON</button>
              <button type="button" data-data-action="export-json">Xuất toàn bộ JSON</button>
              <button type="button" data-data-action="export-csv">Xuất danh sách CSV</button>
              ${storage.recoveryCount ? `<button type="button" data-data-action="export-recovery">Xuất ${storage.recoveryCount} bản ghi recovery</button>` : ''}
              <input type="file" id="tpDataFileInput" accept=".json,application/json" hidden>
            </div>
            ${this._renderImportPanel()}
          </section>

          <section class="tp-data-panel">
            <div class="tp-data-panel-head">
              <div>
                <h3>Backup & khôi phục</h3>
                <p>Mỗi lần ghi dữ liệu tracker đều giữ lại trạng thái hợp lệ trước đó.</p>
              </div>
            </div>
            <dl class="tp-backup-info">
              <div><dt>Thời gian</dt><dd>${backup ? escapeHtml(formatDateTime(backup.createdAt)) : 'Chưa có backup'}</dd></div>
              <div><dt>Số game</dt><dd>${backup?.gameCount ?? '—'}</dd></div>
              <div><dt>Dung lượng</dt><dd>${backup ? formatBytes(backup.bytes) : '—'}</dd></div>
              <div><dt>Schema</dt><dd>${backup ? `v${backup.schemaVersion}` : '—'}</dd></div>
            </dl>
            <div class="tp-data-actions">
              <button type="button" data-data-action="backup">Tạo backup</button>
              ${backup ? '<button type="button" data-data-action="download-backup">Tải backup</button><button type="button" data-data-action="restore">Khôi phục backup gần nhất</button>' : ''}
            </div>
            <label class="tp-history-limit">
              <span>Giới hạn lịch sử mỗi game / khu vực</span>
              <select id="tpHistoryLimit">
                <option value="90"${preferences.historyLimit === 90 ? ' selected' : ''}>90 bản ghi</option>
                <option value="180"${preferences.historyLimit === 180 ? ' selected' : ''}>180 bản ghi</option>
                <option value="365"${preferences.historyLimit === 365 ? ' selected' : ''}>365 bản ghi</option>
              </select>
            </label>
          </section>

          <section class="tp-data-panel tp-collections-panel">
            <div class="tp-data-panel-head">
              <div>
                <h3>Bộ sưu tập tùy chỉnh</h3>
                <p>Tạo nhóm phù hợp với cách bạn lên kế hoạch mua game.</p>
              </div>
            </div>
            <form class="tp-new-collection-form">
              <label>
                <span>Tên bộ sưu tập</span>
                <input name="collectionName" maxlength="40" placeholder="Ví dụ: Muốn mua" required>
              </label>
              <button type="submit">Tạo bộ sưu tập</button>
            </form>
            <div class="tp-collection-list">
              ${collections.length ? collections.map((collection) => `
                <div>
                  <span>${escapeHtml(collection.name)}</span>
                  <small>${games.filter((game) => game.collectionIds.includes(collection.id)).length} game</small>
                  <button type="button" data-data-action="export-collection" data-collection-id="${escapeHtml(collection.id)}">Xuất</button>
                  <button type="button" data-data-action="remove-collection" data-collection-id="${escapeHtml(collection.id)}">Xóa</button>
                </div>
              `).join('') : '<p>Chưa có bộ sưu tập. Chỉ tạo những nhóm bạn thật sự cần.</p>'}
            </div>
          </section>

          <section class="tp-data-panel tp-danger-panel">
            <div class="tp-data-panel-head">
              <div>
                <h3>Xóa dữ liệu</h3>
                <p>Xóa game, mục tiêu giá, tag, bộ sưu tập và lịch sử cục bộ.</p>
              </div>
            </div>
            ${this.confirmReset ? `
              <div class="tp-inline-confirm">
                <strong>Xóa toàn bộ danh sách đã lưu?</strong>
                <p>Thao tác này sẽ xóa game, mục tiêu giá, tag, collection và lịch sử cục bộ.</p>
                <div>
                  <button type="button" data-data-action="cancel-reset">Hủy</button>
                  <button type="button" class="is-danger" data-data-action="confirm-reset">Xóa toàn bộ</button>
                </div>
              </div>
            ` : '<button type="button" class="tp-button-danger" data-data-action="show-reset">Xóa toàn bộ dữ liệu</button>'}
          </section>
        </div>
      </div>
    `;
  }

  _renderImportPanel() {
    if (this.importResult) {
      return `
        <div class="tp-import-result" role="status">
          <strong>Kết quả nhập dữ liệu</strong>
          <span>${this.importResult.imported} game được thêm</span>
          <span>${this.importResult.updated} game được cập nhật</span>
          <span>${this.importResult.skipped} game bị bỏ qua</span>
          <span>${this.importResult.invalid} bản ghi không hợp lệ</span>
        </div>
      `;
    }
    if (!this.importPreview) return '';
    return `
      <div class="tp-import-preview">
        <strong>Xem trước tệp nhập</strong>
        <dl>
          <div><dt>Game hợp lệ</dt><dd>${this.importPreview.validCount}</dd></div>
          <div><dt>Game trùng</dt><dd>${this.importPreview.duplicateCount}</dd></div>
          <div><dt>Bản ghi không hợp lệ</dt><dd>${this.importPreview.invalidCount}</dd></div>
          <div><dt>Schema</dt><dd>v${this.importPreview.schemaVersion}</dd></div>
        </dl>
        <label>
          <span>Cách xử lý</span>
          <select id="tpImportMode">
            <option value="merge">Gộp và bỏ qua game trùng</option>
            <option value="update">Gộp và cập nhật game trùng</option>
            <option value="overwrite">Ghi đè toàn bộ danh sách</option>
          </select>
        </label>
        <button type="button" data-data-action="apply-import" ${this.importPreview.valid ? '' : 'disabled'}>Nhập dữ liệu</button>
      </div>
    `;
  }

  async _handleChange(event) {
    if (event.target.id === 'tpDataFileInput' && event.target.files?.[0]) {
      await this.previewFile(event.target.files[0]);
    }
    if (event.target.id === 'tpHistoryLimit') {
      TrackerRepository.savePreferences({ historyLimit: Number(event.target.value) });
      this.inlineMessage = 'Giới hạn lịch sử cục bộ đã được cập nhật.';
      this.render();
    }
  }

  _handleSubmit(event) {
    if (!event.target.matches('.tp-new-collection-form')) return;
    event.preventDefault();
    const name = new FormData(event.target).get('collectionName');
    try {
      trackerStore.createCollection(name);
      this.inlineMessage = '';
    } catch (error) {
      this.inlineMessage = error.message;
    }
    this.render();
    this.onDataChanged?.();
  }

  _handleClick(event) {
    const button = event.target.closest('[data-data-action]');
    if (!button) return;
    const action = button.dataset.dataAction;

    if (action === 'close') this.close();
    if (action === 'choose-file') this.modal.querySelector('#tpDataFileInput')?.click();
    if (action === 'export-json') downloadJson(TrackerRepository.exportData());
    if (action === 'export-csv') downloadCsv(trackerStore.getAllGames());
    if (action === 'export-recovery') {
      downloadJson(TrackerRepository.exportRecovery(), 'steam-price-tracker-recovery.json');
    }
    if (action === 'backup') {
      const info = TrackerRepository.createBackup();
      this.inlineMessage = info ? 'Backup mới đã được tạo trong dữ liệu cục bộ.' : 'Không thể tạo backup.';
      this.render();
    }
    if (action === 'download-backup') {
      const backup = TrackerRepository.exportBackup();
      if (backup) downloadJson(backup, 'steam-price-tracker-backup.json');
    }
    if (action === 'restore') {
      const restored = TrackerRepository.restoreBackup();
      this.inlineMessage = restored ? 'Dữ liệu trong backup đã được khôi phục trực tiếp.' : 'Không thể khôi phục backup.';
      if (restored) trackerStore.reload();
      this.render();
      this.onDataChanged?.();
    }
    if (action === 'retry-save') {
      this.inlineMessage = TrackerRepository.retryLastWrite()
        ? 'Dữ liệu hiện tại đã được ghi lại.'
        : 'Thiết bị vẫn chưa thể lưu dữ liệu.';
      this.render();
    }
    if (action === 'apply-import') {
      const mode = this.modal.querySelector('#tpImportMode')?.value || 'merge';
      this.importResult = TrackerRepository.importData(this.importRaw, mode);
      trackerStore.reload();
      this.render();
      this.onDataChanged?.();
    }
    if (action === 'remove-collection') {
      trackerStore.removeCollection(button.dataset.collectionId);
      this.render();
      this.onDataChanged?.();
    }
    if (action === 'export-collection') {
      const content = TrackerRepository.exportCollection(button.dataset.collectionId);
      if (content) downloadJson(content, 'steam-price-tracker-collection.json');
    }
    if (action === 'show-reset') {
      this.confirmReset = true;
      this.render();
    }
    if (action === 'cancel-reset') {
      this.confirmReset = false;
      this.render();
    }
    if (action === 'confirm-reset') {
      TrackerRepository.clearAll();
      trackerStore.reload();
      this.confirmReset = false;
      this.inlineMessage = 'Danh sách và dữ liệu liên quan đã được xóa khỏi thiết bị này.';
      this.render();
      this.onDataChanged?.();
    }
  }
}

export default DataManager;
