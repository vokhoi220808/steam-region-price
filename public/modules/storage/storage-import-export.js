function triggerDownload(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function downloadJson(content, filename = 'steam-price-tracker.json') {
  triggerDownload(content, filename, 'application/json;charset=utf-8');
}

export function gamesToCsv(games) {
  const headers = [
    'App ID', 'Tên game', 'Edition', 'Giá hiện tại', 'Tiền tệ',
    'Giá mục tiêu', 'Khu vực ưu tiên', 'Tag', 'Bộ sưu tập', 'Ngày thêm'
  ];
  const rows = games.map((game) => [
    game.appId,
    game.customName || game.name,
    game.edition,
    game.latestPrice?.amount ?? '',
    game.latestPrice?.currency || game.targetPrice?.currency || '',
    game.targetPrice?.amount ?? '',
    game.preferredRegion,
    (game.tags || []).join(' | '),
    (game.collectionIds || []).join(' | '),
    game.createdAt
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(games, filename = 'steam-price-tracker-games.csv') {
  triggerDownload(`\ufeff${gamesToCsv(games)}`, filename, 'text/csv;charset=utf-8');
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Chưa chọn tệp'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Tệp vượt quá giới hạn 10 MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp'));
    reader.readAsText(file, 'utf-8');
  });
}
