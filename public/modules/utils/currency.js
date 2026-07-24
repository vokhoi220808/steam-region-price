export const CURRENCIES = Object.freeze([
  { code: 'VND', name: 'Việt Nam đồng' },
  { code: 'USD', name: 'Đô la Mỹ' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Bảng Anh' },
  { code: 'CNY', name: 'Nhân dân tệ' },
  { code: 'JPY', name: 'Yên Nhật' },
  { code: 'KRW', name: 'Won Hàn Quốc' },
  { code: 'HKD', name: 'Đô la Hồng Kông' },
  { code: 'TWD', name: 'Đô la Đài Loan' },
  { code: 'SGD', name: 'Đô la Singapore' },
  { code: 'THB', name: 'Baht Thái' }
]);

export function formatCurrency(amount, currency = 'VND') {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '—';
  const code = String(currency || 'VND').toUpperCase();
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: ['VND', 'JPY', 'KRW'].includes(code) ? 0 : 2,
      maximumFractionDigits: ['VND', 'JPY', 'KRW'].includes(code) ? 0 : 2
    }).format(numeric).replace(/\s/g, '\u00a0');
  } catch {
    return `${new Intl.NumberFormat('vi-VN').format(numeric)} ${code}`;
  }
}

export function formatCompactCurrency(amount, currency = 'VND') {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '—';
  if (String(currency).toUpperCase() !== 'VND') return formatCurrency(numeric, currency);
  if (Math.abs(numeric) >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(numeric / 1_000_000)} triệu ₫`;
  }
  return formatCurrency(numeric, currency);
}

export function parseCurrency(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}
