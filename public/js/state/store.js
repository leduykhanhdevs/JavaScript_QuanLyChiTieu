import { readPreferences, readSnapshot, removeSnapshot, writePreferences, writeSnapshot } from './cache.js';
import { currentMonth, today } from '../utils/dates.js';

export const state = {
  user: null,
  snapshot: { accounts: [], categories: [], transactions: [], transfers: [], budgets: [], recurringRules: [], goals: [], announcements: [], appSettings: {}, supportTickets: [], syncedAt: null },
  view: 'dashboard',
  status: 'loading',
  offline: false,
  storageWarning: false,
  modal: null,
  search: '',
  filters: { month: currentMonth(), kind: 'all', accountId: 'all', categoryId: 'all', from: '', to: '', minAmount: '', maxAmount: '', sort: 'newest' },
  categoryKind: 'expense',
  categorySearch: '',
  period: currentMonth(),
  reportRange: { from: `${currentMonth()}-01`, to: today() },
  smartFinance: { accountId: 'all', toDate: null },
  preferences: {},
  fxRates: null,
  fxRateError: null,
  fxRateLoading: false,
  fxReverse: false,
  fxRangeDays: 30
};

export function hydrateUser(user) {
  state.user = user;
  state.preferences = { ...readPreferences(user.id), currency: user.currency || 'VND', language: user.language || 'vi' };
  state.fxRates = null;
  state.fxRateError = null;
  state.fxRateLoading = false;
  state.fxReverse = false;
  state.period = state.preferences.defaultMonth || currentMonth();
  state.smartFinance = { accountId: 'all', toDate: null };
  state.snapshot = readSnapshot(user.id) || { accounts: [], categories: [], transactions: [], transfers: [], budgets: [], recurringRules: [], goals: [], announcements: [], appSettings: {}, supportTickets: [], syncedAt: null };
  state.status = 'ready';
}

export function setSnapshot(snapshot) {
  const { user: nextUser, ...collections } = snapshot;
  if (nextUser) {
    state.user = nextUser;
    savePreferences({ ...(nextUser.currency ? { currency: nextUser.currency } : {}), ...(nextUser.language ? { language: nextUser.language } : {}) });
  }
  state.snapshot = { ...state.snapshot, ...collections };
  state.offline = false;
  state.status = 'ready';
  state.storageWarning = !writeSnapshot(state.user.id, state.snapshot);
}

export function persistSnapshot() {
  state.snapshot.syncedAt = new Date().toISOString();
  state.storageWarning = !writeSnapshot(state.user.id, state.snapshot);
}

export function clearUserData(userId) {
  if (userId) {
    removeSnapshot(userId);
    try { localStorage.removeItem(`vi-minh:v1:user:${userId}:preferences`); } catch {}
  }
  state.user = null;
  state.snapshot = { accounts: [], categories: [], transactions: [], transfers: [], budgets: [], recurringRules: [], goals: [], announcements: [], appSettings: {}, supportTickets: [], syncedAt: null };
  state.status = 'auth';
  state.offline = false;
  state.storageWarning = false;
  state.modal = null;
  state.fxRates = null;
  state.fxRateError = null;
  state.fxRateLoading = false;
  state.fxReverse = false;
}

export function savePreferences(updates) {
  state.preferences = { ...state.preferences, ...updates };
  if (state.user) state.storageWarning = !writePreferences(state.user.id, state.preferences) || state.storageWarning;
}

export function applyLocalMutation(path, method, payload, result) {
  const data = state.snapshot;
  const id = result.id;
  const parts = path.split('/').filter(Boolean);
  const entity = parts[1];
  const editId = parts[2];
  const findName = (items, recordId, fallback = '') => items.find((item) => item.id === recordId)?.name || fallback;
  const stamped = new Date().toISOString();
  const transactionImpact = (row, multiplier) => {
    if (!row || row.date > today()) return;
    const account = data.accounts.find((item) => item.id === row.accountId);
    if (account) account.balance += (row.kind === 'income' ? row.amount : -row.amount) * multiplier;
  };

  if (entity === 'savings-goals' && parts[3] === 'contributions') {
    const goal = data.goals.find((item) => item.id === editId);
    const goalAccount = data.accounts.find((item) => item.id === goal?.accountId);
    const otherAccount = data.accounts.find((item) => item.id === payload.accountId);
    const isDeposit = payload.direction === 'deposit';
    const sourceId = isDeposit ? otherAccount?.id : goalAccount?.id;
    const targetId = isDeposit ? goalAccount?.id : otherAccount?.id;
    data.transfers = [{ id, sourceAccountId: sourceId, sourceAccountName: findName(data.accounts, sourceId), targetAccountId: targetId, targetAccountName: findName(data.accounts, targetId), amount: Number(payload.amount), date: payload.date, note: payload.note || '', createdAt: stamped }, ...data.transfers];
    if (payload.date <= today()) {
      if (goalAccount) goalAccount.balance += isDeposit ? Number(payload.amount) : -Number(payload.amount);
      if (otherAccount) otherAccount.balance += isDeposit ? -Number(payload.amount) : Number(payload.amount);
      if (goal) goal.currentAmount = goalAccount?.balance || goal.currentAmount;
    }
  } else if (entity === 'transactions') {
    const list = data.transactions;
    if (method === 'DELETE') {
      transactionImpact(list.find((item) => item.id === editId), -1);
      data.transactions = list.filter((item) => item.id !== editId);
    }
    else {
      const row = { id: id || editId, kind: payload.kind, amount: Number(payload.amount), accountId: payload.accountId, accountName: findName(data.accounts, payload.accountId), categoryId: payload.categoryId, categoryName: findName(data.categories, payload.categoryId), date: payload.date, note: payload.note || '', createdAt: stamped };
      const index = list.findIndex((item) => item.id === row.id);
      if (index >= 0) {
        transactionImpact(list[index], -1);
        data.transactions = list.map((item, at) => at === index ? { ...item, ...row } : item);
      } else data.transactions = [row, ...list];
      transactionImpact(row, 1);
    }
    data.budgets.forEach((budget) => {
      const nextMonth = new Date(`${budget.periodStart}T00:00:00`);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const periodEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
      budget.spent = data.transactions.filter((item) => item.kind === 'expense' && item.categoryId === budget.categoryId && item.date >= budget.periodStart && item.date < periodEnd).reduce((sum, item) => sum + item.amount, 0);
      budget.remaining = budget.limitAmount - budget.spent;
    });
  } else if (entity === 'accounts') {
    if (method === 'DELETE') data.accounts = data.accounts.map((item) => item.id === editId ? { ...item, isArchived: true } : item);
    else {
      const current = data.accounts.find((item) => item.id === (id || editId));
      const openingBalance = Number(payload.openingBalance || 0);
      const row = { id: id || editId, name: payload.name, kind: payload.kind || current?.kind || 'cash', openingBalance, balance: current ? current.balance + openingBalance - current.openingBalance : openingBalance, iconKey: payload.iconKey || 'wallet', color: payload.color || '#2563EB', isArchived: false, createdAt: stamped };
      const index = data.accounts.findIndex((item) => item.id === row.id);
      data.accounts = index >= 0 ? data.accounts.map((item, at) => at === index ? { ...item, ...row } : item) : [...data.accounts, row];
    }
  } else if (entity === 'categories') {
    if (method === 'DELETE') data.categories = data.categories.map((item) => item.id === editId ? { ...item, isArchived: true } : item);
    else {
      const row = { id: id || editId, name: payload.name, kind: payload.kind, color: payload.color || '#2563EB', iconKey: payload.iconKey || 'dots', isDefault: false, isArchived: false };
      const index = data.categories.findIndex((item) => item.id === row.id);
      data.categories = index >= 0 ? data.categories.map((item, at) => at === index ? { ...item, ...row } : item) : [...data.categories, row];
    }
  } else if (entity === 'transfers' || entity === 'contributions') {
    const sourceId = payload.sourceAccountId || (payload.direction === 'deposit' ? payload.accountId : payload.goalAccountId);
    const targetId = payload.targetAccountId || (payload.direction === 'deposit' ? payload.goalAccountId : payload.accountId);
    data.transfers = [{ id, sourceAccountId: sourceId, sourceAccountName: findName(data.accounts, sourceId), targetAccountId: targetId, targetAccountName: findName(data.accounts, targetId), amount: Number(payload.amount), date: payload.date, note: payload.note || '', createdAt: stamped }, ...data.transfers];
    if (payload.date <= today()) {
      const source = data.accounts.find((item) => item.id === sourceId);
      const target = data.accounts.find((item) => item.id === targetId);
      if (source) source.balance -= Number(payload.amount);
      if (target) target.balance += Number(payload.amount);
    }
  } else if (entity === 'budgets') {
    if (method === 'DELETE') data.budgets = data.budgets.filter((item) => item.id !== editId);
    else {
      const periodStart = payload.periodStart?.length === 7 ? `${payload.periodStart}-01` : payload.periodStart;
      const nextMonth = new Date(`${periodStart}T00:00:00`);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const periodEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const spent = data.transactions.filter((item) => item.kind === 'expense' && item.categoryId === payload.categoryId && item.date >= periodStart && item.date < periodEnd).reduce((sum, item) => sum + item.amount, 0);
      const row = { id: id || editId, categoryId: payload.categoryId, categoryName: findName(data.categories, payload.categoryId), periodStart, limitAmount: Number(payload.limitAmount), alertAtPercent: Number(payload.alertAtPercent || 80), note: payload.note || '', spent, remaining: Number(payload.limitAmount) - spent };
      const index = data.budgets.findIndex((item) => item.id === row.id);
      data.budgets = index >= 0 ? data.budgets.map((item, at) => at === index ? { ...item, ...row } : item) : [...data.budgets, row];
    }
  } else if (entity === 'recurring-rules') {
    if (method === 'DELETE') data.recurringRules = data.recurringRules.map((item) => item.id === editId ? { ...item, isActive: false } : item);
    else {
      const row = { id: id || editId, ...payload, amount: Number(payload.amount), accountName: findName(data.accounts, payload.accountId), categoryName: findName(data.categories, payload.categoryId), isActive: payload.isActive ?? true, nextOccurrenceOn: payload.startOn };
      const index = data.recurringRules.findIndex((item) => item.id === row.id);
      data.recurringRules = index >= 0 ? data.recurringRules.map((item, at) => at === index ? { ...item, ...row } : item) : [...data.recurringRules, row];
    }
  } else if (entity === 'savings-goals') {
    if (method === 'DELETE') data.goals = data.goals.map((item) => item.id === editId ? { ...item, status: 'archived' } : item);
    else {
      const row = { id: id || editId, accountId: result.accountId || data.goals.find((item) => item.id === editId)?.accountId, title: payload.title, targetAmount: Number(payload.targetAmount), currentAmount: 0, targetDate: payload.targetDate || null, status: 'active', accountName: payload.title, color: payload.color || '#2563EB' };
      const index = data.goals.findIndex((item) => item.id === row.id);
      data.goals = index >= 0 ? data.goals.map((item, at) => at === index ? { ...item, ...row, accountId: item.accountId, currentAmount: item.currentAmount } : item) : [...data.goals, row];
      if (index < 0 && result.accountId) data.accounts = [...data.accounts, { id: result.accountId, name: payload.title, kind: 'goal', openingBalance: 0, balance: 0, iconKey: 'target', color: payload.color || '#2563EB', isArchived: false, createdAt: stamped }];
      if (index >= 0) data.accounts = data.accounts.map((account) => account.id === row.accountId ? { ...account, name: payload.title, color: payload.color || account.color } : account);
    }
  } else if (entity === 'support-tickets') {
    const ticket = { id: id || `st_${Date.now()}`, ...payload, status: 'open', adminResponse: null, createdAt: stamped };
    data.supportTickets = [ticket, ...(data.supportTickets || [])];
  }
  persistSnapshot();
}
