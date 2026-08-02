import TrackerRepository from '../storage/storage-repository.js';

let accountState = { authenticated: false };
let installPrompt = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function safeHttpUrl(value, fallback = '/logo.jpg') {
  try {
    const url = new URL(String(value), location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : fallback;
  } catch { return fallback; }
}

function toast(message, type = 'success') {
  let root = document.getElementById('accountToastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'accountToastRoot';
    root.className = 'account-toast-root';
    document.body.append(root);
  }
  const item = document.createElement('div');
  item.className = `account-toast ${type}`;
  item.textContent = message;
  root.append(item);
  setTimeout(() => item.remove(), 3500);
}

async function json(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status });
  return data;
}

function channelsFromLocal() {
  try { return JSON.parse(localStorage.getItem('steamPriceCompare.cloudAlerts.v1') || '{}').channels || {}; } catch { return {}; }
}

function mergeCloudGames(cloudGames) {
  TrackerRepository.init();
  for (const cloud of cloudGames || []) {
    const local = TrackerRepository.getByAppId(cloud.appId);
    if (!local) {
      try { TrackerRepository.create(cloud); } catch { /* retain the valid local schema only */ }
    } else if (Date.parse(cloud.updatedAt || 0) > Date.parse(local.updatedAt || 0)) {
      TrackerRepository.update(local.id, cloud);
    }
  }
  window.dispatchEvent(new CustomEvent('tracker:games-change'));
}

async function cloudSync({ quiet = false } = {}) {
  if (!accountState.authenticated) return;
  const remote = await json(await fetch('/api/account/data'));
  mergeCloudGames(remote.games);
  const games = TrackerRepository.getAll();
  const result = await json(await fetch('/api/account/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ games, channels: { ...remote.channels, ...channelsFromLocal() } }) }));
  window.dispatchEvent(new CustomEvent('account:deals-invalidate'));
  if (!quiet) toast(`Đã đồng bộ ${result.synced} game lên cloud.`);
  renderPanel({ ...remote, games });
}

async function syncWishlist({ quiet = false } = {}) {
  const result = await json(await fetch('/api/account/wishlist/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  window.dispatchEvent(new CustomEvent('account:deals-invalidate'));
  if (!quiet) toast(`Đã nhập ${result.synced} game từ Wishlist Steam.`);
  return result;
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Trình duyệt này chưa hỗ trợ Web Push.');
  const config = await json(await fetch('/api/push/config'));
  if (!config.configured) throw new Error('Máy chủ chưa cấu hình VAPID Web Push.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cho phép thông báo.');
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) });
  await json(await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription }) }));
  toast('Đã bật thông báo Web Push trên thiết bị này.');
  renderAccountButton();
}

function ensurePanel() {
  if (document.getElementById('accountPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="account-overlay hidden" id="accountOverlay"></div>
    <aside class="account-panel" id="accountPanel" aria-hidden="true" aria-label="Tài khoản Steam">
      <div class="account-panel-head"><div><small>STEAM CLOUD</small><h2>Tài khoản & đồng bộ</h2></div><button class="icon-btn" id="accountCloseBtn" aria-label="Đóng">×</button></div>
      <div id="accountPanelBody" class="account-panel-body"></div>
    </aside>`);
  document.getElementById('accountOverlay').addEventListener('click', closePanel);
  document.getElementById('accountCloseBtn').addEventListener('click', closePanel);
  document.getElementById('accountPanelBody').addEventListener('click', handlePanelAction);
}

function openPanel() {
  ensurePanel();
  document.getElementById('accountOverlay').classList.remove('hidden');
  document.getElementById('accountPanel').classList.add('open');
  document.getElementById('accountPanel').setAttribute('aria-hidden', 'false');
  if (accountState.authenticated) fetch('/api/account/data').then(json).then(renderPanel).catch((error) => toast(error.message, 'error'));
  else renderPanel();
}

function closePanel() {
  document.getElementById('accountOverlay')?.classList.add('hidden');
  document.getElementById('accountPanel')?.classList.remove('open');
  document.getElementById('accountPanel')?.setAttribute('aria-hidden', 'true');
}

function renderPanel(data = {}) {
  const body = document.getElementById('accountPanelBody');
  if (!body) return;
  if (!accountState.authenticated) {
    body.innerHTML = `<div class="account-empty"><img src="/logo.jpg" alt=""><h3>Đăng nhập bằng Steam</h3><p>Giữ tracker, giá mục tiêu, Wishlist và kênh thông báo đồng bộ trên mọi thiết bị.</p><a class="btn btn-primary" href="/api/auth/steam">Đăng nhập Steam</a></div>`;
    return;
  }
  const account = accountState.account;
  const events = data.events || [];
  body.innerHTML = `
    <div class="account-profile"><img src="${safeHttpUrl(account.avatarUrl)}" alt=""><div><strong>${escapeHtml(account.displayName)}</strong><a href="${safeHttpUrl(account.profileUrl, '#')}" target="_blank" rel="noopener">${escapeHtml(account.steamId)}</a></div></div>
    <div class="account-stats"><div><strong>${(data.games || []).length}</strong><span>Tracker cloud</span></div><div><strong>${(data.wishlist || []).length}</strong><span>Wishlist</span></div><div><strong>${events.filter((e) => e.status === 'sent').length}</strong><span>Đã gửi gần đây</span></div></div>
    <div class="account-actions">
      <button class="btn btn-primary" data-account-action="sync">Đồng bộ ngay</button>
      <button class="btn btn-secondary" data-account-action="wishlist">Nhập lại Wishlist</button>
      <button class="btn btn-secondary" data-account-action="push">Bật Web Push</button>
      ${installPrompt ? '<button class="btn btn-secondary" data-account-action="install">Cài ứng dụng PWA</button>' : ''}
      ${account.isAdmin ? '<button class="btn btn-secondary" data-account-action="admin">Dashboard quản trị</button>' : ''}
      <button class="btn btn-ghost" data-account-action="logout">Đăng xuất</button>
    </div>
    <section class="account-log"><h3>Thông báo gần đây</h3>${events.length ? events.slice(0, 8).map((event) => `<div><span>${escapeHtml(event.channel)}</span><strong class="${event.status === 'sent' ? 'sent' : 'failed'}">${escapeHtml(event.status)}</strong><time>${escapeHtml(new Date(event.created_at).toLocaleString('vi-VN'))}</time></div>`).join('') : '<p>Chưa có thông báo nào.</p>'}</section>`;
}

async function showAdmin() {
  const data = await json(await fetch('/api/admin/status'));
  const body = document.getElementById('accountPanelBody');
  const events = data.notificationEvents || [];
  body.innerHTML = `<button class="btn btn-ghost" data-account-action="back">← Tài khoản</button><h3>Độ tin cậy hệ thống</h3><div class="account-stats"><div><strong>${Number(data.cache?.entries) || 0}</strong><span>Cache entries</span></div><div><strong>${(data.cronRuns || []).length}</strong><span>Cron runs</span></div><div><strong>${(data.retryJobs || []).filter((j) => j.status === 'pending').length}</strong><span>Retry pending</span></div></div><section class="account-log"><h3>Dịch vụ hệ thống</h3>${(data.services || []).map((service) => `<div><span>${escapeHtml(service.service)} ${service.latency_ms ? `(${service.latency_ms}ms)` : ''}</span><strong class="${service.status === 'operational' ? 'sent' : 'failed'}">${escapeHtml(service.status)}</strong><time>${escapeHtml(new Date(service.checked_at).toLocaleString('vi-VN'))}</time></div>`).join('') || '<p>Chưa có lần kiểm tra nào.</p>'}</section><section class="account-log"><h3>Cron gần đây</h3>${(data.cronRuns || []).slice(0, 8).map((run) => `<div><span>${escapeHtml(run.job_name)} · ${Number(run.checked_count) || 0} game</span><strong class="${run.status === 'success' ? 'sent' : 'failed'}">${escapeHtml(run.status)}</strong><time>${escapeHtml(new Date(run.started_at).toLocaleString('vi-VN'))}</time></div>`).join('') || '<p>Chưa có lượt chạy.</p>'}</section><section class="account-log"><h3>Lịch sử thông báo hệ thống</h3>${events.slice(0, 10).map((event) => `<div><span>${escapeHtml(event.channel)} ${event.price_amount ? `· ${escapeHtml(event.price_amount)} ${escapeHtml(event.currency || '')}` : ''}</span><strong class="${event.status === 'sent' ? 'sent' : 'failed'}">${escapeHtml(event.status)}</strong><time>${escapeHtml(new Date(event.created_at).toLocaleString('vi-VN'))}</time></div>`).join('') || '<p>Chưa có lịch sử thông báo.</p>'}</section>`;
}

async function handlePanelAction(event) {
  const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
  if (!action) return;
  event.target.disabled = true;
  try {
    if (action === 'sync') await cloudSync();
    if (action === 'wishlist') await syncWishlist();
    if (action === 'push') await enablePush();
    if (action === 'install' && installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderPanel(await json(await fetch('/api/account/data'))); }
    if (action === 'admin') await showAdmin();
    if (action === 'back') renderPanel(await json(await fetch('/api/account/data')));
    if (action === 'logout') { await json(await fetch('/api/auth/logout', { method: 'POST' })); location.reload(); }
  } catch (error) { toast(error.message, 'error'); }
  finally { event.target.disabled = false; }
}

function renderAccountButton() {
  const button = document.getElementById('steamAccountBtn');
  if (!button) return;
  if (accountState.authenticated) {
    button.innerHTML = `<img src="${safeHttpUrl(accountState.account.avatarUrl)}" alt=""><span>${escapeHtml(accountState.account.displayName)}</span>`;
    button.title = 'Tài khoản Steam và Cloud Sync';
  } else {
    button.innerHTML = '<span>Đăng nhập Steam</span>';
    button.title = 'Đăng nhập Steam để đồng bộ';
  }
}

async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; });
  ensurePanel();
  document.getElementById('steamAccountBtn')?.addEventListener('click', openPanel);
  try { accountState = await json(await fetch('/api/auth/me')); } catch { accountState = { authenticated: false }; }
  renderAccountButton();
  const params = new URLSearchParams(location.search);
  if (params.get('login') === 'success' && accountState.authenticated) {
    history.replaceState({}, '', location.pathname);
    toast(`Xin chào ${accountState.account.displayName}! Đang đồng bộ dữ liệu…`);
    await cloudSync({ quiet: true }).catch((error) => toast(error.message, 'error'));
    if (!sessionStorage.getItem('steamWishlistSynced')) {
      sessionStorage.setItem('steamWishlistSynced', '1');
      await syncWishlist({ quiet: true }).catch((error) => toast(error.message, 'error'));
    }
  } else if (params.get('login') === 'error') {
    toast(params.get('message') || 'Đăng nhập Steam thất bại.', 'error');
    history.replaceState({}, '', location.pathname);
  }
  window.steamCloudAccount = { get state() { return accountState; }, sync: cloudSync, open: openPanel };
}

document.addEventListener('DOMContentLoaded', init);
