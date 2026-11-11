import { monthStart, shiftMonth, today } from './dates.js';

export function searchKey(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi-VN').trim();
}

export function sumAmounts(...values) {
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function totalsForRange(transactions, from, to) {
  const rows = transactions.filter((item) => item.date >= from && item.date <= to);
  const income = rows.filter((item) => item.kind === 'income');
  const expense = rows.filter((item) => item.kind === 'expense');
  return { income: sumAmounts(...income.map((item) => item.amount)), expense: sumAmounts(...expense.map((item) => item.amount)) };
}

export function dashboardStats(snapshot, month) {
  const from = monthStart(month);
  const lastDate = month === today().slice(0, 7) ? today() : `${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()}`;
  const monthTransactions = snapshot.transactions.filter((item) => item.date >= from && item.date <= lastDate);
  const totals = monthTransactions.reduce((value, item) => ({
    income: value.income + (item.kind === 'income' ? item.amount : 0),
    expense: value.expense + (item.kind === 'expense' ? item.amount : 0)
  }), { income: 0, expense: 0 });
  const spending = monthTransactions.filter((item) => item.kind === 'expense').reduce((groups, item) => {
    groups[item.categoryId] = (groups[item.categoryId] || 0) + item.amount;
    return groups;
  }, {});
  const spendingByCategory = Object.entries(spending).map(([categoryId, amount]) => ({
    categoryId,
    name: snapshot.categories.find((category) => category.id === categoryId)?.name || 'Danh mục đã lưu trữ',
    amount
  })).sort((a, b) => b.amount - a.amount);
  const accounts = snapshot.accounts.filter((account) => !account.isArchived);
  const netWorth = accounts.reduce((sum, account) => sum + account.balance, 0);
  const budgets = snapshot.budgets.filter((budget) => budget.periodStart.startsWith(month));
  const recent = [...monthTransactions].sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`)).slice(0, 5);
  return {
    totals, net: totals.income - totals.expense, netWorth, accounts,
    spendingByCategory, budgets, recent,
    budgetSafe: budgets.every((budget) => budget.limitAmount === 0 || budget.spent / budget.limitAmount < 1),
    hasTransactions: monthTransactions.some((item) => item.amount > 0)
  };
}

export function filterTransactions(transactions, filters, search = '', currency = 'VND', usdVndRate = null) {
  const query = searchKey(search);
  const amountRate = currency === 'USD' ? Number(usdVndRate) : 1;
  const toLedgerAmount = (value) => {
    if (!value) return null;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return null;
    if (currency === 'USD') return Number.isFinite(amountRate) && amountRate > 0 ? amount * amountRate : null;
    return amount;
  };
  const minimum = toLedgerAmount(filters.minAmount);
  const maximum = toLedgerAmount(filters.maxAmount);
  const filtered = transactions.filter((item) => {
    const values = [item.note, item.categoryName, item.accountName, item.kind];
    const matchesSearch = !query || values.some((value) => searchKey(value).includes(query));
    const matchesKind = filters.kind === 'all' || item.kind === filters.kind;
    const matchesAccount = filters.accountId === 'all' || item.accountId === filters.accountId;
    const matchesCategory = filters.categoryId === 'all' || item.categoryId === filters.categoryId;
    const matchesMonth = !filters.month || item.date.startsWith(filters.month);
    const matchesFrom = !filters.from || item.date >= filters.from;
    const matchesTo = !filters.to || item.date <= filters.to;
    const matchesMin = minimum == null || item.amount >= minimum;
    const matchesMax = maximum == null || item.amount <= maximum;
    return matchesSearch && matchesKind && matchesAccount && matchesCategory && matchesMonth && matchesFrom && matchesTo && matchesMin && matchesMax;
  });
  const comparator = filters.sort === 'oldest'
    ? (a, b) => `${a.date}${a.createdAt || ''}`.localeCompare(`${b.date}${b.createdAt || ''}`)
    : filters.sort === 'amount-high'
      ? (a, b) => b.amount - a.amount
      : filters.sort === 'amount-low'
        ? (a, b) => a.amount - b.amount
        : (a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`);
  return [...filtered].sort(comparator);
}

export function sixMonthTrend(transactions, anchorMonth) {
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(anchorMonth, index - 5));
  return months.map((month) => {
    const rows = transactions.filter((item) => item.date.startsWith(month));
    return rows.reduce((summary, item) => {
      if (item.kind === 'income') summary.income += item.amount;
      else summary.expense += item.amount;
      return summary;
    }, { month, income: 0, expense: 0 });
  });
}

export function reportBreakdown(transactions, from, to) {
  const rows = transactions.filter((item) => item.date >= from && item.date <= to && item.kind === 'expense');
  const total = sumAmounts(...rows.map((item) => item.amount));
  const byCategory = rows.reduce((groups, item) => {
    groups[item.categoryName] = (groups[item.categoryName] || 0) + item.amount;
    return groups;
  }, {});
  return { total, categories: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount) };
}
