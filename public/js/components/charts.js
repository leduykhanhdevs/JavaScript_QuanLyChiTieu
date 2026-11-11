import { escapeHtml } from '../utils/dom.js';
import { formatCompactMoney } from '../utils/money.js';
import { icon } from './icons.js';

const chartColors = ['#3b82f6', '#f07d68', '#8b5cf6', '#f59e0b', '#60a5fa', '#6366f1', '#ec4899'];

export function donutChart(items, label = 'Phân bổ chi tiêu') {
  const rows = items.filter((item) => item.amount > 0);
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  if (!total) return `<div class="empty-state"><div><div class="empty-illustration" aria-hidden="true">${icon('budget', 28)}</div><h3>Chưa có khoản chi trong kỳ</h3><p>Khi bạn ghi nhận chi tiêu, biểu đồ phân bổ sẽ xuất hiện tại đây.</p></div></div>`;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = rows.map((item, index) => {
    const length = (item.amount / total) * circumference;
    const circle = `<circle cx="80" cy="80" r="${radius}" fill="none" stroke="${chartColors[index % chartColors.length]}" stroke-width="17" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)"/>`;
    offset += length;
    return circle;
  }).join('');
  const legend = rows.slice(0, 6).map((item, index) => `<div class="legend-item"><span class="legend-dot" style="background:${chartColors[index % chartColors.length]}"></span><span data-no-translate>${escapeHtml(item.name)}</span><span class="legend-amount">${formatCompactMoney(item.amount)}</span></div>`).join('');
  return `<div class="donut-layout"><svg class="donut-chart" viewBox="0 0 160 160" role="img" aria-label="${escapeHtml(label)}"><circle cx="80" cy="80" r="54" fill="none" stroke="#e8edf4" stroke-width="17"/>${circles}<text x="80" y="77" text-anchor="middle" font-size="11" fill="#7b8799">Tổng chi</text><text x="80" y="95" text-anchor="middle" font-size="13" font-weight="700" fill="#172033">${escapeHtml(formatCompactMoney(total))}</text></svg><div class="legend-list">${legend}</div></div>`;
}

export function trendChart(rows) {
  if (!rows.some((row) => row.income || row.expense)) return `<div class="empty-state"><div><div class="empty-illustration" aria-hidden="true">${icon('chart', 28)}</div><h3>Chưa có dữ liệu xu hướng</h3><p>Thêm giao dịch để so sánh thu và chi qua các tháng.</p></div></div>`;
  const width = 680; const height = 250; const left = 44; const right = 15; const top = 18; const bottom = 35;
  const maximum = Math.max(1, ...rows.flatMap((row) => [row.income, row.expense]));
  const plotHeight = height - top - bottom;
  const groupWidth = (width - left - right) / rows.length;
  const bars = rows.map((row, index) => {
    const x = left + index * groupWidth;
    const barWidth = Math.min(19, groupWidth * .24);
    const incomeHeight = (row.income / maximum) * plotHeight;
    const expenseHeight = (row.expense / maximum) * plotHeight;
    const label = new Intl.DateTimeFormat(document.documentElement.lang || 'vi-VN', { month: 'short' }).format(new Date(`${row.month}-01T00:00:00`));
    return `<rect x="${x + groupWidth * .25}" y="${top + plotHeight - incomeHeight}" width="${barWidth}" height="${incomeHeight}" rx="4" fill="#3b82f6"><title>Thu ${escapeHtml(formatCompactMoney(row.income))}</title></rect><rect x="${x + groupWidth * .25 + barWidth + 5}" y="${top + plotHeight - expenseHeight}" width="${barWidth}" height="${expenseHeight}" rx="4" fill="#f07d68"><title>Chi ${escapeHtml(formatCompactMoney(row.expense))}</title></rect><text x="${x + groupWidth / 2}" y="${height - 9}" text-anchor="middle" font-size="11" fill="#7b8799">${escapeHtml(label)}</text>`;
  }).join('');
  const guides = [0, .5, 1].map((ratio) => {
    const y = top + plotHeight * ratio;
    return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" stroke="#e8edf4" stroke-dasharray="3 5"/>`;
  }).join('');
  return `<svg class="report-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ thu chi sáu tháng">${guides}${bars}</svg><div class="report-legend"><span><i class="legend-dot" style="background:#3b82f6"></i>Khoản thu</span><span><i class="legend-dot" style="background:#f07d68"></i>Khoản chi</span></div>`;
}
