import { escapeHtml, initials } from '../utils/dom.js';
import { formatDate, monthName, shiftMonth, today } from '../utils/dates.js';
import { formatCompactMoney, formatMoney, percent } from '../utils/money.js';
import { dashboardStats, filterTransactions, reportBreakdown, sixMonthTrend } from '../utils/finance-stats.js';
import { donutChart, trendChart } from '../components/charts.js';
import { icon } from '../components/icons.js';
import { renderBankTargetCatalog } from './bank-catalog.js?v=20261016-bank-hub-selector';
import { renderSmartFinanceInsights } from './smart-finance-view.js?v=20261028-smart-finance-v2';

const navItems = [
  ['dashboard', 'Tổng quan', 'home'], ['transactions', 'Giao dịch', 'receipt'], ['accounts', 'Tài khoản', 'wallet'],
  ['budgets', 'Ngân sách', 'budget'], ['recurring', 'Định kỳ', 'repeat'], ['goals', 'Mục tiêu', 'target'],
  ['reports', 'Báo cáo', 'chart'], ['categories', 'Danh mục', 'tag'], ['help', 'Thông tin & trợ giúp', 'help']
];

const views = {
  dashboard: ['Tổng quan tài chính', 'Theo dõi dòng tiền và các mục tiêu của bạn'],
  transactions: ['Giao dịch', 'Tìm kiếm, lọc và quản lý các khoản thu chi'],
  accounts: ['Tài khoản & ví', 'Theo dõi số dư và chuyển tiền giữa các tài khoản'],
  budgets: ['Ngân sách tháng', 'Đặt giới hạn và theo dõi các khoản chi'],
  recurring: ['Giao dịch định kỳ', 'Quản lý các khoản thu chi lặp lại'],
  goals: ['Mục tiêu tiết kiệm', 'Từng bước tiến gần hơn tới điều bạn mong muốn'],
  reports: ['Báo cáo', 'Hiểu rõ dòng tiền theo kỳ và danh mục'],
  categories: ['Danh mục', 'Sắp xếp các khoản thu chi theo cách của bạn'],
  settings: ['Cài đặt', 'Quản lý thông tin cá nhân và dữ liệu của bạn'],
  help: ['Thông tin & trợ giúp', 'Cách sử dụng Ví Mình và quy tắc tính số liệu']
};

const navLink = ([id, title, iconName], active) => `<button class="nav-link" data-action="navigate" data-view="${id}" aria-current="${active === id ? 'page' : 'false'}"><span class="nav-icon" aria-hidden="true">${icon(iconName, 17)}</span><span>${title}</span></button>`;
const avatarMarkup = (user, className) => `<span class="${className}" aria-hidden="true">${user?.avatarUrl ? `<img src="${escapeHtml(user.avatarUrl)}" alt="">` : initials(user?.fullName || '')}</span>`;

function sidebar(state) {
  const displayName = state.user?.fullName || 'Tài khoản';
  const adminLink = state.user?.role === 'admin' ? `<div class="nav-label">Quản trị</div>${navLink(['admin-overview', 'Khu vực Admin', 'shield'], state.view)}` : '';
  return `<aside class="sidebar" id="sidebar"><a class="brand" href="#" data-action="navigate" data-view="dashboard"><img class="brand-lockup" src="/assets/brand-lockup.svg?v=20261020-logo-v2" alt="Ví Mình — Tài chính cá nhân"></a><div class="nav-label">Menu chính</div><nav class="nav-list" aria-label="Điều hướng chính">${navItems.map((item) => navLink(item, state.view)).join('')}${adminLink}</nav><button type="button" class="sidebar-profile" data-action="navigate" data-view="settings" aria-current="${state.view === 'settings' ? 'page' : 'false'}" aria-label="Mở cài đặt cá nhân của ${escapeHtml(displayName)}">${avatarMarkup(state.user, 'sidebar-profile-avatar')}<span class="sidebar-profile-copy"><strong data-no-translate>${escapeHtml(displayName)}</strong><small>Quản lý tài chính của riêng bạn</small></span><span class="sidebar-profile-chevron" aria-hidden="true">${icon('chevron', 16)}</span></button></aside>`;
}

function topbar(state) {
  const title = views[state.view]?.[0] || 'Ví Mình';
  return `<header class="topbar"><button class="mobile-menu-button" data-action="toggle-menu" aria-label="Mở menu">${icon('menu', 20)}</button><div class="topbar-title">${escapeHtml(title)}</div><label class="global-search"><span class="search-icon" aria-hidden="true">${icon('search', 17)}</span><span class="sr-only">Tìm giao dịch</span><input type="search" id="global-search" placeholder="Tìm nhanh giao dịch…" value="${escapeHtml(state.search)}"></label></header>`;
}

function mobileNav(state) {
  const compactItems = navItems.filter(([id]) => ['dashboard', 'transactions', 'budgets', 'accounts'].includes(id));
  return `<nav class="mobile-bottom-nav" aria-label="Điều hướng di động">${compactItems.map(([id, title, iconName]) => `<button data-action="navigate" data-view="${id}" aria-current="${state.view === id ? 'page' : 'false'}"><span class="mobile-nav-icon" aria-hidden="true">${icon(iconName, 19)}</span><span>${title}</span></button>`).join('')}</nav>`;
}

function pageHeading(title, description, action = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ''}</div>`;
}

function actionButton(label, action, iconName = 'plus', extra = '') {
  return `<button class="button button-primary" data-action="${action}" ${extra}><span class="button-icon" aria-hidden="true">${icon(iconName, 17)}</span>${label}</button>`;
}

function monthControl(label, filter, value, includeAll = false) {
  const current = today().slice(0, 7);
  const months = Array.from({ length: 25 }, (_, index) => shiftMonth(current, index - 12));
  if (value && !months.includes(value)) months.push(value);
  months.sort();
  const monthOptions = months.map((month) => `<option value="${month}" ${value === month ? 'selected' : ''}>${monthName(month).replace(/^tháng/i, 'Tháng')}</option>`).join('');
  return `<div class="field-inline"><select aria-label="${label}" data-filter="${filter}">${includeAll ? `<option value="" ${value ? '' : 'selected'}>Tất cả tháng</option>` : ''}${monthOptions}</select></div>`;
}

function statCard(label, amount, kind = '', foot = '') {
  return `<article class="card stat-card"><div class="stat-label">${label}</div><div class="stat-value ${kind}">${formatMoney(amount)}</div><div class="stat-foot">${foot || '&nbsp;'}</div></article>`;
}

function countStatCard(label, amount, foot, kind = '') {
  return `<article class="card stat-card"><div class="stat-label">${label}</div><div class="stat-value ${kind}">${new Intl.NumberFormat(document.documentElement.lang || 'vi-VN').format(amount)}</div><div class="stat-foot">${foot}</div></article>`;
}

function emptyState(title, description, action = '') {
  return `<div class="empty-state"><div><div class="empty-illustration" aria-hidden="true">${icon('search', 28)}</div><h3>${title}</h3><p>${description}</p>${action}</div></div>`;
}

function budgetLine(budget) {
  const completion = percent(budget.spent, budget.limitAmount);
  const stateClass = completion >= 100 ? 'danger' : completion >= budget.alertAtPercent ? 'warn' : '';
  return `<div class="budget-row"><div class="budget-row-head"><span data-no-translate>${escapeHtml(budget.categoryName)}</span><span>${formatCompactMoney(budget.spent)} / ${formatCompactMoney(budget.limitAmount)}</span></div><div class="progress-track" role="progressbar" aria-valuenow="${Math.min(100, completion)}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(budget.categoryName)} đã dùng ${completion}%"><div class="progress-fill ${stateClass}" style="width:${Math.min(100, completion)}%"></div></div><div class="budget-row-foot"><span>${completion}% đã dùng</span><span>${budget.remaining < 0 ? `Vượt ${formatCompactMoney(Math.abs(budget.remaining))}` : `Còn ${formatCompactMoney(budget.remaining)}`}</span></div></div>`;
}

function transactionRow(item) {
  const symbol = icon(item.kind === 'income' ? 'income' : 'expense', 18);
  const title = item.note || item.categoryName;
  return `<tr><td><div class="transaction-main"><span class="row-icon ${item.kind}" aria-hidden="true">${symbol}</span><span><strong data-no-translate>${escapeHtml(title)}</strong><small data-no-translate>${escapeHtml(item.categoryName)} · ${escapeHtml(item.accountName)}</small></span></div></td><td>${formatDate(item.date)}</td><td>${item.kind === 'income' ? 'Khoản thu' : 'Khoản chi'}</td><td class="amount-cell ${item.kind}">${item.kind === 'income' ? '+' : '−'}${formatMoney(item.amount)}</td><td><div class="table-actions"><button class="icon-button" aria-label="Xem chi tiết" data-action="transaction-detail" data-id="${item.id}">${icon('search', 16)}</button><button class="icon-button" aria-label="Chỉnh sửa" data-action="edit-transaction" data-id="${item.id}">${icon('pencil', 16)}</button><button class="icon-button" aria-label="Xóa" data-action="delete-transaction" data-id="${item.id}">${icon('trash', 16)}</button></div></td></tr>`;
}

function transactionList(rows, title = '', description = 'Thêm giao dịch đầu tiên hoặc thay đổi bộ lọc để xem dữ liệu.') {
  if (!rows.length) return emptyState(title || 'Chưa có giao dịch', description, actionButton('Thêm giao dịch', 'new-transaction'));
  return `<div class="transaction-table-wrap"><table class="transaction-table"><thead><tr><th>Khoản mục</th><th>Ngày</th><th>Loại</th><th style="text-align:right">Số tiền</th><th></th></tr></thead><tbody>${rows.map(transactionRow).join('')}</tbody></table></div>`;
}

function dashboardPage(state) {
  const stats = dashboardStats(state.snapshot, state.period);
  const budgetCards = stats.budgets.slice(0, 4);
  const allowOcr = state.snapshot.appSettings?.enable_ocr_scanner !== false;
  const ocrBtn = allowOcr ? `<button class="button button-secondary" data-action="receipt-scan"><span class="button-icon" aria-hidden="true">${icon('receipt', 17)}</span>Quét hóa đơn</button>` : '';
  const action = `${ocrBtn}${actionButton('Giao dịch mới', 'new-transaction')}`;
  const rangeControl = monthControl('Tháng thống kê', 'dashboard-month', state.period);
  const recent = stats.recent.length ? `<div class="list">${stats.recent.map((item) => `<div class="list-row"><span class="row-icon ${item.kind}">${icon(item.kind === 'income' ? 'income' : 'expense', 18)}</span><div class="row-copy"><div class="row-title" data-no-translate>${escapeHtml(item.note || item.categoryName)}</div><div class="row-meta" data-no-translate>${escapeHtml(item.categoryName)} · ${formatDate(item.date)}</div></div><div class="row-amount ${item.kind}">${item.kind === 'income' ? '+' : '−'}${formatMoney(item.amount)}</div></div>`).join('')}</div>` : emptyState('Tháng này chưa có giao dịch', 'Ghi nhận khoản thu hoặc chi đầu tiên để bắt đầu theo dõi.', actionButton('Thêm giao dịch', 'new-transaction'));
  const budgets = budgetCards.length ? budgetCards.map(budgetLine).join('') : emptyState('Chưa có ngân sách', 'Tạo ngân sách theo danh mục để theo dõi giới hạn chi tiêu.', actionButton('Tạo ngân sách', 'new-budget'));
  return `${pageHeading('Tổng quan tài chính', 'Theo dõi dòng tiền và quản lý mục tiêu của bạn', `${rangeControl}${action}`)}
    ${state.storageWarning ? '<div class="notice notice-warn section-gap">Máy chủ đã đồng bộ dữ liệu, nhưng trình duyệt không lưu được cache cục bộ.</div>' : ''}
    <section class="grid stats-grid dashboard-stats-grid"><article class="card balance-card"><div class="balance-label">Tổng số dư hiện tại</div><div class="balance-value">${formatMoney(stats.netWorth)}</div><div class="balance-meta"><span>${stats.accounts.length} tài khoản đang hoạt động</span><span>Thu trừ chi tháng này: ${formatCompactMoney(stats.net)}</span></div></article>${statCard('Tổng thu trong tháng', stats.totals.income, 'income', 'Khoản thu đã ghi nhận')}${statCard('Tổng chi trong tháng', stats.totals.expense, 'expense', 'Khoản chi đã ghi nhận')}</section>
    <section class="grid two-column section-gap"><article class="card"><div class="card-heading"><div><h2>Chi tiêu theo danh mục</h2><p>${escapeHtml(monthName(state.period))}</p></div><button class="button button-quiet button-small" data-action="navigate" data-view="reports">Xem báo cáo ${icon('arrowRight', 14)}</button></div><div class="chart-wrap">${donutChart(stats.spendingByCategory)}</div></article><article class="card"><div class="card-heading"><div><h2>Ngân sách tháng</h2><p>Theo dõi hạn mức chi tiêu</p></div><button class="button button-quiet button-small" data-action="navigate" data-view="budgets">Xem tất cả ${icon('arrowRight', 14)}</button></div>${budgets}</article></section>
    <section class="card section-gap"><div class="card-heading"><div><h2>Giao dịch gần đây</h2><p>Các khoản thu chi đã ghi nhận trong tháng</p></div><button class="button button-quiet button-small" data-action="navigate" data-view="transactions">Xem tất cả ${icon('arrowRight', 14)}</button></div>${recent}</section>`;
}

function transactionPage(state) {
  const rows = filterTransactions(state.snapshot.transactions, state.filters, state.search, state.user?.currency || 'VND', state.fxRates?.usdVnd);
  const incomeCount = rows.filter((row) => row.kind === 'income').length;
  const expenseCount = rows.filter((row) => row.kind === 'expense').length;
  const activeAccounts = state.snapshot.accounts.filter((row) => !row.isArchived);
  const selectedCategory = state.snapshot.categories.find((row) => row.id === state.filters.categoryId);
  const filterCategories = state.snapshot.categories.filter((row) => !row.isArchived || row.id === selectedCategory?.id);
  const emptyTitle = selectedCategory ? `Chưa có giao dịch trong danh mục ${escapeHtml(selectedCategory.name)}` : 'Không tìm thấy giao dịch phù hợp';
  const emptyDescription = selectedCategory ? 'Các khoản thu hoặc chi thuộc danh mục này sẽ xuất hiện tại đây.' : 'Thêm giao dịch đầu tiên hoặc thay đổi bộ lọc để xem dữ liệu.';
  const heading = selectedCategory ? `Lịch sử danh mục · ${escapeHtml(selectedCategory.name)}` : 'Giao dịch';
  const headingDescription = selectedCategory ? 'Toàn bộ giao dịch trong danh mục, sắp xếp từ mới nhất.' : 'Thu chi · Sổ giao dịch cá nhân';
  const advancedActive = state.filters.kind !== 'all' || state.filters.from || state.filters.to || state.filters.minAmount || state.filters.maxAmount;
  const toolbar = `<div class="toolbar" id="transaction-filters">
    <div class="toolbar-primary">
      <label class="field-inline toolbar-search"><span class="sr-only">Tìm theo mô tả hoặc số tiền</span><input type="search" id="transaction-search" aria-label="Tìm theo mô tả hoặc số tiền" placeholder="Tìm theo mô tả hoặc số tiền" value="${escapeHtml(state.search)}"></label>
      ${monthControl('Lọc tháng', 'month', state.filters.month, true)}
      <div class="field-inline"><select aria-label="Tài khoản" data-filter="accountId"><option value="all">Tất cả tài khoản</option>${activeAccounts.map((item) => `<option data-no-translate value="${item.id}" ${state.filters.accountId === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></div>
      <div class="field-inline"><select aria-label="Danh mục" data-filter="categoryId"><option value="all">Tất cả danh mục</option>${filterCategories.map((item) => `<option data-no-translate value="${item.id}" ${state.filters.categoryId === item.id ? 'selected' : ''}>${escapeHtml(item.name)}${item.isArchived ? ' · Đã lưu trữ' : ''}</option>`).join('')}</select></div>
      <div class="field-inline"><select aria-label="Sắp xếp" data-filter="sort"><option value="newest" ${state.filters.sort === 'newest' ? 'selected' : ''}>Mới nhất</option><option value="oldest" ${state.filters.sort === 'oldest' ? 'selected' : ''}>Cũ nhất</option><option value="amount-high" ${state.filters.sort === 'amount-high' ? 'selected' : ''}>Số tiền cao nhất</option><option value="amount-low" ${state.filters.sort === 'amount-low' ? 'selected' : ''}>Số tiền thấp nhất</option></select></div>
      <button class="button button-secondary button-small" data-action="clear-filters">Xóa bộ lọc</button><span class="toolbar-count" id="transaction-count">${rows.length} phù hợp</span>
    </div>
    <details class="advanced-filters" ${advancedActive ? 'open' : ''}><summary>Bộ lọc nâng cao</summary><div class="advanced-filters-grid">
      <div class="field-inline"><select aria-label="Loại giao dịch" data-filter="kind"><option value="all">Tất cả loại</option><option value="income" ${state.filters.kind === 'income' ? 'selected' : ''}>Khoản thu</option><option value="expense" ${state.filters.kind === 'expense' ? 'selected' : ''}>Khoản chi</option></select></div>
      <label class="field-inline"><span class="sr-only">Từ ngày</span><input type="date" aria-label="Từ ngày" data-filter="from" value="${escapeHtml(state.filters.from)}"></label>
      <label class="field-inline"><span class="sr-only">Đến ngày</span><input type="date" aria-label="Đến ngày" data-filter="to" value="${escapeHtml(state.filters.to)}"></label>
      <label class="field-inline"><span class="sr-only">Số tiền từ (${state.user?.currency || 'VND'})</span><input type="number" min="0" step="${state.user?.currency === 'USD' ? '0.01' : '1'}" aria-label="Số tiền tối thiểu (${state.user?.currency || 'VND'})" data-filter="minAmount" placeholder="Từ (${state.user?.currency || 'VND'})" value="${escapeHtml(state.filters.minAmount)}" ${state.user?.currency === 'USD' && !state.fxRates?.usdVnd ? 'disabled' : ''}></label>
      <label class="field-inline"><span class="sr-only">Số tiền đến (${state.user?.currency || 'VND'})</span><input type="number" min="0" step="${state.user?.currency === 'USD' ? '0.01' : '1'}" aria-label="Số tiền tối đa (${state.user?.currency || 'VND'})" data-filter="maxAmount" placeholder="Đến (${state.user?.currency || 'VND'})" value="${escapeHtml(state.filters.maxAmount)}" ${state.user?.currency === 'USD' && !state.fxRates?.usdVnd ? 'disabled' : ''}></label>
    </div></details>
  </div>`;
  const allowOcr = state.snapshot.appSettings?.enable_ocr_scanner !== false;
  const ocrBtn = allowOcr ? `<button class="button button-secondary" data-action="receipt-scan"><span class="button-icon" aria-hidden="true">${icon('receipt', 17)}</span>Quét hóa đơn</button>` : '';
  const transactionActions = `${ocrBtn}${actionButton('Thêm giao dịch', 'new-transaction')}`;
  return `${pageHeading(heading, headingDescription, transactionActions)}<section class="grid stats-grid"><article class="card stat-card"><div class="stat-label">Tất cả giao dịch</div><div class="stat-value" id="transaction-total-count">${rows.length}</div><div class="stat-foot">Phù hợp với bộ lọc</div></article><article class="card stat-card"><div class="stat-label">Khoản thu</div><div class="stat-value income" id="transaction-income-count">${incomeCount}</div><div class="stat-foot">Phù hợp với bộ lọc</div></article><article class="card stat-card"><div class="stat-label">Khoản chi</div><div class="stat-value expense" id="transaction-expense-count">${expenseCount}</div><div class="stat-foot">Phù hợp với bộ lọc</div></article></section><section class="card section-gap">${toolbar}<div id="transaction-results">${transactionList(rows, emptyTitle, emptyDescription)}</div></section>`;
}

function accountsPage(state) {
  const accounts = state.snapshot.accounts.filter((account) => !account.isArchived);
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const accountCards = accounts.map((account) => `<article class="card account-card" data-agent-focus-type="account" data-agent-focus-id="${escapeHtml(account.id)}"><div class="account-card-top"><span class="account-kind"><span class="row-icon ${account.kind === 'goal' ? 'goal' : ''}" style="background:${escapeHtml(account.color)}18;color:${escapeHtml(account.color)}">${icon(account.kind === 'bank' ? 'bank' : account.kind === 'e_wallet' ? 'card' : account.kind === 'goal' ? 'target' : 'cash', 18)}</span>${account.kind === 'bank' ? 'Ngân hàng' : account.kind === 'e_wallet' ? 'Ví điện tử' : account.kind === 'goal' ? 'Ví mục tiêu' : 'Ví tiền mặt'}</span>${account.kind !== 'goal' ? `<button class="icon-button" data-action="edit-account" data-id="${account.id}" aria-label="Chỉnh sửa ${escapeHtml(account.name)}">${icon('pencil', 16)}</button>` : ''}</div><div class="account-name" data-no-translate>${escapeHtml(account.name)}</div><div class="account-balance">${formatMoney(account.balance)}</div><div class="account-opening">Số dư ban đầu ${formatMoney(account.openingBalance)}</div>${account.kind !== 'goal' ? `<div class="account-actions"><button class="button button-secondary button-small" data-action="edit-account" data-id="${account.id}">Chỉnh sửa</button><button class="button button-quiet button-small" data-action="archive-account" data-id="${account.id}">Lưu trữ</button></div>` : ''}</article>`).join('');
  const history = state.snapshot.transfers.slice(0, 8).map((row) => `<div class="list-row"><span class="row-icon">${icon('transfer', 18)}</span><div class="row-copy"><div class="row-title" data-no-translate>${escapeHtml(row.sourceAccountName)} → ${escapeHtml(row.targetAccountName)}</div><div class="row-meta" data-no-translate>${formatDate(row.date)}${row.note ? ` · ${escapeHtml(row.note)}` : ''}</div></div><div class="row-amount">${formatMoney(row.amount)}</div></div>`).join('');
  return `${pageHeading('Tài khoản & ví', 'Số dư được tính từ sổ thu chi và chuyển tiền.', `${actionButton('Chuyển tiền', 'new-transfer', 'transfer')} ${actionButton('Thêm tài khoản', 'new-account')}`)}<article class="card balance-card"><div class="balance-label">Tổng tài sản hiện tại</div><div class="balance-value">${formatMoney(total)}</div><div class="balance-meta"><span>${accounts.length} tài khoản đang hoạt động</span><span>Gồm cả ví mục tiêu</span></div></article><section class="grid three-column section-gap">${accountCards || emptyState('Chưa có tài khoản', 'Thêm ví để bắt đầu ghi nhận thu chi.', actionButton('Thêm tài khoản', 'new-account'))}</section><section class="card section-gap"><div class="card-heading"><div><h2>Lịch sử chuyển tiền</h2><p>Chuyển nội bộ không làm thay đổi tổng thu hoặc chi</p></div></div>${history ? `<div class="list">${history}</div>` : emptyState('Chưa có lần chuyển tiền nào', 'Chuyển tiền giữa các tài khoản hoặc nạp tiền vào mục tiêu tiết kiệm.', actionButton('Chuyển tiền', 'new-transfer', 'transfer'))}</section>`;
}

function budgetsPage(state) {
  const budgets = state.snapshot.budgets.filter((item) => item.periodStart.startsWith(state.period));
  const spent = budgets.reduce((sum, item) => sum + item.spent, 0);
  const limit = budgets.reduce((sum, item) => sum + item.limitAmount, 0);
  const percentUsed = percent(spent, limit);
  const month = monthControl('Tháng ngân sách', 'budget-month', state.period);
  const cards = budgets.map((item) => {
    const completion = percent(item.spent, item.limitAmount);
    const stateClass = completion >= 100 ? 'danger' : completion >= item.alertAtPercent ? 'warn' : '';
    return `<article class="card" data-agent-focus-type="budget-category" data-agent-focus-id="${escapeHtml(item.categoryId)}"><div class="card-heading"><div class="budget-card-title"><span class="row-icon">${icon('budget', 18)}</span><div><h3>${escapeHtml(item.categoryName)}</h3><p>${escapeHtml(monthName(item.periodStart.slice(0, 7)))}</p></div></div><div class="table-actions"><button class="icon-button" data-action="edit-budget" data-id="${item.id}" aria-label="Chỉnh sửa">${icon('pencil', 16)}</button><button class="icon-button" data-action="delete-budget" data-id="${item.id}" aria-label="Xóa">${icon('trash', 16)}</button></div></div><div class="balance-value" style="font-size:22px">${formatMoney(item.spent)} <span style="font-size:12px;color:var(--ink-500);font-weight:500">/ ${formatMoney(item.limitAmount)}</span></div><div class="progress-track section-gap"><div class="progress-fill ${stateClass}" style="width:${Math.min(100, completion)}%"></div></div><div class="budget-row-foot"><span>${completion}% hạn mức</span><strong>${item.remaining < 0 ? `Vượt ${formatMoney(Math.abs(item.remaining))}` : `Còn ${formatMoney(item.remaining)}`}</strong></div>${item.note ? `<p class="row-meta">${escapeHtml(item.note)}</p>` : ''}</article>`;
  }).join('');
  return `${pageHeading(`Ngân sách · ${escapeHtml(monthName(state.period))}`, 'Đặt hạn mức chi theo danh mục và theo dõi tiến độ.', `${month}${actionButton('Tạo ngân sách', 'new-budget')}`)}<article class="card balance-card budget-summary-card"><div class="balance-label">Ngân sách đã sử dụng</div><div class="balance-value">${formatMoney(spent)}</div><div class="balance-meta"><span>${budgets.length} hạn mức trong tháng</span><span>${limit ? `${percentUsed}% · Còn ${formatMoney(limit - spent)}` : 'Chưa tạo ngân sách'}</span></div>${limit ? `<div class="progress-track section-gap"><div class="progress-fill ${percentUsed >= 100 ? 'danger' : percentUsed >= 80 ? 'warn' : ''}" style="width:${Math.min(100, percentUsed)}%"></div></div>` : ''}</article><section class="grid budget-grid section-gap">${cards || emptyState('Chưa có ngân sách cho tháng này', 'Tạo hạn mức theo danh mục để theo dõi chi tiêu rõ hơn.', actionButton('Tạo ngân sách', 'new-budget'))}</section>`;
}

function recurringPage(state) {
  const rows = state.snapshot.recurringRules;
  const active = rows.filter((item) => item.isActive);
  const paused = rows.length - active.length;
  const [year, month, day] = today().split('-').map(Number);
  const dueByDate = new Date(Date.UTC(year, month - 1, day + 7));
  const dueBy = `${dueByDate.getUTCFullYear()}-${String(dueByDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dueByDate.getUTCDate()).padStart(2, '0')}`;
  const dueSoon = active.filter((item) => item.nextOccurrenceOn <= dueBy).length;
  const list = rows.map((item) => `<div class="list-row" data-agent-focus-type="recurring" data-agent-focus-id="${escapeHtml(item.id)}"><span class="row-icon ${item.kind}">${icon('repeat', 18)}</span><div class="row-copy"><div class="row-title" data-no-translate>${escapeHtml(item.title)}</div><div class="row-meta" data-no-translate>${escapeHtml(item.categoryName)} · ${escapeHtml(item.accountName)} · Kế tiếp ${formatDate(item.nextOccurrenceOn)}</div></div><div class="row-amount ${item.kind}">${item.kind === 'income' ? '+' : '−'}${formatMoney(item.amount)}</div><button class="icon-button" data-action="edit-recurring" data-id="${item.id}" aria-label="Chỉnh sửa">${icon('pencil', 16)}</button><button class="icon-button" data-action="toggle-recurring" data-id="${item.id}" aria-label="${item.isActive ? 'Tạm dừng' : 'Bật lại'}">${icon(item.isActive ? 'pause' : 'play', 16)}</button></div>`).join('');
  return `${pageHeading('Giao dịch định kỳ', 'Các khoản lặp lại được tạo tự động theo lịch.', `${actionButton('Chạy kỳ đến hạn', 'run-recurring', 'refresh')} ${actionButton('Tạo định kỳ', 'new-recurring')}`)}<section class="grid stats-grid recurring-summary-grid">${countStatCard('Tất cả', rows.length, 'Quy tắc đã tạo')}${countStatCard('Sắp đến hạn', dueSoon, 'Trong 7 ngày tới', 'income')}${countStatCard('Tạm dừng', paused, 'Quy tắc chưa hoạt động', 'expense')}</section><div class="notice notice-info section-gap">Giao dịch đến hạn được tạo tối đa một lần cho mỗi ngày. Ví không đủ số dư sẽ làm toàn bộ lượt chạy dừng và không lưu dở.</div><section class="card section-gap">${list ? `<div class="list">${list}</div>` : emptyState('Chưa có quy tắc định kỳ', 'Tạo quy tắc cho tiền nhà, hóa đơn, lương hoặc khoản thu chi lặp lại.', actionButton('Tạo định kỳ', 'new-recurring'))}</section>`;
}

function goalsPage(state) {
  const goals = state.snapshot.goals.filter((goal) => goal.status !== 'archived');
  const total = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const cards = goals.map((goal) => {
    const completion = percent(goal.currentAmount, goal.targetAmount);
    const achieved = goal.currentAmount >= goal.targetAmount;
    return `<article class="card goal-card" data-agent-focus-type="goal" data-agent-focus-id="${escapeHtml(goal.id)}"><div class="goal-card-top"><div class="budget-card-title"><span class="row-icon goal">${icon('target', 18)}</span><div><h3 data-no-translate>${escapeHtml(goal.title)}</h3><p>${goal.targetDate ? `Mục tiêu đến ${formatDate(goal.targetDate)}` : 'Không đặt ngày hoàn thành'}</p></div></div><button class="icon-button" data-action="edit-goal" data-id="${goal.id}" aria-label="Chỉnh sửa">${icon('pencil', 16)}</button></div><div class="goal-target"><div class="goal-current">${formatMoney(goal.currentAmount)}</div><small>trên ${formatMoney(goal.targetAmount)}</small></div><div class="progress-track"><div class="progress-fill ${achieved ? '' : completion >= 80 ? 'warn' : ''}" style="width:${Math.min(100, completion)}%"></div></div><div class="budget-row-foot"><span>${Math.min(100, completion)}% hoàn thành</span><span>${achieved ? 'Đã đạt mục tiêu' : `Còn ${formatMoney(Math.max(0, goal.targetAmount - goal.currentAmount))}`}</span></div><div class="goal-actions"><button class="button button-primary button-small" data-action="goal-deposit" data-id="${goal.id}">${icon('plus', 15)}Nạp tiền</button><button class="button button-secondary button-small" data-action="goal-withdraw" data-id="${goal.id}">Rút tiền</button><button class="button button-quiet button-small" data-action="archive-goal" data-id="${goal.id}">Lưu trữ</button></div></article>`;
  }).join('');
  const targetTotal = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const completion = percent(total, targetTotal);
  return `${pageHeading('Mục tiêu tiết kiệm', 'Theo dõi tích lũy mục tiêu.', actionButton('Tạo mục tiêu', 'new-goal'))}<article class="goal-summary-card"><div><div class="balance-label">Mục tiêu tiết kiệm</div><div class="goal-summary-value">${formatMoney(total)} <span>đã dành dụm</span></div><div class="goal-summary-meta">${goals.length} mục tiêu đang thực hiện</div></div><div class="goal-summary-progress"><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, completion)}%"></div></div><small>${targetTotal ? `${Math.min(100, completion)}% tổng mục tiêu` : 'Tạo mục tiêu để bắt đầu theo dõi'}</small></div></article><section class="grid goal-grid section-gap">${cards || emptyState('Chưa có mục tiêu tiết kiệm', 'Tạo mục tiêu đầu tiên và dành riêng một ví cho khoản tiết kiệm đó.', actionButton('Tạo mục tiêu', 'new-goal'))}</section>`;
}

function reportsPage(state) {
  const { from, to } = state.reportRange;
  const rows = state.snapshot.transactions;
  const breakdown = reportBreakdown(rows, from, to);
  const totals = rows.filter((item) => item.date >= from && item.date <= to).reduce((acc, item) => ({
    income: acc.income + (item.kind === 'income' ? item.amount : 0), expense: acc.expense + (item.kind === 'expense' ? item.amount : 0)
  }), { income: 0, expense: 0 });
  const trend = sixMonthTrend(rows, state.period);
  const categories = breakdown.categories.slice(0, 8).map((item, index) => ({ ...item, color: ['#3b82f6', '#f07d68', '#9179d6', '#f1b94c', '#60a5fa', '#2563eb', '#1e3a8a', '#a67412'][index % 8] }));
  const distribution = categories.map((row) => ({ name: row.name, amount: row.amount }));
  const rangeForm = `<section class="report-range-panel" aria-labelledby="report-range-title">
    <div class="report-range-heading">
      <span class="report-range-icon">${icon('calendar', 18)}</span>
      <div><h2 id="report-range-title">Khoảng thời gian</h2><p>Lọc số liệu báo cáo theo ngày</p></div>
    </div>
    <div class="report-range-fields">
      <label class="report-date-field"><span>Từ ngày</span><input type="date" aria-label="Từ ngày báo cáo" aria-describedby="report-range-summary" data-filter="report-from" value="${escapeHtml(from)}"></label>
      <span class="report-range-connector" aria-hidden="true">${icon('arrowRight', 16)}</span>
      <label class="report-date-field"><span>Đến ngày</span><input type="date" aria-label="Đến ngày báo cáo" aria-describedby="report-range-summary" data-filter="report-to" value="${escapeHtml(to)}"></label>
    </div>
    <p class="report-range-summary" id="report-range-summary">${icon('calendar', 14)}<span>Đang xem dữ liệu từ ${escapeHtml(formatDate(from))} đến ${escapeHtml(formatDate(to))}</span></p>
  </section>`;
  const categoryRows = categories.map((item) => `<div class="list-row"><span class="legend-dot" style="background:${item.color}"></span><div class="row-copy"><div class="row-title">${escapeHtml(item.name)}</div><div class="row-meta">${percent(item.amount, breakdown.total)}% tổng chi</div></div><strong>${formatMoney(item.amount)}</strong></div>`).join('');
  return `${pageHeading('Báo cáo dòng tiền', 'Số liệu được tổng hợp từ giao dịch, không tính chuyển khoản nội bộ.')}${rangeForm}<section class="grid stats-grid">${statCard('Tổng thu', totals.income, 'income', 'Trong khoảng ngày chọn')}${statCard('Tổng chi', totals.expense, 'expense', 'Trong khoảng ngày chọn')}${statCard('Dòng tiền ròng', totals.income - totals.expense, '', 'Thu trừ chi')}</section>${state.snapshot.appSettings?.enable_ai_coach !== false ? renderSmartFinanceInsights(state) : ''}<section class="grid two-column section-gap"><article class="card"><div class="card-heading"><div><h2>Thu và chi qua 6 tháng</h2><p>Chuyển tiền giữa tài khoản được loại trừ</p></div></div>${trendChart(trend)}</article><article class="card"><div class="card-heading"><div><h2>Chi tiêu theo danh mục</h2><p>Trong khoảng ngày đã chọn</p></div></div>${donutChart(distribution)}</article></section><section class="card section-gap"><div class="card-heading"><div><h2>Chi tiết danh mục</h2><p>${categories.length} danh mục có chi tiêu</p></div></div>${categoryRows ? `<div class="list">${categoryRows}</div>` : emptyState('Không có khoản chi trong khoảng ngày này', 'Chọn khoảng khác hoặc thêm giao dịch chi để xem báo cáo.')}</section>`;
}

function categoriesPage(state) {
  const kind = state.categoryKind || 'expense';
  const query = (state.categorySearch || '').trim().toLocaleLowerCase('vi');
  const categories = state.snapshot.categories.filter((item) => item.kind === kind);
  const visible = categories.filter((item) => item.name.toLocaleLowerCase('vi').includes(query));
  const tiles = visible.map((item) => {
    const usage = state.snapshot.transactions.filter((row) => row.categoryId === item.id).length;
    const categoryIcon = icon(item.kind === 'income' ? 'income' : 'tag', 18);
    return `<article class="category-tile" data-category-tile data-search="${escapeHtml(item.name.toLocaleLowerCase('vi'))}"><button type="button" class="category-tile-history" data-action="category-history" data-id="${item.id}" aria-label="Xem toàn bộ lịch sử giao dịch của danh mục ${escapeHtml(item.name)}" title="Xem toàn bộ lịch sử giao dịch"><span class="category-tile-top"><span class="row-icon ${item.kind}" style="background:${escapeHtml(item.color)}18;color:${escapeHtml(item.color)}">${categoryIcon}</span><span class="category-usage-count">${usage} giao dịch · Xem lịch sử</span></span><h3 data-no-translate>${escapeHtml(item.name)}</h3></button><div class="category-tile-foot"><span>${item.isArchived ? 'Đã lưu trữ' : item.isDefault ? 'Mặc định' : 'Đang sử dụng'}</span>${item.isArchived ? '' : `<div class="category-actions"><button class="icon-button" data-action="edit-category" data-id="${item.id}" aria-label="Chỉnh sửa ${escapeHtml(item.name)}">${icon('pencil', 16)}</button><button class="icon-button" data-action="archive-category" data-id="${item.id}" aria-label="Lưu trữ ${escapeHtml(item.name)}">${icon('archive', 16)}</button></div>`}</div></article>`;
  }).join('');
  const emptyTitle = query ? 'Không tìm thấy danh mục' : 'Chưa có danh mục';
  const emptyDescription = query ? 'Thử từ khóa khác hoặc chuyển sang loại danh mục còn lại.' : 'Danh mục sẽ xuất hiện sau khi email được xác minh.';
  return `${pageHeading('Danh mục thu chi', 'Danh mục giúp bạn phân tích giao dịch theo từng nhóm.', actionButton('Thêm danh mục', 'new-category'))}<section class="card section-gap category-panel"><div class="category-toolbar"><div class="category-tabs" role="group" aria-label="Loại danh mục"><button class="category-tab ${kind === 'expense' ? 'is-active' : ''}" data-action="category-kind" data-kind="expense" aria-pressed="${kind === 'expense'}">Khoản chi</button><button class="category-tab ${kind === 'income' ? 'is-active' : ''}" data-action="category-kind" data-kind="income" aria-pressed="${kind === 'income'}">Khoản thu</button></div><label class="field-inline category-search"><span class="sr-only">Tìm danh mục</span><input type="search" id="category-search" aria-label="Tìm danh mục" placeholder="Tìm danh mục" value="${escapeHtml(state.categorySearch || '')}"></label></div><div class="category-grid" id="category-grid">${tiles}</div><div class="empty-state category-empty" id="category-empty" ${visible.length ? 'hidden' : ''}><div><div class="empty-illustration" aria-hidden="true">${icon('search', 28)}</div><h3>${emptyTitle}</h3><p>${emptyDescription}</p>${!query && categories.length === 0 ? actionButton('Thêm danh mục', 'new-category') : ''}</div></div></section><div class="notice notice-info section-gap">Danh mục đã dùng trong lịch sử sẽ được lưu trữ thay vì xóa cứng, nên các báo cáo cũ vẫn chính xác.</div>`;
}

const settingsSectionIds = ['settings-profile', 'settings-security', 'settings-preferences', 'settings-data', 'settings-mini-app', 'settings-bank', 'settings-help'];

function settingsSubnavLink(id, label, activeSection) {
  const active = activeSection === id;
  return `<a class="settings-subnav-link ${active ? 'is-active' : ''}" href="#${id}" data-settings-section="${id}" aria-current="${active ? 'location' : 'false'}">${label}</a>`;
}

function bankLinkSettingsSection() {
  return `<section class="settings-section bank-link-section" id="settings-bank" aria-labelledby="settings-bank-title">
    <div class="bank-link-heading"><div><h2 id="settings-bank-title">Liên kết ngân hàng</h2><p>Chọn một ngân hàng trong danh sách SePay Bank Hub đang công bố.</p></div><span class="bank-status-pill"><span aria-hidden="true"></span>Chưa có kết nối thật</span></div>
    <div class="bank-provider-intro"><span class="bank-provider-intro-icon" aria-hidden="true">${icon('info', 17)}</span><p><strong>Luồng mở Hosted Link đã được nối với backend sandbox.</strong> Cần SePay cấp credential và Company XID để bật nút. Vietcombank không nằm trong danh sách Bank Hub hiện được công bố. SePay không nhận mã ngân hàng để chọn sẵn trong API tạo link, nên có thể yêu cầu bạn chọn lại ngân hàng ở Hosted Link.</p></div>
    ${renderBankTargetCatalog()}
    <div class="bank-link-permissions"><span>${icon('check', 15)}Chỉ yêu cầu quyền đọc</span><span>${icon('shield', 15)}Không nhập mật khẩu hoặc OTP trên Ví Mình</span></div>
    <div class="bank-link-provider-state"><span class="bank-provider-dot" aria-hidden="true"></span><span><strong>Trạng thái tích hợp</strong><small>Sandbox; chỉ xác nhận bước liên kết, chưa đồng bộ giao dịch</small></span><span><strong>Đồng bộ gần nhất</strong><small>Chưa triển khai</small></span></div>
    <section class="card bank-link-process" aria-labelledby="bank-process-title"><div class="card-heading"><div><h3 id="bank-process-title">Quy trình hoạt động</h3><p>Bạn kiểm soát quyền truy cập và từng khoản được nhập.</p></div></div><ol class="bank-process-steps">
      <li><span>1</span><div><strong>Xác thực an toàn</strong><p>Ví Mình tạo Hosted Link ở backend, rồi chuyển hướng một lần tới SePay. Bạn xác thực trong trang do SePay cung cấp.</p></div></li>
      <li><span>2</span><div><strong>Xác nhận liên kết</strong><p>Ví Mình kiểm tra trạng thái với SePay. Chỉ giữ tên ngân hàng và 4 số cuối khi SePay xác nhận liên kết.</p></div></li>
      <li><span>3</span><div><strong>Đồng bộ sẽ làm sau</strong><p>Import giao dịch, phân loại và đồng bộ định kỳ chưa được bật trong mốc này.</p></div></li>
    </ol></section>
    <div class="bank-privacy-note"><span class="bank-privacy-icon" aria-hidden="true">${icon('shield', 19)}</span><div><strong>Quyền riêng tư luôn được ưu tiên</strong><p>Chấp thuận liên kết ngân hàng là lựa chọn riêng, không gộp với Điều khoản sử dụng hoặc Thông báo quyền riêng tư lúc đăng ký. Ví Mình không nhận mật khẩu hay OTP ngân hàng; mốc này chưa tải lịch sử giao dịch.</p></div></div>
  </section>`;
}

function desktopMiniAppSettingsSection() {
  return `<section class="card settings-section desktop-mini-app-section" id="settings-mini-app" aria-labelledby="settings-mini-app-title">
    <div class="card-heading"><div><h2 id="settings-mini-app-title">Trợ lý Ví Mình cho máy tính</h2><p>Mở cửa sổ mini app ngay trên máy đang chạy website.</p></div></div>
    <div class="desktop-mini-app-row"><span class="row-icon">${icon('card', 19)}</span><div class="desktop-mini-app-copy"><strong>Ghi nhanh và theo dõi thu chi</strong><p>Ứng dụng desktop cần được khởi chạy trên máy này. Trình duyệt sẽ hỏi xác nhận trước khi mở Ví Mình.</p></div><button class="button button-primary button-small" type="button" data-action="open-mini-app">${icon('arrowRight', 15)} Mở mini app</button></div>
    <details class="desktop-mini-app-install"><summary>Cách cài đặt bản local</summary><p>Hiện dự án chưa phát hành bộ cài Windows. Trong thư mục dự án, cài dependencies bằng <code>npm install</code>, sau đó chạy <code>npm run desktop</code>. Mở mini app một lần để đăng ký liên kết mở từ trình duyệt.</p></details>
  </section>`;
}

function fxChartMarkup(rates, days) {
  const rows = rates?.history || [];
  if (!rows.length) return '<div class="fx-chart-empty">Biểu đồ sẽ có điểm dữ liệu sau lần đồng bộ hằng ngày tiếp theo.</div>';
  const width = 560;
  const height = 112;
  const values = rows.map((row) => Number(row.usdVnd)).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return '<div class="fx-chart-empty">Chưa có dữ liệu biểu đồ.</div>';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.001);
  const points = rows.map((row, index) => {
    const value = Number(row.usdVnd);
    const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width;
    const y = height - 12 - ((value - min) / span) * (height - 24);
    return [x, y];
  });
  const path = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L${width} ${height} L0 ${height} Z`;
  const last = points.at(-1);
  const labels = [rows[0]?.date, rows[Math.floor((rows.length - 1) / 2)]?.date, rows.at(-1)?.date]
    .filter(Boolean).map((date) => new Date(`${date}T12:00:00`).toLocaleDateString(document.documentElement.lang || 'vi-VN', { day: '2-digit', month: '2-digit' }));
  return `<div class="fx-chart" role="img" aria-label="Biến động tỷ giá USD sang VND trong ${days} ngày gần đây">
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fx-rate-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".18"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs><path class="fx-chart-grid" d="M0 18H${width} M0 55H${width} M0 98H${width}"/><path d="${area}" fill="url(#fx-rate-area)"/><path d="${path}" fill="none" stroke="#3478ee" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/></svg>
    <div class="fx-chart-labels"><span>${escapeHtml(labels[0] || '')}</span><span>${escapeHtml(labels[1] || '')}</span><span>${escapeHtml(labels[2] || '')}</span></div>
  </div>`;
}

function fxRateCard(state) {
  const rates = state.fxRates;
  const days = state.fxRangeDays || 30;
  const reverse = Boolean(state.fxReverse);
  const locale = document.documentElement.lang || 'vi-VN';
  const rateText = rates ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rates.usdVnd) : '';
  const inverseText = rates ? new Intl.NumberFormat(locale, { maximumSignificantDigits: 7 }).format(rates.vndUsd) : '';
  const updated = rates?.providerUpdatedAt
    ? new Date(rates.providerUpdatedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const inputCurrency = reverse ? 'VND' : 'USD';
  const outputCurrency = reverse ? 'USD' : 'VND';
  const initialInput = reverse ? '1000000' : '1';
  const initialOutput = rates
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: reverse ? 2 : 0 }).format(reverse ? 1_000_000 * rates.vndUsd : rates.usdVnd)
    : '—';
  const problem = state.fxRateError?.code === 'FX_RATE_UNAVAILABLE'
    ? 'Chưa có tỷ giá. Hãy cấu hình CURRENCYAPI_API_KEY trong .env ở máy chủ rồi tải lại.'
    : state.fxRateError?.message || 'Không tải được tỷ giá. Bạn vẫn có thể dùng sổ VND.';
  return `<section class="fx-rate-card" aria-labelledby="fx-rate-title">
    <div class="fx-rate-heading"><div><h3 id="fx-rate-title">Theo dõi tỷ giá USD / VND</h3><p>Tỷ giá tham khảo hai chiều · Nguồn ${rates?.provider || 'CurrencyAPI'}</p></div><span class="fx-rate-status ${rates?.stale ? 'is-stale' : ''}"><i></i>${rates ? (rates.stale ? 'DỮ LIỆU CŨ' : 'CẬP NHẬT HẰNG NGÀY') : 'CHƯA KẾT NỐI'}</span></div>
    ${rates ? `<div class="fx-rate-body"><div class="fx-rate-value"><strong>${rateText}<small> ₫ / 1 USD</small></strong><span>1 VND ≈ ${inverseText} USD</span><small>Cập nhật ${escapeHtml(updated)}</small></div><div class="fx-rate-chart-area"><div class="fx-range-tabs" role="group" aria-label="Khoảng thời gian biểu đồ">${[7, 30, 90].map((range) => `<button type="button" data-action="fx-range" data-days="${range}" aria-pressed="${days === range}">${range} ngày</button>`).join('')}</div>${fxChartMarkup(rates, days)}</div></div>
      <div class="fx-converter"><label for="fx-converter-input">Quy đổi nhanh</label><div class="fx-converter-row"><div class="fx-converter-field"><input id="fx-converter-input" type="number" min="0" step="0.01" value="${initialInput}" inputmode="decimal" aria-label="Số tiền ${inputCurrency}" data-fx-input><span>${inputCurrency}</span></div><button type="button" class="fx-swap-button" data-action="fx-swap" aria-label="Đổi chiều quy đổi">⇄</button><div class="fx-converter-field fx-converter-output"><output id="fx-converter-output">${initialOutput}</output><span>${outputCurrency}</span></div></div></div>`
      : `<div class="notice notice-info fx-rate-empty">${escapeHtml(problem)}</div>`}
    <div class="fx-rate-footer"><span>Tự đồng bộ tối đa một lần mỗi ngày theo gói miễn phí. Số liệu USD là quy đổi tham khảo từ sổ VND.</span><button type="button" class="button button-secondary button-small" data-action="fx-refresh" ${state.fxRateLoading ? 'disabled' : ''}>${state.fxRateLoading ? 'Đang tải…' : 'Cập nhật'}</button></div>
  </section>`;
}

function currencyPreferenceMarkup(state) {
  const currency = state.user?.currency === 'USD' ? 'USD' : 'VND';
  return `<div class="setting-row currency-setting-row"><div><div class="setting-label">Đơn vị tiền tệ</div><div class="setting-help">Dùng cho số tiền trong giao dịch và báo cáo. Dữ liệu chuẩn vẫn được lưu bằng VND.</div></div><div class="currency-choice" role="group" aria-label="Đơn vị tiền tệ"><button type="button" data-action="currency-preference" data-currency="VND" aria-pressed="${currency === 'VND'}" class="${currency === 'VND' ? 'is-selected' : ''}">VND · ₫</button><button type="button" data-action="currency-preference" data-currency="USD" aria-pressed="${currency === 'USD'}" class="${currency === 'USD' ? 'is-selected' : ''}">USD · $</button></div></div>${fxRateCard(state)}`;
}

function settingsPage(state) {
  const displayName = escapeHtml(state.user?.fullName || '');
  const email = escapeHtml(state.user?.email || '');
  const requestedSection = location.hash.slice(1);
  const activeSection = settingsSectionIds.includes(requestedSection) ? requestedSection : 'settings-profile';
  return `${pageHeading('Cài đặt tài khoản', 'Quản lý hồ sơ, bảo mật và tùy chọn hiển thị của bạn.')}
    <div class="settings-layout"><aside class="settings-subnav" aria-label="Điều hướng cài đặt"><div class="settings-subnav-label">Cá nhân</div>${settingsSubnavLink('settings-profile', 'Thông tin cá nhân', activeSection)}${settingsSubnavLink('settings-security', 'Bảo mật & mật khẩu', activeSection)}<div class="settings-subnav-label">Ứng dụng</div>${settingsSubnavLink('settings-preferences', 'Tùy chỉnh hiển thị', activeSection)}${settingsSubnavLink('settings-data', 'Tài khoản & dữ liệu', activeSection)}${settingsSubnavLink('settings-mini-app', 'Mini app', activeSection)}<div class="settings-subnav-label">Kết nối</div>${settingsSubnavLink('settings-bank', 'Liên kết ngân hàng', activeSection)}${settingsSubnavLink('settings-help', 'Trợ giúp & liên hệ', activeSection)}</aside><div class="settings-content">
      <section class="card settings-section" id="settings-profile"><div class="card-heading"><div><h2>Thông tin cá nhân</h2><p>Cập nhật tên, ảnh đại diện và email hiển thị trên tài khoản</p></div></div><div class="settings-profile-head">${avatarMarkup(state.user, 'settings-profile-avatar')}<button class="button button-secondary button-small" data-action="edit-profile">Chỉnh sửa hồ sơ</button></div><div class="settings-profile-grid"><div><span class="setting-label">Họ và tên</span><div class="settings-value">${displayName}</div></div><div><span class="setting-label">Email</span><div class="settings-value settings-email-row"><span>${email}</span>${state.user?.emailVerifiedAt ? '<span class="verification-badge">✓ Đã xác nhận</span>' : '<span class="verification-badge">Chưa xác nhận</span>'}</div></div></div></section>
      <section class="card settings-section" id="settings-security"><div class="card-heading"><div><h2>Bảo mật & mật khẩu</h2><p>Bảo vệ quyền truy cập vào tài khoản của bạn</p></div></div><div class="settings-security-row"><div><span class="setting-label">Mật khẩu</span><div class="setting-help">Mật khẩu được bảo vệ ở máy chủ. Gửi liên kết đặt lại đến email đã xác minh để thay đổi.</div></div><button class="button button-primary button-small" data-action="request-password-reset">Gửi liên kết đặt lại</button></div></section>
      <section class="card settings-section" id="settings-preferences"><div class="card-heading"><div><h2>Tùy chỉnh ứng dụng</h2><p>Cài đặt tiền tệ và ngôn ngữ được đồng bộ trong tài khoản của bạn</p></div></div>${currencyPreferenceMarkup(state)}<div class="setting-row"><div><div class="setting-label">Tháng dashboard mặc định</div><div class="setting-help">Chọn kỳ được hiển thị khi mở trang tổng quan</div></div>${monthControl('Tháng dashboard mặc định', 'preference-month', state.preferences.defaultMonth || state.period)}</div><div class="setting-row"><div><div class="setting-label">Ngôn ngữ giao diện</div><div class="setting-help">Áp dụng cho website, khu vực Admin và Mini app.</div></div><select id="preference-language" aria-label="Ngôn ngữ giao diện"><option value="vi" ${state.user?.language === 'vi' ? 'selected' : ''}>Tiếng Việt</option><option value="en" ${state.user?.language === 'en' ? 'selected' : ''}>English</option><option value="zh" ${state.user?.language === 'zh' ? 'selected' : ''}>简体中文</option></select></div></section>
      <section class="card settings-section" id="settings-data"><div class="card-heading"><div><h2>Tài khoản & dữ liệu</h2><p>PostgreSQL là nguồn dữ liệu chuẩn; LocalStorage giữ cache trên thiết bị</p></div></div><div class="setting-row"><div><div class="setting-label">Đồng bộ</div><div class="setting-help">${state.offline ? 'Chưa kết nối máy chủ' : 'Đã kết nối với máy chủ'}</div></div><button class="button button-secondary button-small" data-action="sync">Đồng bộ ngay</button></div><div class="setting-row"><div><div class="setting-label">Cache cục bộ</div><div class="setting-help">${state.snapshot.syncedAt ? `Cập nhật ${formatDate(state.snapshot.syncedAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Chưa có cache trên trình duyệt'}</div></div><span aria-hidden="true">${icon('database', 16)}</span></div><div class="setting-row"><div><div class="setting-label">Đăng xuất</div><div class="setting-help">Xóa cache tài chính của tài khoản hiện tại trên thiết bị này</div></div><button class="button button-danger button-small" data-action="logout">Đăng xuất</button></div></section>
      ${desktopMiniAppSettingsSection()}
      ${state.snapshot.appSettings?.enable_bank_hub !== false ? bankLinkSettingsSection() : ''}
      <section class="settings-help-note" id="settings-help"><span class="row-icon">${icon('help', 17)}</span><div><strong>Cần trợ giúp?</strong><p>Xem trang <a href="#" data-action="navigate" data-view="help">Thông tin & trợ giúp</a> để hiểu quy tắc tính số liệu và cách sử dụng.</p></div></section>
    </div></div>`;
}

function helpPage(state) {
  const topics = [
    ['Giao dịch thu chi', 'Tạo, tìm kiếm, lọc và sắp xếp giao dịch theo loại, tài khoản, danh mục, khoảng ngày và số tiền. Chuyển khoản nội bộ không được tính thành thu hoặc chi.', 'receipt'],
    ['Số dư và tài khoản', 'Số dư được tính từ số dư ban đầu, các khoản thu, chi và chuyển khoản. Tổng tài sản có bao gồm các ví mục tiêu đang hoạt động.', 'wallet'],
    ['Mục tiêu tiết kiệm', 'Mỗi mục tiêu có ví riêng. Nạp/rút mục tiêu là chuyển tiền nội bộ để báo cáo thu chi không bị sai.', 'target'],
    ['Ngân sách', 'Đã dùng là tổng khoản chi theo đúng danh mục trong tháng. Nếu vượt hạn mức, thanh tiến độ hiển thị tối đa 100% và số vượt được ghi riêng.', 'budget'],
    ['Giao dịch định kỳ', 'Quy tắc định kỳ chỉ tạo giao dịch khi đến hạn. Có thể xem, chỉnh sửa, tạm dừng hoặc bật lại quy tắc trong trang Định kỳ.', 'repeat'],
    ['Báo cáo và xuất dữ liệu', 'Trong Agent tài chính trên web, nêu kỳ, loại thống kê và định dạng cần xuất. File chỉ chứa dữ liệu thuộc tài khoản đang đăng nhập.', 'chart'],
    ['Liên kết ngân hàng', 'Mở Cài đặt → Liên kết ngân hàng. Hiện có luồng Hosted Link SePay Bank Hub sandbox để xác nhận bước liên kết; cần credential do SePay cấp. Chưa đồng bộ hoặc nhập lịch sử giao dịch.', 'bank'],
    ['Phân tích tài chính', 'Phân tích, dự báo và nhận diện hóa đơn hỗ trợ tham khảo. Kiểm tra lại thông tin trước khi lưu giao dịch hoặc ra quyết định.', 'info'],
    ['Hồ sơ và quyền riêng tư', 'Cập nhật hồ sơ, ảnh đại diện và email đã xác minh trong Cài đặt. Xem Điều khoản sử dụng và Thông báo quyền riêng tư tại trang pháp lý.', 'user'],
    ['LocalStorage và đồng bộ', 'Trình duyệt giữ cache theo từng tài khoản để mở lại giao diện nhanh. Server phải xác nhận thành công trước khi cache được cập nhật; PostgreSQL là nguồn chuẩn.', 'database'],
    ['Bảo vệ dữ liệu', 'Mật khẩu được băm ở server. Cookie phiên có HttpOnly; token xác minh và đặt lại mật khẩu không lưu vào LocalStorage.', 'shield']
  ];

  const tickets = state?.snapshot?.supportTickets || [];
  const statusLabels = { open: 'Đang chờ xử lý', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đã đóng' };
  const ticketsList = tickets.length ? `
    <div class="admin-ticket-list" style="margin-top: 12px;">
      ${tickets.map((t) => `
        <article class="admin-ticket-item">
          <header>
            <div>
              <strong>${escapeHtml(t.subject)}</strong>
              <small>Gửi lúc: ${formatDate(t.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
            </div>
            <span class="admin-status-badge ${t.status === 'open' ? 'is-pending' : ''}">${statusLabels[t.status] || t.status}</span>
          </header>
          <p>${escapeHtml(t.message)}</p>
          ${t.adminResponse ? `<div class="admin-ticket-reply"><strong>Phản hồi từ Ban Quản Trị:</strong><p style="margin:4px 0 0;">${escapeHtml(t.adminResponse)}</p></div>` : ''}
        </article>
      `).join('')}
    </div>
  ` : '<p class="row-meta" style="margin-top: 10px;">Bạn chưa có yêu cầu hỗ trợ nào được gửi.</p>';

  const supportSection = `
    <section class="card section-gap support-split-container">
      <div class="support-split-col">
        <div class="card-heading">
          <div>
            <h2>Gửi yêu cầu hỗ trợ</h2>
            <p>Nếu bạn gặp sự cố hoặc cần hỗ trợ tài khoản, vui lòng gửi tin nhắn cho Quản trị viên.</p>
          </div>
        </div>
        <form class="admin-stack-form" data-form="support-ticket" style="margin-top: 14px;">
          <label>
            Tiêu đề yêu cầu
            <input type="text" name="subject" required minlength="3" maxlength="150" placeholder="Ví dụ: Cần hỗ trợ liên kết ngân hàng, góp ý tính năng...">
          </label>
          <div class="admin-form-row-2">
            <label>
              Mức độ ưu tiên
              <select name="priority">
                <option value="normal" selected>Bình thường</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </label>
          </div>
          <label>
            Nội dung chi tiết
            <textarea name="message" required minlength="10" maxlength="2000" rows="3" placeholder="Mô tả cụ thể vấn đề bạn gặp phải..."></textarea>
          </label>
          <div style="margin-top: 12px;">
            <button type="submit" class="button button-primary"><span class="button-icon" aria-hidden="true">${icon('help', 16)}</span>Gửi yêu cầu hỗ trợ</button>
          </div>
        </form>
      </div>
      <div class="support-split-col support-split-divider">
        <div class="card-heading">
          <div>
            <h2>Lịch sử yêu cầu hỗ trợ (${tickets.length})</h2>
            <p>Theo dõi trạng thái và câu trả lời từ đội ngũ hỗ trợ</p>
          </div>
        </div>
        ${ticketsList}
      </div>
    </section>
  `;

  return `${pageHeading('Thông tin & trợ giúp', 'Các quy tắc tính toán và cách sử dụng ứng dụng.')}<section class="grid help-grid">${topics.map(([title, description, iconName]) => `<article class="card help-card"><div class="budget-card-title"><span class="row-icon">${icon(iconName, 18)}</span><h2>${title}</h2></div><p>${description}</p></article>`).join('')}</section>${supportSection}<section class="card section-gap"><h2>Ví Mình</h2><p class="row-meta">Website đồ án cuối khóa môn JavaScript · HTML5, CSS3, JavaScript ES6+, Node.js và PostgreSQL.</p><p class="row-meta">Frontend dùng ES modules, DOM API, biểu đồ SVG tự dựng và cache LocalStorage theo user.</p><p class="row-meta">Tài liệu: <a href="/legal.html#terms" target="_blank" rel="noopener noreferrer">Điều khoản sử dụng</a> · <a href="/legal.html#privacy" target="_blank" rel="noopener noreferrer">Thông báo quyền riêng tư</a>.</p></section>`;
}

export function renderPage(state) {
  switch (state.view) {
    case 'dashboard': return dashboardPage(state);
    case 'transactions': return transactionPage(state);
    case 'accounts': return accountsPage(state);
    case 'budgets': return budgetsPage(state);
    case 'recurring': return recurringPage(state);
    case 'goals': return goalsPage(state);
    case 'reports': return reportsPage(state);
    case 'categories': return categoriesPage(state);
    case 'settings': return settingsPage(state);
    case 'help': return helpPage(state);
    default: return dashboardPage(state);
  }
}

export function renderApp(state) {
  const page = renderPage(state);
  const announcements = state.snapshot.announcements || [];
  const announcementBanners = announcements.map((ann) => `
    <aside class="system-announcement-banner ${ann.tone === 'warning' ? 'tone-warning' : ann.tone === 'critical' ? 'tone-critical' : ''}" role="status">
      <div>
        <strong>${escapeHtml(ann.title)}</strong>
        <p>${escapeHtml(ann.message)}</p>
      </div>
    </aside>
  `).join('');
  const announcementStack = announcementBanners ? `<div class="system-announcement-stack">${announcementBanners}</div>` : '';

  return `<div class="app-shell">${sidebar(state)}<main class="main-column">${topbar(state)}<div class="page-wrap"><div class="offline-banner notice notice-warn ${state.offline ? 'is-visible' : ''}" role="status">Máy chủ chưa phản hồi. Đang hiển thị cache gần nhất; thay đổi mới sẽ chỉ được báo thành công khi API xác nhận.</div>${announcementStack}<div id="page-content">${page}</div></div></main>${mobileNav(state)}</div>`;
}

