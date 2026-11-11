let displayCurrency = 'VND';
let usdVndRate = null;

const vndFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

export function setMoneyDisplay(currency = 'VND', rate = null) {
  displayCurrency = currency === 'USD' ? 'USD' : 'VND';
  const parsedRate = Number(rate);
  usdVndRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;
}

export function getMoneyCurrency() { return displayCurrency; }
export function getUsdVndRate() { return usdVndRate; }
export function getMoneyUnitLabel() { return displayCurrency; }

export function formatMoney(value = 0) {
  const amount = Number(value) || 0;
  if (displayCurrency === 'USD') return usdVndRate ? usdFormatter.format(amount / usdVndRate) : '— USD';
  return vndFormatter.format(amount);
}

export function formatMoneyInput(value = 0) {
  const amount = Number(value) || 0;
  if (displayCurrency === 'USD') return usdVndRate ? (amount / usdVndRate).toFixed(2) : '';
  return String(Math.round(amount));
}

export const formatCompactMoney = (value = 0) => displayCurrency === 'USD'
  ? (usdVndRate ? usdFormatter.format((Number(value) || 0) / usdVndRate) : '— USD')
  : `${compact.format(Number(value) || 0)} đ`;

export const parseMoneyInput = (value, currency = displayCurrency) => {
  const source = String(value ?? '').trim();
  if (currency === 'USD') {
    if (!/^\d+(?:\.\d{1,2})?$/.test(source)) return '';
    const amount = Number(source);
    return Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER ? amount : '';
  }
  const digits = source.replace(/[^0-9]/g, '');
  if (!digits) return '';
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : '';
};

export const percent = (numerator, denominator) => denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
