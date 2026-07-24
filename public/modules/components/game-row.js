import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { escapeHtml } from '../utils/dom.js';
import { computeGap, computeStatus, getCheapestRegion, getDiscount, STATUS_META } from '../tracker/tracker-status.js';

export function GameRow(game) {
  const status = computeStatus(game);
  const meta = STATUS_META[status];
  const gap = computeGap(game);
  const cheapest = getCheapestRegion(game);
  const currency = game.latestPrice?.currency || game.targetPrice?.currency || 'VND';
  const name = game.customName || game.name;

  return `
    <tr class="tp-game-row${game.pinned ? ' is-pinned' : ''}" data-game-id="${escapeHtml(game.id)}" tabindex="0">
      <td>
        <div class="tp-list-game">
          <img
            src="${escapeHtml(game.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`)}"
            alt=""
            loading="lazy"
            width="96"
            height="45"
            data-game-image
          >
          <span>
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(game.edition)} · ${game.appId}</small>
          </span>
        </div>
      </td>
      <td><span class="tp-status-badge is-${meta.tone}"><span aria-hidden="true">${meta.icon}</span>${escapeHtml(meta.label)}</span></td>
      <td class="tp-numeric"><strong>${game.latestPrice ? escapeHtml(formatCurrency(game.latestPrice.amount, currency)) : '—'}</strong></td>
      <td class="tp-numeric">${game.targetPrice ? escapeHtml(formatCurrency(game.targetPrice.amount, game.targetPrice.currency)) : 'Chưa đặt'}</td>
      <td class="tp-numeric ${gap?.reached ? 'is-positive' : ''}">
        ${gap ? escapeHtml(formatCurrency(gap.difference, currency)) : '—'}
        ${gap ? `<small>${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(gap.percent)}%</small>` : ''}
      </td>
      <td class="tp-numeric">${getDiscount(game) > 0 ? `−${getDiscount(game)}%` : '—'}</td>
      <td>
        ${cheapest ? `<strong>${escapeHtml(cheapest.regionName)}</strong><small>${escapeHtml(formatCurrency(cheapest.convertedAmount, cheapest.convertedCurrency || currency))}</small>` : '—'}
      </td>
      <td>${escapeHtml(formatDate(game.lastCheckedAt || game.updatedAt))}</td>
      <td>
        <div class="tp-row-actions">
          <button type="button" data-action="details" data-game-id="${escapeHtml(game.id)}">Chi tiết</button>
          <button type="button" data-action="edit" data-game-id="${escapeHtml(game.id)}">Sửa</button>
          <button type="button" data-action="pin" data-game-id="${escapeHtml(game.id)}">${game.pinned ? 'Bỏ ghim' : 'Ghim'}</button>
        </div>
      </td>
    </tr>
  `;
}

export default GameRow;
