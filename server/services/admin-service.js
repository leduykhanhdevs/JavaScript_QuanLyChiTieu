import { AppError, conflict, notFound, unauthorized } from '../lib/errors.js';
import { colorValue, optionalText, requiredText, validDate, uuid } from '../lib/validation.js';
import { dailyIpBucketHash, maskEmail, verifyPassword } from '../lib/security.js';
import { env, hasSePayBankHubConfig, hasSmtpConfig } from '../config/env.js';
import { LEGAL_VERSIONS } from '../config/legal.js';

const MAX_RANGE_DAYS = 366;
const ADMIN_MUTATION_LOCK = 62419831;
const allowedStatuses = new Set(['active', 'disabled']);
const allowedRoles = new Set(['user', 'admin']);
const allowedAuditActions = new Set([
  'all',
  'user.status_changed',
  'user.role_changed',
  'user.sessions_revoked',
  'user.unverified_purged',
  'announcement.created',
  'announcement.updated',
  'announcement.deleted',
  'settings.updated',
  'template_category.created',
  'template_category.updated',
  'support_ticket.updated'
]);
const allowedSecurityEvents = new Set([
  'all',
  'login_failed',
  'login_succeeded',
  'otp_failed',
  'otp_locked',
  'password_reset_requested',
  'rate_limited'
]);

function todayInVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function defaultFromDate(to) {
  const date = new Date(`${to}T00:00:00.000Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 5);
  return date.toISOString().slice(0, 10);
}

function dateRange(params) {
  const getParam = (key) => {
    if (!params) return null;
    if (typeof params.get === 'function') return params.get(key);
    return params[key] || null;
  };
  const to = validDate(getParam('to') || todayInVietnam(), 'Ngày kết thúc');
  const from = validDate(getParam('from') || defaultFromDate(to), 'Ngày bắt đầu');
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (days < 0) throw new AppError(400, 'INVALID_DATE_RANGE', 'Ngày bắt đầu không được sau ngày kết thúc.');
  if (days > MAX_RANGE_DAYS) throw new AppError(400, 'DATE_RANGE_TOO_LARGE', 'Khoảng thống kê tối đa là 366 ngày.');
  return { from, to };
}

function pageNumber(value, fallback, max = 10_000) {
  if (value == null || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new AppError(400, 'INVALID_PAGINATION', 'Trang dữ liệu không hợp lệ.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new AppError(400, 'INVALID_PAGINATION', 'Trang dữ liệu không hợp lệ.');
  return number;
}

function safeUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    emailMasked: maskEmail(row.email),
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at
  };
}

function safeAudit(row) {
  return {
    id: row.id,
    action: row.action,
    actorName: row.actor_name || 'Thiết lập ban đầu',
    actorEmailMasked: maskEmail(row.actor_email),
    targetName: row.target_name || (row.target_email ? 'Tài khoản' : 'Hệ thống'),
    targetEmailMasked: maskEmail(row.target_email),
    oldStatus: row.old_status,
    newStatus: row.new_status,
    oldRole: row.old_role,
    newRole: row.new_role,
    summary: row.summary || null,
    createdAt: row.created_at
  };
}

async function inTransaction(db, callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally { client.release(); }
}

export async function recordSecurityEvent(db, { eventType, email, ip, routePath }) {
  try {
    const masked = email ? maskEmail(String(email)) : null;
    const ipHash = dailyIpBucketHash(ip || 'local');
    await db.query(
      `INSERT INTO security_events (event_type, email_masked, ip_bucket_hash, route_path)
       VALUES ($1, $2, $3, $4)`,
      [eventType, masked && masked !== '—' ? masked : null, ipHash, String(routePath || '/api/auth').slice(0, 120)]
    );
  } catch {
    // Non-blocking security telemetry
  }
}

export async function getAdminOverview(db, params) {
  const { from, to } = dateRange(params);
  const [counts, trend, transactionCount, activity, health, quickStats] = await Promise.all([
    db.query(`SELECT count(*)::int AS total,
                     count(*) FILTER (WHERE status = 'active')::int AS active,
                     count(*) FILTER (WHERE status = 'pending_email')::int AS pending,
                     count(*) FILTER (WHERE status = 'disabled')::int AS disabled
                FROM users`),
    db.query(`WITH months AS (
                SELECT generate_series(date_trunc('month', $1::date::timestamp),
                                       date_trunc('month', $2::date::timestamp), interval '1 month') AS month
              ), signups AS (
                SELECT date_trunc('month', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month, count(*)::int AS count
                  FROM users
                 WHERE created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                   AND created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                 GROUP BY 1
              )
              SELECT to_char(months.month, 'YYYY-MM') AS month, coalesce(signups.count, 0)::int AS count
                FROM months LEFT JOIN signups USING (month) ORDER BY months.month`, [from, to]),
    db.query(`SELECT count(*)::int AS count FROM transactions
               WHERE transaction_date >= $1::date AND transaction_date <= $2::date`, [from, to]),
    db.query(`SELECT a.id, a.action, a.old_status, a.new_status, a.old_role, a.new_role, a.summary, a.created_at,
                     actor.full_name AS actor_name, actor.email AS actor_email,
                     target.full_name AS target_name, target.email AS target_email
                FROM admin_audit_logs a
                LEFT JOIN users actor ON actor.id = a.actor_user_id
                LEFT JOIN users target ON target.id = a.target_user_id
               ORDER BY a.created_at DESC, a.id DESC LIMIT 6`),
    db.query('SELECT 1 AS available'),
    db.query(`SELECT
                (SELECT count(DISTINCT user_id)::int FROM sessions WHERE revoked_at IS NULL AND expires_at > now() AND last_seen_at >= now() - interval '24 hours') AS dau,
                (SELECT count(*)::int FROM support_tickets WHERE status IN ('open', 'in_progress')) AS open_tickets,
                (SELECT count(*)::int FROM security_events WHERE created_at >= now() - interval '24 hours' AND event_type IN ('login_failed', 'otp_failed', 'otp_locked', 'rate_limited')) AS security_alerts_24h,
                (SELECT count(*)::int FROM system_announcements WHERE is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())) AS active_announcements`)
  ]);
  return {
    period: { from, to },
    counts: counts.rows[0],
    signupTrend: trend.rows,
    transactionCount: transactionCount.rows[0].count,
    recentActivity: activity.rows.map(safeAudit),
    services: {
      api: 'available',
      database: health.rowCount ? 'available' : 'unavailable',
      smtp: hasSmtpConfig ? 'available' : 'unavailable',
      bankHub: hasSePayBankHubConfig ? 'available' : 'unavailable'
    },
    quickStats: quickStats.rows[0] || { dau: 0, open_tickets: 0, security_alerts_24h: 0, active_announcements: 0 }
  };
}

// Group A1, A2, A3, A5: Activity & Adoption Analytics (aggregate only, no financial amounts)
export async function getAdminAnalytics(db, params) {
  const { from, to } = dateRange(params);
  const [activitySummary, activeSeries, featureAdoption, txCountTrend, bankFunnel, consentStats] = await Promise.all([
    db.query(`SELECT
                count(DISTINCT user_id) FILTER (WHERE last_seen_at >= now() - interval '24 hours')::int AS dau,
                count(DISTINCT user_id) FILTER (WHERE last_seen_at >= now() - interval '7 days')::int AS wau,
                count(DISTINCT user_id) FILTER (WHERE last_seen_at >= now() - interval '30 days')::int AS mau,
                count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now())::int AS active_sessions
              FROM sessions`),
    db.query(`WITH days AS (
                SELECT generate_series(current_date - interval '13 days', current_date, interval '1 day')::date AS day
              ), seen AS (
                SELECT (last_seen_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
                       count(DISTINCT user_id)::int AS active_users
                  FROM sessions
                 WHERE last_seen_at >= (current_date - interval '13 days')::timestamp
                 GROUP BY 1
              )
              SELECT to_char(days.day, 'YYYY-MM-DD') AS day, coalesce(seen.active_users, 0)::int AS count
                FROM days LEFT JOIN seen USING (day) ORDER BY days.day`),
    db.query(`SELECT
                count(*) FILTER (WHERE status = 'active')::int AS active_users,
                (SELECT count(DISTINCT user_id)::int FROM accounts WHERE is_archived = false) AS users_with_accounts,
                (SELECT count(DISTINCT user_id)::int FROM transactions) AS users_with_transactions,
                (SELECT count(DISTINCT user_id)::int FROM budgets) AS users_with_budgets,
                (SELECT count(DISTINCT user_id)::int FROM recurring_rules WHERE is_active = true) AS users_with_recurring,
                (SELECT count(DISTINCT user_id)::int FROM savings_goals WHERE status = 'active') AS users_with_goals,
                (SELECT count(DISTINCT user_id)::int FROM bank_link_attempts WHERE status = 'linked') AS users_with_bank_links,
                (SELECT count(*)::int FROM accounts WHERE is_archived = false) AS total_accounts,
                (SELECT count(*)::int FROM categories WHERE is_archived = false) AS total_categories,
                (SELECT count(*)::int FROM budgets) AS total_budgets,
                (SELECT count(*)::int FROM recurring_rules WHERE is_active = true) AS total_recurring,
                (SELECT count(*)::int FROM savings_goals WHERE status = 'active') AS total_goals
              FROM users`),
    db.query(`WITH months AS (\n                SELECT generate_series(date_trunc('month', $1::date::timestamp),
                                       date_trunc('month', $2::date::timestamp), interval '1 month') AS month
              ), tx AS (
                SELECT date_trunc('month', transaction_date::timestamp) AS month,
                       count(*) FILTER (WHERE kind = 'income')::int AS income_count,
                       count(*) FILTER (WHERE kind = 'expense')::int AS expense_count,
                       count(*)::int AS total_count
                  FROM transactions
                 WHERE transaction_date >= $1::date AND transaction_date <= $2::date
                 GROUP BY 1
              ), tr AS (
                SELECT date_trunc('month', transfer_date::timestamp) AS month,
                       count(*)::int AS transfer_count
                  FROM transfers
                 WHERE transfer_date >= $1::date AND transfer_date <= $2::date
                 GROUP BY 1
              )
              SELECT to_char(months.month, 'YYYY-MM') AS month,
                     coalesce(tx.income_count, 0)::int AS income_count,
                     coalesce(tx.expense_count, 0)::int AS expense_count,
                     coalesce(tx.total_count, 0)::int AS total_count,
                     coalesce(tr.transfer_count, 0)::int AS transfer_count
                FROM months
                LEFT JOIN tx USING (month)
                LEFT JOIN tr USING (month)
               ORDER BY months.month`, [from, to]),
    db.query(`SELECT
                count(*)::int AS total_attempts,
                count(*) FILTER (WHERE status = 'ready')::int AS ready_count,
                count(*) FILTER (WHERE status = 'launched')::int AS launched_count,
                count(*) FILTER (WHERE status = 'linked')::int AS linked_count,
                count(*) FILTER (WHERE status IN ('failed', 'abandoned', 'expired'))::int AS failed_or_expired_count,
                count(*) FILTER (WHERE status = 'linked')::int AS active_connections
              FROM bank_link_attempts`),
    db.query(`SELECT
                count(DISTINCT user_id) FILTER (WHERE consent_type = 'terms_of_use' AND document_version = $1)::int AS terms_current_users,
                count(DISTINCT user_id) FILTER (WHERE consent_type = 'privacy_notice' AND document_version = $2)::int AS privacy_current_users,
                count(*) FILTER (WHERE consent_type = 'bank_link_T&C')::int AS bank_consent_events,
                count(*) FILTER (WHERE source = 'registration')::int AS registration_consents,
                count(*) FILTER (WHERE source = 'login')::int AS login_consents
              FROM user_consents`, [LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy])
  ]);

  const act = activitySummary.rows[0] || { dau: 0, wau: 0, mau: 0, active_sessions: 0 };
  const adopt = featureAdoption.rows[0] || {};
  const activeUsers = Math.max(0, Number(adopt.active_users || 0));
  const stickiness = act.mau > 0 ? Math.round((act.dau / act.mau) * 100) : 0;

  return {
    period: { from, to },
    activity: {
      dau: act.dau,
      wau: act.wau,
      mau: act.mau,
      stickinessPercent: stickiness,
      activeSessions: act.active_sessions,
      dailySeries: activeSeries.rows
    },
    adoption: {
      activeUsers,
      features: [
        { key: 'accounts', label: 'Tài khoản & Ví', users: Number(adopt.users_with_accounts || 0), records: Number(adopt.total_accounts || 0) },
        { key: 'transactions', label: 'Sổ giao dịch thu/chi', users: Number(adopt.users_with_transactions || 0), records: txCountTrend.rows.reduce((s, r) => s + Number(r.total_count || 0), 0) },
        { key: 'budgets', label: 'Ngân sách tháng', users: Number(adopt.users_with_budgets || 0), records: Number(adopt.total_budgets || 0) },
        { key: 'recurring', label: 'Giao dịch định kỳ', users: Number(adopt.users_with_recurring || 0), records: Number(adopt.total_recurring || 0) },
        { key: 'goals', label: 'Mục tiêu tiết kiệm', users: Number(adopt.users_with_goals || 0), records: Number(adopt.total_goals || 0) },
        { key: 'bank_hub', label: 'Liên kết SePay Bank Hub', users: Number(adopt.users_with_bank_links || 0), records: Number(adopt.users_with_bank_links || 0) }
      ]
    },
    transactionVolumeTrend: txCountTrend.rows,
    bankHubFunnel: bankFunnel.rows[0],
    legalCompliance: {
      termsVersion: LEGAL_VERSIONS.terms,
      privacyVersion: LEGAL_VERSIONS.privacy,
      ...consentStats.rows[0]
    }
  };
}

// Group A4 & B7: Verification Queue & Unverified Account Cleanup
export async function getAdminVerificationQueue(db) {
  const [summary, rows] = await Promise.all([
    db.query(`SELECT
                count(*) FILTER (WHERE status = 'pending_email')::int AS pending_accounts,
                count(*) FILTER (WHERE status = 'pending_email' AND created_at < now() - interval '7 days')::int AS stale_over_7d,
                (SELECT count(*)::int FROM registration_email_codes WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()) AS active_otps,
                (SELECT count(*)::int FROM registration_email_codes WHERE attempts >= 5) AS locked_otps,
                (SELECT count(*)::int FROM email_change_codes WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()) AS pending_email_changes
              FROM users`),
    db.query(`SELECT u.id, u.full_name, u.email, u.created_at,
                     c.expires_at AS otp_expires_at,
                     c.attempts AS otp_attempts,
                     c.revoked_at AS otp_revoked_at,
                     extract(epoch FROM (now() - u.created_at))::int AS age_seconds
                FROM users u
                LEFT JOIN LATERAL (
                  SELECT expires_at, attempts, revoked_at
                    FROM registration_email_codes
                   WHERE user_id = u.id
                   ORDER BY created_at DESC LIMIT 1
                ) c ON true
               WHERE u.status = 'pending_email'
               ORDER BY u.created_at ASC
               LIMIT 100`)
  ]);

  return {
    summary: summary.rows[0],
    queue: rows.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      emailMasked: maskEmail(row.email),
      createdAt: row.created_at,
      ageDays: Math.floor(Number(row.age_seconds || 0) / 86400),
      otpAttempts: Number(row.otp_attempts || 0),
      otpState: !row.otp_expires_at
        ? 'none'
        : Number(row.otp_attempts || 0) >= 5
          ? 'locked'
          : row.otp_revoked_at || new Date(row.otp_expires_at).getTime() <= Date.now()
            ? 'expired'
            : 'active'
    }))
  };
}

export async function purgeStaleUnverifiedUsers(db, actorIdValue, olderThanDaysValue = 7) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const olderThanDays = Number(olderThanDaysValue ?? 7);
  if (!Number.isInteger(olderThanDays) || olderThanDays < 1 || olderThanDays > 365) {
    throw new AppError(400, 'INVALID_PURGE_DAYS', 'Số ngày chờ tối thiểu phải từ 1 đến 365 ngày.');
  }
  return inTransaction(db, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_MUTATION_LOCK]);
    const deleted = await client.query(
      `DELETE FROM users
        WHERE status = 'pending_email'
          AND email_verified_at IS NULL
          AND created_at < now() - ($1 * interval '1 day')
          AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = users.id)
        RETURNING id`,
      [olderThanDays]
    );
    const purgedCount = deleted.rowCount || 0;
    if (purgedCount > 0) {
      await client.query(
        `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
         VALUES ($1, 'user.unverified_purged', $2)`,
        [actorId, `Dọn dẹp ${purgedCount} tài khoản chưa xác minh quá ${olderThanDays} ngày`]
      );
    }
    return { purgedCount, olderThanDays };
  });
}

// Group A6: Detailed System Health & Schema Migrations
export async function getAdminDetailedHealth(db) {
  const start = Date.now();
  let dbAvailable = false;
  let dbLatencyMs = null;
  let migrations = [];
  let tokenCleanupStats = { expiredSessions: 0, expiredEmailTokens: 0, expiredOtps: 0, expiredBankAttempts: 0 };

  try {
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - start;
    dbAvailable = true;
    const [migResult, cleanupResult] = await Promise.all([
      db.query('SELECT version, description, applied_at FROM schema_migrations ORDER BY version ASC'),
      db.query(`SELECT
                  (SELECT count(*)::int FROM sessions WHERE expires_at <= now() OR revoked_at IS NOT NULL) AS expired_sessions,
                  (SELECT count(*)::int FROM email_tokens WHERE expires_at <= now() OR consumed_at IS NOT NULL OR revoked_at IS NOT NULL) AS expired_email_tokens,
                  (SELECT count(*)::int FROM registration_email_codes WHERE expires_at <= now() OR consumed_at IS NOT NULL OR revoked_at IS NOT NULL) AS expired_otps,
                  (SELECT count(*)::int FROM bank_link_attempts WHERE status IN ('expired', 'failed', 'abandoned')) AS expired_bank_attempts`)
    ]);
    migrations = migResult.rows.map((row) => ({
      version: row.version,
      description: row.description,
      appliedAt: row.applied_at
    }));
    const c = cleanupResult.rows[0] || {};
    tokenCleanupStats = {
      expiredSessions: Number(c.expired_sessions || 0),
      expiredEmailTokens: Number(c.expired_email_tokens || 0),
      expiredOtps: Number(c.expired_otps || 0),
      expiredBankAttempts: Number(c.expired_bank_attempts || 0)
    };
  } catch {
    dbAvailable = false;
  }

  return {
    checkedAt: new Date().toISOString(),
    runtime: {
      nodeVersion: process.version,
      environment: env.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime())
    },
    services: [
      { key: 'api', name: 'HTTP API Server', status: 'available', detail: `Cổng ${env.port} · Cùng nguồn gốc (Same-origin)` },
      { key: 'database', name: 'PostgreSQL Database', status: dbAvailable ? 'available' : 'unavailable', detail: dbAvailable ? `Độ trễ phản hồi ${dbLatencyMs} ms · ${migrations.length} migrations` : 'Không kết nối được PostgreSQL' },
      { key: 'smtp', name: 'Dịch vụ Email SMTP', status: hasSmtpConfig ? 'available' : 'unavailable', detail: hasSmtpConfig ? `Máy chủ ${env.smtp.host}:${env.smtp.port}` : 'Chưa cấu hình biến môi trường SMTP_*' },
      { key: 'bank_hub', name: 'SePay Bank Hub Sandbox', status: hasSePayBankHubConfig ? 'available' : 'unavailable', detail: hasSePayBankHubConfig ? 'Đã cấu hình Client ID, Secret, XID & AES-256-GCM key' : 'Chế độ chờ cấu hình SEPAY_BANKHUB_*' }
    ],
    migrations,
    tokenHygiene: tokenCleanupStats
  };
}

export async function listAdminUsers(db, params) {
  const query = (params.get('q') || '').trim();
  if (query.length > 100) throw new AppError(400, 'SEARCH_TOO_LONG', 'Từ khóa tìm kiếm tối đa 100 ký tự.');
  const status = params.get('status') || 'all';
  const role = params.get('role') || 'all';
  const verified = params.get('verified') || 'all';
  if (!['all', 'active', 'pending_email', 'disabled'].includes(status)) throw new AppError(400, 'INVALID_FILTER', 'Trạng thái tài khoản không hợp lệ.');
  if (!['all', 'user', 'admin'].includes(role)) throw new AppError(400, 'INVALID_FILTER', 'Vai trò tài khoản không hợp lệ.');
  if (!['all', 'yes', 'no'].includes(verified)) throw new AppError(400, 'INVALID_FILTER', 'Bộ lọc xác minh không hợp lệ.');
  const page = pageNumber(params.get('page'), 1);
  const pageSize = pageNumber(params.get('pageSize'), 10, 50);
  const sort = params.get('sort') || 'newest';
  const orderBy = {
    newest: 'created_at DESC, id DESC',
    oldest: 'created_at ASC, id ASC',
    name: 'full_name ASC, id ASC'
  }[sort];
  if (!orderBy) throw new AppError(400, 'INVALID_SORT', 'Cách sắp xếp không hợp lệ.');

  const where = [];
  const values = [];
  const add = (condition, value) => { values.push(value); where.push(condition.replace('?', `$${values.length}`)); };
  if (status !== 'all') add('status = ?', status);
  if (role !== 'all') add('role = ?', role);
  if (verified === 'yes') where.push('email_verified_at IS NOT NULL');
  if (verified === 'no') where.push('email_verified_at IS NULL');
  if (query) {
    const escaped = query.replace(/[\\%_]/g, '\\$&');
    values.push(`%${escaped}%`);
    where.push(`(full_name ILIKE $${values.length} OR email_normalized ILIKE $${values.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [totalResult, rows, summaryResult] = await Promise.all([
    db.query(`SELECT count(*)::int AS total FROM users ${clause}`, values),
    db.query(`SELECT id, full_name, email, role, status, email_verified_at, created_at
                FROM users ${clause}
               ORDER BY ${orderBy}
               LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize]),
    db.query(`SELECT count(*)::int AS total,
                     count(*) FILTER (WHERE status = 'active')::int AS active,
                     count(*) FILTER (WHERE status = 'pending_email')::int AS pending
                FROM users`)
  ]);
  return {
    users: rows.rows.map(safeUser),
    summary: summaryResult.rows[0],
    pagination: { page, pageSize, total: totalResult.rows[0].total, totalPages: Math.max(1, Math.ceil(totalResult.rows[0].total / pageSize)) }
  };
}

// Group A7: Enhanced User Detail (non-financial security & consent metadata)
export async function getAdminUser(db, idValue) {
  const id = uuid(idValue, 'Tài khoản người dùng');
  const [userResult, sessionResult, consentResult, auditResult] = await Promise.all([
    db.query(
      `SELECT id, full_name, email, role, status, email_verified_at, created_at, updated_at
         FROM users WHERE id = $1`, [id]
    ),
    db.query(
      `SELECT count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now())::int AS active_sessions,
              max(last_seen_at) AS last_seen_at
         FROM sessions WHERE user_id = $1`, [id]
    ),
    db.query(
      `SELECT consent_type, document_version, accepted_at, source
         FROM user_consents
        WHERE user_id = $1
        ORDER BY accepted_at DESC LIMIT 6`, [id]
    ),
    db.query(
      `SELECT a.id, a.action, a.old_status, a.new_status, a.old_role, a.new_role, a.summary, a.created_at,
              actor.full_name AS actor_name, actor.email AS actor_email,
              target.full_name AS target_name, target.email AS target_email
         FROM admin_audit_logs a
         LEFT JOIN users actor ON actor.id = a.actor_user_id
         LEFT JOIN users target ON target.id = a.target_user_id
        WHERE a.target_user_id = $1
        ORDER BY a.created_at DESC LIMIT 8`, [id]
    )
  ]);

  const user = userResult.rows[0];
  if (!user) throw notFound('Không tìm thấy tài khoản.');
  const sess = sessionResult.rows[0] || { active_sessions: 0, last_seen_at: null };

  return {
    user: {
      ...safeUser(user),
      updatedAt: user.updated_at,
      activeSessions: Number(sess.active_sessions || 0),
      lastSeenAt: sess.last_seen_at || null,
      consents: consentResult.rows.map((row) => ({
        consentType: row.consent_type,
        documentVersion: row.document_version,
        acceptedAt: row.accepted_at,
        source: row.source
      })),
      auditHistory: auditResult.rows.map(safeAudit)
    }
  };
}

// Group B1: Force Logout / Revoke All User Sessions
export async function revokeAdminUserSessions(db, actorIdValue, targetIdValue) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const targetId = uuid(targetIdValue, 'Tài khoản người dùng');
  return inTransaction(db, async (client) => {
    const user = (await client.query('SELECT id, full_name, email, role, status, email_verified_at, created_at FROM users WHERE id = $1 FOR UPDATE', [targetId])).rows[0];
    if (!user) throw notFound('Không tìm thấy tài khoản.');
    const revoked = await client.query(
      'UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING id',
      [targetId]
    );
    const revokedCount = revoked.rowCount || 0;
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, target_user_id, action, summary)
       VALUES ($1, $2, 'user.sessions_revoked', $3)`,
      [actorId, targetId, `Thu hồi ${revokedCount} phiên đăng nhập đang hoạt động`]
    );
    return { revokedCount };
  });
}

// Group B8: Admin Role Management with Password Re-authentication
export async function changeAdminUserRole(db, actorIdValue, targetIdValue, requestedRole, adminPassword) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const targetId = uuid(targetIdValue, 'Tài khoản người dùng');
  if (!allowedRoles.has(requestedRole)) throw new AppError(400, 'INVALID_ROLE', 'Vai trò mới không hợp lệ.');
  if (actorId === targetId) throw conflict('SELF_ROLE_CHANGE_FORBIDDEN', 'Bạn không thể tự thay đổi vai trò của chính mình.');
  if (typeof adminPassword !== 'string' || !adminPassword) {
    throw new AppError(400, 'ADMIN_PASSWORD_REQUIRED', 'Vui lòng nhập mật khẩu Admin hiện tại để xác nhận đổi vai trò.');
  }

  return inTransaction(db, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_MUTATION_LOCK]);
    const actor = (await client.query('SELECT id, password_hash FROM users WHERE id = $1 FOR UPDATE', [actorId])).rows[0];
    if (!actor || !(await verifyPassword(adminPassword, actor.password_hash))) {
      throw unauthorized('Mật khẩu xác nhận Admin không chính xác.');
    }

    const user = (await client.query(
      `SELECT id, full_name, email, role, status, email_verified_at, created_at
         FROM users WHERE id = $1 FOR UPDATE`, [targetId]
    )).rows[0];
    if (!user) throw notFound('Không tìm thấy tài khoản.');
    if (user.role === requestedRole) return { user: safeUser(user), changed: false };
    if (requestedRole === 'admin' && (user.status !== 'active' || !user.email_verified_at)) {
      throw conflict('ADMIN_REQUIRES_ACTIVE_VERIFIED', 'Chỉ có thể cấp quyền Admin cho tài khoản đang hoạt động và đã xác minh email.');
    }
    if (user.role === 'admin' && requestedRole === 'user') {
      const remainingAdmins = await client.query(
        `SELECT count(*)::int AS count FROM users
          WHERE role = 'admin' AND status = 'active' AND id <> $1`, [targetId]
      );
      if (remainingAdmins.rows[0].count === 0) {
        throw conflict('LAST_ACTIVE_ADMIN', 'Không thể hạ quyền Admin đang hoạt động cuối cùng.');
      }
    }

    const updated = (await client.query(
      `UPDATE users SET role = $2, updated_at = now() WHERE id = $1
       RETURNING id, full_name, email, role, status, email_verified_at, created_at`,
      [targetId, requestedRole]
    )).rows[0];

    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, target_user_id, action, old_role, new_role, summary)
       VALUES ($1, $2, 'user.role_changed', $3, $4, $5)`,
      [actorId, targetId, user.role, requestedRole, `Đổi vai trò từ ${user.role.toUpperCase()} sang ${requestedRole.toUpperCase()}`]
    );
    return { user: safeUser(updated), changed: true };
  });
}

// Group A8: Enhanced Audit Logs with Filtering
export async function listAdminAuditLogs(db, params) {
  const page = pageNumber(params.get('page'), 1);
  const pageSize = pageNumber(params.get('pageSize'), 10, 50);
  const action = params.get('action') || 'all';
  if (!allowedAuditActions.has(action)) throw new AppError(400, 'INVALID_FILTER', 'Loại sự kiện nhật ký không hợp lệ.');
  const query = (params.get('q') || '').trim();
  if (query.length > 100) throw new AppError(400, 'SEARCH_TOO_LONG', 'Từ khóa tìm kiếm tối đa 100 ký tự.');
  const fromValue = params.get('from') || '';
  const toValue = params.get('to') || '';

  const where = [];
  const values = [];
  if (action !== 'all') {
    values.push(action);
    where.push(`a.action = $${values.length}`);
  }
  if (fromValue) {
    const from = validDate(fromValue, 'Từ ngày');
    values.push(from);
    where.push(`(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $${values.length}::date`);
  }
  if (toValue) {
    const to = validDate(toValue, 'Đến ngày');
    values.push(to);
    where.push(`(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $${values.length}::date`);
  }
  if (query) {
    const escaped = query.replace(/[\\%_]/g, '\\$&');
    values.push(`%${escaped}%`);
    where.push(`(actor.full_name ILIKE $${values.length} OR target.full_name ILIKE $${values.length} OR coalesce(a.summary, '') ILIKE $${values.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [total, result] = await Promise.all([
    db.query(
      `SELECT count(*)::int AS total
         FROM admin_audit_logs a
         LEFT JOIN users actor ON actor.id = a.actor_user_id
         LEFT JOIN users target ON target.id = a.target_user_id
         ${clause}`,
      values
    ),
    db.query(
      `SELECT a.id, a.action, a.old_status, a.new_status, a.old_role, a.new_role, a.summary, a.created_at,
              actor.full_name AS actor_name, actor.email AS actor_email,
              target.full_name AS target_name, target.email AS target_email
         FROM admin_audit_logs a
         LEFT JOIN users actor ON actor.id = a.actor_user_id
         LEFT JOIN users target ON target.id = a.target_user_id
         ${clause}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize]
    )
  ]);
  return {
    logs: result.rows.map(safeAudit),
    pagination: { page, pageSize, total: total.rows[0].total, totalPages: Math.max(1, Math.ceil(total.rows[0].total / pageSize)) }
  };
}

// Group B2: Security Events Monitor
export async function listAdminSecurityEvents(db, params) {
  const page = pageNumber(params.get('page'), 1);
  const pageSize = pageNumber(params.get('pageSize'), 12, 50);
  const eventType = params.get('eventType') || 'all';
  if (!allowedSecurityEvents.has(eventType)) throw new AppError(400, 'INVALID_FILTER', 'Loại sự kiện bảo mật không hợp lệ.');

  const where = eventType === 'all' ? '' : 'WHERE event_type = $1';
  const values = eventType === 'all' ? [] : [eventType];

  const [summary, total, rows] = await Promise.all([
    db.query(`SELECT
                count(*) FILTER (WHERE event_type = 'login_failed' AND created_at >= now() - interval '24 hours')::int AS login_failed_24h,
                count(*) FILTER (WHERE event_type IN ('otp_failed', 'otp_locked') AND created_at >= now() - interval '24 hours')::int AS otp_failed_24h,
                count(*) FILTER (WHERE event_type = 'rate_limited' AND created_at >= now() - interval '24 hours')::int AS rate_limited_24h,
                count(*) FILTER (WHERE event_type = 'password_reset_requested' AND created_at >= now() - interval '24 hours')::int AS password_reset_24h,
                count(DISTINCT ip_bucket_hash) FILTER (WHERE created_at >= now() - interval '24 hours' AND event_type IN ('login_failed', 'otp_failed', 'otp_locked', 'rate_limited'))::int AS distinct_flagged_buckets_24h
              FROM security_events`),
    db.query(`SELECT count(*)::int AS total FROM security_events ${where}`, values),
    db.query(
      `SELECT id, event_type, email_masked, ip_bucket_hash, route_path, created_at
         FROM security_events
         ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize]
    )
  ]);

  return {
    summary: summary.rows[0],
    events: rows.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      emailMasked: row.email_masked || '—',
      ipBucketShort: `hmac:${String(row.ip_bucket_hash).slice(0, 10)}`,
      routePath: row.route_path,
      createdAt: row.created_at
    })),
    pagination: { page, pageSize, total: total.rows[0].total, totalPages: Math.max(1, Math.ceil(total.rows[0].total / pageSize)) }
  };
}

// Group B3: System Announcements (Broadcast Banners)
export async function listAdminAnnouncements(db) {
  const result = await db.query(
    `SELECT a.id, a.title, a.body, a.severity, a.is_active, a.starts_at, a.ends_at, a.created_at, a.updated_at,
            u.full_name AS author_name
       FROM system_announcements a
       LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.is_active DESC, a.created_at DESC`
  );
  return {
    announcements: result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity,
      isActive: row.is_active,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      createdAt: row.created_at,
      authorName: row.author_name || 'Admin'
    }))
  };
}

export async function createAdminAnnouncement(db, actorIdValue, payload) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const title = requiredText(payload.title, 'Tiêu đề thông báo', 140);
  const body = requiredText(payload.body, 'Nội dung thông báo', 600);
  const severity = payload.severity === 'warn' ? 'warn' : 'info';
  const isActive = payload.isActive !== false;
  const endsAt = payload.endsAt ? new Date(`${validDate(payload.endsAt, 'Ngày kết thúc')}T23:59:59.000Z`).toISOString() : null;

  return inTransaction(db, async (client) => {
    const inserted = await client.query(
      `INSERT INTO system_announcements (title, body, severity, is_active, ends_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, body, severity, is_active, starts_at, ends_at, created_at`,
      [title, body, severity, isActive, endsAt, actorId]
    );
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
       VALUES ($1, 'announcement.created', $2)`,
      [actorId, `Tạo thông báo hệ thống: ${title.slice(0, 120)}`]
    );
    return { announcement: inserted.rows[0] };
  });
}

export async function updateAdminAnnouncement(db, actorIdValue, idValue, payload) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const id = uuid(idValue, 'Thông báo');
  return inTransaction(db, async (client) => {
    const existing = (await client.query('SELECT id, title, is_active FROM system_announcements WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!existing) throw notFound('Không tìm thấy thông báo hệ thống.');
    const nextActive = typeof payload.isActive === 'boolean' ? payload.isActive : !existing.is_active;
    await client.query('UPDATE system_announcements SET is_active = $2 WHERE id = $1', [id, nextActive]);
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
       VALUES ($1, 'announcement.updated', $2)`,
      [actorId, `${nextActive ? 'Bật' : 'Tắt'} thông báo: ${existing.title.slice(0, 120)}`]
    );
    return { id, isActive: nextActive };
  });
}

export async function deleteAdminAnnouncement(db, actorIdValue, idValue) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const id = uuid(idValue, 'Thông báo');
  return inTransaction(db, async (client) => {
    const deleted = (await client.query('DELETE FROM system_announcements WHERE id = $1 RETURNING id, title', [id])).rows[0];
    if (!deleted) throw notFound('Không tìm thấy thông báo hệ thống.');
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
       VALUES ($1, 'announcement.deleted', $2)`,
      [actorId, `Xóa thông báo: ${deleted.title.slice(0, 120)}`]
    );
    return { id, deleted: true };
  });
}

// Group B4 & B6: App Settings (Feature Flags) & Default Category Templates
export async function getAdminSettingsAndTemplates(db) {
  const [settingsResult, templatesResult] = await Promise.all([
    db.query('SELECT key, enabled, description, updated_at FROM app_settings ORDER BY key ASC'),
    db.query('SELECT id, name, kind, icon_key, color, sort_order, is_enabled, updated_at FROM default_category_templates ORDER BY kind ASC, sort_order ASC, name ASC')
  ]);
  return {
    settings: settingsResult.rows.map((row) => ({
      key: row.key,
      enabled: row.enabled,
      description: row.description,
      updatedAt: row.updated_at
    })),
    templates: templatesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      iconKey: row.icon_key,
      color: row.color,
      sortOrder: row.sort_order,
      isEnabled: row.is_enabled,
      updatedAt: row.updated_at
    }))
  };
}

export async function updateAdminAppSetting(db, actorIdValue, payload) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const key = String(payload.key || '').trim();
  const enabled = Boolean(payload.enabled);
  const allowedKeys = new Set(['maintenance_mode', 'allow_registration', 'enable_ocr_scanner', 'enable_ai_coach', 'enable_bank_hub']);
  if (!allowedKeys.has(key)) throw new AppError(400, 'INVALID_SETTING_KEY', 'Cờ cấu hình không hợp lệ.');

  return inTransaction(db, async (client) => {
    const updated = (await client.query(
      `UPDATE app_settings SET enabled = $2, updated_by = $3, updated_at = now()
        WHERE key = $1 RETURNING key, enabled, description, updated_at`,
      [key, enabled, actorId]
    )).rows[0];
    if (!updated) throw notFound('Không tìm thấy cấu hình.');
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
       VALUES ($1, 'settings.updated', $2)`,
      [actorId, `Cập nhật cờ ${key} = ${enabled ? 'ON' : 'OFF'}`]
    );
    return { setting: updated };
  });
}

export async function createAdminCategoryTemplate(db, actorIdValue, payload) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const name = requiredText(payload.name, 'Tên danh mục mẫu', 60);
  const kind = payload.kind === 'income' ? 'income' : 'expense';
  const color = colorValue(payload.color || '#2563EB');
  const iconKey = optionalText(payload.iconKey, 40) || (kind === 'income' ? 'income' : 'tag');

  return inTransaction(db, async (client) => {
    const inserted = (await client.query(
      `INSERT INTO default_category_templates (name, kind, icon_key, color, is_enabled)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, kind, icon_key, color, sort_order, is_enabled`,
      [name, kind, iconKey, color]
    )).rows[0];
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
       VALUES ($1, 'template_category.created', $2)`,
      [actorId, `Thêm danh mục mẫu: ${name} (${kind === 'income' ? 'Thu' : 'Chi'})`]
    );
    return { template: inserted };
  });
}

export async function updateAdminCategoryTemplate(db, actorIdValue, idValue, payload) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const id = uuid(idValue, 'Danh mục mẫu');
  return inTransaction(db, async (client) => {
    const existing = (await client.query('SELECT id, name, kind, is_enabled FROM default_category_templates WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!existing) throw notFound('Không tìm thấy danh mục mẫu.');
    const nextEnabled = typeof payload.isEnabled === 'boolean' ? payload.isEnabled : !existing.is_enabled;
    await client.query('UPDATE default_category_templates SET is_enabled = $2 WHERE id = $1', [id, nextEnabled]);
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, summary)
       VALUES ($1, 'template_category.updated', $2)`,
      [actorId, `${nextEnabled ? 'Bật' : 'Tắt'} danh mục mẫu: ${existing.name}`]
    );
    return { id, isEnabled: nextEnabled };
  });
}

// Group B5: Support Tickets & Feedback Inbox
export async function listAdminSupportTickets(db, params) {
  const status = params.get('status') || 'all';
  if (!['all', 'open', 'in_progress', 'resolved'].includes(status)) {
    throw new AppError(400, 'INVALID_FILTER', 'Trạng thái yêu cầu hỗ trợ không hợp lệ.');
  }
  const where = status === 'all' ? '' : 'WHERE t.status = $1';
  const values = status === 'all' ? [] : [status];

  const [summary, rows] = await Promise.all([
    db.query(`SELECT
                count(*)::int AS total,
                count(*) FILTER (WHERE status = 'open')::int AS open_count,
                count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_count,
                count(*) FILTER (WHERE status = 'resolved')::int AS resolved_count
              FROM support_tickets`),
    db.query(
      `SELECT t.id, t.topic, t.subject, t.message, t.status, t.admin_note, t.created_at, t.updated_at,
              u.full_name AS user_name, u.email AS user_email
         FROM support_tickets t
         JOIN users u ON u.id = t.user_id
         ${where}
        ORDER BY CASE t.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, t.created_at DESC
        LIMIT 100`,
      values
    )
  ]);

  return {
    summary: summary.rows[0],
    tickets: rows.rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      subject: row.subject,
      message: row.message,
      status: row.status,
      adminNote: row.admin_note || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userName: row.user_name,
      userEmailMasked: maskEmail(row.user_email)
    }))
  };
}

export async function updateAdminSupportTicket(db, actorIdValue, idValue, payload) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const id = uuid(idValue, 'Yêu cầu hỗ trợ');
  const status = payload.status;
  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Trạng thái phiếu hỗ trợ không hợp lệ.');
  }
  const adminNote = optionalText(payload.adminNote, 500);

  return inTransaction(db, async (client) => {
    const existing = (await client.query('SELECT id, user_id, subject FROM support_tickets WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!existing) throw notFound('Không tìm thấy phiếu hỗ trợ.');
    await client.query(
      `UPDATE support_tickets
          SET status = $2,
              admin_note = coalesce($3, admin_note),
              resolved_by = CASE WHEN $2 = 'resolved' THEN $4::uuid ELSE resolved_by END
        WHERE id = $1`,
      [id, status, adminNote, actorId]
    );
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, target_user_id, action, summary)
       VALUES ($1, $2, 'support_ticket.updated', $3)`,
      [actorId, existing.user_id, `Cập nhật phiếu hỗ trợ "${existing.subject.slice(0, 80)}" → ${status}`]
    );
    return { id, status, adminNote };
  });
}

export async function getAdminExportUsers(db, rowLimit) {
  const count = await db.query('SELECT count(*)::int AS total FROM users');
  const total = Number(count.rows[0].total);
  if (total > rowLimit) throw new AppError(413, 'EXPORT_TOO_LARGE', `Danh sách có hơn ${rowLimit.toLocaleString('vi-VN')} tài khoản. Hãy thu hẹp dữ liệu trước khi xuất.`);
  const result = await db.query(
    `SELECT id, full_name, email, role, status, email_verified_at, created_at
       FROM users ORDER BY created_at DESC, id DESC LIMIT $1`, [rowLimit]
  );
  return { users: result.rows.map(safeUser), total };
}

export async function getAdminExportAuditLogs(db, params, rowLimit) {
  const fromValue = params.get('from');
  const toValue = params.get('to');
  let period = '';
  const values = [];
  let where = '';
  if (fromValue || toValue) {
    if (!fromValue || !toValue) throw new AppError(400, 'INVALID_DATE_RANGE', 'Khoảng ngày cần có cả ngày bắt đầu và ngày kết thúc.');
    const from = validDate(fromValue, 'Từ ngày');
    const to = validDate(toValue, 'Đến ngày');
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
    if (days < 0) throw new AppError(400, 'INVALID_DATE_RANGE', 'Ngày bắt đầu không được sau ngày kết thúc.');
    if (days > 366) throw new AppError(400, 'DATE_RANGE_TOO_LARGE', 'Khoảng ngày xuất tối đa là 366 ngày.');
    values.push(from, to);
    where = `WHERE (a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $1::date AND $2::date`;
    period = `${from} — ${to}`;
  }
  const count = await db.query(`SELECT count(*)::int AS total FROM admin_audit_logs a ${where}`, values);
  const total = Number(count.rows[0].total);
  if (total > rowLimit) throw new AppError(413, 'EXPORT_TOO_LARGE', `Khoảng nhật ký có hơn ${rowLimit.toLocaleString('vi-VN')} sự kiện. Hãy thu hẹp khoảng ngày.`);
  const result = await db.query(
    `SELECT a.id, a.action, a.old_status, a.new_status, a.old_role, a.new_role, a.summary, a.created_at,
            actor.full_name AS actor_name, actor.email AS actor_email,
            target.full_name AS target_name, target.email AS target_email
       FROM admin_audit_logs a
       LEFT JOIN users actor ON actor.id = a.actor_user_id
       LEFT JOIN users target ON target.id = a.target_user_id
       ${where}
       ORDER BY a.created_at DESC, a.id DESC LIMIT $${values.length + 1}`,
    [...values, rowLimit]
  );
  return { logs: result.rows.map(safeAudit), total, period };
}

export async function changeAdminUserStatus(db, actorIdValue, targetIdValue, requestedStatus) {
  const actorId = uuid(actorIdValue, 'Tài khoản Admin');
  const targetId = uuid(targetIdValue, 'Tài khoản người dùng');
  if (!allowedStatuses.has(requestedStatus)) throw new AppError(400, 'INVALID_STATUS', 'Trạng thái mới không hợp lệ.');
  if (actorId === targetId) throw conflict('SELF_LOCK_FORBIDDEN', 'Bạn không thể thay đổi trạng thái tài khoản của chính mình.');

  return inTransaction(db, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_MUTATION_LOCK]);
    const user = (await client.query(
      `SELECT id, full_name, email, role, status, email_verified_at, created_at
         FROM users WHERE id = $1 FOR UPDATE`, [targetId]
    )).rows[0];
    if (!user) throw notFound('Không tìm thấy tài khoản.');
    if (user.status === requestedStatus) return { user: safeUser(user), changed: false };
    if (requestedStatus === 'disabled' && user.status !== 'active') {
      throw conflict('ACCOUNT_NOT_ACTIVE', 'Chỉ có thể khóa tài khoản đang hoạt động.');
    }
    if (requestedStatus === 'active' && (user.status !== 'disabled' || !user.email_verified_at)) {
      throw conflict('EMAIL_NOT_VERIFIED', 'Chỉ mở khóa tài khoản đã xác minh email.');
    }
    if (user.role === 'admin' && user.status === 'active' && requestedStatus === 'disabled') {
      const remainingAdmins = await client.query(
        `SELECT count(*)::int AS count FROM users
          WHERE role = 'admin' AND status = 'active' AND id <> $1`, [targetId]
      );
      if (remainingAdmins.rows[0].count === 0) throw conflict('LAST_ACTIVE_ADMIN', 'Không thể khóa Admin đang hoạt động cuối cùng.');
    }

    const updated = (await client.query(
      `UPDATE users SET status = $2, updated_at = now() WHERE id = $1
       RETURNING id, full_name, email, role, status, email_verified_at, created_at`, [targetId, requestedStatus]
    )).rows[0];
    if (requestedStatus === 'disabled') {
      await client.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [targetId]);
    }
    await client.query(
      `INSERT INTO admin_audit_logs (actor_user_id, target_user_id, action, old_status, new_status, summary)
       VALUES ($1, $2, 'user.status_changed', $3, $4, $5)`,
      [actorId, targetId, user.status, requestedStatus, requestedStatus === 'disabled' ? 'Khóa tài khoản và thu hồi phiên' : 'Mở khóa tài khoản']
    );
    return { user: safeUser(updated), changed: true };
  });
}
