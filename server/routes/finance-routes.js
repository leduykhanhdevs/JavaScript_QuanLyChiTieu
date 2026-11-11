import { AppError, notFound } from '../lib/errors.js';
import { objectBody, uuid } from '../lib/validation.js';
import { cancelProfileEmailChange, confirmEmailChangeAuthorizationCode, confirmProfileEmailCode, createAccount, createBudget, createCategory, createGoal, createSupportTicket, createTransfer, deleteRecurringRule, deleteTransaction, getBootstrap, getProfileAvatar, getReportData, getTransactions, goalMovement, runDueRecurring, saveRecurringRule, saveTransaction, sendEmailChangeAuthorizationCode, sendProfileEmailCode, updateAccount, updateBudget, updateCategory, updateCurrencyPreference, updateGoal, updateProfile, updateUiLanguage } from '../services/finance-service.js';
import { sendBuffer } from '../lib/http.js';
import { createUserExport } from '../services/export-service.js';
import { convertMoneyFieldsToVnd, getFxRateSummary, requireUsableFxRate } from '../services/fx-rate-service.js';

const matchId = (pathname, base) => {
  const match = pathname.match(new RegExp(`^${base}/([^/]+)$`));
  return match?.[1] || null;
};

export async function handleFinanceRoute(ctx) {
  const { req, res, url, db, user } = ctx;
  const { pathname } = url;
  if (!pathname.startsWith('/api/')) return null;
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
  const body = () => objectBody(ctx.body);

  if (req.method === 'GET' && pathname === '/api/fx/rates') {
    return [200, await getFxRateSummary(db, url.searchParams.get('days'))];
  }

  if (req.method === 'GET' && pathname === '/api/settings/profile/avatar') {
    const avatar = await getProfileAvatar(db, user.id);
    sendBuffer(res, 200, avatar.data, avatar.mime);
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/bootstrap') return [200, await getBootstrap(db, user)];
  if (req.method === 'GET' && pathname === '/api/dashboard') return [200, await getBootstrap(db, user)];
  if (req.method === 'GET' && pathname === '/api/exports/user') {
    const file = await createUserExport(db, user.id, url.searchParams);
    sendBuffer(res, 200, file.buffer, file.contentType, { 'Content-Disposition': `attachment; filename="${file.filename}"` });
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/reports') return [200, await getReportData(db, user.id, url.searchParams)];
  if (req.method === 'GET' && pathname === '/api/transactions') return [200, { transactions: await getTransactions(db, user.id, url.searchParams) }];
  if (req.method === 'POST' && pathname === '/api/transactions') return [201, await saveTransaction(db, user.id, null, await convertMoneyFieldsToVnd(db, body(), ['amount']))];
  const transactionId = matchId(pathname, '/api/transactions');
  if (transactionId && req.method === 'PATCH') return [200, await saveTransaction(db, user.id, transactionId, await convertMoneyFieldsToVnd(db, body(), ['amount']))];
  if (transactionId && req.method === 'DELETE') return [200, await deleteTransaction(db, user.id, transactionId)];
  if (transactionId && req.method === 'GET') {
    const values = await getTransactions(db, user.id, new URLSearchParams({ limit: '500' }));
    const transaction = values.find((row) => row.id === transactionId);
    if (!transaction) throw notFound('Không tìm thấy giao dịch.');
    return [200, { transaction }];
  }

  if (req.method === 'GET' && pathname === '/api/accounts') return [200, { accounts: (await getBootstrap(db, user)).accounts }];
  if (req.method === 'POST' && pathname === '/api/accounts') return [201, await createAccount(db, user.id, await convertMoneyFieldsToVnd(db, body(), ['openingBalance'], { allowZero: ['openingBalance'] }))];
  const accountId = matchId(pathname, '/api/accounts');
  if (accountId && req.method === 'PATCH') return [200, await updateAccount(db, user.id, accountId, await convertMoneyFieldsToVnd(db, body(), ['openingBalance'], { allowZero: ['openingBalance'] }))];
  if (accountId && req.method === 'DELETE') return [200, await updateAccount(db, user.id, accountId, {}, true)];

  if (req.method === 'GET' && pathname === '/api/categories') return [200, { categories: (await getBootstrap(db, user)).categories }];
  if (req.method === 'POST' && pathname === '/api/categories') return [201, await createCategory(db, user.id, body())];
  const categoryId = matchId(pathname, '/api/categories');
  if (categoryId && req.method === 'PATCH') return [200, await updateCategory(db, user.id, categoryId, body())];
  if (categoryId && req.method === 'DELETE') return [200, await updateCategory(db, user.id, categoryId, {}, true)];

  if (req.method === 'GET' && pathname === '/api/transfers') return [200, { transfers: (await getBootstrap(db, user)).transfers }];
  if (req.method === 'POST' && pathname === '/api/transfers') return [201, await createTransfer(db, user.id, await convertMoneyFieldsToVnd(db, body(), ['amount']))];

  if (req.method === 'GET' && pathname === '/api/budgets') return [200, { budgets: (await getBootstrap(db, user)).budgets }];
  if (req.method === 'POST' && pathname === '/api/budgets') return [201, await createBudget(db, user.id, await convertMoneyFieldsToVnd(db, body(), ['limitAmount']))];
  const budgetId = matchId(pathname, '/api/budgets');
  if (budgetId && req.method === 'PATCH') return [200, await updateBudget(db, user.id, budgetId, await convertMoneyFieldsToVnd(db, body(), ['limitAmount']))];
  if (budgetId && req.method === 'DELETE') return [200, await updateBudget(db, user.id, budgetId, {}, true)];

  if (req.method === 'GET' && pathname === '/api/recurring-rules') return [200, { recurringRules: (await getBootstrap(db, user)).recurringRules }];
  if (req.method === 'POST' && pathname === '/api/recurring-rules') return [201, await saveRecurringRule(db, user.id, null, await convertMoneyFieldsToVnd(db, body(), ['amount']))];
  if (req.method === 'POST' && pathname === '/api/recurring-rules/run-due') return [200, await runDueRecurring(db, user.id)];
  const recurringId = matchId(pathname, '/api/recurring-rules');
  if (recurringId && req.method === 'PATCH') return [200, await saveRecurringRule(db, user.id, recurringId, await convertMoneyFieldsToVnd(db, body(), ['amount']))];
  if (recurringId && req.method === 'DELETE') return [200, await deleteRecurringRule(db, user.id, recurringId)];

  if (req.method === 'GET' && pathname === '/api/savings-goals') return [200, { goals: (await getBootstrap(db, user)).goals }];
  if (req.method === 'POST' && pathname === '/api/savings-goals') return [201, await createGoal(db, user.id, await convertMoneyFieldsToVnd(db, body(), ['targetAmount']))];
  const goalMovementMatch = pathname.match(/^\/api\/savings-goals\/([^/]+)\/contributions$/);
  if (goalMovementMatch && req.method === 'POST') return [201, await goalMovement(db, user.id, uuid(goalMovementMatch[1], 'Mục tiêu'), await convertMoneyFieldsToVnd(db, body(), ['amount']))];
  const goalId = matchId(pathname, '/api/savings-goals');
  if (goalId && req.method === 'PATCH') return [200, await updateGoal(db, user.id, goalId, await convertMoneyFieldsToVnd(db, body(), ['targetAmount']))];
  if (goalId && req.method === 'DELETE') return [200, await updateGoal(db, user.id, goalId, {}, true)];

  if (req.method === 'POST' && pathname === '/api/support-tickets') return [201, await createSupportTicket(db, user.id, body())];

  if (req.method === 'PATCH' && pathname === '/api/settings/profile') return [200, { user: await updateProfile(db, user.id, body()) }];
  if (req.method === 'PATCH' && pathname === '/api/settings/preferences') {
    const preferences = body();
    if (Object.hasOwn(preferences, 'language')) return [200, { user: await updateUiLanguage(db, user.id, preferences.language) }];
    if (String(preferences.currency || '').trim().toUpperCase() === 'USD') await requireUsableFxRate(db);
    return [200, { user: await updateCurrencyPreference(db, user.id, preferences.currency) }];
  }
  if (req.method === 'POST' && pathname === '/api/settings/profile/email-change/authorization') return [200, await sendEmailChangeAuthorizationCode(db, user.id)];
  if (req.method === 'POST' && pathname === '/api/settings/profile/email-change/authorization/confirm') {
    return [200, await confirmEmailChangeAuthorizationCode(db, user.id, body().code)];
  }
  if (req.method === 'POST' && pathname === '/api/settings/profile/email-change/cancel') return [200, await cancelProfileEmailChange(db, user.id)];
  if (req.method === 'POST' && pathname === '/api/settings/profile/email-verification') return [200, await sendProfileEmailCode(db, user.id, body().email)];
  if (req.method === 'POST' && pathname === '/api/settings/profile/email-verification/confirm') {
    const data = body();
    return [200, await confirmProfileEmailCode(db, user.id, data.email, data.code)];
  }
  return null;
}
