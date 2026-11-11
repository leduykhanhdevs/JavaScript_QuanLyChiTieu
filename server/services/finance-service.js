import { randomInt } from 'node:crypto';
import { AppError, conflict, notFound } from '../lib/errors.js';
import { accountKind, categoryKind, colorValue, monthStart, nonNegativeAmount, optionalDate, optionalText, positiveAmount, requiredText, uuid, validDate, validateEmail } from '../lib/validation.js';
import { env, hasSmtpConfig } from '../config/env.js';
import { hashPassword, verifyPassword } from '../lib/security.js';
import { sendEmailChangeCode } from '../lib/mail.js';

const safeInteger = (value, label = 'Số tiền') => {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number)) throw new AppError(500, 'AMOUNT_OVERFLOW', `${label} vượt phạm vi tính toán an toàn.`);
  return number;
};
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function profileUser(row) {
  const avatarVersion = row.avatar_updated_at ? new Date(row.avatar_updated_at).getTime() : null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    currency: row.currency || 'VND',
    emailVerifiedAt: row.email_verified_at,
    avatarUrl: row.has_avatar && avatarVersion ? `/api/settings/profile/avatar?v=${avatarVersion}` : null
  };
}

function jpegDimensions(image) {
  if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8) return null;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset < image.length - 3) {
    if (image[offset] !== 0xff) { offset += 1; continue; }
    while (image[offset] === 0xff) offset += 1;
    const marker = image[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 1 >= image.length) return null;
    const segmentLength = image.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > image.length) return null;
    if (startOfFrame.has(marker)) {
      if (segmentLength < 7) return null;
      return { height: image.readUInt16BE(offset + 3), width: image.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  return null;
}

function avatarBytesFromDataUrl(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 360_000) {
    throw new AppError(400, 'INVALID_AVATAR', 'Ảnh đại diện vượt quá giới hạn cho phép.', { avatar: 'Chọn ảnh JPEG nhỏ hơn 256 KB sau khi xử lý.' });
  }
  const match = value.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new AppError(400, 'INVALID_AVATAR', 'Ảnh đại diện chưa đúng định dạng.', { avatar: 'Ảnh sẽ được chuyển sang JPEG trước khi tải lên.' });
  const image = Buffer.from(match[1], 'base64');
  const dimensions = jpegDimensions(image);
  if (image.length < 1 || image.length > 262_144 || image.toString('base64') !== match[1] || !dimensions || dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 512 || dimensions.height > 512) {
    throw new AppError(400, 'INVALID_AVATAR', 'Ảnh đại diện không hợp lệ hoặc vượt quá giới hạn.', { avatar: 'Ảnh cần là JPEG vuông, tối đa 512 × 512 và 256 KB.' });
  }
  return image;
}

async function inTransaction(db, callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function lockAccounts(client, userId, ids, { active = true } = {}) {
  const uniqueIds = [...new Set(ids.filter(Boolean))].sort();
  if (!uniqueIds.length) return [];
  const result = await client.query(
    `SELECT id, kind, opening_balance FROM accounts
     WHERE user_id = $1 AND id = ANY($2::uuid[]) ${active ? 'AND is_archived = false' : ''}
     ORDER BY id FOR UPDATE`, [userId, uniqueIds]
  );
  if (result.rowCount !== uniqueIds.length) throw notFound('Không tìm thấy tài khoản đang hoạt động.');
  return result.rows;
}

async function assertNoNegativeBalances(client, userId, accountIds) {
  const ids = [...new Set(accountIds.filter(Boolean))].sort();
  if (!ids.length) return;
  const accounts = await lockAccounts(client, userId, ids, { active: false });
  const events = await client.query(
    `SELECT account_id, transaction_date AS event_date, id::text AS event_id,
            CASE WHEN kind = 'income' THEN amount ELSE -amount END AS delta
       FROM transactions WHERE user_id = $1 AND account_id = ANY($2::uuid[])
     UNION ALL
     SELECT target_account_id AS account_id, transfer_date AS event_date, id::text AS event_id, amount AS delta
       FROM transfers WHERE user_id = $1 AND target_account_id = ANY($2::uuid[])
     UNION ALL
     SELECT source_account_id AS account_id, transfer_date AS event_date, id::text AS event_id, -amount AS delta
       FROM transfers WHERE user_id = $1 AND source_account_id = ANY($2::uuid[])
     ORDER BY account_id, event_date, event_id`, [userId, ids]
  );
  const opening = new Map(accounts.map((row) => [row.id, safeInteger(row.opening_balance, 'Số dư ban đầu')]));
  for (const event of events.rows) {
    const balance = opening.get(event.account_id) + safeInteger(event.delta);
    if (balance < 0) throw conflict('INSUFFICIENT_BALANCE', 'Thao tác này làm số dư một tài khoản bị âm. Hãy kiểm tra giao dịch hoặc chọn tài khoản khác.');
    opening.set(event.account_id, balance);
  }
}

async function accountBalances(db, userId) {
  const [accountsResult, transactionResult, transferResult] = await Promise.all([
    db.query('SELECT id, user_id, name, kind, opening_balance, icon_key, color, is_archived, created_at FROM accounts WHERE user_id = $1 ORDER BY is_archived, created_at, name', [userId]),
    db.query(`SELECT account_id, SUM(CASE WHEN kind = 'income' THEN amount ELSE -amount END)::text AS net
              FROM transactions WHERE user_id = $1 AND transaction_date <= $2 GROUP BY account_id`, [userId, today()]),
    db.query(`SELECT account_id, SUM(delta)::text AS net FROM (
                SELECT target_account_id AS account_id, amount AS delta FROM transfers WHERE user_id = $1 AND transfer_date <= $2
                UNION ALL
                SELECT source_account_id AS account_id, -amount AS delta FROM transfers WHERE user_id = $1 AND transfer_date <= $2
              ) AS ledger GROUP BY account_id`, [userId, today()])
  ]);
  const transactionNet = new Map(transactionResult.rows.map((row) => [row.account_id, safeInteger(row.net)]));
  const transferNet = new Map(transferResult.rows.map((row) => [row.account_id, safeInteger(row.net)]));
  return accountsResult.rows.map((row) => ({
    id: row.id, userId: row.user_id, name: row.name, kind: row.kind,
    openingBalance: safeInteger(row.opening_balance),
    balance: safeInteger(row.opening_balance) + (transactionNet.get(row.id) || 0) + (transferNet.get(row.id) || 0),
    iconKey: row.icon_key, color: row.color, isArchived: row.is_archived, createdAt: row.created_at
  }));
}

async function userData(db, userId) {
  const accounts = await accountBalances(db, userId);
  const [categories, transactions, transfers, budgets, recurringRules, goals, announcements, appSettings, supportTickets] = await Promise.all([
    db.query('SELECT id, user_id, name, kind, icon_key, color, is_default, is_archived, created_at FROM categories WHERE user_id = $1 ORDER BY is_archived, kind, name', [userId]),
    db.query(`SELECT t.id, t.kind, t.amount, t.account_id, t.category_id, t.transaction_date, t.note, t.recurring_rule_id, t.scheduled_for,
                     t.created_at, a.name AS account_name, c.name AS category_name
              FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.id = t.category_id
              WHERE t.user_id = $1 ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT 1000`, [userId]),
    db.query(`SELECT tr.id, tr.source_account_id, tr.target_account_id, tr.amount, tr.transfer_date, tr.note, tr.created_at,
                     source.name AS source_name, target.name AS target_name
              FROM transfers tr JOIN accounts source ON source.id = tr.source_account_id JOIN accounts target ON target.id = tr.target_account_id
              WHERE tr.user_id = $1 ORDER BY tr.transfer_date DESC, tr.created_at DESC LIMIT 500`, [userId]),
    db.query(`SELECT b.id, b.category_id, c.name AS category_name, b.period_start, b.limit_amount, b.alert_at_percent, b.note,
                     COALESCE(SUM(t.amount), 0)::text AS spent
              FROM budgets b JOIN categories c ON c.id = b.category_id
              LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id AND t.kind = 'expense'
                 AND t.transaction_date >= b.period_start AND t.transaction_date < (b.period_start + interval '1 month')
              WHERE b.user_id = $1 GROUP BY b.id, c.name ORDER BY b.period_start DESC, c.name`, [userId]),
    db.query(`SELECT r.id, r.title, r.kind, r.amount, r.account_id, r.category_id, r.frequency, r.day_of_month, r.start_on, r.end_on,
                     r.next_occurrence_on, r.is_active, a.name AS account_name, c.name AS category_name
              FROM recurring_rules r JOIN accounts a ON a.id = r.account_id JOIN categories c ON c.id = r.category_id
              WHERE r.user_id = $1 ORDER BY r.is_active DESC, r.next_occurrence_on`, [userId]),
    db.query(`SELECT g.id, g.account_id, g.title, g.target_amount, g.target_date, g.status, a.name AS account_name, a.color
              FROM savings_goals g JOIN accounts a ON a.id = g.account_id
              WHERE g.user_id = $1 ORDER BY g.status, g.created_at DESC`, [userId]),
    db.query(`SELECT id, title, body, severity, starts_at, ends_at
              FROM system_announcements
              WHERE is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
              ORDER BY starts_at DESC LIMIT 5`).catch(() => ({ rows: [] })),
    db.query('SELECT key, enabled FROM app_settings').catch(() => ({ rows: [] })),
    db.query(`SELECT id, topic, subject, message, status, admin_note, created_at, updated_at
              FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [userId]).catch(() => ({ rows: [] }))
  ]);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const flags = { maintenance_mode: false, allow_registration: true, enable_ocr_scanner: true, enable_ai_coach: true, enable_bank_hub: true };
  for (const row of appSettings.rows) flags[row.key] = Boolean(row.enabled);
  return {
    accounts,
    categories: categories.rows.map((row) => ({ id: row.id, userId: row.user_id, name: row.name, kind: row.kind, iconKey: row.icon_key, color: row.color, isDefault: row.is_default, isArchived: row.is_archived, createdAt: row.created_at })),
    transactions: transactions.rows.map((row) => ({ id: row.id, kind: row.kind, amount: safeInteger(row.amount), accountId: row.account_id, accountName: row.account_name, categoryId: row.category_id, categoryName: row.category_name, date: row.transaction_date, note: row.note || '', recurringRuleId: row.recurring_rule_id, scheduledFor: row.scheduled_for, createdAt: row.created_at })),
    transfers: transfers.rows.map((row) => ({ id: row.id, sourceAccountId: row.source_account_id, sourceAccountName: row.source_name, targetAccountId: row.target_account_id, targetAccountName: row.target_name, amount: safeInteger(row.amount), date: row.transfer_date, note: row.note || '', createdAt: row.created_at })),
    budgets: budgets.rows.map((row) => ({ id: row.id, categoryId: row.category_id, categoryName: row.category_name, periodStart: row.period_start, limitAmount: safeInteger(row.limit_amount), alertAtPercent: row.alert_at_percent, note: row.note || '', spent: safeInteger(row.spent), remaining: safeInteger(row.limit_amount) - safeInteger(row.spent) })),
    recurringRules: recurringRules.rows.map((row) => ({ id: row.id, title: row.title, kind: row.kind, amount: safeInteger(row.amount), accountId: row.account_id, accountName: row.account_name, categoryId: row.category_id, categoryName: row.category_name, frequency: row.frequency, dayOfMonth: row.day_of_month, startOn: row.start_on, endOn: row.end_on, nextOccurrenceOn: row.next_occurrence_on, isActive: row.is_active })),
    goals: goals.rows.map((row) => ({ id: row.id, accountId: row.account_id, title: row.title, targetAmount: safeInteger(row.target_amount), currentAmount: accountById.get(row.account_id)?.balance || 0, targetDate: row.target_date, status: row.status, accountName: row.account_name, color: row.color })),
    announcements: announcements.rows.map((row) => ({ id: row.id, title: row.title, body: row.body, severity: row.severity, startsAt: row.starts_at, endsAt: row.ends_at })),
    appSettings: flags,
    supportTickets: supportTickets.rows.map((row) => ({ id: row.id, topic: row.topic, subject: row.subject, message: row.message, status: row.status, adminNote: row.admin_note || '', createdAt: row.created_at, updatedAt: row.updated_at }))
  };
}

export async function getBootstrap(db, user) {
  return { user, ...(await userData(db, user.id)), syncedAt: new Date().toISOString() };
}

export async function createAccount(db, userId, payload) {
  const name = requiredText(payload.name, 'Tên tài khoản', 80);
  const kind = accountKind(payload.kind);
  const opening = nonNegativeAmount(payload.openingBalance);
  const color = colorValue(payload.color);
  const result = await db.query('INSERT INTO accounts (user_id, name, kind, opening_balance, icon_key, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [userId, name, kind, opening, optionalText(payload.iconKey, 40), color]);
  return { id: result.rows[0].id };
}

export async function updateAccount(db, userId, idValue, payload, archive = false) {
  const id = uuid(idValue, 'Tài khoản');
  return inTransaction(db, async (client) => {
    const account = (await client.query('SELECT id, kind FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId])).rows[0];
    if (!account) throw notFound('Không tìm thấy tài khoản.');
    if (account.kind === 'goal') throw new AppError(409, 'GOAL_ACCOUNT_MANAGED', 'Ví mục tiêu được quản lý từ màn hình Mục tiêu.');
    if (archive) {
      const goal = await client.query("SELECT 1 FROM savings_goals WHERE user_id = $1 AND account_id = $2 AND status <> 'archived'", [userId, id]);
      if (goal.rowCount) throw conflict('ACCOUNT_HAS_GOAL', 'Hãy lưu trữ mục tiêu trước khi lưu trữ ví này.');
      await client.query('UPDATE accounts SET is_archived = true WHERE id = $1 AND user_id = $2', [id, userId]);
      return { id, isArchived: true };
    }
    const name = requiredText(payload.name, 'Tên tài khoản', 80);
    const opening = nonNegativeAmount(payload.openingBalance);
    await client.query('UPDATE accounts SET name = $1, opening_balance = $2, color = $3, icon_key = $4 WHERE id = $5 AND user_id = $6', [name, opening, colorValue(payload.color), optionalText(payload.iconKey, 40), id, userId]);
    await assertNoNegativeBalances(client, userId, [id]);
    return { id };
  });
}

export async function createCategory(db, userId, payload) {
  const name = requiredText(payload.name, 'Tên danh mục', 60);
  const kind = categoryKind(payload.kind);
  const result = await db.query('INSERT INTO categories (user_id, name, kind, icon_key, color) VALUES ($1, $2, $3, $4, $5) RETURNING id', [userId, name, kind, optionalText(payload.iconKey, 40), colorValue(payload.color)]);
  return { id: result.rows[0].id };
}

export async function updateCategory(db, userId, idValue, payload, archive = false) {
  const id = uuid(idValue, 'Danh mục');
  const category = (await db.query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [id, userId])).rows[0];
  if (!category) throw notFound('Không tìm thấy danh mục.');
  if (archive) {
    await db.query('UPDATE categories SET is_archived = true WHERE id = $1 AND user_id = $2', [id, userId]);
    return { id, isArchived: true };
  }
  await db.query('UPDATE categories SET name = $1, icon_key = $2, color = $3 WHERE id = $4 AND user_id = $5', [requiredText(payload.name, 'Tên danh mục', 60), optionalText(payload.iconKey, 40), colorValue(payload.color), id, userId]);
  return { id };
}

async function getAccountForWrite(client, userId, idValue, expectedKind = undefined) {
  const id = uuid(idValue, 'Tài khoản');
  const result = await client.query('SELECT id, kind, is_archived FROM accounts WHERE id = $1 AND user_id = $2', [id, userId]);
  const account = result.rows[0];
  if (!account || account.is_archived) throw notFound('Không tìm thấy tài khoản đang hoạt động.');
  if (expectedKind && account.kind !== expectedKind) throw new AppError(400, 'ACCOUNT_KIND_MISMATCH', 'Loại tài khoản không phù hợp với thao tác này.');
  return account;
}

export async function saveTransaction(db, userId, idValue, payload) {
  const kind = categoryKind(payload.kind);
  const amount = positiveAmount(payload.amount);
  const accountId = uuid(payload.accountId, 'Tài khoản');
  const categoryId = uuid(payload.categoryId, 'Danh mục');
  const date = validDate(payload.date, 'Ngày giao dịch');
  const note = optionalText(payload.note, 500);
  return inTransaction(db, async (client) => {
    const existing = idValue ? (await client.query('SELECT id, account_id FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE', [uuid(idValue, 'Giao dịch'), userId])).rows[0] : null;
    if (idValue && !existing) throw notFound('Không tìm thấy giao dịch.');
    const oldAccountId = existing?.account_id;
    const account = await getAccountForWrite(client, userId, accountId);
    if (account.kind === 'goal') throw new AppError(400, 'GOAL_ACCOUNT_ONLY_TRANSFER', 'Ví mục tiêu chỉ nhận tiền qua thao tác Nạp/Rút mục tiêu.');
    const category = (await client.query('SELECT id, kind, is_archived FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId])).rows[0];
    if (!category || category.is_archived || category.kind !== kind) throw new AppError(400, 'CATEGORY_KIND_MISMATCH', 'Chọn danh mục đang hoạt động và đúng loại thu/chi.');
    let result;
    if (existing) result = await client.query('UPDATE transactions SET kind = $1, amount = $2, account_id = $3, account_kind = $4, category_id = $5, transaction_date = $6, note = $7 WHERE id = $8 AND user_id = $9 RETURNING id', [kind, amount, accountId, account.kind, categoryId, date, note, existing.id, userId]);
    else result = await client.query('INSERT INTO transactions (user_id, kind, amount, account_id, account_kind, category_id, transaction_date, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [userId, kind, amount, accountId, account.kind, categoryId, date, note]);
    await assertNoNegativeBalances(client, userId, [oldAccountId, accountId]);
    return { id: result.rows[0].id };
  });
}

export async function deleteTransaction(db, userId, idValue) {
  const id = uuid(idValue, 'Giao dịch');
  return inTransaction(db, async (client) => {
    const row = (await client.query('SELECT account_id FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId])).rows[0];
    if (!row) throw notFound('Không tìm thấy giao dịch.');
    await client.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    await assertNoNegativeBalances(client, userId, [row.account_id]);
    return { id, deleted: true };
  });
}

export async function createTransfer(db, userId, payload) {
  const amount = positiveAmount(payload.amount);
  const sourceId = uuid(payload.sourceAccountId, 'Tài khoản nguồn');
  const targetId = uuid(payload.targetAccountId, 'Tài khoản đích');
  if (sourceId === targetId) throw new AppError(400, 'SAME_TRANSFER_ACCOUNT', 'Tài khoản nguồn và đích phải khác nhau.');
  const date = validDate(payload.date, 'Ngày chuyển');
  const note = optionalText(payload.note, 500);
  return inTransaction(db, async (client) => {
    const accounts = await lockAccounts(client, userId, [sourceId, targetId]);
    const byId = new Map(accounts.map((row) => [row.id, row]));
    const source = byId.get(sourceId);
    const target = byId.get(targetId);
    const result = await client.query('INSERT INTO transfers (user_id, source_account_id, source_account_kind, target_account_id, target_account_kind, amount, transfer_date, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [userId, sourceId, source.kind, targetId, target.kind, amount, date, note]);
    await assertNoNegativeBalances(client, userId, [sourceId, targetId]);
    return { id: result.rows[0].id };
  });
}

export async function createBudget(db, userId, payload) {
  const categoryId = uuid(payload.categoryId, 'Danh mục');
  const period = monthStart(payload.periodStart);
  const limit = positiveAmount(payload.limitAmount, 'Ngân sách');
  const alert = Number(payload.alertAtPercent ?? 80);
  if (!Number.isInteger(alert) || alert < 1 || alert > 100) throw new AppError(400, 'VALIDATION_ERROR', 'Mức nhắc nhở phải từ 1 đến 100%.');
  const category = (await db.query("SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND kind = 'expense' AND is_archived = false", [categoryId, userId])).rows[0];
  if (!category) throw new AppError(400, 'INVALID_BUDGET_CATEGORY', 'Chọn danh mục chi đang hoạt động.');
  const result = await db.query('INSERT INTO budgets (user_id, category_id, period_start, limit_amount, alert_at_percent, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [userId, categoryId, period, limit, alert, optionalText(payload.note, 300)]);
  return { id: result.rows[0].id };
}

export async function updateBudget(db, userId, idValue, payload, remove = false) {
  const id = uuid(idValue, 'Ngân sách');
  if (remove) {
    const result = await db.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (!result.rowCount) throw notFound('Không tìm thấy ngân sách.');
    return { id, deleted: true };
  }
  const categoryId = uuid(payload.categoryId, 'Danh mục');
  const period = monthStart(payload.periodStart);
  const limit = positiveAmount(payload.limitAmount, 'Ngân sách');
  const alert = Number(payload.alertAtPercent ?? 80);
  if (!Number.isInteger(alert) || alert < 1 || alert > 100) throw new AppError(400, 'VALIDATION_ERROR', 'Mức nhắc nhở phải từ 1 đến 100%.');
  const result = await db.query('UPDATE budgets SET category_id = $1, period_start = $2, limit_amount = $3, alert_at_percent = $4, note = $5 WHERE id = $6 AND user_id = $7 RETURNING id', [categoryId, period, limit, alert, optionalText(payload.note, 300), id, userId]);
  if (!result.rowCount) throw notFound('Không tìm thấy ngân sách.');
  return { id };
}

const FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly']);
export async function saveRecurringRule(db, userId, idValue, payload) {
  const title = requiredText(payload.title, 'Tên định kỳ', 100);
  const kind = categoryKind(payload.kind);
  const amount = positiveAmount(payload.amount);
  const accountId = uuid(payload.accountId, 'Tài khoản');
  const categoryId = uuid(payload.categoryId, 'Danh mục');
  const frequency = payload.frequency;
  if (!FREQUENCIES.has(frequency)) throw new AppError(400, 'VALIDATION_ERROR', 'Tần suất chưa hợp lệ.');
  const startOn = validDate(payload.startOn, 'Ngày bắt đầu');
  const endOn = optionalDate(payload.endOn, 'Ngày kết thúc');
  if (endOn && endOn < startOn) throw new AppError(400, 'VALIDATION_ERROR', 'Ngày kết thúc không được trước ngày bắt đầu.');
  const day = frequency === 'monthly' ? Number(payload.dayOfMonth) : null;
  if (frequency === 'monthly' && (!Number.isInteger(day) || day < 1 || day > 31)) throw new AppError(400, 'VALIDATION_ERROR', 'Ngày trong tháng phải từ 1 đến 31.');
  return inTransaction(db, async (client) => {
    const account = await getAccountForWrite(client, userId, accountId);
    if (account.kind === 'goal') throw new AppError(400, 'GOAL_ACCOUNT_ONLY_TRANSFER', 'Không dùng ví mục tiêu cho định kỳ thu/chi.');
    const category = (await client.query('SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND kind = $3 AND is_archived = false', [categoryId, userId, kind])).rows[0];
    if (!category) throw new AppError(400, 'CATEGORY_KIND_MISMATCH', 'Chọn danh mục đang hoạt động và đúng loại.');
    const nextDate = startOn < today() ? today() : startOn;
    const isActive = (!endOn || nextDate <= endOn) && Boolean(payload.isActive ?? true);
    let result;
    if (idValue) result = await client.query('UPDATE recurring_rules SET title = $1, kind = $2, amount = $3, account_id = $4, account_kind = $5, category_id = $6, frequency = $7, day_of_month = $8, start_on = $9, end_on = $10, next_occurrence_on = GREATEST(next_occurrence_on, $11), is_active = $12 WHERE id = $13 AND user_id = $14 RETURNING id', [title, kind, amount, accountId, account.kind, categoryId, frequency, day, startOn, endOn, nextDate, isActive, uuid(idValue, 'Định kỳ'), userId]);
    else result = await client.query('INSERT INTO recurring_rules (user_id, title, kind, amount, account_id, account_kind, category_id, frequency, day_of_month, start_on, end_on, next_occurrence_on, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id', [userId, title, kind, amount, accountId, account.kind, categoryId, frequency, day, startOn, endOn, nextDate, isActive]);
    if (!result.rowCount) throw notFound('Không tìm thấy quy tắc định kỳ.');
    return { id: result.rows[0].id };
  });
}

export async function deleteRecurringRule(db, userId, idValue) {
  const id = uuid(idValue, 'Định kỳ');
  const result = await db.query('UPDATE recurring_rules SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  if (!result.rowCount) throw notFound('Không tìm thấy quy tắc định kỳ.');
  return { id, isActive: false };
}

export async function createGoal(db, userId, payload) {
  const title = requiredText(payload.title, 'Tên mục tiêu', 100);
  const target = positiveAmount(payload.targetAmount, 'Số tiền mục tiêu');
  const targetDate = optionalDate(payload.targetDate, 'Ngày mục tiêu');
  const color = colorValue(payload.color);
  return inTransaction(db, async (client) => {
    const account = await client.query("INSERT INTO accounts (user_id, name, kind, opening_balance, icon_key, color) VALUES ($1, $2, 'goal', 0, 'target', $3) RETURNING id", [userId, title, color]);
    const goal = await client.query("INSERT INTO savings_goals (user_id, account_id, title, target_amount, target_date) VALUES ($1, $2, $3, $4, $5) RETURNING id", [userId, account.rows[0].id, title, target, targetDate]);
    return { id: goal.rows[0].id, accountId: account.rows[0].id };
  });
}

export async function updateGoal(db, userId, idValue, payload, archive = false) {
  const id = uuid(idValue, 'Mục tiêu');
  const goal = (await db.query('SELECT id, account_id FROM savings_goals WHERE id = $1 AND user_id = $2', [id, userId])).rows[0];
  if (!goal) throw notFound('Không tìm thấy mục tiêu.');
  if (archive) {
    await db.query("UPDATE savings_goals SET status = 'archived' WHERE id = $1 AND user_id = $2", [id, userId]);
    return { id, status: 'archived' };
  }
  const title = requiredText(payload.title, 'Tên mục tiêu', 100);
  const target = positiveAmount(payload.targetAmount, 'Số tiền mục tiêu');
  await db.query('UPDATE savings_goals SET title = $1, target_amount = $2, target_date = $3 WHERE id = $4 AND user_id = $5', [title, target, optionalDate(payload.targetDate, 'Ngày mục tiêu'), id, userId]);
  await db.query('UPDATE accounts SET name = $1, color = $2 WHERE id = $3 AND user_id = $4', [title, colorValue(payload.color), goal.account_id, userId]);
  return { id };
}

export async function goalMovement(db, userId, goalIdValue, payload) {
  const goalId = uuid(goalIdValue, 'Mục tiêu');
  const amount = positiveAmount(payload.amount);
  const externalAccountId = uuid(payload.accountId, 'Tài khoản');
  const date = validDate(payload.date, 'Ngày giao dịch');
  const goal = (await db.query("SELECT g.account_id FROM savings_goals g WHERE g.id = $1 AND g.user_id = $2 AND g.status = 'active'", [goalId, userId])).rows[0];
  if (!goal) throw notFound('Không tìm thấy mục tiêu đang hoạt động.');
  if (goal.account_id === externalAccountId) throw new AppError(400, 'SAME_TRANSFER_ACCOUNT', 'Chọn tài khoản khác với ví mục tiêu.');
  const direction = payload.direction === 'withdraw' ? 'withdraw' : 'deposit';
  return inTransaction(db, async (client) => {
    const accounts = await lockAccounts(client, userId, [goal.account_id, externalAccountId]);
    const byId = new Map(accounts.map((row) => [row.id, row]));
    const goalAccount = byId.get(goal.account_id);
    const other = byId.get(externalAccountId);
    if (goalAccount.kind !== 'goal' || other.kind === 'goal') throw new AppError(400, 'INVALID_GOAL_MOVEMENT', 'Chọn ví mục tiêu và một tài khoản thu/chi đang hoạt động.');
    const source = direction === 'deposit' ? other : goalAccount;
    const target = direction === 'deposit' ? goalAccount : other;
    const result = await client.query('INSERT INTO transfers (user_id, source_account_id, source_account_kind, target_account_id, target_account_kind, amount, transfer_date, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [userId, source.id, source.kind, target.id, target.kind, amount, date, optionalText(payload.note, 500)]);
    await assertNoNegativeBalances(client, userId, [goalAccount.id, other.id]);
    return { id: result.rows[0].id };
  });
}

function clampMonthlyDay(year, monthIndex, day) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
}
function nextOccurrence(dateText, frequency, dayOfMonth) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  else if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  else if (frequency === 'monthly') {
    const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    return clampMonthlyDay(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), dayOfMonth);
  } else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export async function runDueRecurring(db, userId) {
  return inTransaction(db, async (client) => {
    const rules = await client.query('SELECT * FROM recurring_rules WHERE user_id = $1 AND is_active = true AND next_occurrence_on <= $2 ORDER BY next_occurrence_on, id FOR UPDATE', [userId, today()]);
    const generated = [];
    for (const rule of rules.rows) {
      let scheduled = rule.next_occurrence_on;
      let iterations = 0;
      while (scheduled <= today() && (!rule.end_on || scheduled <= rule.end_on) && iterations < 180) {
        const accounts = await lockAccounts(client, userId, [rule.account_id]);
        const account = accounts[0];
        const result = await client.query(
          `INSERT INTO transactions (user_id, kind, amount, account_id, account_kind, category_id, transaction_date, note, recurring_rule_id, scheduled_for)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $7)
           ON CONFLICT (recurring_rule_id, scheduled_for) DO NOTHING RETURNING id`,
          [userId, rule.kind, rule.amount, rule.account_id, account.kind, rule.category_id, scheduled, rule.title, rule.id]
        );
        if (result.rowCount) generated.push({ id: result.rows[0].id, ruleId: rule.id, date: scheduled });
        scheduled = nextOccurrence(scheduled, rule.frequency, rule.day_of_month);
        iterations += 1;
      }
      const active = (!rule.end_on || scheduled <= rule.end_on) && scheduled > today();
      await client.query('UPDATE recurring_rules SET next_occurrence_on = $1, is_active = $2 WHERE id = $3 AND user_id = $4', [scheduled, active, rule.id, userId]);
    }
    if (generated.length) {
      const ids = rules.rows.map((row) => row.account_id);
      await assertNoNegativeBalances(client, userId, ids);
    }
    return { generated };
  });
}

export async function updateProfile(db, userId, payload) {
  const fullName = requiredText(payload.fullName, 'Tên hiển thị', 120);
  let result;
  if (Object.hasOwn(payload, 'avatarDataUrl')) {
    const avatar = avatarBytesFromDataUrl(payload.avatarDataUrl);
    result = await db.query(
      `UPDATE users
       SET full_name = $1,
           avatar_data = $2,
           avatar_mime = CASE WHEN $2::bytea IS NULL THEN NULL ELSE 'image/jpeg' END,
           avatar_updated_at = CASE WHEN $2::bytea IS NULL THEN NULL ELSE now() END
       WHERE id = $3 AND status = 'active'
       RETURNING id, email, full_name, role, currency, email_verified_at, (avatar_data IS NOT NULL) AS has_avatar, avatar_updated_at`,
      [fullName, avatar, userId]
    );
  } else {
    result = await db.query(
      `UPDATE users SET full_name = $1 WHERE id = $2 AND status = 'active'
       RETURNING id, email, full_name, role, currency, email_verified_at, (avatar_data IS NOT NULL) AS has_avatar, avatar_updated_at`,
      [fullName, userId]
    );
  }
  if (!result.rowCount) throw notFound('Không tìm thấy tài khoản người dùng.');
  return profileUser(result.rows[0]);
}

export async function updateCurrencyPreference(db, userId, currencyValue) {
  const currency = typeof currencyValue === 'string' ? currencyValue.trim().toUpperCase() : '';
  if (!['VND', 'USD'].includes(currency)) {
    throw new AppError(400, 'INVALID_CURRENCY', 'Đơn vị tiền tệ chỉ hỗ trợ VND hoặc USD.', { currency: 'Chọn VND hoặc USD.' });
  }
  const result = await db.query(
    `UPDATE users SET currency = $1
      WHERE id = $2 AND status = 'active'
      RETURNING id, email, full_name, role, currency, email_verified_at,
                (avatar_data IS NOT NULL) AS has_avatar, avatar_updated_at`,
    [currency, userId]
  );
  if (!result.rowCount) throw notFound('Không tìm thấy tài khoản người dùng.');
  return profileUser(result.rows[0]);
}

export async function getProfileAvatar(db, userId) {
  const result = await db.query(
    `SELECT avatar_data, avatar_mime FROM users WHERE id = $1 AND status = 'active' AND avatar_data IS NOT NULL`,
    [userId]
  );
  if (!result.rowCount) throw notFound('Tài khoản chưa có ảnh đại diện.');
  return { data: result.rows[0].avatar_data, mime: result.rows[0].avatar_mime };
}

export async function sendProfileEmailCode(db, userId, emailValue) {
  if (!hasSmtpConfig) throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP chưa được cấu hình để gửi mã xác nhận email.');
  const { email, normalized } = validateEmail(emailValue);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await hashPassword(code);
  let issued;
  try {
    issued = await inTransaction(db, async (client) => {
      const user = (await client.query(
        `SELECT id, email, email_normalized, full_name, email_verified_at
         FROM users WHERE id = $1 AND status = 'active' FOR UPDATE`, [userId]
      )).rows[0];
      if (!user) throw notFound('Không tìm thấy tài khoản người dùng.');
      if (user.email_normalized === normalized && user.email_verified_at) return { alreadyVerified: true };

      const existingEmail = await client.query('SELECT id FROM users WHERE email_normalized = $1 AND id <> $2', [normalized, userId]);
      if (existingEmail.rowCount) return { emailInUse: true };

      await client.query('UPDATE email_change_codes SET revoked_at = now() WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at <= now()');
      const reserved = await client.query(
        `SELECT user_id FROM email_change_codes
         WHERE pending_email_normalized = $1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
         FOR UPDATE`, [normalized]
      );
      if (reserved.rowCount && reserved.rows[0].user_id !== userId) return { emailInUse: true };

      await client.query('UPDATE email_change_codes SET revoked_at = now() WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL', [userId]);
      const result = await client.query(
        `INSERT INTO email_change_codes (user_id, pending_email, pending_email_normalized, code_hash, expires_at)
         VALUES ($1, $2, $3, $4, now() + ($5 * interval '1 minute')) RETURNING id`,
        [userId, email, normalized, codeHash, env.emailOtpTtlMinutes]
      );
      return { id: result.rows[0].id, fullName: user.full_name };
    });
  } catch (error) {
    if (error.code === '23505') throw conflict('EMAIL_UNAVAILABLE', 'Email này đang được sử dụng hoặc có mã xác nhận đang chờ.');
    throw error;
  }

  if (issued.alreadyVerified) return { alreadyVerified: true, message: 'Email này đã được xác nhận.' };
  if (issued.emailInUse) throw conflict('EMAIL_IN_USE', 'Email này đã được sử dụng bởi một tài khoản khác.', { email: 'Hãy nhập một địa chỉ email khác.' });
  try {
    await sendEmailChangeCode(email, issued.fullName, code);
  } catch {
    await db.query('UPDATE email_change_codes SET revoked_at = now() WHERE id = $1 AND consumed_at IS NULL AND revoked_at IS NULL', [issued.id]);
    throw new AppError(503, 'EMAIL_SEND_FAILED', 'Chưa gửi được mã xác nhận. Kiểm tra cấu hình SMTP rồi thử lại.');
  }
  return { message: `Mã xác nhận đã được gửi đến ${email}. Mã có hiệu lực trong ${env.emailOtpTtlMinutes} phút.` };
}

export async function confirmProfileEmailCode(db, userId, emailValue, codeValue) {
  const { email, normalized } = validateEmail(emailValue);
  if (typeof codeValue !== 'string' || !/^\d{6}$/.test(codeValue)) {
    throw new AppError(400, 'INVALID_EMAIL_CODE', 'Mã xác nhận cần gồm đúng 6 chữ số.', { emailCode: 'Nhập mã gồm đúng 6 chữ số.' });
  }
  const outcome = await inTransaction(db, async (client) => {
    const codeRecord = (await client.query(
      `SELECT id, code_hash, attempts FROM email_change_codes
       WHERE user_id = $1 AND pending_email_normalized = $2 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       FOR UPDATE`, [userId, normalized]
    )).rows[0];
    if (!codeRecord || codeRecord.attempts >= 5) return { invalid: true };
    if (!await verifyPassword(codeValue, codeRecord.code_hash)) {
      const attempts = codeRecord.attempts + 1;
      await client.query(
        `UPDATE email_change_codes SET attempts = $2, revoked_at = CASE WHEN $2 >= 5 THEN now() ELSE revoked_at END
         WHERE id = $1`, [codeRecord.id, attempts]
      );
      return { invalid: true };
    }

    const existing = await client.query('SELECT id FROM users WHERE email_normalized = $1 AND id <> $2', [normalized, userId]);
    if (existing.rowCount) {
      await client.query('UPDATE email_change_codes SET revoked_at = now() WHERE id = $1', [codeRecord.id]);
      return { emailInUse: true };
    }
    const updated = await client.query(
      `UPDATE users SET email = $1, email_normalized = $2, email_verified_at = now()
       WHERE id = $3 AND status = 'active'
       RETURNING id, email, full_name, role, email_verified_at, (avatar_data IS NOT NULL) AS has_avatar, avatar_updated_at`,
      [email, normalized, userId]
    );
    if (!updated.rowCount) throw notFound('Không tìm thấy tài khoản người dùng.');
    await client.query('UPDATE email_change_codes SET consumed_at = now() WHERE id = $1', [codeRecord.id]);
    await client.query('UPDATE email_change_codes SET revoked_at = now() WHERE user_id = $1 AND id <> $2 AND consumed_at IS NULL AND revoked_at IS NULL', [userId, codeRecord.id]);
    return { user: profileUser(updated.rows[0]) };
  });
  if (outcome.invalid) throw new AppError(400, 'INVALID_EMAIL_CODE', 'Mã không đúng, đã hết hạn hoặc đã được sử dụng. Hãy gửi mã mới.', { emailCode: 'Kiểm tra mã hoặc yêu cầu gửi mã mới.' });
  if (outcome.emailInUse) throw conflict('EMAIL_IN_USE', 'Email này đã được sử dụng bởi một tài khoản khác.', { email: 'Hãy nhập một địa chỉ email khác.' });
  return { user: outcome.user, message: 'Email đã được xác nhận thành công.' };
}

export async function getTransactions(db, userId, query) {
  const limit = Math.min(500, Math.max(1, Number.parseInt(query.get('limit') || '250', 10) || 250));
  const from = query.get('from');
  const to = query.get('to');
  if (from) validDate(from, 'Từ ngày');
  if (to) validDate(to, 'Đến ngày');
  if (from && to && from > to) throw new AppError(400, 'INVALID_DATE_RANGE', 'Ngày bắt đầu không được sau ngày kết thúc.');
  const result = await db.query(
    `SELECT t.id, t.kind, t.amount, t.account_id, t.category_id, t.transaction_date, t.note, t.recurring_rule_id, t.scheduled_for, t.created_at,
            a.name AS account_name, c.name AS category_name
     FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND ($2::date IS NULL OR t.transaction_date >= $2) AND ($3::date IS NULL OR t.transaction_date <= $3)
     ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $4`, [userId, from || null, to || null, limit]
  );
  return result.rows.map((row) => ({ id: row.id, kind: row.kind, amount: safeInteger(row.amount), accountId: row.account_id, accountName: row.account_name, categoryId: row.category_id, categoryName: row.category_name, date: row.transaction_date, note: row.note || '', recurringRuleId: row.recurring_rule_id, scheduledFor: row.scheduled_for }));
}

export async function getReportData(db, userId, query) {
  const from = query.get('from') || `${today().slice(0, 7)}-01`;
  const to = query.get('to') || today();
  validDate(from, 'Từ ngày'); validDate(to, 'Đến ngày');
  if (from > to) throw new AppError(400, 'INVALID_DATE_RANGE', 'Ngày bắt đầu không được sau ngày kết thúc.');
  const transactions = await getTransactions(db, userId, new URLSearchParams({ from, to, limit: '500' }));
  const [byCategory, byMonth] = await Promise.all([
    db.query(`SELECT c.id AS category_id, c.name AS category_name, t.kind, SUM(t.amount)::text AS amount
              FROM transactions t JOIN categories c ON c.id = t.category_id
              WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2 AND $3
              GROUP BY c.id, c.name, t.kind ORDER BY SUM(t.amount) DESC`, [userId, from, to]),
    db.query(`SELECT to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
                     SUM(amount) FILTER (WHERE kind = 'income')::text AS income,
                     SUM(amount) FILTER (WHERE kind = 'expense')::text AS expense
              FROM transactions WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3
              GROUP BY date_trunc('month', transaction_date) ORDER BY date_trunc('month', transaction_date)`, [userId, from, to])
  ]);
  return {
    from, to, transactions,
    byCategory: byCategory.rows.map((row) => ({ categoryId: row.category_id, categoryName: row.category_name, kind: row.kind, amount: safeInteger(row.amount) })),
    byMonth: byMonth.rows.map((row) => ({ month: row.month, income: safeInteger(row.income), expense: safeInteger(row.expense) }))
  };
}

export async function createSupportTicket(db, userId, payload) {
  const topic = String(payload.topic || 'other').trim();
  if (!['bug', 'account', 'feature', 'other'].includes(topic)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Chủ đề phản hồi không hợp lệ.', { topic: 'Chọn một chủ đề hợp lệ.' });
  }
  const subject = requiredText(payload.subject, 'Tiêu đề yêu cầu', 140);
  const message = requiredText(payload.message, 'Nội dung phản hồi', 1000);
  const result = await db.query(
    `INSERT INTO support_tickets (user_id, topic, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, topic, subject, message, status, admin_note, created_at, updated_at`,
    [userId, topic, subject, message]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    ticket: {
      id: row.id,
      topic: row.topic,
      subject: row.subject,
      message: row.message,
      status: row.status,
      adminNote: row.admin_note || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  };
}

