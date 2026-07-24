import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { escapeHtml } from '../utils/dom.js';
import { computeGap, computeStatus, getCheapestRegion, getDiscount, STATUS_META } from '../tracker/tracker-status.js';
import { renderPriceScale } from './price-scale.js';

function statusBadge(game) {
  const status = computeStatus(game);
  const meta = STATUS_META[status];
  return `
    <span class="tp-status-badge is-${meta.tone}">
      <span aria-hidden="true">${meta.icon}</span>
      ${escapeHtml(meta.label)}
    </span>
  `;
}

function priceDifference(game) {
  const gap = computeGap(game);
  if (!gap) return `<span class="tp-price-missing">Chưa có giá mục tiêu</span>`;
  const currency = game.latestPrice.currency;
  if (gap.reached) {
    return `
      <span class="tp-gap is-reached">
        Thấp hơn mục tiêu
        <strong>${escapeHtml(formatCurrency(Math.abs(gap.difference), currency))}</strong>
      </span>
    `;
  }
  return `
    <span class="tp-gap">
      Còn thiếu
      <strong>${escapeHtml(formatCurrency(gap.difference, currency))}</strong>
      <small>${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(gap.percent)}%</small>
    </span>
  `;
}

export function GameCard(game, collectionMap = new Map()) {
  const displayName = game.customName || game.name;
  const currency = game.latestPrice?.currency || game.targetPrice?.currency || 'VND';
  const cheapest = getCheapestRegion(game);
  const discount = getDiscount(game);
  const collections = (game.collectionIds || []).map((id) => collectionMap.get(id)).filter(Boolean);

  return `
    <article
      class="tp-game-card${game.pinned ? ' is-pinned' : ''}"
      data-game-id="${escapeHtml(game.id)}"
      data-status="${computeStatus(game)}"
      tabindex="0"
      aria-label="${escapeHtml(`Mở chi tiết ${displayName}`)}"
    >
      <div class="tp-card-media">
        <img
          src="${escapeHtml(game.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`)}"
          alt="Ảnh bìa ${escapeHtml(displayName)}"
          loading="lazy"
          width="460"
          height="215"
          data-game-image
        >
        <span class="tp-image-fallback" aria-hidden="true">${escapeHtml(displayName.slice(0, 2).toUpperCase())}</span>
        <div class="tp-media-badges">
          ${discount > 0 ? `<span class="tp-sale-badge">−${discount}%</span>` : ''}
          ${game.edition && game.edition !== 'Standard' ? `<span class="tp-edition-badge">${escapeHtml(game.edition)}</span>` : ''}
        </div>
      </div>

      <div class="tp-card-body">
        <header class="tp-card-identity">
          <div>
            <h3>${escapeHtml(displayName)}</h3>
            <p>App ID ${game.appId} · Thêm ${escapeHtml(formatDate(game.createdAt))}</p>
          </div>
          ${game.pinned ? '<span class="tp-pin-label">Đã ghim</span>' : ''}
        </header>

        <div class="tp-card-tags">
          ${(game.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
          ${collections.slice(0, 1).map((name) => `<span class="is-collection">${escapeHtml(name)}</span>`).join('')}
        </div>

        <div class="tp-price-primary">
          <span>Giá hiện tại</span>
          <strong>${game.latestPrice ? escapeHtml(formatCurrency(game.latestPrice.amount, currency)) : 'Chưa có dữ liệu'}</strong>
          ${game.errorData ? `<small>Chưa thể cập nhật · ${escapeHtml(formatDate(game.lastCheckedAt))}</small>` : ''}
        </div>

        <div class="tp-price-grid">
          <div>
            <span>Giá mục tiêu</span>
            <strong>${game.targetPrice ? escapeHtml(formatCurrency(game.targetPrice.amount, game.targetPrice.currency)) : 'Chưa đặt'}</strong>
          </div>
          <div>
            ${priceDifference(game)}
          </div>
        </div>

        <div class="tp-cheapest-row">
          <span>Thấp nhất theo vùng</span>
          <strong>${cheapest ? escapeHtml(formatCurrency(cheapest.convertedAmount, cheapest.convertedCurrency || currency)) : '—'}</strong>
          <small>${cheapest ? escapeHtml(`${cheapest.regionName} · ${cheapest.currency}`) : 'Chưa có dữ liệu khu vực'}</small>
        </div>

        ${renderPriceScale(game)}

        <div class="tp-card-status-row">
          ${statusBadge(game)}
          <span>${game.lastCheckedAt ? `Kiểm tra ${escapeHtml(formatDate(game.lastCheckedAt))}` : 'Chưa kiểm tra giá'}</span>
        </div>

        <footer class="tp-card-actions">
          <button type="button" class="tp-card-primary" data-action="${game.targetPrice ? 'details' : 'edit'}" data-game-id="${escapeHtml(game.id)}">
            ${game.targetPrice ? 'Xem chi tiết' : 'Đặt mục tiêu'}
          </button>
          <button type="button" class="tp-card-secondary" data-action="edit" data-game-id="${escapeHtml(game.id)}">Chỉnh sửa</button>
          <details class="tp-card-menu">
            <summary aria-label="Mở thao tác khác">Thêm</summary>
            <div>
              <button type="button" data-action="compare" data-game-id="${escapeHtml(game.id)}">So sánh giá</button>
              <button type="button" data-action="pin" data-game-id="${escapeHtml(game.id)}">${game.pinned ? 'Bỏ ghim' : 'Ghim'}</button>
              <button type="button" data-action="tag" data-game-id="${escapeHtml(game.id)}">Thêm tag</button>
              <button type="button" data-action="duplicate" data-game-id="${escapeHtml(game.id)}">Nhân bản</button>
              <button type="button" class="is-danger" data-action="delete" data-game-id="${escapeHtml(game.id)}">Xóa</button>
            </div>
          </details>
        </footer>
      </div>
    </article>
  `;
}

export default GameCard;
