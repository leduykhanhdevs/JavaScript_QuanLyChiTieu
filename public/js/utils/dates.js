export const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts;
};
export const currentMonth = () => today().slice(0, 7);
export const monthStart = (month = currentMonth()) => `${month}-01`;
const displayLocale = () => document.documentElement.lang === 'zh-CN' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en-US' : 'vi-VN';
export function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat(displayLocale(), options).format(date);
}
export const shiftMonth = (month, offset) => {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
export const monthName = (month) => new Intl.DateTimeFormat(displayLocale(), { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00`));
