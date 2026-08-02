import trackerStore from '../tracker/tracker-store.js';

const STORAGE_KEY = 'steamPriceCompare.cloudAlerts.v1';

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeState(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export default class AlertSettings {
  constructor() {
    this.overlay = document.getElementById('tpAlertOverlay');
    this.modal = document.getElementById('tpAlertModal');
    this.form = document.getElementById('tpAlertForm');
    this.status = document.getElementById('tpAlertStatus');
    this.summary = document.getElementById('tpAlertSummary');
    this.openButton = document.getElementById('tpAlertBtn');
    this.saveButton = document.getElementById('tpAlertSaveBtn');
    this.testButton = document.getElementById('tpAlertTestBtn');
    this.disableButton = document.getElementById('tpAlertDisableBtn');
    this.capabilities = null;
    this.syncTimer = null;

    this.openButton?.addEventListener('click', () => this.open());
    this.overlay?.addEventListener('click', () => this.close());
    this.modal?.querySelectorAll('[data-alert-close]').forEach((button) => button.addEventListener('click', () => this.close()));
    this.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.sync(false);
    });
    this.testButton?.addEventListener('click', () => this.sendTest());
    this.disableButton?.addEventListener('click', () => this.disable());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal?.classList.contains('is-open')) this.close();
    });
    this.updateButton();
  }

  get saved() {
    return readState();
  }

  get targetGames() {
    return trackerStore.getAllGames()
      .filter((game) => game.appId && game.targetPrice && Number.isFinite(Number(game.targetPrice.amount)))
      .map((game) => ({
        appId: Number(game.appId),
        productType: /\/sub\//i.test(game.steamUrl || '') ? 'sub' : 'app',
        name: game.customName || game.name,
        targetAmount: Number(game.targetPrice.amount),
        targetCurrency: game.targetPrice.currency,
        regionCode: game.preferredRegion || 'vn'
      }));
  }

  credentialsHeaders(saved = this.saved) {
    return {
      'Content-Type': 'application/json',
      ...(saved.clientId ? { 'X-Alert-Client-Id': saved.clientId } : {}),
      ...(saved.clientSecret ? { Authorization: `Bearer ${saved.clientSecret}` } : {})
    };
  }

  async open() {
    const saved = this.saved;
    this.form.elements.email.value = saved.channels?.email || '';
    this.form.elements.discordWebhook.value = saved.channels?.discordWebhook || '';
    this.form.elements.telegramChatId.value = saved.channels?.telegramChatId || '';
    this.overlay.classList.add('is-open');
    this.modal.classList.add('is-open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this.renderSummary();
    this.setStatus('Đang kiểm tra cấu hình máy chủ…', 'loading');
    try {
      this.capabilities = await readJson(await fetch('/api/alerts/status'));
      if (!this.capabilities.configured) {
        this.setStatus('Máy chủ chưa có SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.', 'warning');
      } else {
        const channels = this.capabilities.channels;
        this.setStatus(`Máy chủ sẵn sàng · Discord${channels.telegram ? ' · Telegram' : ''}${channels.email ? ' · Email' : ''}`, 'success');
      }
    } catch (error) {
      this.setStatus(error.message, 'error');
    }
    requestAnimationFrame(() => this.form.elements.email.focus());
  }

  close() {
    this.overlay?.classList.remove('is-open');
    this.modal?.classList.remove('is-open');
    this.modal?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  renderSummary() {
    const games = this.targetGames;
    const saved = this.saved;
    this.summary.innerHTML = `
      <div><strong>${games.length}</strong><span>game có giá mục tiêu</span></div>
      <div><strong>${saved.enabled ? 'Đang bật' : 'Chưa bật'}</strong><span>trạng thái cloud</span></div>
      <div><strong>${saved.syncedAt ? new Date(saved.syncedAt).toLocaleString('vi-VN') : '—'}</strong><span>đồng bộ gần nhất</span></div>
    `;
    this.disableButton.hidden = !saved.enabled;
  }

  formChannels() {
    return {
      email: String(this.form.elements.email.value || '').trim(),
      discordWebhook: String(this.form.elements.discordWebhook.value || '').trim(),
      telegramChatId: String(this.form.elements.telegramChatId.value || '').trim()
    };
  }

  setBusy(busy) {
    [this.saveButton, this.testButton, this.disableButton].forEach((button) => {
      if (button) button.disabled = busy;
    });
    if (this.saveButton) this.saveButton.textContent = busy ? 'Đang đồng bộ…' : 'Lưu & đồng bộ';
  }

  setStatus(message, type = '') {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.type = type;
  }

  async sync(silent = false) {
    const games = this.targetGames;
    const previous = this.saved;
    const channels = silent ? previous.channels : this.formChannels();
    if (!games.length) {
      if (!silent) this.setStatus('Hãy đặt giá mục tiêu cho ít nhất một game trước.', 'warning');
      return null;
    }
    if (!channels?.email && !channels?.discordWebhook && !channels?.telegramChatId) {
      if (!silent) this.setStatus('Hãy nhập ít nhất một kênh nhận thông báo.', 'warning');
      return null;
    }

    if (!silent) {
      this.setBusy(true);
      this.setStatus('Đang mã hóa và đồng bộ danh sách cảnh báo…', 'loading');
    }
    try {
      const result = await readJson(await fetch('/api/alerts/sync', {
        method: 'POST',
        headers: this.credentialsHeaders(previous),
        body: JSON.stringify({ channels, games })
      }));
      const next = {
        clientId: result.clientId,
        clientSecret: result.clientSecret,
        channels,
        enabled: true,
        syncedAt: result.syncedAt
      };
      writeState(next);
      this.updateButton();
      this.renderSummary();
      if (!silent) this.setStatus(`Đã đồng bộ ${result.synced} cảnh báo giá.`, 'success');
      return next;
    } catch (error) {
      this.updateButton('error');
      if (!silent) this.setStatus(error.message, 'error');
      return null;
    } finally {
      if (!silent) this.setBusy(false);
    }
  }

  queueSync(change) {
    if (!this.saved.enabled || !['game:add', 'game:update', 'game:remove', 'reload'].includes(change?.type)) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.sync(true), 900);
  }

  async sendTest() {
    const saved = await this.sync(false);
    if (!saved) return;
    this.setBusy(true);
    this.setStatus('Đang gửi thông báo thử…', 'loading');
    try {
      const result = await readJson(await fetch('/api/alerts/test', {
        method: 'POST',
        headers: this.credentialsHeaders(saved),
        body: '{}'
      }));
      const sent = result.results.filter((item) => item.success).map((item) => item.channel).join(', ');
      this.setStatus(`Đã gửi thử qua: ${sent}.`, 'success');
    } catch (error) {
      this.setStatus(error.message, 'error');
    } finally {
      this.setBusy(false);
    }
  }

  async disable() {
    const saved = this.saved;
    if (!saved.clientId || !saved.clientSecret) return;
    this.setBusy(true);
    this.setStatus('Đang tắt Cloud Alerts…', 'loading');
    try {
      await readJson(await fetch('/api/alerts', {
        method: 'DELETE',
        headers: this.credentialsHeaders(saved),
        body: '{}'
      }));
      writeState({ ...saved, enabled: false });
      this.updateButton();
      this.renderSummary();
      this.setStatus('Đã tắt toàn bộ cảnh báo trên máy chủ.', 'success');
    } catch (error) {
      this.setStatus(error.message, 'error');
    } finally {
      this.setBusy(false);
    }
  }

  updateButton(forcedState = '') {
    if (!this.openButton) return;
    const saved = this.saved;
    this.openButton.dataset.alertState = forcedState || (saved.enabled ? 'active' : 'idle');
    this.openButton.textContent = saved.enabled ? `🔔 Thông báo giá · ${this.targetGames.length}` : '🔔 Thông báo giá';
  }
}
