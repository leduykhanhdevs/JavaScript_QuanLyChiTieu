import { today, currentMonth, shiftMonth } from './dates.js';
import { formatMoney } from './money.js';

const DAY_MS = 86_400_000;
const FORECAST_WINDOW_DAYS = 90;

const parseDay = (value) => {
  const text = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const asDay = (date) => date.toISOString().slice(0, 10);
const addDays = (value, amount) => {
  const date = parseDay(value);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + amount);
  return asDay(date);
};
const daysBetween = (from, to) => Math.max(0, Math.floor((parseDay(to) - parseDay(from)) / DAY_MS));
const monthEnd = (month) => {
  const date = parseDay(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return asDay(date);
};
const safeAmount = (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const signedBalance = (value) => Number.isSafeInteger(Number(value)) ? Number(value) : 0;

function nextOccurrence(value, rule) {
  const date = parseDay(value);
  if (!date) return '';
  if (rule.frequency === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  else if (rule.frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  else if (rule.frequency === 'monthly') {
    const day = Math.max(1, Math.min(31, Number(rule.dayOfMonth) || date.getUTCDate()));
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    date.setUTCDate(Math.min(day, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
  } else if (rule.frequency === 'yearly') {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCFullYear(date.getUTCFullYear() + 1);
    date.setUTCMonth(month);
    date.setUTCDate(Math.min(day, new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate()));
  } else return '';
  return asDay(date);
}

function ruleEvents(snapshot, accountIds, from, to) {
  const events = [];
  for (const rule of snapshot.recurringRules || []) {
    if (!rule.isActive || !accountIds.has(rule.accountId)) continue;
    let occurrence = String(rule.nextOccurrenceOn || rule.startOn || '').slice(0, 10);
    if (!occurrence) continue;
    let guard = 0;
    while (occurrence <= from && guard < 500) {
      const next = nextOccurrence(occurrence, rule);
      if (!next || next <= occurrence) break;
      occurrence = next;
      guard += 1;
    }
    if (occurrence === from) {
      occurrence = nextOccurrence(occurrence, rule);
    }
    guard = 0;
    while (occurrence && occurrence <= to && guard < 500) {
      if (!rule.endOn || occurrence <= String(rule.endOn).slice(0, 10)) {
        events.push({ date: occurrence, accountId: rule.accountId, kind: rule.kind, amount: safeAmount(rule.amount), source: 'recurring', ruleId: rule.id });
      }
      const next = nextOccurrence(occurrence, rule);
      if (!next || next <= occurrence) break;
      occurrence = next;
      guard += 1;
    }
  }
  return events;
}

/** Forecast a selected account (or all non-goal accounts) without writing data. */
export function forecastCashflow(snapshot, accountId = 'all', requestedTo = addDays(today(), 30), todayDate = today()) {
  const activeAccounts = (snapshot.accounts || []).filter((account) => !account.isArchived && account.kind !== 'goal');
  const accounts = accountId === 'all' ? activeAccounts : activeAccounts.filter((account) => account.id === accountId);
  if (!accounts.length) return { available: false, reason: 'Chưa có tài khoản đang hoạt động để dự báo.' };

  const toDate = String(requestedTo || '').slice(0, 10);
  const requestedDays = daysBetween(todayDate, toDate);
  if (!parseDay(toDate) || requestedDays > FORECAST_WINDOW_DAYS) {
    return { available: false, reason: 'Chọn ngày dự báo trong vòng 90 ngày tới.' };
  }
  const accountIds = new Set(accounts.map((account) => account.id));
  const accountBalance = accounts.reduce((sum, account) => sum + signedBalance(account.balance), 0);
  const transactions = snapshot.transactions || [];
  const futureEvents = transactions
    .filter((item) => accountIds.has(item.accountId) && item.date > todayDate && item.date <= toDate)
    .map((item) => ({ date: item.date, accountId: item.accountId, kind: item.kind, amount: safeAmount(item.amount), source: 'recorded' }));
  const existingRecurring = new Set(transactions
    .filter((item) => item.recurringRuleId && item.scheduledFor)
    .map((item) => `${item.recurringRuleId}:${String(item.scheduledFor).slice(0, 10)}`));
  const scheduledEvents = ruleEvents(snapshot, accountIds, todayDate, toDate)
    .filter((item) => !existingRecurring.has(`${item.ruleId}:${item.date}`));
  const futureTransferEvents = (snapshot.transfers || []).filter((item) => item.date > todayDate && item.date <= toDate)
    .flatMap((item) => [
      ...(accountIds.has(item.sourceAccountId) ? [{ date: item.date, accountId: item.sourceAccountId, kind: 'transfer-out', amount: safeAmount(item.amount), source: 'transfer' }] : []),
      ...(accountIds.has(item.targetAccountId) ? [{ date: item.date, accountId: item.targetAccountId, kind: 'transfer-in', amount: safeAmount(item.amount), source: 'transfer' }] : [])
    ]);
  const events = [...futureEvents, ...scheduledEvents, ...futureTransferEvents];

  const historyFrom = addDays(todayDate, -FORECAST_WINDOW_DAYS);
  const variableHistory = transactions.filter((item) => item.kind === 'expense'
    && !item.recurringRuleId
    && accountIds.has(item.accountId)
    && item.date >= historyFrom
    && item.date < todayDate);
  const dailyVariableSpend = variableHistory.length >= 5
    ? variableHistory.reduce((sum, item) => sum + safeAmount(item.amount), 0) / FORECAST_WINDOW_DAYS
    : 0;
  const variableExpense = Math.round(dailyVariableSpend * requestedDays);
  const eventTotals = events.reduce((totals, item) => {
    if (item.kind === 'income') totals.income += item.amount;
    else if (item.kind === 'expense') totals.expense += item.amount;
    return totals;
  }, { income: 0, expense: 0 });

  const eventsByDate = new Map();
  events.forEach((item) => {
    if (!eventsByDate.has(item.date)) eventsByDate.set(item.date, []);
    eventsByDate.get(item.date).push(item);
  });
  let balance = accountBalance;
  let lowestBalance = balance;
  let lowestDate = todayDate;
  for (let offset = 1; offset <= requestedDays; offset += 1) {
    const date = addDays(todayDate, offset);
    balance -= dailyVariableSpend;
    for (const item of (eventsByDate.get(date) || []).sort((a, b) => (['expense', 'transfer-out'].includes(a.kind) ? -1 : 1) - (['expense', 'transfer-out'].includes(b.kind) ? -1 : 1))) {
      balance += ['income', 'transfer-in'].includes(item.kind) ? item.amount : -item.amount;
    }
    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestDate = date;
    }
  }
  const recordedFuture = futureEvents.reduce((count, item) => count + (item.source === 'recorded' ? 1 : 0), 0);
  return {
    available: true,
    accountLabel: accountId === 'all' ? 'Tất cả tài khoản cá nhân' : accounts[0].name,
    from: todayDate,
    to: toDate,
    horizonDays: requestedDays,
    openingBalance: accountBalance,
    expectedIncome: eventTotals.income,
    expectedScheduledExpense: eventTotals.expense,
    expectedExpense: eventTotals.expense + variableExpense,
    variableExpense,
    variableHistoryCount: variableHistory.length,
    scheduledCount: scheduledEvents.length,
    recordedFutureCount: recordedFuture,
    projectedBalance: Math.round(balance),
    lowestBalance: Math.round(lowestBalance),
    lowestDate
  };
}

function normalizeText(value) {
  return String(value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

/** Return cautious, evidence-backed flags; never labels an item as fraud. */
export function detectSpendingAnomalies(snapshot, todayDate = today()) {
  const transactions = snapshot.transactions || [];
  const expenses = transactions.filter((item) => item.kind === 'expense');
  const flags = [];
  const exactGroups = new Map();
  expenses.filter((item) => !item.recurringRuleId).forEach((item) => {
    const key = [item.date, item.accountId, item.categoryId, item.amount].join('|');
    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key).push(item);
  });
  for (const matches of exactGroups.values()) {
    if (matches.length < 2) continue;
    const item = matches[0];
    flags.push({
      kind: 'possible-duplicate',
      title: 'Có thể đã nhập trùng',
      detail: `${matches.length} khoản chi ${item.categoryName} cùng số tiền ${formatMoney(item.amount)}, tài khoản và ngày ${item.date}. Hãy kiểm tra trước khi xóa.`,
      amount: safeAmount(item.amount),
      categoryId: item.categoryId,
      date: item.date,
      count: matches.length
    });
  }

  const month = todayDate.slice(0, 7);
  const elapsedDay = Number(todayDate.slice(8, 10));
  const priorMonths = [shiftMonth(month, -1), shiftMonth(month, -2), shiftMonth(month, -3)];
  const byCategoryMonth = new Map();
  expenses.forEach((item) => {
    const itemMonth = item.date.slice(0, 7);
    if (itemMonth !== month && !priorMonths.includes(itemMonth)) return;
    const key = `${item.categoryId}|${itemMonth}`;
    byCategoryMonth.set(key, (byCategoryMonth.get(key) || 0) + safeAmount(item.amount));
  });
  const categoryIds = new Set(expenses.map((item) => item.categoryId));
  for (const categoryId of categoryIds) {
    const current = byCategoryMonth.get(`${categoryId}|${month}`) || 0;
    if (current <= 0) continue;
    const samples = priorMonths.map((prior) => {
      const comparableDay = Math.min(elapsedDay, Number(monthEnd(prior).slice(8, 10)));
      const cutoff = `${prior}-${String(comparableDay).padStart(2, '0')}`;
      return expenses.filter((item) => item.categoryId === categoryId && item.date.slice(0, 7) === prior && item.date <= cutoff)
        .reduce((sum, item) => sum + safeAmount(item.amount), 0);
    });
    const activeMonths = samples.filter((amount) => amount > 0);
    if (activeMonths.length < 2) continue;
    const average = samples.reduce((sum, amount) => sum + amount, 0) / samples.length;
    if (current < average * 1.75 || current - average < 100_000) continue;
    const categoryName = expenses.find((item) => item.categoryId === categoryId)?.categoryName || 'Danh mục';
    flags.push({
      kind: 'spending-spike',
      title: 'Chi tiêu đang cao hơn mức gần đây',
      detail: `${categoryName}: ${formatMoney(current)} từ đầu tháng, cao hơn khoảng 75% so với mức trung bình ${formatMoney(average)} của ba kỳ so sánh. Đây chỉ là tín hiệu để xem lại.`,
      amount: current,
      categoryId,
      date: todayDate
    });
  }

  const currentMonthStart = `${month}-01`;
  (snapshot.budgets || []).filter((budget) => budget.periodStart === currentMonthStart && budget.spent > budget.limitAmount).forEach((budget) => {
    flags.push({
      kind: 'budget-overrun',
      title: 'Đã vượt ngân sách danh mục',
      detail: `${budget.categoryName}: chi ${formatMoney(budget.spent)}, vượt hạn mức ${formatMoney(budget.limitAmount)}.`,
      amount: budget.spent - budget.limitAmount,
      categoryId: budget.categoryId,
      date: todayDate
    });
  });

  return flags.sort((a, b) => b.amount - a.amount).slice(0, 6);
}

function periodForQuestion(query, todayDate) {
  const current = todayDate.slice(0, 7);
  if (/hom qua/.test(query)) {
    const date = addDays(todayDate, -1);
    return { month: date.slice(0, 7), from: date, to: date, mode: 'range', label: 'Hôm qua' };
  }
  if (/hom nay|ngay nay/.test(query)) {
    return { month: current, from: todayDate, to: todayDate, mode: 'range', label: 'Hôm nay' };
  }
  if (/7 ngay (?:gan nhat|nay|qua)/.test(query)) {
    const from = addDays(todayDate, -6);
    return { month: current, from, to: todayDate, mode: 'range', label: `7 ngày gần nhất (${from} – ${todayDate})` };
  }
  if (/tuan nay/.test(query)) {
    const weekday = parseDay(todayDate).getUTCDay();
    const from = addDays(todayDate, -((weekday + 6) % 7));
    return { month: current, from, to: todayDate, mode: 'range', label: `Tuần này (${from} – ${todayDate})` };
  }
  if (/thang truoc|ky truoc/.test(query)) {
    const month = shiftMonth(current, -1);
    const [year, monthNumber] = month.split('-').map(Number);
    return { month, from: `${month}-01`, to: monthEnd(month), mode: 'month', label: `Tháng ${monthNumber}/${year}` };
  }
  const namedMonth = query.match(/\bthang\s+(0?[1-9]|1[0-2])\b(?:\s+nam\s+(20\d{2})\b)?/);
  if (namedMonth) {
    const year = Number(namedMonth[2] || todayDate.slice(0, 4));
    const monthNumber = Number(namedMonth[1]);
    const month = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const to = month === current ? todayDate : monthEnd(month);
    return { month, from: `${month}-01`, to, mode: 'month', label: `Tháng ${monthNumber}/${year}` };
  }
  return { month: current, from: `${current}-01`, to: todayDate, mode: 'month', label: 'Từ đầu tháng đến hôm nay' };
}

/** Extract safe, user-specific navigation context from an AI Coach question. */
export function getFinanceQuestionContext(prompt, snapshot, { includeDefaultPeriod = false, todayDate = today() } = {}) {
  const query = normalizeText(prompt);
  const hasExplicitPeriod = /(hom qua|hom nay|ngay nay|7 ngay|tuan nay|thang nay|thang truoc|ky truoc)/.test(query)
    || /\bthang\s+(0?[1-9]|1[0-2])\b/.test(query);
  const period = hasExplicitPeriod || includeDefaultPeriod ? periodForQuestion(query, todayDate) : null;
  const categories = (snapshot.categories || []).filter((item) => !item.isArchived)
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length);
  const category = categories.find((item) => normalizeText(item.name).length > 1 && query.includes(normalizeText(item.name)));
  const accounts = (snapshot.accounts || []).filter((item) => !item.isArchived && item.kind !== 'goal')
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length);
  const account = accounts.find((item) => normalizeText(item.name).length > 1 && query.includes(normalizeText(item.name)));
  const goal = (snapshot.goals || []).filter((item) => item.status === 'active')
    .sort((a, b) => normalizeText(b.title).length - normalizeText(a.title).length)
    .find((item) => normalizeText(item.title).length > 2 && query.includes(normalizeText(item.title)));
  const recurringRule = (snapshot.recurringRules || []).filter((item) => item.isActive)
    .sort((a, b) => normalizeText(b.title).length - normalizeText(a.title).length)
    .find((item) => normalizeText(item.title).length > 2 && query.includes(normalizeText(item.title)));
  const asksIncome = /\bthu\b|thu nhap|tien vao|nhan luong/.test(query);
  const asksExpense = /\bchi\b|chi tieu|chi phi/.test(query);
  const kind = category?.kind || (asksIncome !== asksExpense ? asksIncome ? 'income' : 'expense' : '');

  return {
    period: period ? { month: period.month, from: period.from, to: period.to, mode: period.mode } : null,
    kind,
    categoryId: category?.id || '',
    accountId: account?.id || '',
    goalId: goal?.id || '',
    recurringId: recurringRule?.id || ''
  };
}

/** Local, rule-based coach answers grounded in the signed-in user's snapshot. */
export function analyzePersonalFinanceQuestion(prompt, snapshot, todayDate = today()) {
  const query = normalizeText(prompt);
  if (!/(bao nhieu|tong|chi|thu|so du|du bao|tiet kiem|muc tieu|ngan sach|bat thuong|trung|ke hoach|giao dich|tai khoan)/.test(query)) return null;
  if (/(tuan truoc|quy nay|quy truoc|nam nay|nam truoc|12 thang)/.test(query) && /(chi|thu|giao dich)/.test(query)) {
    return { text: 'Hiện mình tổng hợp được hôm nay, hôm qua, 7 ngày gần nhất, tuần này, tháng này, tháng trước và tháng/năm cụ thể. Mở Báo cáo để tự chọn khoảng ngày khác.', actions: [{ type: 'route', label: 'Chọn khoảng ngày trong Báo cáo', view: 'reports' }] };
  }
  const transactionRows = snapshot.transactions || [];
  const hasExplicitPeriod = /\b(hom qua|hom nay|7 ngay|tuan nay|thang nay|thang truoc|thang (?:0?[1-9]|1[0-2]))\b/.test(query)
    || /\btu .+ den .+/.test(query);
  const asksForAllTransactions = !hasExplicitPeriod
    && /\b(toan bo|tat ca|lich su(?: day du)?|moi giao dich)\b/.test(query)
    && /\b(giao dich|thu chi)\b/.test(query);
  const period = asksForAllTransactions
    ? {
        month: '',
        from: transactionRows.reduce((earliest, item) => !earliest || item.date < earliest ? item.date : earliest, ''),
        to: transactionRows.reduce((latest, item) => !latest || item.date > latest ? item.date : latest, ''),
        mode: 'all',
        label: 'Toàn bộ dữ liệu'
      }
    : periodForQuestion(query, todayDate);
  const txInPeriod = asksForAllTransactions
    ? transactionRows
    : transactionRows.filter((item) => item.date >= period.from && item.date <= period.to);
  const category = (snapshot.categories || []).filter((item) => !item.isArchived)
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length)
    .find((item) => normalizeText(item.name).length > 1 && query.includes(normalizeText(item.name)));
  const account = (snapshot.accounts || []).filter((item) => !item.isArchived && item.kind !== 'goal')
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length)
    .find((item) => normalizeText(item.name).length > 1 && query.includes(normalizeText(item.name)));

  if (/bat thuong|nhap trung|giao dich trung/.test(query)) {
    const flags = detectSpendingAnomalies(snapshot, todayDate);
    const text = flags.length
      ? `Mình tìm thấy ${flags.length} tín hiệu cần bạn xem lại:\n${flags.slice(0, 3).map((flag) => `• ${flag.title}: ${flag.detail}`).join('\n')}`
      : txInPeriod.length < 8
        ? 'Chưa đủ giao dịch để so sánh đáng tin cậy. Khi có thêm lịch sử, mình sẽ dò các khoản trùng và mức chi tăng bất thường.'
        : 'Theo các ngưỡng hiện tại, chưa thấy tín hiệu cần đánh dấu trong kỳ. Điều đó không khẳng định mọi khoản đều chính xác.';
    return { text, actions: [{ type: 'route', label: 'Mở Báo cáo & cảnh báo', view: 'reports' }] };
  }

  if (/du bao|du kien so du/.test(query)) {
    const forecast = forecastCashflow(snapshot, 'all', addDays(todayDate, 30), todayDate);
    if (!forecast.available) return { text: forecast.reason, actions: [{ type: 'route', label: 'Mở Báo cáo', view: 'reports' }] };
    const enoughHistory = forecast.variableHistoryCount >= 5;
    return {
      text: `Trong 30 ngày tới, số dư tổng hợp ước tính là ${formatMoney(forecast.projectedBalance)}. Mô hình tính các khoản định kỳ, giao dịch đã ghi cho tương lai${enoughHistory ? ' và mức chi biến đổi trung bình 90 ngày' : '; chưa đủ 5 khoản chi biến đổi để ước tính phần chi thường ngày'}. Mốc thấp nhất dự kiến: ${formatMoney(forecast.lowestBalance)} vào ${forecast.lowestDate}.`,
      actions: [{ type: 'route', label: 'Xem dự báo chi tiết', view: 'reports' }]
    };
  }

  if (/ngan sach|vuot muc/.test(query)) {
    const budgets = (snapshot.budgets || []).filter((item) => item.periodStart === `${period.month}-01`);
    if (!budgets.length) return { text: `Mình chưa thấy ngân sách được thiết lập cho ${period.month}.`, actions: [{ type: 'route', label: 'Mở Ngân sách', view: 'budgets' }, { type: 'form', label: 'Tạo ngân sách', action: 'new-budget' }] };
    const summaries = budgets.map((item) => `${item.categoryName}: ${formatMoney(item.spent)} / ${formatMoney(item.limitAmount)}${item.remaining < 0 ? ` (vượt ${formatMoney(Math.abs(item.remaining))})` : ` (còn ${formatMoney(item.remaining)})`}`);
    return { text: `Tình hình ngân sách ${period.month}:\n${summaries.join('\n')}`, actions: [{ type: 'route', label: 'Mở Ngân sách', view: 'budgets' }] };
  }

  if (/muc tieu|tiet kiem/.test(query)) {
    const goals = (snapshot.goals || []).filter((item) => item.status === 'active');
    if (!goals.length) return { text: 'Bạn chưa có mục tiêu tiết kiệm đang hoạt động. Tạo mục tiêu để dành riêng một ví và theo dõi tiến độ.', actions: [{ type: 'route', label: 'Xem Mục tiêu', view: 'goals' }, { type: 'form', label: 'Tạo mục tiêu', action: 'new-goal' }] };
    const details = goals.slice(0, 4).map((item) => `${item.title}: ${formatMoney(item.currentAmount)} / ${formatMoney(item.targetAmount)}`);
    return { text: `Tiến độ mục tiêu của bạn:\n${details.join('\n')}`, actions: [{ type: 'route', label: 'Mở Mục tiêu', view: 'goals' }] };
  }

  if ((/so du|tai khoan/.test(query) || account && /con bao nhieu|bao nhieu tien/.test(query)) && !category && !/(chi|thu|giao dich)/.test(query)) {
    const accounts = (snapshot.accounts || []).filter((item) => !item.isArchived);
    const personalAccounts = accounts.filter((item) => item.kind !== 'goal');
    if (account) return { text: `Số dư hiện tại của ${account.name} là ${formatMoney(signedBalance(account.balance))}.`, actions: [{ type: 'route', label: 'Mở Tài khoản', view: 'accounts' }] };
    const total = personalAccounts.reduce((sum, item) => sum + signedBalance(item.balance), 0);
    const details = personalAccounts.slice(0, 5).map((item) => `${item.name}: ${formatMoney(signedBalance(item.balance))}`);
    return { text: `Tổng số dư các ví cá nhân là ${formatMoney(total)}.${details.length ? `\n${details.join('\n')}` : ''}`, actions: [{ type: 'route', label: 'Mở Tài khoản', view: 'accounts' }] };
  }

  const asksIncome = /\bthu\b|thu nhap|tien vao|nhan luong/.test(query);
  const asksExpense = /\bchi\b|chi tieu|chi phi/.test(query);
  const kind = category ? category.kind : asksIncome !== asksExpense ? asksIncome ? 'income' : 'expense' : null;
  const rows = txInPeriod.filter((item) => (!kind || item.kind === kind) && (!category || item.categoryId === category.id) && (!account || item.accountId === account.id));
  const total = rows.reduce((sum, item) => sum + safeAmount(item.amount), 0);
  if (category) {
    const label = kind === 'income' ? 'thu' : 'chi';
    const action = { type: 'category-history', label: `Mở lịch sử ${category.name}`, categoryId: category.id };
    const latest = rows.reduce((best, item) => !best || item.date > best.date ? item : best, null);
    return {
      text: `${period.label}, danh mục ${category.name}${account ? ` trong tài khoản ${account.name}` : ''} có ${rows.length} giao dịch ${label}, tổng ${formatMoney(total)}.${latest ? ` Khoản gần nhất: ${latest.date}, ${formatMoney(latest.amount)}.` : ''}`,
      actions: [action, { type: 'route', label: 'Mở Báo cáo', view: 'reports' }]
    };
  }

  if (/(chi|thu|bao nhieu|tong|giao dich|tien)/.test(query)) {
    if (!kind) {
      const incomeRows = rows.filter((item) => item.kind === 'income');
      const expenseRows = rows.filter((item) => item.kind === 'expense');
      const incomeTotal = incomeRows.reduce((sum, item) => sum + safeAmount(item.amount), 0);
      const expenseTotal = expenseRows.reduce((sum, item) => sum + safeAmount(item.amount), 0);
      return {
        text: `${period.label}, bạn có ${rows.length} giao dịch: ${formatMoney(incomeTotal)} thu qua ${incomeRows.length} giao dịch và ${formatMoney(expenseTotal)} chi qua ${expenseRows.length} giao dịch. Chuyển khoản giữa các ví không nằm trong phép tính này.`,
        actions: [{ type: 'route', label: 'Xem giao dịch', view: 'transactions' }, { type: 'route', label: 'Mở Báo cáo', view: 'reports' }]
      };
    }
    const label = kind === 'income' ? 'thu' : 'chi';
    return {
      text: `${period.label}, bạn ghi nhận ${formatMoney(total)} ${label}${account ? ` trong tài khoản ${account.name}` : ''} qua ${rows.length} giao dịch. Chuyển khoản giữa các ví không nằm trong phép tính này.`,
      actions: [{ type: 'route', label: 'Xem giao dịch', view: 'transactions' }, { type: 'route', label: 'Mở Báo cáo', view: 'reports' }]
    };
  }
  return null;
}

export const financeDateHelpers = { addDays, monthEnd, daysBetween, normalizeText };
