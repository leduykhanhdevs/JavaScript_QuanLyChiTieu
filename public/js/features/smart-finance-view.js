import { icon } from '../components/icons.js';
import { escapeHtml } from '../utils/dom.js';
import { today } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';
import { detectSpendingAnomalies, financeDateHelpers, forecastCashflow } from '../utils/smart-finance.js?v=20261028-smart-finance-v2';

const { addDays } = financeDateHelpers;

function forecastPanel(state) {
  const accounts = (state.snapshot.accounts || []).filter((account) => !account.isArchived && account.kind !== 'goal');
  const accountId = state.smartFinance?.accountId || 'all';
  const toDate = state.smartFinance?.toDate || addDays(today(), 30);
  const forecast = forecastCashflow(state.snapshot, accountId, toDate);
  const accountOptions = accounts.map((account) => `<option value="${escapeHtml(account.id)}" ${accountId === account.id ? 'selected' : ''}>${escapeHtml(account.name)}</option>`).join('');
  const result = forecast.available
    ? `<div class="smart-forecast-metrics">
        <article class="smart-forecast-result ${forecast.projectedBalance < 0 ? 'is-negative' : ''}"><small>Số dư dự kiến</small><strong>${formatMoney(forecast.projectedBalance)}</strong><span>${escapeHtml(forecast.accountLabel)} · đến ${escapeHtml(forecast.to)}</span></article>
        <article><small>Thu dự kiến</small><strong class="income">${formatMoney(forecast.expectedIncome)}</strong><span>Các khoản thu đã ghi và định kỳ</span></article>
        <article><small>Chi dự kiến</small><strong class="expense">${formatMoney(forecast.expectedExpense)}</strong><span>Đã ghi/lên lịch ${formatMoney(forecast.expectedScheduledExpense)} · theo lịch sử ${formatMoney(forecast.variableExpense)}</span></article>
        <article><small>Mức thấp nhất ước tính</small><strong class="${forecast.lowestBalance < 0 ? 'expense' : ''}">${formatMoney(forecast.lowestBalance)}</strong><span>Dự kiến vào ${escapeHtml(forecast.lowestDate)}</span></article>
      </div>
      <p class="smart-finance-note">${forecast.variableHistoryCount >= 5
    ? `Chi biến đổi dự kiến dùng trung bình 90 ngày (${forecast.variableHistoryCount} khoản chi); khoản ghi trước và định kỳ được tính riêng. Đây là ước tính tham khảo.`
    : `Chưa đủ 5 khoản chi biến đổi trong 90 ngày (${forecast.variableHistoryCount} khoản), nên phần này đang là 0; dự báo chỉ tính số dư và khoản thu/chi đã ghi hoặc định kỳ.`} Không tự tạo giao dịch.</p>`
    : `<div class="notice notice-info smart-finance-note">${escapeHtml(forecast.reason || 'Chưa đủ dữ liệu để dự báo.')}</div>`;
  return `<section class="card smart-finance-card" aria-labelledby="smart-forecast-title">
    <div class="card-heading"><div><h2 id="smart-forecast-title">Dự báo dòng tiền</h2><p>Ước tính số dư dựa trên lịch định kỳ, khoản tương lai đã ghi và lịch sử chi tiêu.</p></div><span class="smart-finance-badge">${icon('chart', 15)} Tối đa 90 ngày</span></div>
    <div class="smart-forecast-controls"><label><span>Tài khoản</span><select data-filter="forecast-account" aria-label="Tài khoản dự báo"><option value="all" ${accountId === 'all' ? 'selected' : ''}>Tất cả tài khoản cá nhân</option>${accountOptions}</select></label><label><span>Dự báo đến ngày</span><input type="date" min="${today()}" max="${addDays(today(), 90)}" value="${escapeHtml(toDate)}" data-filter="forecast-to" aria-label="Ngày kết thúc dự báo"></label></div>
    ${result}
  </section>`;
}

function anomalyPanel(state) {
  const flags = detectSpendingAnomalies(state.snapshot);
  const enoughData = (state.snapshot.transactions || []).length >= 8;
  const content = flags.length
    ? `<div class="smart-anomaly-list">${flags.map((flag) => `<article class="smart-anomaly-item"><span class="smart-anomaly-icon" aria-hidden="true">${icon(flag.kind === 'possible-duplicate' ? 'repeat' : 'info', 17)}</span><div><strong>${escapeHtml(flag.title)}</strong><p>${escapeHtml(flag.detail)}</p>${flag.categoryId ? `<button type="button" data-action="category-history" data-id="${escapeHtml(flag.categoryId)}">Xem giao dịch ${icon('arrowRight', 13)}</button>` : ''}</div></article>`).join('')}</div>`
    : `<div class="smart-anomaly-empty"><span aria-hidden="true">${icon(enoughData ? 'check' : 'info', 20)}</span><div><strong>${enoughData ? 'Chưa có tín hiệu cần đánh dấu' : 'Cần thêm lịch sử giao dịch'}</strong><p>${enoughData ? 'Các quy tắc hiện tại chỉ tìm khoản trùng chính xác, chi tăng mạnh và ngân sách vượt hạn mức. Đây không phải xác nhận mọi khoản đều chính xác.' : 'Cần tối thiểu một số giao dịch và các kỳ trước để so sánh. Các cảnh báo chỉ là gợi ý kiểm tra.'}</p></div></div>`;
  return `<section class="card smart-finance-card" aria-labelledby="smart-anomaly-title"><div class="card-heading"><div><h2 id="smart-anomaly-title">Điểm cần xem lại</h2><p>Dò giao dịch trùng, mức chi tăng và ngân sách vượt hạn mức.</p></div><span class="smart-finance-badge">${icon('shield', 15)} Gợi ý</span></div>${content}<p class="smart-finance-note">Không tự xóa giao dịch và không khẳng định gian lận. Mọi số liệu được tính cục bộ từ giao dịch của tài khoản đang đăng nhập.</p></section>`;
}

export function renderSmartFinanceInsights(state) {
  return `<div class="grid two-column section-gap smart-finance-grid">${forecastPanel(state)}${anomalyPanel(state)}</div>`;
}
