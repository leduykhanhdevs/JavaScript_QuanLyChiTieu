import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { AppError } from '../lib/errors.js';
import { validDate, uuid } from '../lib/validation.js';
import { getAdminAnalytics, getAdminOverview, getAdminExportAuditLogs, getAdminExportUsers } from './admin-service.js';
import { requireUsableFxRate } from './fx-rate-service.js';

const MAX_EXPORT_ROWS = 5_000;
const workerFonts = globalThis.__VI_MINH_REPORT_FONTS;
const REGULAR_FONT = workerFonts?.regular || fileURLToPath(new URL('../../public/assets/fonts/BeVietnamPro-Regular.ttf', import.meta.url));
const BOLD_FONT = workerFonts?.bold || fileURLToPath(new URL('../../public/assets/fonts/BeVietnamPro-Bold.ttf', import.meta.url));

function todayInVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function reportRange(params) {
  const today = todayInVietnam();
  const from = validDate(params.get('from') || `${today.slice(0, 7)}-01`, 'Từ ngày');
  const to = validDate(params.get('to') || today, 'Đến ngày');
  if (from > to) throw new AppError(400, 'INVALID_DATE_RANGE', 'Ngày bắt đầu không được sau ngày kết thúc.');
  return { from, to };
}

function dataset(params, allowed, defaultValue) {
  const value = params.get('dataset') || defaultValue;
  if (!allowed.has(value)) throw new AppError(400, 'INVALID_EXPORT_DATASET', 'Loại dữ liệu xuất không hợp lệ.');
  return value;
}

function kindFilter(params) {
  const kind = params.get('kind') || 'all';
  if (!['all', 'income', 'expense'].includes(kind)) throw new AppError(400, 'INVALID_EXPORT_FILTER', 'Loại thu chi không hợp lệ.');
  return kind;
}

function assertRowLimit(total) {
  if (Number(total) > MAX_EXPORT_ROWS) {
    throw new AppError(413, 'EXPORT_TOO_LARGE', `Phạm vi xuất có hơn ${MAX_EXPORT_ROWS.toLocaleString('vi-VN')} dòng. Hãy thu hẹp dữ liệu cần xuất rồi thử lại.`);
  }
}

function userTransactionWhere(userId, range, kind, categoryId) {
  const values = [userId];
  const clauses = ['t.user_id = $1'];
  if (range) {
    values.push(range.from, range.to);
    clauses.push(`t.transaction_date BETWEEN $${values.length - 1}::date AND $${values.length}::date`);
  }
  if (kind !== 'all') {
    values.push(kind);
    clauses.push(`t.kind = $${values.length}`);
  }
  if (categoryId) {
    values.push(categoryId);
    clauses.push(`t.category_id = $${values.length}`);
  }
  return { where: clauses.join(' AND '), values };
}

async function userTransactions(db, userId, range, kind, categoryId) {
  if (categoryId) {
    const owned = await db.query('SELECT id, name, kind FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
    if (!owned.rowCount) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục trong tài khoản này.');
  }
  const filter = userTransactionWhere(userId, range, kind, categoryId);
  const count = await db.query(`SELECT count(*)::int AS total FROM transactions t WHERE ${filter.where}`, filter.values);
  if (range) assertRowLimit(count.rows[0].total);
  const rows = await db.query(
    `SELECT t.kind, t.amount, t.transaction_date, t.note, a.name AS account_name, c.name AS category_name
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
       JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
      WHERE ${filter.where}
      ORDER BY t.transaction_date DESC, t.created_at DESC${range ? `\n      LIMIT ${MAX_EXPORT_ROWS}` : ''}`,
    filter.values
  );
  const totals = await db.query(
    `SELECT count(*)::int AS count,
            coalesce(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0)::text AS income,
            coalesce(sum(t.amount) FILTER (WHERE t.kind = 'expense'), 0)::text AS expense,
            min(t.transaction_date)::text AS earliest_date,
            max(t.transaction_date)::text AS latest_date
       FROM transactions t WHERE ${filter.where}`,
    filter.values
  );
  const first = range?.from || totals.rows[0].earliest_date;
  const last = range?.to || totals.rows[0].latest_date;
  const days = first && last ? (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000 : 0;
  const bucket = days <= 31 ? 'day' : days <= 731 ? 'month' : 'year';
  const bucketFormat = { day: 'DD/MM', month: 'MM/YYYY', year: 'YYYY' }[bucket];
  const seriesRows = count.rows[0].total
    ? await db.query(
        `SELECT to_char(date_trunc($${filter.values.length + 1}, t.transaction_date::timestamp), $${filter.values.length + 2}) AS label,
                coalesce(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0)::text AS income,
                coalesce(sum(t.amount) FILTER (WHERE t.kind = 'expense'), 0)::text AS expense
           FROM transactions t
          WHERE ${filter.where}
          GROUP BY date_trunc($${filter.values.length + 1}, t.transaction_date::timestamp)
          ORDER BY date_trunc($${filter.values.length + 1}, t.transaction_date::timestamp)`,
        [...filter.values, bucket, bucketFormat]
      )
    : { rows: [] };
  const chart = {
    title: `Thu và chi theo ${bucket === 'day' ? 'ngày' : bucket === 'month' ? 'tháng' : 'năm'}`,
    unit: 'VND',
    labels: seriesRows.rows.map((row) => row.label),
    series: [
      ...(kind !== 'expense' ? [{ name: 'Thu', color: '#2563EB', values: seriesRows.rows.map((row) => Number(row.income)) }] : []),
      ...(kind !== 'income' ? [{ name: 'Chi', color: '#8DB2FA', values: seriesRows.rows.map((row) => Number(row.expense)) }] : [])
    ]
  };
  return {
    rows: rows.rows,
    totals: totals.rows[0],
    chart
  };
}

function transactionTable(rows) {
  return {
    name: 'Giao dịch',
    columns: [
      { header: 'Loại giao dịch', key: 'kind_label', width: 17 },
      { header: 'Số tiền (VND)', key: 'amount', width: 18 },
      { header: 'Ngày giao dịch', key: 'transaction_date', width: 17 },
      { header: 'Tài khoản', key: 'account_name', width: 20 },
      { header: 'Danh mục', key: 'category_name', width: 22 },
      { header: 'Ghi chú', key: 'note', width: 42 }
    ],
    rows: rows.map((row) => ({
      transaction_date: row.transaction_date,
      kind_label: row.kind === 'income' ? 'Thu' : 'Chi',
      amount: Number(row.amount),
      category_name: row.category_name,
      account_name: row.account_name,
      note: row.note || ''
    }))
  };
}

async function createUserExportData(db, userId, params) {
  const selected = dataset(params, new Set(['report', 'transactions', 'recurring', 'categories']), 'report');
  const kind = kindFilter(params);
  const categoryIdValue = params.get('categoryId');
  const categoryId = categoryIdValue ? uuid(categoryIdValue, 'Danh mục') : null;
  const allTransactions = selected === 'transactions' && params.get('all') === 'true' && !params.get('from') && !params.get('to');
  const range = allTransactions ? null : reportRange(params);
  const periodLabel = allTransactions ? 'Toàn bộ giao dịch đã lưu' : `${range.from} — ${range.to}`;

  if (selected === 'recurring') {
    const result = await db.query(
      `SELECT r.title, r.kind, r.amount, r.frequency, r.day_of_month, r.start_on, r.end_on,
              r.next_occurrence_on, r.is_active, a.name AS account_name, c.name AS category_name
         FROM recurring_rules r
         JOIN accounts a ON a.id = r.account_id AND a.user_id = r.user_id
         JOIN categories c ON c.id = r.category_id AND c.user_id = r.user_id
        WHERE r.user_id = $1 AND ($2 = 'all' OR r.kind = $2)
        ORDER BY r.is_active DESC, r.next_occurrence_on, r.title
        LIMIT ${MAX_EXPORT_ROWS + 1}`,
      [userId, kind]
    );
    assertRowLimit(result.rows.length);
    const rows = result.rows.map((row) => ({
      title: row.title,
      kind: row.kind === 'income' ? 'Thu' : 'Chi',
      amount: Number(row.amount),
      frequency: ({ daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng', yearly: 'Hằng năm' })[row.frequency] || row.frequency,
      day_of_month: row.day_of_month || '',
      start_on: row.start_on,
      end_on: row.end_on || 'Không giới hạn',
      next_occurrence_on: row.next_occurrence_on,
      status: row.is_active ? 'Đang hoạt động' : 'Tạm dừng',
      category_name: row.category_name,
      account_name: row.account_name
    }));
    return {
      title: 'Giao dịch định kỳ', period: 'Tất cả quy tắc đang lưu',
      summary: [{ label: 'Số quy tắc', value: rows.length }],
      tables: [{ name: 'Định kỳ', columns: [
        { header: 'Tên quy tắc', key: 'title', width: 26 }, { header: 'Loại', key: 'kind', width: 12 },
        { header: 'Số tiền (VND)', key: 'amount', width: 18 }, { header: 'Chu kỳ', key: 'frequency', width: 17 },
        { header: 'Ngày trong tháng', key: 'day_of_month', width: 18 }, { header: 'Ngày bắt đầu', key: 'start_on', width: 15 },
        { header: 'Ngày kết thúc', key: 'end_on', width: 17 }, { header: 'Lần tiếp theo', key: 'next_occurrence_on', width: 16 },
        { header: 'Trạng thái', key: 'status', width: 20 }, { header: 'Danh mục', key: 'category_name', width: 22 },
        { header: 'Tài khoản', key: 'account_name', width: 20 }
      ], rows }]
    };
  }

  if (selected === 'categories') {
    const result = await db.query(
      `SELECT c.id, c.name, c.kind, c.is_archived,
              count(t.id)::int AS transaction_count,
              coalesce(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0)::text AS income,
              coalesce(sum(t.amount) FILTER (WHERE t.kind = 'expense'), 0)::text AS expense
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
              AND t.transaction_date BETWEEN $2::date AND $3::date
              AND ($4 = 'all' OR t.kind = $4)
        WHERE c.user_id = $1 AND ($5::uuid IS NULL OR c.id = $5)
        GROUP BY c.id, c.name, c.kind, c.is_archived
        ORDER BY c.is_archived, c.kind, c.name
        LIMIT ${MAX_EXPORT_ROWS + 1}`,
      [userId, range.from, range.to, kind, categoryId]
    );
    assertRowLimit(result.rows.length);
    const rows = result.rows.map((row) => ({
      name: row.name, kind: row.kind === 'income' ? 'Thu' : 'Chi',
      status: row.is_archived ? 'Đã lưu trữ' : 'Đang hoạt động',
      transaction_count: row.transaction_count, income: Number(row.income), expense: Number(row.expense)
    }));
    return {
      title: categoryId ? 'Thống kê danh mục thu chi' : 'Danh mục thu chi', period: periodLabel,
      summary: [{ label: 'Số danh mục', value: rows.length }, { label: 'Từ ngày', value: range.from }, { label: 'Đến ngày', value: range.to }],
      tables: [{ name: 'Danh mục', columns: [
        { header: 'Danh mục', key: 'name', width: 26 }, { header: 'Loại', key: 'kind', width: 12 },
        { header: 'Trạng thái', key: 'status', width: 20 }, { header: 'Số giao dịch', key: 'transaction_count', width: 16 },
        { header: 'Tổng thu (VND)', key: 'income', width: 20 }, { header: 'Tổng chi (VND)', key: 'expense', width: 20 }
      ], rows }]
    };
  }

  const { rows, totals, chart } = await userTransactions(db, userId, range, kind, categoryId);
  const txTable = transactionTable(rows);
  if (selected === 'transactions') {
    return {
      title: categoryId ? 'Giao dịch theo danh mục' : 'Tổng giao dịch thu chi', period: periodLabel,
      summary: [
        { label: 'Số giao dịch', value: Number(totals.count) },
        { label: 'Tổng thu (VND)', value: Number(totals.income) },
        { label: 'Tổng chi (VND)', value: Number(totals.expense) }
      ],
      charts: [chart],
      tables: [txTable]
    };
  }

  const [categories, months] = await Promise.all([
    db.query(
      `SELECT c.name AS category_name, t.kind,
              count(*)::int AS transaction_count, sum(t.amount)::text AS amount
         FROM transactions t JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
        WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2::date AND $3::date
          AND ($4 = 'all' OR t.kind = $4) AND ($5::uuid IS NULL OR t.category_id = $5)
        GROUP BY c.name, t.kind ORDER BY sum(t.amount) DESC, c.name`,
      [userId, range.from, range.to, kind, categoryId]
    ),
    db.query(
      `SELECT to_char(date_trunc('month', t.transaction_date), 'YYYY-MM') AS month,
              count(*)::int AS transaction_count,
              coalesce(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0)::text AS income,
              coalesce(sum(t.amount) FILTER (WHERE t.kind = 'expense'), 0)::text AS expense
         FROM transactions t
        WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2::date AND $3::date
          AND ($4 = 'all' OR t.kind = $4) AND ($5::uuid IS NULL OR t.category_id = $5)
        GROUP BY date_trunc('month', t.transaction_date) ORDER BY date_trunc('month', t.transaction_date)`,
      [userId, range.from, range.to, kind, categoryId]
    )
  ]);
  const categoryRows = categories.rows.map((row) => ({
    category_name: row.category_name, kind: row.kind === 'income' ? 'Thu' : 'Chi',
    transaction_count: row.transaction_count, amount: Number(row.amount)
  }));
  const monthRows = months.rows.map((row) => ({
    month: row.month, transaction_count: row.transaction_count,
    income: Number(row.income), expense: Number(row.expense)
  }));
  return {
    title: 'Báo cáo dòng tiền', period: periodLabel,
    summary: [
      { label: 'Số giao dịch', value: Number(totals.count) },
      { label: 'Tổng thu (VND)', value: Number(totals.income) },
      { label: 'Tổng chi (VND)', value: Number(totals.expense) },
      { label: 'Chênh lệch (VND)', value: Number(totals.income) - Number(totals.expense) }
    ],
    charts: [chart],
    tables: [
      { name: 'Theo danh mục', columns: [
        { header: 'Danh mục', key: 'category_name', width: 26 }, { header: 'Loại', key: 'kind', width: 12 },
        { header: 'Số giao dịch', key: 'transaction_count', width: 16 }, { header: 'Tổng tiền (VND)', key: 'amount', width: 20 }
      ], rows: categoryRows },
      { name: 'Theo tháng', columns: [
        { header: 'Tháng', key: 'month', width: 16 }, { header: 'Số giao dịch', key: 'transaction_count', width: 18 },
        { header: 'Tổng thu (VND)', key: 'income', width: 22 }, { header: 'Tổng chi (VND)', key: 'expense', width: 22 }
      ], rows: monthRows },
      txTable
    ]
  };
}

async function createAdminExportData(db, params) {
  const selected = dataset(params, new Set(['overview', 'users', 'audit', 'growth', 'analytics']), 'overview');
  if (selected === 'analytics') {
    const [analytics, overview] = await Promise.all([getAdminAnalytics(db, params), getAdminOverview(db, params)]);
    const activity = analytics.activity || {};
    const adoption = analytics.adoption || {};
    const features = adoption.features || [];
    const transactionRows = (analytics.transactionVolumeTrend || []).map((row) => ({
      month: row.month,
      incomeCount: Number(row.income_count || 0),
      expenseCount: Number(row.expense_count || 0),
      transactionCount: Number(row.total_count || 0),
      transferCount: Number(row.transfer_count || 0)
    }));
    const dailyRows = (activity.dailySeries || []).map((row) => ({ day: row.day, activeUsers: Number(row.count || 0) }));
    const bank = analytics.bankHubFunnel || {};
    return {
      title: 'Phân tích hoạt động hệ thống Admin',
      period: `${analytics.period.from} — ${analytics.period.to}`,
      summary: [
        { label: 'Tổng tài khoản', value: Number(overview.counts?.total || 0) },
        { label: 'DAU (24 giờ)', value: Number(activity.dau || 0) },
        { label: 'WAU (7 ngày)', value: Number(activity.wau || 0) },
        { label: 'MAU (30 ngày)', value: Number(activity.mau || 0) },
        { label: 'Tỷ lệ DAU/MAU', value: `${Number(activity.stickinessPercent || 0)}%` },
        { label: 'Phiên hợp lệ', value: Number(activity.activeSessions || 0) },
        { label: 'Giao dịch trong kỳ (số lượng)', value: Number(overview.transactionCount || 0) }
      ],
      charts: [
        {
          title: 'Người dùng hoạt động theo ngày',
          unit: 'người',
          labels: dailyRows.map((row) => row.day.slice(5)),
          series: [{ name: 'Người dùng', color: '#2563EB', values: dailyRows.map((row) => row.activeUsers) }]
        },
        {
          title: 'Số giao dịch và chuyển khoản theo tháng',
          unit: 'lượt',
          labels: transactionRows.map((row) => row.month),
          series: [
            { name: 'Thu', color: '#2563EB', values: transactionRows.map((row) => row.incomeCount) },
            { name: 'Chi', color: '#8DB2FA', values: transactionRows.map((row) => row.expenseCount) },
            { name: 'Chuyển tiền', color: '#64748B', values: transactionRows.map((row) => row.transferCount) }
          ]
        }
      ],
      tables: [
        { name: 'Mức độ sử dụng tính năng', columns: [
          { header: 'Tính năng', key: 'feature', width: 32 }, { header: 'Người dùng', key: 'users', width: 18 },
          { header: 'Số bản ghi', key: 'records', width: 18 }, { header: 'Tỷ lệ người dùng hoạt động', key: 'adoption', width: 27 }
        ], rows: features.map((item) => ({
          feature: item.label,
          users: Number(item.users || 0),
          records: Number(item.records || 0),
          adoption: adoption.activeUsers ? `${Math.round(Number(item.users || 0) / adoption.activeUsers * 100)}%` : '0%'
        })) },
        { name: 'Lưu lượng tháng', columns: [
          { header: 'Tháng', key: 'month', width: 18 }, { header: 'Lượt thu', key: 'incomeCount', width: 16 },
          { header: 'Lượt chi', key: 'expenseCount', width: 16 }, { header: 'Tổng giao dịch', key: 'transactionCount', width: 20 },
          { header: 'Chuyển khoản nội bộ', key: 'transferCount', width: 23 }
        ], rows: transactionRows },
        { name: 'Hoạt động 14 ngày', columns: [
          { header: 'Ngày', key: 'day', width: 18 }, { header: 'Người dùng hoạt động', key: 'activeUsers', width: 25 }
        ], rows: dailyRows },
        { name: 'Liên kết Bank Hub', columns: [
          { header: 'Chỉ số', key: 'label', width: 30 }, { header: 'Giá trị', key: 'value', width: 20 }
        ], rows: [
          { label: 'Lượt bắt đầu liên kết', value: Number(bank.total_attempts || 0) },
          { label: 'Sẵn sàng mở Hosted Link', value: Number(bank.ready_count || 0) },
          { label: 'Đã mở Hosted Link', value: Number(bank.launched_count || 0) },
          { label: 'Đã liên kết', value: Number(bank.linked_count || 0) },
          { label: 'Lỗi, bỏ dở hoặc hết hạn', value: Number(bank.failed_or_expired_count || 0) }
        ] }
      ]
    };
  }
  if (selected === 'users') {
    const result = await getAdminExportUsers(db, MAX_EXPORT_ROWS);
    const rows = result.users.map((user) => ({
      fullName: user.fullName, email: user.emailMasked, role: user.role === 'admin' ? 'Admin' : 'User',
      status: ({ active: 'Đang hoạt động', pending_email: 'Chờ xác minh', disabled: 'Đã khóa' })[user.status] || user.status,
      emailVerified: user.emailVerifiedAt ? 'Đã xác minh' : 'Chưa xác minh', createdAt: user.createdAt
    }));
    return {
      title: 'Danh sách người dùng Admin', period: 'Email đã che một phần; không có dữ liệu tài chính cá nhân',
      summary: [{ label: 'Tổng tài khoản', value: result.total }, { label: 'Đã xuất', value: rows.length }],
      tables: [{ name: 'Người dùng', columns: [
        { header: 'Họ tên', key: 'fullName', width: 28 }, { header: 'Email đã che', key: 'email', width: 28 },
        { header: 'Vai trò', key: 'role', width: 14 }, { header: 'Trạng thái', key: 'status', width: 22 },
        { header: 'Email', key: 'emailVerified', width: 18 }, { header: 'Ngày tạo', key: 'createdAt', width: 24 }
      ], rows }]
    };
  }

  if (selected === 'audit') {
    const result = await getAdminExportAuditLogs(db, params, MAX_EXPORT_ROWS);
    const actionTitle = (action) => ({
      'user.status_changed': 'Thay đổi trạng thái tài khoản',
      'user.role_changed': 'Thay đổi vai trò tài khoản',
      'user.sessions_revoked': 'Thu hồi phiên đăng nhập',
      'user.unverified_purged': 'Dọn dẹp tài khoản chưa xác minh',
      'announcement.created': 'Tạo thông báo hệ thống',
      'announcement.updated': 'Cập nhật thông báo hệ thống',
      'announcement.deleted': 'Xóa thông báo hệ thống',
      'settings.updated': 'Cập nhật cấu hình hệ thống',
      'template_category.created': 'Thêm danh mục mẫu',
      'template_category.updated': 'Cập nhật danh mục mẫu',
      'support_ticket.updated': 'Cập nhật phiếu hỗ trợ'
    })[action] || action;
    const rows = result.logs.map((log) => ({
      createdAt: log.createdAt,
      actor: `${log.actorName} (${log.actorEmailMasked})`,
      action: actionTitle(log.action),
      target: `${log.targetName} (${log.targetEmailMasked})`,
      change: log.oldRole != null
        ? `${log.oldRole} → ${log.newRole}`
        : log.oldStatus != null
          ? `${log.oldStatus} → ${log.newStatus}`
          : (log.summary || '—')
    }));
    return {
      title: 'Nhật ký quản trị', period: result.period || 'Tất cả nhật ký',
      summary: [{ label: 'Số sự kiện', value: result.total }, { label: 'Đã xuất', value: rows.length }],
      tables: [{ name: 'Nhật ký', columns: [
        { header: 'Thời gian', key: 'createdAt', width: 24 }, { header: 'Người thực hiện', key: 'actor', width: 32 },
        { header: 'Hoạt động', key: 'action', width: 30 }, { header: 'Tài khoản liên quan', key: 'target', width: 34 },
        { header: 'Thay đổi', key: 'change', width: 22 }
      ], rows }]
    };
  }

  const overview = await getAdminOverview(db, params);
  const summary = [
    { label: 'Tổng tài khoản', value: overview.counts.total },
    { label: 'Đang hoạt động', value: overview.counts.active },
    { label: 'Chờ xác minh', value: overview.counts.pending },
    { label: 'Đã khóa', value: overview.counts.disabled },
    { label: 'Giao dịch trong kỳ (số lượng)', value: overview.transactionCount },
    { label: 'API', value: overview.services.api },
    { label: 'PostgreSQL', value: overview.services.database }
  ];
  const trendRows = overview.signupTrend.map((row) => ({ month: row.month, count: Number(row.count) }));
  if (selected === 'growth') {
    return {
      title: 'Tăng trưởng người dùng', period: `${overview.period.from} — ${overview.period.to}`,
      summary: [{ label: 'Lượt đăng ký trong kỳ', value: trendRows.reduce((sum, row) => sum + row.count, 0) }, { label: 'Số tháng', value: trendRows.length }],
      charts: [{ title: 'Lượt đăng ký theo tháng', unit: 'tài khoản', labels: trendRows.map((row) => row.month), series: [{ name: 'Đăng ký', color: '#2563EB', values: trendRows.map((row) => row.count) }] }],
      tables: [{ name: 'Tăng trưởng', columns: [
        { header: 'Tháng', key: 'month', width: 20 }, { header: 'Lượt đăng ký', key: 'count', width: 20 }
      ], rows: trendRows }]
    };
  }
  const activityRows = overview.recentActivity.map((log) => ({
    createdAt: log.createdAt, actor: `${log.actorName} (${log.actorEmailMasked})`,
    action: log.action === 'user.role_changed' ? 'Thay đổi vai trò' : 'Thay đổi trạng thái',
    target: `${log.targetName} (${log.targetEmailMasked})`
  }));
  return {
    title: 'Chỉ số hệ thống Admin', period: `${overview.period.from} — ${overview.period.to}`,
    summary,
    charts: [
      { title: 'Lượt đăng ký theo tháng', unit: 'tài khoản', labels: trendRows.map((row) => row.month), series: [{ name: 'Đăng ký', color: '#2563EB', values: trendRows.map((row) => row.count) }] },
      { title: 'Trạng thái tài khoản', unit: 'tài khoản', labels: ['Hoạt động', 'Chờ xác minh', 'Đã khóa'], series: [{ name: 'Tài khoản', color: '#2563EB', values: [Number(overview.counts.active || 0), Number(overview.counts.pending || 0), Number(overview.counts.disabled || 0)] }] }
    ],
    tables: [
      { name: 'Tăng trưởng', columns: [
        { header: 'Tháng', key: 'month', width: 20 }, { header: 'Lượt đăng ký', key: 'count', width: 20 }
      ], rows: trendRows },
      { name: 'Hoạt động gần đây', columns: [
        { header: 'Thời gian', key: 'createdAt', width: 24 }, { header: 'Người thực hiện', key: 'actor', width: 32 },
        { header: 'Hoạt động', key: 'action', width: 24 }, { header: 'Tài khoản liên quan', key: 'target', width: 34 }
      ], rows: activityRows }
    ]
  };
}

function safeCellValue(value) {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  return String(value);
}

async function toExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ví Mình';
  workbook.created = new Date();
  const overview = workbook.addWorksheet('Tổng quan');
  overview.addRow([data.title]);
  overview.mergeCells('A1:B1');
  overview.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
  overview.addRow(['Khoảng thời gian', data.period]);
  overview.addRow([]);
  const summaryHeader = overview.addRow(['Chỉ số', 'Giá trị']);
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  for (const item of data.summary) {
    const row = overview.addRow([safeCellValue(item.label), safeCellValue(item.value)]);
    if (data.currency === 'USD' && /\(USD\)/.test(item.label) && typeof item.value === 'number') row.getCell(2).numFmt = '"$"#,##0.00';
  }
  overview.columns = [{ width: 38 }, { width: 48 }];
  overview.views = [{ state: 'frozen', ySplit: 4 }];

  if (data.charts?.length) {
    const chartSheet = workbook.addWorksheet('Thống kê');
    chartSheet.getColumn(1).width = 18;
    for (const chart of data.charts) {
      const columnCount = 1 + chart.series.length * 2;
      const titleRow = chartSheet.addRow([chart.title]);
      chartSheet.mergeCells(titleRow.number, 1, titleRow.number, columnCount);
      titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1E3A8A' } };
      const header = chartSheet.addRow(['Kỳ', ...chart.series.flatMap((series) => [`${series.name}${chart.unit ? ` (${chart.unit})` : ''}`, `${series.name} · biểu đồ`])]);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      chart.series.forEach((series, index) => {
        chartSheet.getColumn(2 + index * 2).width = 20;
        chartSheet.getColumn(3 + index * 2).width = 32;
        if (data.currency === 'USD' && chart.unit === 'USD') chartSheet.getColumn(2 + index * 2).numFmt = '"$"#,##0.00';
      });
      const maximum = Math.max(0, ...chart.series.flatMap((series) => series.values));
      chart.labels.forEach((label, rowIndex) => {
        const values = chart.series.flatMap((series) => {
          const value = Number(series.values[rowIndex] || 0);
          const bars = maximum > 0 && value > 0 ? '█'.repeat(Math.max(1, Math.round(value / maximum * 28))) : '—';
          return [value, bars];
        });
        const row = chartSheet.addRow([label, ...values]);
        chart.series.forEach((series, index) => {
          const color = `FF${String(series.color || '#2563EB').replace('#', '').toUpperCase()}`;
          row.getCell(3 + index * 2).font = { color: { argb: color }, name: 'Arial' };
        });
      });
      chartSheet.addRow([]);
    }
    chartSheet.views = [{ state: 'frozen', ySplit: 2 }];
  }

  for (const table of data.tables) {
    const sheet = workbook.addWorksheet(String(table.name).slice(0, 31));
    const header = sheet.addRow(table.columns.map((column) => column.header));
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    for (const item of table.rows) {
      const row = sheet.addRow(table.columns.map((column) => safeCellValue(item[column.key])));
      row.eachCell((cell) => { cell.alignment = { vertical: 'top', wrapText: true }; });
    }
    sheet.columns = table.columns.map((column) => ({ key: column.key, width: column.width || 18 }));
    if (data.currency === 'USD') table.columns.forEach((column, index) => {
      if (/\(USD\)/.test(column.header)) sheet.getColumn(index + 1).numFmt = '"$"#,##0.00';
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(table.columns.length).letter}1` };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function pdfText(value) {
  return value == null ? '' : String(value);
}

function pdfSummaryValue(data, item) {
  return data.currency === 'USD' && /\(USD\)/.test(item.label) && typeof item.value === 'number'
    ? item.value.toFixed(2)
    : pdfText(item.value);
}

function toPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 38, right: 36, bottom: 38, left: 36 }, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont('Vietnam', REGULAR_FONT);
    doc.registerFont('VietnamBold', BOLD_FONT);
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const availableWidth = right - left;
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    let y = doc.page.margins.top;

    doc.font('VietnamBold').fontSize(17).fillColor('#1e3a8a').text(pdfText(data.title), left, y, { width: availableWidth });
    y = doc.y + 5;
    doc.font('Vietnam').fontSize(9).fillColor('#64748b').text(`Khoảng thời gian: ${pdfText(data.period)}`, left, y, { width: availableWidth });
    y = doc.y + 13;
    doc.font('VietnamBold').fontSize(10).fillColor('#1e293b').text('TÓM TẮT', left, y);
    y = doc.y + 5;
    const summaryWidth = availableWidth / 2;
    for (let index = 0; index < data.summary.length; index += 2) {
      if (y + 30 > bottom()) { doc.addPage(); y = doc.page.margins.top; }
      const first = data.summary[index];
      const second = data.summary[index + 1];
      doc.roundedRect(left, y, availableWidth, 26, 4).fill('#eff6ff');
      doc.font('VietnamBold').fontSize(9).fillColor('#334155').text(`${pdfText(first.label)}: `, left + 8, y + 7, { width: summaryWidth - 16, continued: true });
      doc.font('Vietnam').text(pdfSummaryValue(data, first), { continued: false });
      if (second) {
        const x = left + summaryWidth;
        doc.font('VietnamBold').fontSize(9).fillColor('#334155').text(`${pdfText(second.label)}: `, x + 8, y + 7, { width: summaryWidth - 16, continued: true });
        doc.font('Vietnam').text(pdfSummaryValue(data, second), { continued: false });
      }
      y += 31;
    }

    for (const chart of data.charts || []) {
      if (!chart.labels?.length || !chart.series?.length) continue;
      if (y + 155 > bottom()) { doc.addPage(); y = doc.page.margins.top; }
      y += 8;
      doc.font('VietnamBold').fontSize(11).fillColor('#1e3a8a').text(pdfText(chart.title), left, y, { width: availableWidth });
      y = doc.y + 8;
      const plotLeft = left + 8;
      const plotWidth = availableWidth - 16;
      const plotTop = y;
      const baseline = plotTop + 82;
      const maxBarHeight = 72;
      const maxValue = Math.max(0, ...chart.series.flatMap((series) => series.values.map(Number)));
      const groupWidth = plotWidth / chart.labels.length;
      const barWidth = Math.max(2, Math.min(15, groupWidth / (chart.series.length + 1)));
      doc.moveTo(plotLeft, baseline).lineTo(plotLeft + plotWidth, baseline).strokeColor('#dce5f1').lineWidth(0.7).stroke();
      chart.labels.forEach((label, labelIndex) => {
        const groupCenter = plotLeft + groupWidth * (labelIndex + 0.5);
        chart.series.forEach((series, seriesIndex) => {
          const value = Math.max(0, Number(series.values[labelIndex] || 0));
          const height = maxValue ? value / maxValue * maxBarHeight : 0;
          const offset = (seriesIndex - (chart.series.length - 1) / 2) * (barWidth + 2);
          if (height > 0) doc.rect(groupCenter + offset - barWidth / 2, baseline - height, barWidth, height).fill(series.color || '#2563EB');
        });
        const labelStep = Math.max(1, Math.ceil(chart.labels.length / 24));
        if (labelIndex % labelStep === 0 || labelIndex === chart.labels.length - 1) {
          doc.font('Vietnam').fontSize(chart.labels.length > 18 ? 5.5 : 7).fillColor('#64748b')
            .text(pdfText(label), plotLeft + groupWidth * labelIndex, baseline + 4, { width: groupWidth, align: 'center', ellipsis: true });
        }
      });
      let legendX = left + 8;
      const legendY = baseline + 22;
      for (const series of chart.series) {
        doc.rect(legendX, legendY + 2, 7, 7).fill(series.color || '#2563EB');
        doc.font('Vietnam').fontSize(8).fillColor('#475569').text(pdfText(series.name), legendX + 11, legendY, { width: 100 });
        legendX += 62 + Math.min(80, pdfText(series.name).length * 4.5);
      }
      y = legendY + 17;
    }

    for (const table of data.tables) {
      if (y + 46 > bottom()) { doc.addPage(); y = doc.page.margins.top; }
      y += 10;
      doc.font('VietnamBold').fontSize(11).fillColor('#1e3a8a').text(pdfText(table.name), left, y, { width: availableWidth });
      y = doc.y + 6;
      const totalWeight = table.columns.reduce((sum, column) => sum + (column.width || 18), 0);
      const widths = table.columns.map((column) => availableWidth * (column.width || 18) / totalWeight);
      const headerHeight = 24;
      const drawHeader = () => {
        if (y + headerHeight > bottom()) { doc.addPage(); y = doc.page.margins.top; }
        doc.rect(left, y, availableWidth, headerHeight).fill('#1e3a8a');
        let x = left;
        table.columns.forEach((column, index) => {
          doc.font('VietnamBold').fontSize(8).fillColor('#ffffff').text(pdfText(column.header), x + 4, y + 6, { width: widths[index] - 8, height: headerHeight - 8, ellipsis: true });
          x += widths[index];
        });
        y += headerHeight;
      };
      drawHeader();
      if (!table.rows.length) {
        doc.font('Vietnam').fontSize(9).fillColor('#64748b').text('Không có dữ liệu trong phạm vi đã chọn.', left + 5, y + 7, { width: availableWidth - 10 });
        y = doc.y + 9;
        continue;
      }
      for (const row of table.rows) {
        const texts = table.columns.map((column) => {
          const value = row[column.key];
          return data.currency === 'USD' && /\(USD\)/.test(column.header) && typeof value === 'number' ? value.toFixed(2) : pdfText(value);
        });
        const heights = texts.map((value, index) => doc.font('Vietnam').fontSize(8).heightOfString(value || ' ', { width: widths[index] - 10 }));
        const rowHeight = Math.max(22, ...heights.map((height) => Math.min(height, 110) + 8));
        if (y + rowHeight > bottom()) { doc.addPage(); y = doc.page.margins.top; drawHeader(); }
        doc.rect(left, y, availableWidth, rowHeight).fillAndStroke('#ffffff', '#e2e8f0');
        let x = left;
        texts.forEach((value, index) => {
          doc.font('Vietnam').fontSize(8).fillColor('#334155').text(value, x + 5, y + 5, {
            width: widths[index] - 10, height: rowHeight - 8, ellipsis: true
          });
          x += widths[index];
        });
        y += rowHeight;
      }
      y += 10;
    }
    doc.end();
  });
}

export async function createUserExport(db, userId, params) {
  const data = await createUserExportData(db, userId, params);
  const preference = await db.query('SELECT currency FROM users WHERE id = $1', [userId]);
  const currency = preference.rows[0]?.currency === 'USD' ? 'USD' : 'VND';
  data.currency = currency;
  if (currency === 'USD') {
    const rates = await requireUsableFxRate(db);
    const moneyKeys = new Set(['amount', 'income', 'expense', 'difference', 'limit_amount', 'target_amount', 'spent', 'remaining']);
    const convert = (value) => Number((Number(value) / rates.usdVnd).toFixed(2));
    const convertRows = (rows = []) => rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key,
      moneyKeys.has(key) && value !== '' && value != null ? convert(value) : typeof value === 'string' ? value.replaceAll('(VND)', '(USD)').replaceAll('VND', 'USD') : value
    ])));
    data.summary = data.summary.map((item) => ({
      ...item,
      label: item.label.replaceAll('(VND)', '(USD)').replaceAll('VND', 'USD'),
      value: /\(VND\)/.test(item.label) && typeof item.value === 'number' ? convert(item.value) : item.value
    }));
    data.tables = data.tables.map((table) => ({
      ...table,
      columns: table.columns.map((column) => ({ ...column, header: column.header.replaceAll('(VND)', '(USD)').replaceAll('VND', 'USD') })),
      rows: convertRows(table.rows)
    }));
    data.charts = (data.charts || []).map((chart) => ({
      ...chart,
      unit: chart.unit === 'VND' ? 'USD' : chart.unit,
      title: chart.title.replaceAll('VND', 'USD'),
      series: chart.series.map((series) => ({ ...series, values: series.values.map(convert) }))
    }));
    data.period += ` · Quy đổi tham khảo tại ${rates.date} (CurrencyAPI)`;
  }
  return createExportFile(data, params.get('format'));
}

export async function createAdminExport(db, params) {
  const data = await createAdminExportData(db, params);
  return createExportFile(data, params.get('format'));
}

async function createExportFile(data, formatValue) {
  const format = formatValue || 'xlsx';
  if (!['xlsx', 'pdf'].includes(format)) throw new AppError(400, 'INVALID_EXPORT_FORMAT', 'Định dạng xuất chỉ hỗ trợ Excel hoặc PDF.');
  const filename = `vi-minh-${data.title.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 54)}.${format}`;
  const buffer = format === 'xlsx' ? await toExcel(data) : await toPdf(data);
  return {
    buffer,
    filename,
    contentType: format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'
  };
}
