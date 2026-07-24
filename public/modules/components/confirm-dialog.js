import { createFocusTrap } from '../utils/dom.js';

let activeCleanup = null;

export function hideConfirmDialog() {
  activeCleanup?.();
}

export function showConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDanger = false,
  dangerous = false,
  onConfirm,
  onCancel
}) {
  const dialog = document.getElementById('tpDialog');
  const overlay = document.getElementById('tpDialogOverlay');
  if (!dialog || !overlay) return;

  activeCleanup?.();
  const titleEl = dialog.querySelector('#tpDialogTitle');
  const messageEl = dialog.querySelector('#tpDialogMessage');
  const confirmButton = dialog.querySelector('#tpDialogConfirmBtn');
  const cancelButton = dialog.querySelector('#tpDialogCancelBtn');
  const returnFocus = document.activeElement;

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmButton.textContent = confirmLabel || confirmText || 'Xác nhận';
  cancelButton.textContent = cancelLabel || cancelText || 'Hủy';
  confirmButton.classList.toggle('is-danger', Boolean(isDanger || dangerous));

  const cleanupTrap = createFocusTrap(dialog, cancel);
  function cleanup() {
    confirmButton.removeEventListener('click', confirm);
    cancelButton.removeEventListener('click', cancel);
    overlay.removeEventListener('click', overlayClick);
    cleanupTrap();
    overlay.classList.remove('is-open');
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tp-modal-open');
    activeCleanup = null;
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  }
  function confirm() {
    cleanup();
    onConfirm?.();
  }
  function cancel() {
    cleanup();
    onCancel?.();
  }
  function overlayClick(event) {
    if (event.target === overlay) cancel();
  }

  confirmButton.addEventListener('click', confirm, { once: true });
  cancelButton.addEventListener('click', cancel, { once: true });
  overlay.addEventListener('click', overlayClick);
  activeCleanup = cleanup;

  overlay.classList.add('is-open');
  dialog.classList.add('is-open');
  dialog.setAttribute('aria-hidden', 'false');
  document.body.classList.add('tp-modal-open');
  requestAnimationFrame(() => cancelButton.focus());
}
