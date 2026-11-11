import {
  createAdminAnnouncement,
  createAdminCategoryTemplate,
  deleteAdminAnnouncement,
  fetchAdminAnalytics,
  fetchAdminAnnouncements,
  fetchAdminAuditLogs,
  fetchAdminDetailedHealth,
  fetchAdminOverview,
  fetchAdminSecurityEvents,
  fetchAdminSettings,
  fetchAdminSupportTickets,
  fetchAdminUser,
  fetchAdminUsers,
  fetchAdminVerificationQueue,
  purgeAdminUnverifiedUsers,
  revokeAdminUserSessions,
  updateAdminAnnouncement,
  updateAdminCategoryTemplate,
  updateAdminSetting,
  updateAdminSupportTicket,
  updateAdminUserRole,
  updateAdminUserStatus
} from '../api/admin-client.js?v=20261105-admin-suite-v1';
import { $, escapeHtml, initials } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { downloadExport } from '../api/download.js?v=20261104-agent-exports-v1';

const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const monthStartMinus = (months) => {
  const date = new Date(`${today()}T00:00:00.000Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
};

export const adminUi = {
  view: 'admin-overview',
  actorId: null,
  loading: false,
  error: null,
  period: 'six-months',
  from: monthStartMinus(5),
  to: today(),
  dateError: '',
  overview: null,
  analytics: null,
  verificationQueue: null,
  purgingQueue: false,
  healthDetailed: null,
  securityEvents: null,
  securityFilters: { eventType: 'all', page: 1, pageSize: 12 },
  announcements: [],
  savingAnnouncement: false,
  settingsData: null,
  savingSettingKey: null,
  savingTemplate: false,
  supportTickets: null,
  ticketFilter: 'all',
  openTicketCount: 0,
  selectedTicket: null,
  savingTicket: false,
  agentMessages: [],
  agentDraft: '',
  agentExportContext: null,
  users: [],
  selectedUser: null,
  detailLoading: false,
  detailError: null,
  revokingSessions: false,
  userSummary: null,
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  auditLogs: [],
  auditPagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  auditFilters: { q: '', action: 'all', from: '', to: '' },
  filters: { q: '', status: 'all', role: 'all', verified: 'all', sort: 'newest', page: 1, pageSize: 10 },
  pendingStatus: null,
  savingStatus: false,
  pendingRole: null,
  savingRole: false,
  roleError: ''
};

const viewPaths = new Map([
  ['/admin', 'admin-overview'],
  ['/admin/analytics', 'admin-analytics'],
  ['/admin/agent', 'admin-agent'],
  ['/admin/users', 'admin-users'],
  ['/admin/verification', 'admin-verification'],
  ['/admin/security', 'admin-security'],
  ['/admin/support', 'admin-support'],
  ['/admin/announcements', 'admin-announcements'],
  ['/admin/settings', 'admin-settings'],
  ['/admin/health', 'admin-health'],
  ['/admin/audit-logs', 'admin-audit']
]);
const pathsByView = new Map([...viewPaths].map(([path, view]) => [view, path]));

export const adminViewFromPath = (path) => viewPaths.get(path.replace(/\/$/, '') || '/admin') || null;
export const adminPathForView = (view) => pathsByView.get(view) || null;

export function resetAdminUi() {
  adminUi.view = 'admin-overview';
  adminUi.actorId = null;
  adminUi.loading = false;
  adminUi.error = null;
  adminUi.period = 'six-months';
  adminUi.from = monthStartMinus(5);
  adminUi.to = today();
  adminUi.dateError = '';
  adminUi.overview = null;
  adminUi.analytics = null;
  adminUi.verificationQueue = null;
  adminUi.purgingQueue = false;
  adminUi.healthDetailed = null;
  adminUi.securityEvents = null;
  adminUi.securityFilters = { eventType: 'all', page: 1, pageSize: 12 };
  adminUi.announcements = [];
  adminUi.savingAnnouncement = false;
  adminUi.settingsData = null;
  adminUi.savingSettingKey = null;
  adminUi.savingTemplate = false;
  adminUi.supportTickets = null;
  adminUi.ticketFilter = 'all';
  adminUi.openTicketCount = 0;
  adminUi.selectedTicket = null;
  adminUi.savingTicket = false;
  adminUi.agentMessages = [];
  adminUi.agentDraft = '';
  adminUi.agentExportContext = null;
  adminUi.users = [];
  adminUi.selectedUser = null;
  adminUi.detailLoading = false;
  adminUi.detailError = null;
  adminUi.revokingSessions = false;
  adminUi.userSummary = null;
  adminUi.pagination = { page: 1, pageSize: 10, total: 0, totalPages: 1 };
  adminUi.auditLogs = [];
  adminUi.auditPagination = { page: 1, pageSize: 10, total: 0, totalPages: 1 };
  adminUi.auditFilters = { q: '', action: 'all', from: '', to: '' };
  adminUi.filters = { q: '', status: 'all', role: 'all', verified: 'all', sort: 'newest', page: 1, pageSize: 10 };
  adminUi.pendingStatus = null;
  adminUi.savingStatus = false;
  adminUi.pendingRole = null;
  adminUi.savingRole = false;
  adminUi.roleError = '';
}

export function setAdminPeriod(period) {
  adminUi.period = period;
  adminUi.dateError = '';
  const end = today();
  adminUi.to = end;
  if (period === '30-days') {
    const from = new Date(`${end}T00:00:00.000Z`);
    from.setUTCDate(from.getUTCDate() - 29);
    adminUi.from = from.toISOString().slice(0, 10);
  } else if (period === '90-days') {
    const from = new Date(`${end}T00:00:00.000Z`);
    from.setUTCDate(from.getUTCDate() - 89);
    adminUi.from = from.toISOString().slice(0, 10);
  } else if (period === 'six-months') adminUi.from = monthStartMinus(5);
}

export async function loadAdminView(view = adminUi.view) {
  adminUi.view = view;
  adminUi.loading = true;
  adminUi.error = null;
  try {
    if (view === 'admin-overview') {
      adminUi.overview = await fetchAdminOverview({ from: adminUi.from, to: adminUi.to });
      if (adminUi.overview?.quickStats?.open_tickets != null) adminUi.openTicketCount = Number(adminUi.overview.quickStats.open_tickets);
    } else if (view === 'admin-analytics') {
      adminUi.analytics = await fetchAdminAnalytics({ from: adminUi.from, to: adminUi.to });
    } else if (view === 'admin-agent') {
      const [overview, analytics] = await Promise.all([
        fetchAdminOverview({ from: adminUi.from, to: adminUi.to }),
        fetchAdminAnalytics({ from: adminUi.from, to: adminUi.to }).catch(() => null)
      ]);
      adminUi.overview = overview;
      if (overview?.quickStats?.open_tickets != null) adminUi.openTicketCount = Number(overview.quickStats.open_tickets);
      if (analytics) adminUi.analytics = analytics;
    } else if (view === 'admin-users') {
      const result = await fetchAdminUsers(adminUi.filters);
      adminUi.users = result.users;
      adminUi.userSummary = result.summary;
      adminUi.pagination = result.pagination;
    } else if (view === 'admin-verification') {
      adminUi.verificationQueue = await fetchAdminVerificationQueue();
    } else if (view === 'admin-security') {
      adminUi.securityEvents = await fetchAdminSecurityEvents(adminUi.securityFilters);
    } else if (view === 'admin-support') {
      adminUi.supportTickets = await fetchAdminSupportTickets({ status: adminUi.ticketFilter });
      if (adminUi.supportTickets?.summary?.open_count != null) adminUi.openTicketCount = Number(adminUi.supportTickets.summary.open_count);
    } else if (view === 'admin-announcements') {
      const result = await fetchAdminAnnouncements();
      adminUi.announcements = result.announcements || [];
    } else if (view === 'admin-settings') {
      adminUi.settingsData = await fetchAdminSettings();
    } else if (view === 'admin-health') {
      adminUi.healthDetailed = await fetchAdminDetailedHealth();
    } else if (view === 'admin-audit') {
      const result = await fetchAdminAuditLogs({
        page: adminUi.auditPagination.page,
        pageSize: adminUi.auditPagination.pageSize,
        ...adminUi.auditFilters
      });
      adminUi.auditLogs = result.logs;
      adminUi.auditPagination = result.pagination;
    }
    if (adminUi.openTicketCount === 0 && view !== 'admin-support' && view !== 'admin-overview') {
      fetchAdminSupportTickets({ status: 'open' }).then((res) => {
        const count = Number(res?.summary?.open_count || 0);
        if (count !== adminUi.openTicketCount) {
          adminUi.openTicketCount = count;
          const navItem = document.querySelector('.admin-nav-link[data-view="admin-support"]');
          const badge = navItem?.querySelector('.admin-nav-badge');
          if (count > 0) {
            if (badge) badge.textContent = count > 99 ? '99+' : String(count);
            else if (navItem) navItem.insertAdjacentHTML('beforeend', `<span class="admin-nav-badge">${count > 99 ? '99+' : count}</span>`);
          } else if (badge) {
            badge.remove();
          }
        }
      }).catch(() => {});
    }
  } catch (error) {
    adminUi.error = error;
  } finally {
    adminUi.loading = false;
  }
  return adminUi.error;
}

function number(value) { return new Intl.NumberFormat('vi-VN').format(Number(value || 0)); }

function dateLabel(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.valueOf())) return '—';
  return new Intl.DateTimeFormat('vi-VN', options).format(date);
}

function monthLabel(value) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function statusLabel(status) {
  return ({ active: 'Hoạt động', pending_email: 'Chờ xác minh', disabled: 'Đã khóa' })[status] || status;
}

function statusClass(status) {
  return ({ active: 'is-active', pending_email: 'is-pending', disabled: 'is-disabled' })[status] || '';
}

function actionLabel(action) {
  return ({
    'user.status_changed': 'Cập nhật trạng thái tài khoản',
    'user.role_changed': 'Cập nhật vai trò tài khoản',
    'user.sessions_revoked': 'Thu hồi phiên đăng nhập',
    'user.unverified_purged': 'Dọn dẹp tài khoản chưa xác minh',
    'announcement.created': 'Tạo thông báo hệ thống',
    'announcement.updated': 'Cập nhật thông báo hệ thống',
    'announcement.deleted': 'Xóa thông báo hệ thống',
    'settings.updated': 'Cập nhật cấu hình hệ thống',
    'template_category.created': 'Thêm danh mục mẫu',
    'template_category.updated': 'Cập nhật danh mục mẫu',
    'support_ticket.updated': 'Xử lý phiếu hỗ trợ'
  })[action] || 'Hoạt động quản trị';
}

function auditChange(log) {
  if (log.action === 'user.status_changed') return `${statusLabel(log.oldStatus)} → ${statusLabel(log.newStatus)}`;
  if (log.action === 'user.role_changed') return `${log.oldRole === 'admin' ? 'Admin' : 'User'} → ${log.newRole === 'admin' ? 'Admin' : 'User'}`;
  return log.summary || '—';
}

function pageHeading(title, description, actions = '') {
  return `<div class="admin-page-heading"><div><p class="admin-eyebrow">Ví Mình / Quản trị</p><h1>${title}</h1><p class="admin-page-description">${description}</p></div><div class="admin-heading-actions">${actions}</div></div>`;
}

function statCard(label, value, note, iconName, tone = '') {
  const formatted = typeof value === 'string' ? escapeHtml(value) : number(value);
  return `<article class="admin-card admin-stat-card ${tone}"><div class="admin-stat-top"><span>${label}</span><span class="admin-stat-icon" aria-hidden="true">${icon(iconName, 16)}</span></div><strong>${formatted}</strong><small>${note}</small></article>`;
}

function errorPanel() {
  if (!adminUi.error) return '';
  const access = adminUi.error.status === 401 || adminUi.error.status === 403;
  return `<section class="admin-card admin-error" role="alert"><span class="admin-error-icon" aria-hidden="true">${icon('alert', 16)}</span><div><h2>${access ? 'Không thể mở khu vực quản trị' : 'Chưa tải được dữ liệu'}</h2><p>${escapeHtml(adminUi.error.message || 'Máy chủ chưa phản hồi. Hãy thử lại.')}</p><button class="admin-button admin-button-secondary" data-action="admin-retry">Thử lại</button></div></section>`;
}

function loadingBlock(label = 'Đang tải dữ liệu…') {
  return `<div class="admin-loading" role="status"><span class="admin-spinner" aria-hidden="true"></span>${label}</div>`;
}

function emptyBlock(title, description) {
  return `<div class="admin-empty"><span class="admin-empty-icon" aria-hidden="true">${icon('search', 19)}</span><h3>${title}</h3><p>${description}</p></div>`;
}

function trendChart(rows) {
  if (!rows?.length || rows.every((row) => Number(row.count) === 0)) {
    return emptyBlock('Chưa có lượt đăng ký trong kỳ này', 'Khi có tài khoản mới, xu hướng theo tháng sẽ xuất hiện tại đây.');
  }
  const width = 620;
  const height = 220;
  const left = 38;
  const right = 32;
  const top = 20;
  const bottom = 34;
  const max = Math.max(1, ...rows.map((row) => Number(row.count)));
  const points = rows.map((row, index) => ({
    x: left + index * (width - left - right) / Math.max(1, rows.length - 1),
    y: top + (height - top - bottom) * (1 - Number(row.count) / max),
    row
  }));
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  const fillPath = `${left},${height - bottom} ${path} ${width - right},${height - bottom}`;
  const guides = [0, 0.5, 1].map((fraction) => {
    const y = top + (height - top - bottom) * fraction;
    const tick = Math.round(max * (1 - fraction));
    return `<g><line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="admin-chart-grid"/><text x="${left - 10}" y="${y + 4}" text-anchor="end" class="admin-chart-tick">${tick}</text></g>`;
  }).join('');
  return `<div class="admin-chart-scroll"><svg class="admin-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Số lượt đăng ký theo tháng">${guides}<polygon points="${fillPath}" class="admin-chart-area"/><polyline points="${path}" class="admin-chart-line"/>${points.map(({ x, y, row }) => `<g><circle cx="${x}" cy="${y}" r="4.5" class="admin-chart-dot"><title>${monthLabel(row.month)}: ${number(row.count)} tài khoản</title></circle><text x="${x}" y="${height - 9}" text-anchor="middle" class="admin-chart-label">${monthLabel(row.month)}</text></g>`).join('')}</svg></div>`;
}

function accountDistribution(counts = {}) {
  const items = [
    { key: 'active', label: 'Đang hoạt động', value: Number(counts.active || 0), color: 'var(--blue-600)' },
    { key: 'pending', label: 'Chờ xác minh', value: Number(counts.pending || 0), color: 'var(--amber-500)' },
    { key: 'disabled', label: 'Đã khóa', value: Number(counts.disabled || 0), color: 'var(--coral-600)' }
  ];
  const total = Number(counts.total || 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const rings = items.map((item) => {
    const length = total ? item.value / total * circumference : 0;
    const circle = `<circle cx="70" cy="70" r="${radius}" fill="none" stroke="${item.color}" stroke-width="15" stroke-dasharray="${length} ${Math.max(0, circumference - length)}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"/>`;
    offset += length;
    return circle;
  }).join('');
  return `<div class="admin-distribution"><svg viewBox="0 0 140 140" role="img" aria-label="Phân bố trạng thái tài khoản"><circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--ink-100)" stroke-width="15"/>${rings}<text x="70" y="67" class="admin-donut-total">${number(total)}</text><text x="70" y="84" class="admin-donut-caption">tài khoản</text></svg><div class="admin-legend">${items.map((item) => `<div><span class="admin-legend-name"><i style="--legend-color:${item.color}"></i>${item.label}</span><strong>${number(item.value)} <small>${total ? `${Math.round(item.value / total * 100)}%` : '0%'}</small></strong></div>`).join('')}</div></div>`;
}

function recentActivity(rows) {
  if (!rows?.length) return emptyBlock('Chưa có hoạt động quản trị', 'Các thay đổi tài khoản sẽ được ghi lại tại đây.');
  return `<div class="admin-activity-list">${rows.map((row) => `<div class="admin-activity-row"><span class="admin-activity-marker" aria-hidden="true">${icon(row.action === 'user.role_changed' ? 'shield' : 'refresh', 13)}</span><div><strong>${escapeHtml(actionLabel(row.action))}</strong><p>${escapeHtml(row.actorName)} · ${escapeHtml(row.summary || `${row.targetName} (${row.targetEmailMasked})`)}</p></div><time>${dateLabel(row.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>`).join('')}</div>`;
}

function serviceRow(label, status, description, iconName = 'database') {
  const available = status === 'available';
  return `<div class="admin-service-row"><span class="admin-service-icon" aria-hidden="true">${icon(iconName, 16)}</span><div><strong>${label}</strong><small>${description}</small></div><span class="admin-service-status ${available ? 'is-ready' : 'is-unavailable'}"><i></i>${available ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span></div>`;
}

function periodControl() {
  const options = [['30-days', '30 ngày'], ['90-days', '90 ngày'], ['six-months', '6 tháng gần nhất'], ['custom', 'Tùy chỉnh']];
  return `<div class="admin-period-select"><select aria-label="Khoảng thời gian thống kê" data-admin-period>${options.map(([value, title]) => `<option value="${value}" ${adminUi.period === value ? 'selected' : ''}>${title}</option>`).join('')}</select></div>`;
}

function customRange() {
  if (adminUi.period !== 'custom') return '';
  return `<div class="admin-custom-range"><label>Từ ngày<input type="date" data-admin-date="from" value="${escapeHtml(adminUi.from)}"></label><label>Đến ngày<input type="date" data-admin-date="to" value="${escapeHtml(adminUi.to)}"></label>${adminUi.dateError ? `<span class="admin-range-error" role="alert">${escapeHtml(adminUi.dateError)}</span>` : ''}</div>`;
}

function overviewPage() {
  const data = adminUi.overview;
  const counts = data?.counts || {};
  const quick = data?.quickStats || {};
  const actions = `${periodControl()}<button class="admin-button admin-button-secondary" data-action="admin-refresh" aria-label="Làm mới tổng quan">${icon('refresh', 16)}<span>Làm mới</span></button>`;
  return `${pageHeading('Tổng quan Admin', 'Theo dõi hoạt động hệ thống bằng số liệu tổng hợp, không xem chi tiết tài chính cá nhân.', actions)}${customRange()}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-stat-grid">
      ${statCard('Tổng tài khoản', counts.total, 'Tất cả tài khoản đã đăng ký', 'users')}
      ${statCard('Đang hoạt động', counts.active, `24h qua: ${number(quick.dau || 0)} phiên`, 'check', 'tone-blue')}
      ${statCard('Chờ xác minh email', counts.pending, 'Chưa hoàn tất xác minh OTP', 'mail', 'tone-amber')}
      ${statCard('Giao dịch trong kỳ', data.transactionCount, `${dateLabel(data.period.from)} – ${dateLabel(data.period.to)} (chỉ đếm lượt)`, 'chart', 'tone-slate')}
    </section>
    <section class="admin-quick-strip">
      <button type="button" class="admin-quick-pill" data-action="navigate" data-view="admin-analytics">${icon('chart', 15)}<span>Phân tích hoạt động & tính năng</span>${icon('arrowRight', 13)}</button>
      <button type="button" class="admin-quick-pill" data-action="navigate" data-view="admin-verification">${icon('mail', 15)}<span>Hàng đợi OTP (${number(counts.pending)})</span>${icon('arrowRight', 13)}</button>
      <button type="button" class="admin-quick-pill" data-action="navigate" data-view="admin-security">${icon('shield', 15)}<span>Cảnh báo bảo mật 24h (${number(quick.security_alerts_24h)})</span>${icon('arrowRight', 13)}</button>
      <button type="button" class="admin-quick-pill" data-action="navigate" data-view="admin-support">${icon('help', 15)}<span>Phiếu hỗ trợ mở (${number(quick.open_tickets)})</span>${icon('arrowRight', 13)}</button>
    </section>
    <section class="admin-overview-grid">
      <article class="admin-card admin-chart-card"><div class="admin-card-heading"><div><h2>Tăng trưởng người dùng</h2><p>Số tài khoản đăng ký trong từng tháng</p></div><span class="admin-range-chip">${escapeHtml(adminUi.period === 'custom' ? `${data.period.from} — ${data.period.to}` : 'Theo tháng')}</span></div>${trendChart(data.signupTrend)}</article>
      <article class="admin-card admin-status-card"><div class="admin-card-heading"><div><h2>Tình trạng tài khoản</h2><p>Phân bố hiện tại</p></div></div>${accountDistribution(counts)}</article>
      <article class="admin-card admin-activity-card"><div class="admin-card-heading"><div><h2>Hoạt động quản trị gần đây</h2><p>Lịch sử thay đổi trạng thái, vai trò và vận hành</p></div><button class="admin-text-button" data-action="navigate" data-view="admin-audit">Xem nhật ký ${icon('arrowRight', 14)}</button></div>${recentActivity(data.recentActivity)}</article>
      <article class="admin-card admin-service-card"><div class="admin-card-heading"><div><h2>Trạng thái dịch vụ</h2><p>Kiểm tra kết nối ở thời điểm hiện tại</p></div><button class="admin-text-button" data-action="navigate" data-view="admin-health">Chi tiết ${icon('arrowRight', 14)}</button></div>
        ${serviceRow('API Server', data.services.api, 'Ứng dụng và các endpoint', 'api')}
        ${serviceRow('PostgreSQL', data.services.database, 'Cơ sở dữ liệu hệ thống', 'database')}
        ${serviceRow('SMTP Mailer', data.services.smtp, 'Gửi OTP xác minh & đặt lại mật khẩu', 'mail')}
        ${serviceRow('SePay Bank Hub', data.services.bankHub, 'Tích hợp Hosted Link Sandbox', 'bank')}
      </article>
    </section>` : ''}`;
}

function dailyActivityChart(series = []) {
  if (!series.length) return emptyBlock('Chưa có dữ liệu phiên hoạt động', 'Dữ liệu phiên hoạt động 14 ngày gần nhất sẽ hiển thị tại đây.');
  const width = 580;
  const height = 185;
  const left = 32;
  const right = 20;
  const top = 18;
  const bottom = 30;
  const max = Math.max(1, ...series.map((r) => Number(r.count || 0)));
  const barWidth = Math.max(12, Math.floor((width - left - right) / series.length) - 8);
  const step = (width - left - right) / Math.max(1, series.length);
  return `<div class="admin-chart-scroll"><svg class="admin-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Người dùng hoạt động 14 ngày gần nhất">
    ${[0, 0.5, 1].map((f) => {
      const y = top + (height - top - bottom) * f;
      const val = Math.round(max * (1 - f));
      return `<g><line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="admin-chart-grid"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" class="admin-chart-tick">${val}</text></g>`;
    }).join('')}
    ${series.map((row, idx) => {
      const count = Number(row.count || 0);
      const h = Math.max(3, ((height - top - bottom) * count) / max);
      const x = left + idx * step + (step - barWidth) / 2;
      const y = height - bottom - h;
      const label = row.day.slice(8, 10) + '/' + row.day.slice(5, 7);
      return `<g><rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="4" fill="var(--blue-600)" opacity="${count ? '0.9' : '0.2'}"><title>${row.day}: ${count} người dùng hoạt động</title></rect>${idx % 2 === 0 ? `<text x="${x + barWidth / 2}" y="${height - 8}" text-anchor="middle" class="admin-chart-label">${label}</text>` : ''}</g>`;
    }).join('')}
  </svg></div>`;
}

function transactionVolumeChart(rows = []) {
  if (!rows.length) return emptyBlock('Chưa có lượt giao dịch', 'Số lượng bản ghi thu/chi theo tháng sẽ hiển thị tại đây.');
  const width = 580;
  const height = 185;
  const left = 36;
  const right = 20;
  const top = 18;
  const bottom = 30;
  const max = Math.max(1, ...rows.map((r) => Math.max(Number(r.income_count || 0), Number(r.expense_count || 0), Number(r.total_count || 0))));
  const step = (width - left - right) / Math.max(1, rows.length);
  const barW = Math.max(10, Math.min(22, Math.floor(step / 3)));
  return `<div class="admin-chart-scroll"><svg class="admin-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Lưu lượng bản ghi giao dịch theo tháng">
    ${[0, 0.5, 1].map((f) => {
      const y = top + (height - top - bottom) * f;
      const val = Math.round(max * (1 - f));
      return `<g><line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="admin-chart-grid"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" class="admin-chart-tick">${val}</text></g>`;
    }).join('')}
    ${rows.map((row, idx) => {
      const inc = Number(row.income_count || 0);
      const exp = Number(row.expense_count || 0);
      const hInc = Math.max(3, ((height - top - bottom) * inc) / max);
      const hExp = Math.max(3, ((height - top - bottom) * exp) / max);
      const cx = left + idx * step + step / 2;
      return `<g>
        <rect x="${cx - barW - 2}" y="${height - bottom - hInc}" width="${barW}" height="${hInc}" rx="3" fill="var(--blue-600)"><title>${monthLabel(row.month)} · Khoản thu: ${inc} lượt</title></rect>
        <rect x="${cx + 2}" y="${height - bottom - hExp}" width="${barW}" height="${hExp}" rx="3" fill="var(--coral-600)"><title>${monthLabel(row.month)} · Khoản chi: ${exp} lượt</title></rect>
        <text x="${cx}" y="${height - 8}" text-anchor="middle" class="admin-chart-label">${monthLabel(row.month)}</text>
      </g>`;
    }).join('')}
  </svg></div>`;
}

// Group A1, A2, A3, A5 Page
function analyticsPage() {
  const data = adminUi.analytics;
  const act = data?.activity || {};
  const adopt = data?.adoption || { activeUsers: 0, features: [] };
  const funnel = data?.bankHubFunnel || {};
  const legal = data?.legalCompliance || {};
  const actions = `${periodControl()}<button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Làm mới</span></button>`;

  return `${pageHeading('Hoạt động & Phân tích', 'Thống kê tỷ lệ sử dụng tính năng, lưu lượng bản ghi và tuân thủ pháp lý — tuyệt đối không truy xuất số tiền cá nhân.', actions)}${customRange()}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-overview-grid">
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Người dùng hoạt động 14 ngày qua</h2><p>Đếm từ bảng sessions.last_seen_at</p></div><span class="admin-range-chip">14 ngày</span></div>
        ${dailyActivityChart(act.dailySeries)}
      </article>
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Tỷ lệ sử dụng tính năng</h2><p>Trên tổng số ${number(adopt.activeUsers)} tài khoản đang hoạt động</p></div></div>
        <div class="admin-adoption-list">
          ${adopt.features.map((f) => {
            const pct = adopt.activeUsers ? Math.min(100, Math.round((f.users / adopt.activeUsers) * 100)) : 0;
            return `<div class="admin-adoption-row">
              <div class="admin-adoption-head"><strong>${escapeHtml(f.label)}</strong><span>${number(f.users)} người dùng · ${number(f.records)} bản ghi (${pct}%)</span></div>
              <div class="admin-progress-track"><div class="admin-progress-fill" style="width:${pct}%"></div></div>
            </div>`;
          }).join('')}
        </div>
      </article>
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Lưu lượng bản ghi thu/chi theo tháng</h2><p>Chỉ đếm số lượng giao dịch (Xanh: Thu · Cam: Chi)</p></div></div>
        ${transactionVolumeChart(data.transactionVolumeTrend)}
      </article>
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Phễu SePay Bank Hub & Đồng thuận pháp lý</h2><p>Giám sát chuyển đổi liên kết ngân hàng và điều khoản</p></div></div>
        <div class="admin-kv-grid">
          <div class="admin-kv-box"><small>Lượt tạo link Bank Hub</small><strong>${number(funnel.total_attempts)}</strong><span>Đã mở: ${number(funnel.launched_count)} · Thành công: ${number(funnel.linked_count)}</span></div>
          <div class="admin-kv-box"><small>Kết nối đang hoạt động</small><strong>${number(funnel.active_connections)}</strong><span>Hết hạn/Hủy: ${number(funnel.failed_or_expired_count)}</span></div>
          <div class="admin-kv-box"><small>Điều khoản v${escapeHtml(legal.termsVersion)}</small><strong>${number(legal.terms_current_users)}</strong><span>Người dùng đã đồng thuận</span></div>
          <div class="admin-kv-box"><small>Quyền riêng tư v${escapeHtml(legal.privacyVersion)}</small><strong>${number(legal.privacy_current_users)}</strong><span>Lượt đồng thuận Bank Hub: ${number(legal.bank_consent_events)}</span></div>
        </div>
      </article>
    </section>
  ` : ''}`;
}

// Group A4 & B7: Verification Queue & Unverified Purge
function verificationPage() {
  const data = adminUi.verificationQueue;
  const summary = data?.summary || {};
  const queue = data?.queue || [];
  const actions = `<button class="admin-button admin-button-danger" data-action="admin-purge-unverified" ${adminUi.purgingQueue ? 'disabled' : ''}>${icon('trash', 15)}<span>${adminUi.purgingQueue ? 'Đang dọn dẹp…' : 'Dọn tài khoản chờ > 7 ngày'}</span></button><button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Làm mới</span></button>`;

  const otpBadge = (state, attempts) => {
    if (state === 'active') return `<span class="admin-status-badge is-active"><i></i>Còn hạn (${attempts}/5 lần thử)</span>`;
    if (state === 'locked') return `<span class="admin-status-badge is-disabled"><i></i>Khóa OTP (5/5 lần sai)</span>`;
    if (state === 'expired') return `<span class="admin-status-badge is-pending"><i></i>Đã hết hạn (${attempts}/5)</span>`;
    return `<span class="admin-status-badge">Chưa có mã</span>`;
  };

  return `${pageHeading('Hàng đợi xác minh OTP', 'Theo dõi các tài khoản đang chờ xác minh email (pending_email), tình trạng mã OTP và dọn dẹp tài khoản rác quá hạn.', actions)}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-stat-grid">
      ${statCard('Đang chờ xác minh', summary.pending_accounts, 'Trạng thái pending_email', 'mail', 'tone-amber')}
      ${statCard('Quá hạn > 7 ngày', summary.stale_over_7d, 'Có thể dọn dẹp an toàn', 'alert')}
      ${statCard('Mã OTP đang hiệu lực', summary.active_otps, `Bị khóa 5 lần sai: ${number(summary.locked_otps)}`, 'check', 'tone-blue')}
      ${statCard('Yêu cầu đổi email', summary.pending_email_changes, 'Đang chờ xác nhận mã 6 số', 'users', 'tone-slate')}
    </section>
    <section class="admin-card admin-directory-card">
      <div class="admin-card-heading"><div><h2>Danh sách tài khoản chờ xác minh email</h2><p>Không hiển thị mã OTP hoặc token thô. Quy trình dọn dẹp chỉ xóa tài khoản pending_email chưa có giao dịch.</p></div></div>
      ${queue.length ? `<div class="admin-table-wrap"><table class="admin-user-table"><thead><tr><th>Tài khoản</th><th>Ngày đăng ký</th><th>Thời gian chờ</th><th>Trạng thái OTP gần nhất</th><th>Thao tác</th></tr></thead><tbody>
        ${queue.map((item) => `<tr>
          <td><div class="admin-user-cell"><span class="admin-avatar">${escapeHtml(initials(item.fullName))}</span><span><strong>${escapeHtml(item.fullName)}</strong><small>${escapeHtml(item.emailMasked)}</small></span></div></td>
          <td>${dateLabel(item.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td>${item.ageDays > 0 ? `${item.ageDays} ngày` : 'Hôm nay'}</td>
          <td>${otpBadge(item.otpState, item.otpAttempts)}</td>
          <td><button class="admin-row-action" data-action="admin-view-user" data-id="${item.id}">Chi tiết</button></td>
        </tr>`).join('')}
      </tbody></table></div>` : emptyBlock('Không có tài khoản nào đang chờ xác minh', 'Tất cả người dùng đăng ký đều đã hoàn tất xác minh email.')}
    </section>
  ` : ''}`;
}

// Group B2: Security Events Monitor
function securityPage() {
  const data = adminUi.securityEvents;
  const summary = data?.summary || {};
  const events = data?.events || [];
  const filterOptions = [
    ['all', 'Tất cả sự kiện'],
    ['login_failed', 'Đăng nhập thất bại'],
    ['login_succeeded', 'Đăng nhập thành công'],
    ['otp_failed', 'Nhập sai OTP'],
    ['otp_locked', 'Khóa OTP (5 lần sai)'],
    ['password_reset_requested', 'Yêu cầu đặt lại mật khẩu'],
    ['rate_limited', 'Chặn giới hạn tần suất (429)']
  ];
  const eventBadge = (type) => {
    const map = {
      login_failed: ['Đăng nhập thất bại', 'is-disabled'],
      login_succeeded: ['Đăng nhập thành công', 'is-active'],
      otp_failed: ['Sai mã OTP', 'is-pending'],
      otp_locked: ['Khóa mã OTP', 'is-disabled'],
      password_reset_requested: ['Yêu cầu khôi phục MK', 'is-pending'],
      rate_limited: ['Rate Limited (429)', 'is-disabled']
    };
    const [label, cls] = map[type] || [type, ''];
    return `<span class="admin-status-badge ${cls}"><i></i>${label}</span>`;
  };

  return `${pageHeading('An ninh đăng nhập & Tần suất (B2)', 'Giám sát sự kiện xác thực và giới hạn tần suất 24h qua. Địa chỉ IP được băm ẩn danh một chiều theo ngày (HMAC Bucket).', `<button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Làm mới</span></button>`)}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-stat-grid">
      ${statCard('Đăng nhập sai (24h)', summary.login_failed_24h, 'Sai email hoặc mật khẩu', 'alert', 'tone-amber')}
      ${statCard('Sai / Khóa OTP (24h)', summary.otp_failed_24h, 'Nhập sai mã xác minh 6 số', 'lock')}
      ${statCard('Chặn Rate Limit (24h)', summary.rate_limited_24h, 'Vượt ngưỡng yêu cầu API', 'shield', 'tone-blue')}
      ${statCard('IP Bucket cảnh báo (24h)', summary.distinct_flagged_buckets_24h, `Khôi phục MK: ${number(summary.password_reset_24h)}`, 'users', 'tone-slate')}
    </section>
    <section class="admin-card admin-directory-card">
      <div class="admin-card-heading">
        <div><h2>Nhật ký sự kiện bảo mật</h2><p>Không lưu mật khẩu, OTP hay địa chỉ IP thô</p></div>
        <div class="admin-filter"><select data-admin-security-filter="eventType" aria-label="Lọc loại sự kiện bảo mật">${filterOptions.map(([val, label]) => `<option value="${val}" ${adminUi.securityFilters.eventType === val ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
      </div>
      ${events.length ? `<div class="admin-table-wrap"><table class="admin-user-table"><thead><tr><th>Thời gian</th><th>Sự kiện</th><th>Email (Đã che)</th><th>IP Bucket (HMAC ngày)</th><th>Endpoint</th></tr></thead><tbody>
        ${events.map((ev) => `<tr>
          <td>${dateLabel(ev.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td>${eventBadge(ev.eventType)}</td>
          <td><strong>${escapeHtml(ev.emailMasked)}</strong></td>
          <td><code>${escapeHtml(ev.ipBucketShort)}</code></td>
          <td><code>${escapeHtml(ev.routePath)}</code></td>
        </tr>`).join('')}
      </tbody></table></div>${pagination(data.pagination, 'admin-security')}` : emptyBlock('Chưa có sự kiện bảo mật phù hợp', 'Các sự kiện đăng nhập, OTP và giới hạn tần suất sẽ xuất hiện tại đây.')}
    </section>
  ` : ''}`;
}

// Group B5: Support Tickets & Feedback Inbox
function supportPage() {
  const data = adminUi.supportTickets;
  const summary = data?.summary || {};
  const tickets = data?.tickets || [];
  const topicLabel = (t) => ({ bug: 'Báo lỗi kỹ thuật', account: 'Hỗ trợ tài khoản', feature: 'Góp ý tính năng', other: 'Khác' })[t] || t;
  const ticketBadge = (s) => ({
    open: '<span class="admin-status-badge is-pending"><i></i>Mới tiếp nhận</span>',
    in_progress: '<span class="admin-status-badge is-active"><i></i>Đang xử lý</span>',
    resolved: '<span class="admin-status-badge"><i></i>Đã giải quyết</span>'
  })[s] || s;

  return `${pageHeading('Hộp thư hỗ trợ & Phản hồi (B5)', 'Tiếp nhận và phản hồi yêu cầu hỗ trợ kỹ thuật của người dùng mà không truy cập dữ liệu tài chính cá nhân.', `<button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Làm mới</span></button>`)}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-stat-grid">
      ${statCard('Tổng phiếu hỗ trợ', summary.total, 'Tất cả yêu cầu đã gửi', 'mail')}
      ${statCard('Mới tiếp nhận', summary.open_count, 'Cần phản hồi', 'alert', 'tone-amber')}
      ${statCard('Đang xử lý', summary.in_progress_count, 'Admin đang theo dõi', 'refresh', 'tone-blue')}
      ${statCard('Đã giải quyết', summary.resolved_count, 'Hoàn tất hỗ trợ', 'check', 'tone-slate')}
    </section>
    <section class="admin-card admin-directory-card">
      <div class="admin-card-heading">
        <div><h2>Danh sách yêu cầu hỗ trợ</h2><p>Chọn trạng thái để lọc hoặc cập nhật ghi chú phản hồi cho người dùng</p></div>
        <div class="admin-filter"><select data-admin-ticket-filter="status" aria-label="Lọc trạng thái phiếu hỗ trợ">
          <option value="all" ${adminUi.ticketFilter === 'all' ? 'selected' : ''}>Tất cả trạng thái</option>
          <option value="open" ${adminUi.ticketFilter === 'open' ? 'selected' : ''}>Mới tiếp nhận</option>
          <option value="in_progress" ${adminUi.ticketFilter === 'in_progress' ? 'selected' : ''}>Đang xử lý</option>
          <option value="resolved" ${adminUi.ticketFilter === 'resolved' ? 'selected' : ''}>Đã giải quyết</option>
        </select></div>
      </div>
      ${tickets.length ? `<div class="admin-ticket-list">
        ${tickets.map((t) => `<article class="admin-ticket-card">
          <header class="admin-ticket-header">
            <div>
              <div class="admin-ticket-badges">
                <span class="admin-role-badge">${escapeHtml(topicLabel(t.topic))}</span>
                ${ticketBadge(t.status)}
              </div>
              <h3 class="admin-ticket-subject">${escapeHtml(t.subject)}</h3>
              <p class="admin-ticket-meta">${escapeHtml(t.userName)} (${escapeHtml(t.userEmailMasked)}) · ${dateLabel(t.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </header>
          <div class="admin-ticket-content">
            <span class="admin-ticket-content-label">Nội dung yêu cầu từ người dùng:</span>
            <p class="admin-ticket-message">${escapeHtml(t.message)}</p>
          </div>
          <form class="admin-ticket-form" data-form="admin-support-ticket" data-id="${escapeHtml(t.id)}">
            <div class="admin-ticket-form-header">
              <span class="admin-ticket-form-title">${icon('mail', 15)} Phản hồi & cập nhật tiến độ</span>
            </div>
            <label class="admin-ticket-field">
              <span class="admin-field-caption">Ghi chú phản hồi cho người dùng</span>
              <textarea name="adminNote" maxlength="500" rows="3" placeholder="Nhập ghi chú phản hồi giải quyết hoặc cập nhật tiến độ xử lý cho người dùng…">${escapeHtml(t.adminNote)}</textarea>
            </label>
            <div class="admin-ticket-controls">
              <label class="admin-ticket-status-select">
                <span class="admin-field-caption">Trạng thái xử lý</span>
                <select name="status" aria-label="Trạng thái xử lý">
                  <option value="open" ${t.status === 'open' ? 'selected' : ''}>Mới tiếp nhận</option>
                  <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>Đang xử lý</option>
                  <option value="resolved" ${t.status === 'resolved' ? 'selected' : ''}>Đã giải quyết</option>
                </select>
              </label>
              <button type="submit" class="admin-button admin-button-primary">
                ${icon('check', 15)}
                <span>Lưu xử lý</span>
              </button>
            </div>
          </form>
        </article>`).join('')}
      </div>` : emptyBlock('Chưa có phiếu hỗ trợ nào', 'Các yêu cầu hỗ trợ gửi từ mục Trợ giúp của người dùng sẽ hiển thị tại đây.')}
    </section>
  ` : ''}`;
}

// Group B3: System Announcements (Broadcast Banner)
function announcementsPage() {
  const list = adminUi.announcements || [];
  return `${pageHeading('Thông báo hệ thống (B3)', 'Tạo và quản lý biểu ngữ thông báo bảo trì hoặc cập nhật tính năng hiển thị trên khu vực cá nhân của người dùng.', `<button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Làm mới</span></button>`)}${errorPanel()}
    <section class="admin-overview-grid">
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Đăng thông báo mới</h2><p>Hiển thị ngay trên đầu giao diện người dùng nếu đang bật</p></div></div>
        <form class="admin-stack-form" data-form="admin-announcement">
          <label>Tiêu đề thông báo *<input type="text" name="title" required maxlength="140" placeholder="Ví dụ: Bảo trì nâng cấp kết nối SePay lúc 23:00"></label>
          <label>Nội dung chi tiết *<textarea name="body" required maxlength="600" rows="3" placeholder="Mô tả ngắn gọn lịch bảo trì hoặc hướng dẫn cho người dùng…"></textarea></label>
          <div class="admin-form-row">
            <label>Mức độ hiển thị<select name="severity"><option value="info">Thông tin (Xanh nhẹ)</option><option value="warn">Cảnh báo / Bảo trì (Vàng cam)</option></select></label>
            <label>Ngày kết thúc (tùy chọn)<input type="date" name="endsAt" min="${today()}"></label>
          </div>
          <button type="submit" class="admin-button admin-button-primary" ${adminUi.savingAnnouncement ? 'disabled' : ''}>${icon('plus', 15)}<span>${adminUi.savingAnnouncement ? 'Đang đăng…' : 'Đăng thông báo'}</span></button>
        </form>
      </article>
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Danh sách thông báo (${number(list.length)})</h2><p>Có thể tạm tắt hoặc xóa thông báo bất kỳ lúc nào</p></div></div>
        ${adminUi.loading && !list.length ? loadingBlock() : list.length ? `<div class="admin-announcement-list">
          ${list.map((item) => `<div class="admin-announcement-item ${item.isActive ? 'is-active' : ''}">
            <div>
              <div class="admin-announcement-top">
                <span class="admin-status-badge ${item.isActive ? 'is-active' : ''}"><i></i>${item.isActive ? 'Đang hiển thị' : 'Đã tắt'}</span>
                <span class="admin-role-badge">${item.severity === 'warn' ? 'CẢNH BÁO' : 'THÔNG TIN'}</span>
              </div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.body)}</p>
              <small>Tạo bởi ${escapeHtml(item.authorName)} · ${dateLabel(item.createdAt)}${item.endsAt ? ` · Hết hạn ${dateLabel(item.endsAt)}` : ''}</small>
            </div>
            <div class="admin-user-actions">
              <button type="button" class="admin-row-action" data-action="admin-toggle-announcement" data-id="${item.id}" data-active="${!item.isActive}">${item.isActive ? 'Tắt' : 'Bật'}</button>
              <button type="button" class="admin-row-action is-danger" data-action="admin-delete-announcement" data-id="${item.id}">Xóa</button>
            </div>
          </div>`).join('')}
        </div>` : emptyBlock('Chưa có thông báo hệ thống', 'Tạo thông báo đầu tiên ở biểu mẫu bên trái.')}
      </article>
    </section>`;
}

// Group B4 & B6: App Settings (Feature Flags) & Default Category Templates
function settingsAndTemplatesPage() {
  const data = adminUi.settingsData;
  const settings = data?.settings || [];
  const templates = data?.templates || [];
  const settingTitle = (key) => ({
    maintenance_mode: 'Chế độ bảo trì hệ thống (Maintenance Mode)',
    allow_registration: 'Cho phép đăng ký tài khoản mới',
    enable_ocr_scanner: 'Tính năng quét hóa đơn OCR trên thiết bị',
    enable_ai_coach: 'Trợ lý tài chính AI Coach cá nhân',
    enable_bank_hub: 'Kết nối ngân hàng SePay Bank Hub Sandbox'
  })[key] || key;

  return `${pageHeading('Cấu hình & Danh mục mẫu', 'Quản lý cờ tính năng toàn cục (Feature Flags) và bộ danh mục mặc định tự động tạo cho tài khoản mới.', `<button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Làm mới</span></button>`)}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-overview-grid">
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Cờ tính năng hệ thống (Feature Flags)</h2><p>Áp dụng tức thì cho toàn bộ người dùng thông qua /api/bootstrap</p></div></div>
        <div class="admin-settings-list">
          ${settings.map((item) => `<div class="admin-setting-row">
            <div>
              <strong>${escapeHtml(settingTitle(item.key))}</strong>
              <p>${escapeHtml(item.description)}</p>
              <small>Mã khóa: <code>${escapeHtml(item.key)}</code> · Cập nhật ${dateLabel(item.updatedAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
            </div>
            <button type="button" class="admin-button ${item.enabled ? 'admin-button-primary' : 'admin-button-secondary'}\" data-action=\"admin-toggle-setting\" data-key=\"${escapeHtml(item.key)}\" data-enabled=\"${!item.enabled}\" ${adminUi.savingSettingKey === item.key ? 'disabled' : ''}>
              ${item.enabled ? 'Đang bật' : 'Đang tắt'}
            </button>
          </div>`).join('')}
        </div>
      </article>
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Thêm danh mục mẫu mặc định</h2><p>Tự động khởi tạo khi người dùng mới xác minh email thành công</p></div></div>
        <form class="admin-stack-form" data-form="admin-category-template">
          <div class="admin-form-row">
            <label>Tên danh mục mẫu *<input type="text" name="name" required maxlength="60" placeholder="Ví dụ: Bảo hiểm, Thú cưng…"></label>
            <label>Loại thu/chi<select name="kind"><option value="expense">Khoản chi</option><option value="income">Khoản thu</option></select></label>
            <label>Màu sắc<input type="color" name="color" value="#2563EB"></label>
          </div>
          <button type="submit" class="admin-button admin-button-primary" ${adminUi.savingTemplate ? 'disabled' : ''}>${icon('plus', 15)}<span>Thêm vào bộ mẫu</span></button>
        </form>
        <div class="admin-template-list">
          ${templates.map((tpl) => `<div class="admin-template-chip ${tpl.isEnabled ? '' : 'is-muted'}">
            <span class="admin-template-dot" style="background:${escapeHtml(tpl.color)}"></span>
            <div><strong>${escapeHtml(tpl.name)}</strong><small>${tpl.kind === 'income' ? 'Khoản thu' : 'Khoản chi'}</small></div>
            <button type="button" class="admin-row-action" data-action="admin-toggle-template" data-id="${tpl.id}" data-enabled="${!tpl.isEnabled}">${tpl.isEnabled ? 'Đang dùng' : 'Đã ẩn'}</button>
          </div>`).join('')}
        </div>
      </article>
    </section>
  ` : ''}`;
}

// Detailed System Health & Schema Migrations
function healthPage() {
  const data = adminUi.healthDetailed;
  const runtime = data?.runtime || {};
  const services = data?.services || [];
  const migrations = data?.migrations || [];
  const hygiene = data?.tokenHygiene || {};
  const formatUptime = (sec = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h} giờ ${m} phút`;
  };

  return `${pageHeading('Sức khỏe hệ thống & Migrations', 'Kiểm tra độ trễ PostgreSQL, cấu hình dịch vụ tích hợp, vệ sinh token hết hạn và lịch sử phiên bản schema_migrations.', `<button class="admin-button admin-button-secondary" data-action="admin-refresh">${icon('refresh', 16)}<span>Kiểm tra lại</span></button>`)}${errorPanel()}${adminUi.loading && !data ? loadingBlock() : data ? `
    <section class="admin-stat-grid">
      ${statCard('Thời gian chạy (Uptime)', formatUptime(runtime.uptimeSeconds), `Node ${runtime.nodeVersion || '—'} (${runtime.environment || 'dev'})`, 'check', 'tone-blue')}
      ${statCard('Schema Migrations', migrations.length, `Phiên bản mới nhất: ${migrations.at(-1)?.version || '—'}`, 'database')}
      ${statCard('Phiên đã thu hồi/hết hạn', hygiene.expiredSessions, 'Bản ghi trong bảng sessions', 'lock', 'tone-slate')}
      ${statCard('OTP & Token đã đóng', Number(hygiene.expiredOtps || 0) + Number(hygiene.expiredEmailTokens || 0), `Bank link hết hạn: ${number(hygiene.expiredBankAttempts)}`, 'shield')}
    </section>
    <section class="admin-overview-grid">
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Trạng thái các thành phần hạ tầng</h2><p>Kiểm tra lúc ${dateLabel(data.checkedAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p></div></div>
        ${services.map((s) => serviceRow(s.name, s.status, s.detail, s.key === 'api' ? 'api' : s.key === 'smtp' ? 'mail' : s.key === 'bank_hub' ? 'bank' : 'database')).join('')}
      </article>
      <article class="admin-card">
        <div class="admin-card-heading"><div><h2>Lịch sử Database Migrations</h2><p>Bảng schema_migrations trong PostgreSQL</p></div></div>
        <div class="admin-table-wrap"><table class="admin-user-table"><thead><tr><th>Phiên bản</th><th>Mô tả Migration</th><th>Thời gian áp dụng</th></tr></thead><tbody>
          ${migrations.map((m) => `<tr><td><span class="admin-role-badge is-admin">v${escapeHtml(m.version)}</span></td><td><strong>${escapeHtml(m.description)}</strong></td><td>${dateLabel(m.appliedAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('')}
        </tbody></table></div>
      </article>
    </section>
  ` : ''}`;
}

function normalizeAdminAgentPrompt(value) {
  return String(value || '').toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}

function adminAgentServiceLabel(status) {
  return status === 'available' ? 'Sẵn sàng' : 'Chưa sẵn sàng';
}

function adminAgentTrendMetrics(data) {
  const rows = data?.signupTrend || [];
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const previous = rows.at(-2);
  const latest = rows.at(-1);
  const delta = previous && latest ? Number(latest.count || 0) - Number(previous.count || 0) : null;
  const change = delta == null ? 'Chưa đủ kỳ để so sánh' : delta > 0 ? `+${number(delta)}` : number(delta);
  const changeNote = !previous || !latest
    ? 'Cần ít nhất hai tháng để so sánh'
    : Number(previous.count || 0) === 0
      ? 'Không tính phần trăm khi kỳ trước bằng 0'
      : `${delta > 0 ? '+' : ''}${number((delta / Number(previous.count)) * 100)}% so với ${monthLabel(previous.month)}`;
  const peak = rows.reduce((best, row) => Number(row.count || 0) > Number(best?.count || -1) ? row : best, null);
  return {
    total,
    average: rows.length ? Math.round(total / rows.length) : 0,
    peak: peak ? Number(peak.count || 0) : 0,
    peakMonth: peak ? monthLabel(peak.month) : '—',
    latest: Number(latest?.count || 0),
    latestMonth: latest ? monthLabel(latest.month) : '—',
    change,
    changeNote,
    previousMonth: previous ? monthLabel(previous.month) : '—'
  };
}

function adminAgentAnswer(prompt, previousContext = null) {
  const query = normalizeAdminAgentPrompt(prompt);
  const data = adminUi.overview;
  const analytics = adminUi.analytics;
  const exportRequest = parseAdminExportRequest(prompt, previousContext);
  if (exportRequest) {
    const datasetLabel = ({ overview: 'chỉ số hệ thống', growth: 'tăng trưởng người dùng', users: 'danh sách người dùng', audit: 'nhật ký quản trị', analytics: 'phân tích hoạt động' })[exportRequest.dataset];
    const exportMetrics = exportRequest.dataset === 'analytics' && analytics
      ? [
          { label: 'DAU / WAU / MAU', value: `${number(analytics.activity?.dau)} / ${number(analytics.activity?.wau)} / ${number(analytics.activity?.mau)}`, note: 'Người dùng hoạt động' },
          { label: 'Gắn kết DAU/MAU', value: `${analytics.activity?.stickinessPercent || 0}%`, note: 'Tỷ lệ trong 30 ngày' }
        ]
      : [
          { label: 'Tổng tài khoản', value: number(data?.counts?.total), note: 'Số liệu tổng hợp' },
          { label: 'Giao dịch trong kỳ', value: number(data?.transactionCount), note: 'Chỉ số đếm, không có số tiền' }
        ];
    return {
      title: `Xuất ${datasetLabel}`,
      text: exportRequest.dataset === 'users'
        ? 'Tệp chứa thông tin tài khoản cần thiết và email đã che một phần. Không có nội dung hoặc số tiền giao dịch cá nhân.'
        : exportRequest.dataset === 'audit'
          ? `Nhật ký quản trị trong khoảng ${dateLabel(exportRequest.from)} – ${dateLabel(exportRequest.to)}; email được che một phần và không có dữ liệu giao dịch cá nhân.`
          : exportRequest.dataset === 'analytics'
            ? `Tệp gồm DAU/WAU/MAU, mức dùng tính năng, lưu lượng giao dịch theo số lượng và tình trạng liên kết Bank Hub trong kỳ ${dateLabel(exportRequest.from)} – ${dateLabel(exportRequest.to)}. Không chứa số tiền hoặc giao dịch của từng người dùng.`
          : `Dữ liệu tổng hợp trong khoảng ${dateLabel(exportRequest.from)} – ${dateLabel(exportRequest.to)}. Chỉ số giao dịch là số lượng; không xuất số tiền hoặc nội dung giao dịch cá nhân.`,
      metrics: data && exportRequest.from === adminUi.from && exportRequest.to === adminUi.to ? exportMetrics : [],
      actions: exportRequest.formats.map((format) => ({
        type: 'export', dataset: exportRequest.dataset, format,
        from: exportRequest.from, to: exportRequest.to,
        label: format === 'xlsx' ? 'Tải Excel' : 'Tải PDF'
      }))
    };
  }
  if (!data) {
    return {
      title: 'Chưa có dữ liệu để phân tích',
      text: adminUi.error?.message || 'Chưa tải được thống kê Admin. Hãy làm mới trang Agent rồi thử lại.',
      actions: [{ label: 'Mở Tổng quan Admin', view: 'admin-overview' }]
    };
  }

  const counts = data.counts || {};
  const quick = data.quickStats || {};
  const trend = adminAgentTrendMetrics(data);
  const services = data.services || {};
  const commonMetrics = [
    { label: 'Tổng tài khoản', value: number(counts.total), note: 'Tất cả tài khoản' },
    { label: 'Đang hoạt động', value: number(counts.active), note: `DAU 24h: ${number(quick.dau || 0)}` },
    { label: 'Giao dịch trong kỳ', value: number(data.transactionCount), note: `${dateLabel(data.period?.from)} – ${dateLabel(data.period?.to)}` }
  ];

  if (/(doanh thu|revenue|thu nhap|chi tieu|tien giao dich|so tien|tai chinh)/.test(query)) {
    return {
      title: 'Giới hạn quyền riêng tư tài chính',
      text: 'Admin API chỉ cung cấp số lượng bản ghi giao dịch, số tài khoản, DAU/MAU và tỷ lệ áp dụng tính năng. Hệ thống không lưu doanh thu kinh doanh; số tiền và nội dung giao dịch cá nhân được bảo vệ nghiêm ngặt và không đưa vào trang quản trị.',
      metrics: [{ label: 'Giao dịch trong kỳ', value: number(data.transactionCount), note: 'Chỉ là số lượng bản ghi, không phải tổng tiền' }],
      actions: [{ label: 'Xem Hoạt động & Phân tích', view: 'admin-analytics' }]
    };
  }

  if (/(dau|wau|mau|tinh nang|adoption|hoat dong|su dung)/.test(query) && analytics) {
    const act = analytics.activity || {};
    return {
      title: 'Phân tích mức độ hoạt động & Tính năng',
      text: `Hiện có ${number(act.dau)} người dùng hoạt động trong 24h qua (DAU), ${number(act.wau)} trong 7 ngày (WAU) và ${number(act.mau)} trong 30 ngày (MAU), đạt tỷ lệ gắn kết ${act.stickinessPercent || 0}%. Đang có ${number(act.activeSessions)} phiên hợp lệ.`,
      metrics: [
        { label: 'DAU (24h)', value: number(act.dau), note: 'Phiên hoạt động trong ngày', tone: 'blue' },
        { label: 'WAU (7 ngày)', value: number(act.wau), note: 'Hoạt động trong tuần' },
        { label: 'MAU (30 ngày)', value: number(act.mau), note: `Gắn kết: ${act.stickinessPercent || 0}%` }
      ],
      actions: [{ label: 'Mở Hoạt động & Phân tích', view: 'admin-analytics' }]
    };
  }

  if (/(an ninh|bao mat|security|rate limit|otp|ho tro|ticket)/.test(query)) {
    return {
      title: 'Tình hình an ninh & Hỗ trợ người dùng',
      text: `Trong 24h qua hệ thống ghi nhận ${number(quick.security_alerts_24h)} sự kiện cảnh báo xác thực/tần suất. Hiện có ${number(counts.pending)} tài khoản đang chờ xác minh OTP và ${number(quick.open_tickets)} phiếu hỗ trợ đang mở cần phản hồi.`,
      metrics: [
        { label: 'Cảnh báo 24h', value: number(quick.security_alerts_24h), note: 'Đăng nhập sai / OTP / 429', tone: quick.security_alerts_24h ? 'amber' : 'blue' },
        { label: 'Chờ xác minh OTP', value: number(counts.pending), note: 'Hàng đợi xác minh' },
        { label: 'Phiếu hỗ trợ mở', value: number(quick.open_tickets), note: 'Hộp thư hỗ trợ' }
      ],
      actions: [{ label: 'Mở An ninh đăng nhập', view: 'admin-security' }, { label: 'Mở Hộp thư hỗ trợ', view: 'admin-support' }]
    };
  }

  if (/(tang truong|dang ky|signup|phat trien)/.test(query)) {
    const latestText = trend.latest === 0
      ? `${trend.latestMonth} chưa ghi nhận lượt đăng ký mới.`
      : `${trend.latestMonth} ghi nhận ${number(trend.latest)} lượt đăng ký mới.`;
    const comparison = trend.change === 'Chưa đủ kỳ để so sánh'
      ? 'Chưa đủ hai tháng dữ liệu để so sánh xu hướng.'
      : `So với ${trend.previousMonth}, thay đổi là ${trend.change} lượt (${trend.changeNote}).`;
    return {
      title: 'Phân tích tăng trưởng người dùng',
      text: `Trong ${data.signupTrend?.length || 0} tháng thuộc kỳ đã chọn có ${number(trend.total)} lượt đăng ký, trung bình ${number(trend.average)} lượt mỗi tháng. ${latestText} ${comparison} Tháng cao nhất trong kỳ là ${trend.peakMonth} với ${number(trend.peak)} lượt.`,
      metrics: [
        { label: 'Đăng ký trong kỳ', value: number(trend.total), note: `${dateLabel(data.period?.from)} – ${dateLabel(data.period?.to)}` },
        { label: 'Tháng gần nhất', value: number(trend.latest), note: trend.latestMonth },
        { label: 'Trung bình mỗi tháng', value: number(trend.average), note: 'Tính trên các tháng trong kỳ' },
        { label: 'Tháng cao nhất', value: number(trend.peak), note: trend.peakMonth, tone: 'blue' }
      ],
      actions: [{ label: 'Mở biểu đồ tăng trưởng', view: 'admin-overview' }, { label: 'Xem danh sách người dùng', view: 'admin-users' }]
    };
  }

  if (/(ke hoach|lap ke hoach|de xuat|cai thien|nen lam gi|goi y)/.test(query)) {
    const pending = Number(counts.pending || 0);
    const unavailable = Object.entries(services).filter(([, value]) => value !== 'available').map(([key]) => key === 'database' ? 'PostgreSQL' : key.toUpperCase());
    const plan = [
      `1. Dùng ${number(trend.total)} lượt đăng ký và mức trung bình ${number(trend.average)} mỗi tháng làm đường cơ sở; theo dõi thêm trong mục Hoạt động & Phân tích.`,
      pending ? `2. Rà soát ${number(pending)} tài khoản đang chờ xác minh trong Hàng đợi OTP; dọn dẹp các tài khoản quá hạn > 7 ngày.` : '2. Hàng đợi xác minh OTP hiện sạch; tiếp tục duy trì giám sát tỷ lệ nhận mã.',
      unavailable.length ? `3. Kiểm tra cấu hình dịch vụ chưa sẵn sàng: ${unavailable.join(', ')}.` : '3. Các dịch vụ hạ tầng đang sẵn sàng; duy trì kiểm tra sức khỏe định kỳ.',
      `4. Kiểm tra ${number(quick.open_tickets || 0)} phiếu hỗ trợ đang mở và ${number(quick.security_alerts_24h || 0)} cảnh báo an ninh 24h qua.`
    ].join('\n');
    return {
      title: 'Kế hoạch quản trị đề xuất',
      text: `${plan}\n\nKế hoạch này dựa trên thống kê hệ thống hiện có; không dùng nội dung giao dịch cá nhân và không tự thay đổi tài khoản.`,
      metrics: [
        { label: 'Đăng ký trong kỳ', value: number(trend.total), note: 'Theo tháng trong khoảng đã chọn' },
        { label: 'Chờ xác minh', value: number(pending), note: 'Tài khoản cần theo dõi', tone: pending ? 'amber' : '' },
        { label: 'Phiếu hỗ trợ mở', value: number(quick.open_tickets), note: 'Cần phản hồi', tone: quick.open_tickets ? 'amber' : 'blue' }
      ],
      actions: [{ label: 'Hàng đợi xác minh', view: 'admin-verification' }, { label: 'Hộp thư hỗ trợ', view: 'admin-support' }]
    };
  }

  return {
    title: 'Tóm tắt tình trạng hệ thống',
    text: `Hiện có ${number(counts.total)} tài khoản (${number(counts.active)} hoạt động, ${number(counts.pending)} chờ xác minh, ${number(counts.disabled)} đã khóa). Kỳ đã chọn có ${number(data.transactionCount)} lượt giao dịch. API: ${adminAgentServiceLabel(services.api)} · PostgreSQL: ${adminAgentServiceLabel(services.database)}.`,
    metrics: commonMetrics,
    actions: [{ label: 'Xem Tổng quan Admin', view: 'admin-overview' }, { label: 'Hoạt động & Phân tích', view: 'admin-analytics' }]
  };
}

function adminAgentSuggestions() {
  return [
    'Tóm tắt tình trạng hệ thống',
    'Phân tích hoạt động và tính năng',
    'Kiểm tra an ninh và phiếu hỗ trợ',
    'Phân tích tăng trưởng người dùng',
    'Lập kế hoạch cải thiện',
    'Xuất danh sách người dùng',
    'Xuất phân tích hoạt động'
  ];
}

function parseAdminExportRequest(prompt, previousContext = null) {
  const query = normalizeAdminAgentPrompt(prompt);
  if (!/\b(xuat|export|excel|xlsx|pdf|tai tep|tai file)\b/.test(query)) return null;
  const requestedDataset = /\b(nhat ky|audit|lich su thao tac)\b/.test(query)
    ? 'audit'
    : /\b(nguoi dung|tai khoan|users)\b/.test(query)
      ? 'users'
      : /\b(phan tich hoat dong|hoat dong|dau|wau|mau|tinh nang|adoption|bank hub)\b/.test(query)
        ? 'analytics'
      : /\b(tang truong|dang ky|signup|growth)\b/.test(query)
        ? 'growth'
        : null;
  const dataset = requestedDataset || previousContext?.dataset || 'overview';
  const formats = [];
  if (/\b(excel|xlsx)\b/.test(query)) formats.push('xlsx');
  if (/\bpdf\b/.test(query)) formats.push('pdf');
  if (!formats.length) formats.push('xlsx', 'pdf');
  const from = previousContext?.from || adminUi.from;
  const to = previousContext?.to || adminUi.to;
  return { dataset, formats, from, to };
}

function adminAgentDatasetForPrompt(prompt) {
  const query = normalizeAdminAgentPrompt(prompt);
  if (/\b(nhat ky|audit|lich su thao tac)\b/.test(query)) return 'audit';
  if (/\b(nguoi dung|tai khoan|users)\b/.test(query)) return 'users';
  if (/\b(phan tich hoat dong|hoat dong|dau|wau|mau|tinh nang|adoption|bank hub)\b/.test(query)) return 'analytics';
  if (/\b(tang truong|dang ky|signup|phat trien)\b/.test(query)) return 'growth';
  return 'overview';
}

function renderAdminAgentMetrics(metrics = []) {
  if (!metrics.length) return '';
  return `<div class="admin-agent-report-metrics">${metrics.map((metric) => `<article class="admin-agent-report-metric ${metric.tone ? `tone-${metric.tone}` : ''}"><small>${escapeHtml(metric.label)}</small><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.note)}</span></article>`).join('')}</div>`;
}

function renderAdminAgentActions(actions = []) {
  const allowedViews = new Set(['admin-overview', 'admin-analytics', 'admin-users', 'admin-verification', 'admin-security', 'admin-support', 'admin-audit']);
  return actions.map((action) => {
    if (action.type === 'export' && ['overview', 'growth', 'users', 'audit', 'analytics'].includes(action.dataset) && ['xlsx', 'pdf'].includes(action.format)) {
      const extension = action.format === 'xlsx' ? '.xlsx' : '.pdf';
      const label = action.format === 'xlsx' ? 'Tải Excel' : 'Tải PDF';
      return `<button type="button" class="admin-agent-export-action" data-action="admin-agent-export" data-dataset="${action.dataset}" data-format="${action.format}" data-from="${escapeHtml(action.from || '')}" data-to="${escapeHtml(action.to || '')}"><span class="admin-agent-export-type">${extension}</span><span><strong>${label}</strong><small>${extension} · tệp dữ liệu</small></span></button>`;
    }
    if (allowedViews.has(action.view)) return `<button type="button" class="admin-agent-action-link" data-action="navigate" data-view="${action.view}">${escapeHtml(action.label)}${icon('arrowRight', 14)}</button>`;
    return '';
  }).join('');
}

function renderAdminAgentMessage(message) {
  if (message.role === 'user') {
    return `<article class="admin-agent-message is-user"><div class="admin-agent-message-body">${escapeHtml(message.text)}</div></article>`;
  }
  return `<article class="admin-agent-message is-assistant"><span class="admin-agent-message-mark" aria-hidden="true">${icon('api', 16)}</span><div class="admin-agent-report"><header><strong>${escapeHtml(message.title || 'Agent quản trị')}</strong><small>Phân tích từ số liệu tổng hợp</small></header><p>${escapeHtml(message.text)}</p>${renderAdminAgentMetrics(message.metrics)}<div class="admin-agent-report-actions">${renderAdminAgentActions(message.actions)}</div></div></article>`;
}

function adminAgentPage() {
  const data = adminUi.overview;
  const counts = data?.counts || {};
  const services = data?.services || {};
  const suggestions = adminAgentSuggestions();
  const messages = adminUi.agentMessages;
  const loading = adminUi.loading;
  const period = data?.period;
  const titleActions = `${periodControl()}<button class="admin-button admin-button-secondary" data-action="admin-agent-refresh" aria-label="Làm mới số liệu Agent" ${loading ? 'disabled' : ''}>${icon('refresh', 16)}<span>Làm mới</span></button>`;
  const sideMetric = (label, value, note) => `<article class="admin-agent-side-metric"><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`;
  const agentContent = loading && !data
    ? loadingBlock('Đang tải số liệu tổng hợp…')
    : messages.length
      ? messages.map(renderAdminAgentMessage).join('')
      : `<div class="admin-agent-welcome"><span class="admin-agent-welcome-mark" aria-hidden="true">✦</span><h2>Chào bạn, mình có thể giúp gì?</h2><p>Hỏi về hoạt động người dùng, tỷ lệ sử dụng tính năng, an ninh đăng nhập, hộp thư hỗ trợ hoặc yêu cầu xuất báo cáo quản trị.</p></div>`;
  const serviceCount = data
    ? services.api === 'available' && services.database === 'available' ? 'Sẵn sàng' : 'Cần kiểm tra'
    : '—';
  return `${pageHeading('Agent Admin', 'Phân tích hoạt động hệ thống, tổng hợp thống kê và đề xuất kế hoạch quản trị.', titleActions)}
    ${customRange()}${errorPanel()}
    <section class="admin-agent-layout">
      <article class="admin-card admin-agent-conversation">
        <header class="admin-agent-chat-header">
          <span class="admin-agent-avatar" aria-hidden="true">${icon('api', 19)}</span>
          <div><h2>Agent quản trị</h2><p>Phân tích nội bộ · Hội thoại chỉ giữ trong phiên</p></div>
          <span class="admin-agent-data-badge"><i></i>Số liệu tổng hợp Admin</span>
          <button type="button" class="admin-agent-clear" data-action="admin-agent-clear" aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện">${icon('refresh', 16)}</button>
        </header>
        <div class="admin-agent-thread" id="admin-agent-thread" role="log" aria-live="polite" aria-relevant="additions text">
          ${agentContent}${loading && data ? '<div class="admin-agent-inline-status" role="status">Đang cập nhật số liệu…</div>' : ''}
        </div>
        <div class="admin-agent-quick-prompts"><span>GỢI Ý CÂU HỎI</span><div>${suggestions.map((prompt) => `<button type="button" data-action="admin-agent-suggestion" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}</div></div>
        <form class="admin-agent-composer" data-form="admin-agent">
          <label class="admin-sr-only" for="admin-agent-input">Nhập câu hỏi phân tích</label>
          <textarea id="admin-agent-input" data-admin-agent-input name="message" rows="1" maxlength="1000" placeholder="Nhập yêu cầu phân tích hoặc kế hoạch…" ${loading ? 'disabled' : ''}>${escapeHtml(adminUi.agentDraft)}</textarea>
          <button type="submit" class="admin-button admin-button-primary" aria-label="Gửi yêu cầu" ${loading ? 'disabled' : ''}>${icon('send', 17)}</button>
        </form>
        <p class="admin-agent-disclosure">Agent phân tích theo quy tắc cục bộ; chưa kết nối mô hình AI bên ngoài.</p>
      </article>
      <aside class="admin-agent-aside">
        <section class="admin-card admin-agent-overview-card">
          <header><h2>Chỉ số hệ thống</h2><p>${period ? `${dateLabel(period.from)} – ${dateLabel(period.to)}` : 'Cùng khoảng thời gian đã chọn'}</p></header>
          <div class="admin-agent-side-metrics">
            ${sideMetric('Tổng tài khoản', data ? number(counts.total) : '—', 'Từ dữ liệu hệ thống')}
            ${sideMetric('Đang hoạt động', data ? number(counts.active) : '—', 'Tài khoản hoạt động')}
            ${sideMetric('Giao dịch trong kỳ', data ? number(data.transactionCount) : '—', 'Chỉ số đếm')}
            ${sideMetric('Dịch vụ', serviceCount, 'API · PostgreSQL')}
          </div>
          <button type="button" class="admin-agent-side-link" data-action="navigate" data-view="admin-analytics">Mở Hoạt động & Phân tích${icon('arrowRight', 14)}</button>
        </section>
        <section class="admin-card admin-agent-tools-card">
          <header><h2>Công cụ quản trị</h2><p>Mở màn hình thao tác có kiểm soát</p></header>
          <button type="button" class="admin-agent-tool-link" data-action="navigate" data-view="admin-users"><span>${icon('users', 16)}</span>Quản lý người dùng${icon('chevron', 14)}</button>
          <button type="button" class="admin-agent-tool-link" data-action="navigate" data-view="admin-security"><span>${icon('shield', 16)}</span>An ninh đăng nhập${icon('chevron', 14)}</button>
          <button type="button" class="admin-agent-tool-link" data-action="navigate" data-view="admin-support"><span>${icon('help', 16)}</span>Hộp thư hỗ trợ${icon('chevron', 14)}</button>
          <button type="button" class="admin-agent-tool-link" data-action="navigate" data-view="admin-audit"><span>${icon('audit', 16)}</span>Nhật ký quản trị${icon('chevron', 14)}</button>
        </section>
        <section class="admin-card admin-agent-boundary-card">
          <span class="admin-agent-boundary-icon" aria-hidden="true">${icon('info', 17)}</span><h2>Giới hạn dữ liệu</h2>
          <ul><li>Không đọc nội dung giao dịch cá nhân.</li><li>Admin API không truy xuất số tiền cá nhân.</li><li>Agent không tự khóa hoặc đổi quyền tài khoản.</li></ul>
          <p>Mọi thay đổi vẫn cần xác nhận trong màn quản trị.</p>
        </section>
      </aside>
    </section>`;
}

function appendAdminAgentPrompt(prompt, context) {
  const text = String(prompt || '').trim().slice(0, 1000);
  if (!text) return;
  adminUi.agentDraft = '';
  adminUi.agentMessages.push({ role: 'user', text });
  const previousContext = adminUi.agentExportContext;
  const exportRequest = parseAdminExportRequest(text, previousContext);
  adminUi.agentMessages.push({ role: 'assistant', ...adminAgentAnswer(text, previousContext) });
  adminUi.agentExportContext = exportRequest
    ? { dataset: exportRequest.dataset, from: exportRequest.from, to: exportRequest.to }
    : { dataset: adminAgentDatasetForPrompt(text), from: adminUi.from, to: adminUi.to };
  context.render();
  requestAnimationFrame(() => {
    const thread = $('#admin-agent-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  });
}

export function submitAdminAgent(form, context) {
  const value = new FormData(form).get('message')?.toString() || '';
  appendAdminAgentPrompt(value, context);
}

export function handleAdminAgentInput(target) {
  adminUi.agentDraft = target.value.slice(0, 1000);
}

function userFilters() {
  const filter = (key, label, options) => `<div class="admin-filter"><select data-admin-filter="${key}" aria-label="${label}">${options.map(([value, title]) => `<option value="${value}" ${adminUi.filters[key] === value ? 'selected' : ''}>${title}</option>`).join('')}</select></div>`;
  return `<form id="admin-search-form" class="admin-user-toolbar"><label class="admin-search">${icon('search', 16)}<span class="admin-sr-only">Tìm tên hoặc email</span><input name="q" type="search" value="${escapeHtml(adminUi.filters.q)}" placeholder="Tìm theo tên hoặc email…"><button type="submit" aria-label="Tìm kiếm">Tìm</button></label>${filter('status', 'Trạng thái', [['all', 'Trạng thái: Tất cả'], ['active', 'Hoạt động'], ['pending_email', 'Chờ xác minh'], ['disabled', 'Đã khóa']])}${filter('role', 'Vai trò', [['all', 'Vai trò: Tất cả'], ['user', 'User'], ['admin', 'Admin']])}${filter('verified', 'Xác minh email', [['all', 'Xác minh: Tất cả'], ['yes', 'Đã xác minh'], ['no', 'Chưa xác minh']])}${filter('sort', 'Sắp xếp', [['newest', 'Mới nhất'], ['oldest', 'Cũ nhất'], ['name', 'Tên A–Z']])}<button type="button" class="admin-text-button" data-action="admin-clear-filters">Xóa lọc</button></form>`;
}

function userAction(user) {
  const statusAction = user.id === adminUi.actorId ? '' : user.status === 'active'
    ? `<button class="admin-row-action is-danger" data-action="admin-confirm-status" data-id="${user.id}" data-name="${escapeHtml(user.fullName)}" data-status="disabled">Khóa</button>`
    : user.status === 'disabled' && user.emailVerifiedAt
      ? `<button class="admin-row-action" data-action="admin-confirm-status" data-id="${user.id}" data-name="${escapeHtml(user.fullName)}" data-status="active">Mở khóa</button>`
      : '';
  const roleAction = user.id !== adminUi.actorId && user.status === 'active' && user.emailVerifiedAt
    ? `<button class="admin-row-action" data-action="admin-confirm-role" data-id="${user.id}" data-name="${escapeHtml(user.fullName)}" data-role="${user.role === 'admin' ? 'user' : 'admin'}">${user.role === 'admin' ? 'Hạ quyền' : 'Cấp Admin'}</button>`
    : '';
  return `<div class="admin-user-actions"><button class="admin-row-action" data-action="admin-view-user" data-id="${user.id}">Chi tiết</button>${roleAction}${statusAction}</div>`;
}

function userStatus(user) {
  return `<span class="admin-status-badge ${statusClass(user.status)}"><i></i>${statusLabel(user.status)}</span>`;
}

function desktopUserRows(users) {
  return users.map((user) => `<tr><td><div class="admin-user-cell"><span class="admin-avatar">${escapeHtml(initials(user.fullName))}</span><span><strong>${escapeHtml(user.fullName)}</strong><small>${escapeHtml(user.emailMasked)}</small></span></div></td><td><span class="admin-role-badge ${user.role === 'admin' ? 'is-admin' : ''}">${user.role === 'admin' ? 'Admin' : 'Người dùng'}</span></td><td>${userStatus(user)}</td><td>${user.emailVerifiedAt ? 'Đã xác minh' : 'Chưa xác minh'}</td><td>${dateLabel(user.createdAt)}</td><td>${userAction(user)}</td></tr>`).join('');
}

function mobileUserCards(users) {
  return users.map((user) => `<article class="admin-user-mobile-card"><header><span class="admin-avatar">${escapeHtml(initials(user.fullName))}</span><div><strong>${escapeHtml(user.fullName)}</strong><small>${escapeHtml(user.emailMasked)}</small></div><span class="admin-role-badge ${user.role === 'admin' ? 'is-admin' : ''}">${user.role === 'admin' ? 'Admin' : 'Người dùng'}</span></header><div class="admin-mobile-meta"><span>${userStatus(user)}</span><span>${user.emailVerifiedAt ? 'Đã xác minh email' : 'Chưa xác minh email'}</span><span>Đăng ký ${dateLabel(user.createdAt)}</span></div><footer>${userAction(user)}</footer></article>`).join('');
}

function pagination(pagination, actionPrefix) {
  const { page, totalPages, total } = pagination;
  const itemLabel = actionPrefix === 'admin-audit' ? 'mục nhật ký' : actionPrefix === 'admin-security' ? 'sự kiện' : 'tài khoản';
  return `<div class="admin-pagination"><span>Hiển thị ${total ? (page - 1) * pagination.pageSize + 1 : 0}–${Math.min(page * pagination.pageSize, total)} trong ${number(total)} ${itemLabel}</span><div><button class="admin-button admin-button-secondary" data-action="${actionPrefix}-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Trang trước">${icon('back', 14)}</button><span>Trang ${page} / ${totalPages}</span><button class="admin-button admin-button-secondary" data-action="${actionPrefix}-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Trang sau">${icon('chevron', 14)}</button></div></div>`;
}

function userPage() {
  const summary = adminUi.userSummary || {};
  const data = adminUi.users;
  const userBody = adminUi.loading ? loadingBlock('Đang tải danh sách…') : adminUi.error && !adminUi.userSummary ? '' : data.length ? `<div class="admin-table-wrap"><table class="admin-user-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Xác minh</th><th>Ngày đăng ký</th><th>Thao tác</th></tr></thead><tbody>${desktopUserRows(data)}</tbody></table></div><div class="admin-user-mobile-list">${mobileUserCards(data)}</div>${pagination(adminUi.pagination, 'admin-users')}` : emptyBlock(adminUi.filters.q || adminUi.filters.status !== 'all' || adminUi.filters.role !== 'all' || adminUi.filters.verified !== 'all' ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản', adminUi.filters.q || adminUi.filters.status !== 'all' || adminUi.filters.role !== 'all' || adminUi.filters.verified !== 'all' ? 'Thử đổi từ khóa hoặc xóa một số bộ lọc.' : 'Tài khoản mới sẽ xuất hiện tại đây sau khi đăng ký.');
  return `${pageHeading('Người dùng', 'Tra cứu, quản lý trạng thái, thu hồi phiên và phân quyền Admin có xác thực mật khẩu; không truy cập dữ liệu tài chính cá nhân.')} ${errorPanel()}${adminUi.userSummary ? `<section class="admin-stat-grid admin-user-summary">${statCard('Tổng tài khoản', summary.total, 'Tài khoản đã đăng ký', 'users')}${statCard('Đang hoạt động', summary.active, 'Có thể đăng nhập', 'check', 'tone-blue')}${statCard('Chờ xác minh', summary.pending, 'Chưa xác minh email', 'mail', 'tone-amber')}</section>` : adminUi.loading ? loadingBlock('Đang tải chỉ số tài khoản…') : ''}<section class="admin-card admin-directory-card">${userFilters()}${userBody}</section>`;
}

function auditRows(logs) {
  return logs.map((log) => `<tr><td>${dateLabel(log.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td><strong>${escapeHtml(log.actorName)}</strong><small>${escapeHtml(log.actorEmailMasked)}</small></td><td>${escapeHtml(actionLabel(log.action))}</td><td><strong>${escapeHtml(log.targetName)}</strong><small>${escapeHtml(log.targetEmailMasked)}</small></td><td>${escapeHtml(auditChange(log))}</td></tr>`).join('');
}

function auditFiltersBar() {
  const actions = [
    ['all', 'Hoạt động: Tất cả'],
    ['user.status_changed', 'Đổi trạng thái tài khoản'],
    ['user.role_changed', 'Đổi vai trò Admin/User'],
    ['user.sessions_revoked', 'Thu hồi phiên đăng nhập'],
    ['user.unverified_purged', 'Dọn tài khoản chưa xác minh'],
    ['announcement.created', 'Đăng thông báo hệ thống'],
    ['announcement.updated', 'Cập nhật thông báo'],
    ['settings.updated', 'Đổi cấu hình Feature Flag'],
    ['template_category.created', 'Thêm danh mục mẫu'],
    ['support_ticket.updated', 'Xử lý phiếu hỗ trợ']
  ];
  return `<form id="admin-audit-filter-form" class="admin-user-toolbar admin-audit-toolbar">
    <label class="admin-search">${icon('search', 16)}<span class="admin-sr-only">Tìm nhật ký</span><input name="q" type="search" value="${escapeHtml(adminUi.auditFilters.q)}" placeholder="Tìm theo tên Admin, người dùng hoặc tóm tắt…"><button type="submit">Lọc</button></label>
    <div class="admin-filter"><select data-admin-audit-filter="action" aria-label="Loại hoạt động">${actions.map(([val, label]) => `<option value="${val}" ${adminUi.auditFilters.action === val ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
    <div class="admin-audit-dates">
      <label class="admin-date-inline"><span>Từ</span><input type="date" data-admin-audit-filter="from" value="${escapeHtml(adminUi.auditFilters.from)}" aria-label="Từ ngày"></label>
      <label class="admin-date-inline"><span>Đến</span><input type="date" data-admin-audit-filter="to" value="${escapeHtml(adminUi.auditFilters.to)}" aria-label="Đến ngày"></label>
    </div>
    <button type="button" class="admin-text-button" data-action="admin-clear-audit-filters">Xóa lọc</button>
  </form>`;
}

// Group A8: Filterable Audit Logs
function auditPage() {
  const data = adminUi.auditLogs;
  return `${pageHeading('Nhật ký quản trị (A8)', 'Các thay đổi tài khoản, phân quyền và cấu hình được lưu bất biến (append-only) để truy vết. Không chứa giao dịch hoặc số tiền.')} ${errorPanel()}<section class="admin-card admin-audit-card">${auditFiltersBar()}${adminUi.loading ? loadingBlock('Đang tải nhật ký…') : data.length ? `<div class="admin-table-wrap"><table class="admin-audit-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hoạt động</th><th>Đối tượng</th><th>Chi tiết thay đổi</th></tr></thead><tbody>${auditRows(data)}</tbody></table></div><div class="admin-audit-mobile-list">${data.map((log) => `<article><header><strong>${escapeHtml(actionLabel(log.action))}</strong><time>${dateLabel(log.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></header><p>${escapeHtml(log.actorName)} tác động lên ${escapeHtml(log.targetName)}</p><span>${escapeHtml(auditChange(log))}</span></article>`).join('')}</div>${pagination(adminUi.auditPagination, 'admin-audit')}` : emptyBlock('Chưa có nhật ký quản trị phù hợp', 'Các thay đổi tài khoản và vận hành sẽ được lưu tự động và hiển thị tại đây.')}</section>`;
}

function statusDialog() {
  if (!adminUi.pendingStatus) return '';
  const { fullName, status } = adminUi.pendingStatus;
  const locking = status === 'disabled';
  return `<dialog class="admin-confirm-dialog" id="admin-confirm-dialog" aria-labelledby="admin-confirm-title"><div class="admin-dialog-icon ${locking ? 'is-danger' : ''}" aria-hidden="true">${icon(locking ? 'alert' : 'check', 18)}</div><h2 id="admin-confirm-title">${locking ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}</h2><p>${locking ? `Tài khoản <strong>${escapeHtml(fullName)}</strong> sẽ bị đăng xuất trên các thiết bị hiện tại và không thể đăng nhập.` : `Tài khoản <strong>${escapeHtml(fullName)}</strong> sẽ được phép đăng nhập lại.`}</p><div class="admin-dialog-actions"><button class="admin-button admin-button-secondary" data-action="admin-cancel-status" ${adminUi.savingStatus ? 'disabled' : ''}>Hủy</button><button class="admin-button ${locking ? 'admin-button-danger' : 'admin-button-primary'}" data-action="admin-apply-status" ${adminUi.savingStatus ? 'disabled' : ''}>${adminUi.savingStatus ? 'Đang lưu…' : locking ? 'Khóa tài khoản' : 'Mở khóa'}</button></div></dialog>`;
}

// Group B8: Role Change Dialog with Admin Password Re-authentication
function roleDialog() {
  if (!adminUi.pendingRole) return '';
  const { fullName, role } = adminUi.pendingRole;
  const promoting = role === 'admin';
  return `<dialog class="admin-confirm-dialog" id="admin-role-dialog" aria-labelledby="admin-role-title">
    <form data-form="admin-role-change">
      <div class="admin-dialog-icon ${promoting ? '' : 'is-danger'}" aria-hidden="true">${icon('shield', 18)}</div>
      <h2 id="admin-role-title">${promoting ? 'Cấp quyền Admin?' : 'Hạ quyền về User?'}</h2>
      <p>Bạn sắp đổi vai trò của <strong>${escapeHtml(fullName)}</strong> thành <strong>${promoting ? 'ADMIN' : 'USER'}</strong>. Vui lòng nhập mật khẩu Admin hiện tại để xác thực.</p>
      <label class="admin-dialog-field">Mật khẩu Admin xác nhận *<input type="password" name="adminPassword" required autocomplete="current-password" placeholder="Nhập mật khẩu của bạn…"></label>
      ${adminUi.roleError ? `<p class="admin-range-error" style="text-align:left;margin:6px 0">${escapeHtml(adminUi.roleError)}</p>` : ''}
      <div class="admin-dialog-actions">
        <button type="button" class="admin-button admin-button-secondary" data-action="admin-cancel-role" ${adminUi.savingRole ? 'disabled' : ''}>Hủy</button>
        <button type="submit" class="admin-button ${promoting ? 'admin-button-primary' : 'admin-button-danger'}" ${adminUi.savingRole ? 'disabled' : ''}>${adminUi.savingRole ? 'Đang xác thực…' : 'Xác nhận đổi vai trò'}</button>
      </div>
    </form>
  </dialog>`;
}

// Group A7, B1, B8: Enhanced User Detail Drawer
function userDetailDialog() {
  if (!adminUi.selectedUser && !adminUi.detailLoading && !adminUi.detailError) return '';
  const user = adminUi.selectedUser;
  return `<dialog class="admin-detail-dialog" id="admin-user-detail-dialog" aria-labelledby="admin-user-detail-title"><header class="admin-detail-header"><div><p class="admin-eyebrow">Thông tin tài khoản (A7 / B1 / B8)</p><h2 id="admin-user-detail-title">${user ? escapeHtml(user.fullName) : 'Chi tiết người dùng'}</h2></div><button class="admin-detail-close" data-action="admin-close-user-detail" aria-label="Đóng">${icon('close', 17)}</button></header>${adminUi.detailLoading ? loadingBlock('Đang tải thông tin…') : adminUi.detailError ? `<div class="admin-error" role="alert"><div><p>${escapeHtml(adminUi.detailError.message || 'Chưa tải được thông tin tài khoản.')}</p></div></div>` : `<div class="admin-detail-body">
    <div class="admin-detail-person"><span class="admin-avatar">${escapeHtml(initials(user.fullName))}</span><div><strong>${escapeHtml(user.fullName)}</strong><small>${escapeHtml(user.emailMasked)}</small></div></div>
    <dl>
      <div><dt>Vai trò</dt><dd><span class="admin-role-badge ${user.role === 'admin' ? 'is-admin' : ''}">${user.role === 'admin' ? 'ADMIN' : 'USER'}</span></dd></div>
      <div><dt>Trạng thái</dt><dd>${userStatus(user)}</dd></div>
      <div><dt>Email</dt><dd>${user.emailVerifiedAt ? `Đã xác minh (${dateLabel(user.emailVerifiedAt)})` : 'Chưa xác minh'}</dd></div>
      <div><dt>Ngày đăng ký</dt><dd>${dateLabel(user.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
      <div><dt>Phiên đang hoạt động</dt><dd>${number(user.activeSessions || 0)} phiên</dd></div>
      <div><dt>Hoạt động gần nhất</dt><dd>${user.lastSeenAt ? dateLabel(user.lastSeenAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa ghi nhận'}</dd></div>
    </dl>
    <div class="admin-detail-actions-box">
      <button type="button" class="admin-button admin-button-secondary" data-action="admin-revoke-sessions" data-id="${user.id}" ${adminUi.revokingSessions ? 'disabled' : ''}>${icon('logout', 15)}<span>${adminUi.revokingSessions ? 'Đang thu hồi…' : 'Đăng xuất mọi thiết bị'}</span></button>
      ${user.id !== adminUi.actorId && user.status === 'active' && user.emailVerifiedAt ? `<button type="button" class="admin-button admin-button-secondary" data-action="admin-confirm-role" data-id="${user.id}" data-name="${escapeHtml(user.fullName)}" data-role="${user.role === 'admin' ? 'user' : 'admin'}">${icon('shield', 15)}<span>${user.role === 'admin' ? 'Hạ quyền về User' : 'Cấp quyền Admin'}</span></button>` : ''}
    </div>
    ${user.consents?.length ? `<div class="admin-detail-section"><h3>Đồng thuận pháp lý</h3><ul>${user.consents.map((c) => `<li><strong>${escapeHtml(c.consentType)}</strong> (v${escapeHtml(c.documentVersion)}) · ${dateLabel(c.acceptedAt)}</li>`).join('')}</ul></div>` : ''}
    ${user.auditHistory?.length ? `<div class="admin-detail-section"><h3>Lịch sử tác động quản trị</h3><ul>${user.auditHistory.map((a) => `<li><strong>${escapeHtml(actionLabel(a.action))}</strong> · ${escapeHtml(auditChange(a))} (${dateLabel(a.createdAt)})</li>`).join('')}</ul></div>` : ''}
    <p class="admin-detail-privacy">Trang quản trị chỉ hiển thị thông tin tài khoản và bảo mật cần thiết. Giao dịch và số liệu tài chính cá nhân không được cung cấp.</p>
  </div>`}</dialog>`;
}

function navLink(view, label, iconName, badge = 0) {
  const badgeHtml = badge > 0 ? `<span class="admin-nav-badge">${badge > 99 ? '99+' : badge}</span>` : '';
  return `<button class="admin-nav-link" data-action="navigate" data-view="${view}" aria-current="${adminUi.view === view ? 'page' : 'false'}"><span class="admin-nav-icon" aria-hidden="true">${icon(iconName, 17)}</span><span>${label}</span>${badgeHtml}</button>`;
}

export function renderAdminApp(appState) {
  adminUi.actorId = appState.user?.id || null;
  const titles = {
    'admin-overview': 'Tổng quan',
    'admin-analytics': 'Hoạt động & Phân tích',
    'admin-agent': 'Agent quản trị',
    'admin-users': 'Người dùng',
    'admin-verification': 'Hàng đợi xác minh',
    'admin-security': 'An ninh đăng nhập',
    'admin-support': 'Hộp thư hỗ trợ',
    'admin-announcements': 'Thông báo hệ thống',
    'admin-settings': 'Cấu hình & Danh mục mẫu',
    'admin-health': 'Sức khỏe hệ thống',
    'admin-audit': 'Nhật ký quản trị'
  };
  const title = titles[adminUi.view] || 'Quản trị';
  const content = adminUi.view === 'admin-analytics' ? analyticsPage()
    : adminUi.view === 'admin-agent' ? adminAgentPage()
      : adminUi.view === 'admin-users' ? userPage()
        : adminUi.view === 'admin-verification' ? verificationPage()
          : adminUi.view === 'admin-security' ? securityPage()
            : adminUi.view === 'admin-support' ? supportPage()
              : adminUi.view === 'admin-announcements' ? announcementsPage()
                : adminUi.view === 'admin-settings' ? settingsAndTemplatesPage()
                  : adminUi.view === 'admin-health' ? healthPage()
                    : adminUi.view === 'admin-audit' ? auditPage()
                      : overviewPage();
  return `<div class="admin-app"><div class="admin-sidebar-backdrop ${appState.adminMenuOpen ? 'is-open' : ''}" data-action="admin-close-menu" aria-hidden="true"></div><aside class="admin-sidebar ${appState.adminMenuOpen ? 'is-open' : ''}" id="admin-sidebar"><a class="admin-brand" href="/admin" data-action="navigate" data-view="admin-overview" aria-label="Ví Mình — Tài chính cá nhân"><img class="admin-brand-lockup" src="/assets/brand-lockup.svg?v=20261020-logo-v2" alt=""><img class="admin-brand-mark" src="/assets/brand-mark.svg?v=20261020-logo-v2" alt="" aria-hidden="true"></a>
    <span class="admin-nav-label">GIÁM SÁT & PHÂN TÍCH</span>
    <nav class="admin-nav" aria-label="Điều hướng quản trị">
      ${navLink('admin-overview', 'Tổng quan', 'home')}
      ${navLink('admin-analytics', 'Hoạt động & Phân tích', 'chart')}
      ${navLink('admin-agent', 'Agent', 'api')}
      ${navLink('admin-health', 'Sức khỏe hệ thống', 'database')}
    </nav>
    <span class="admin-nav-label" style="margin-top:14px">VẬN HÀNH & BẢO MẬT</span>
    <nav class="admin-nav" aria-label="Điều hướng vận hành">
      ${navLink('admin-users', 'Người dùng', 'users')}
      ${navLink('admin-verification', 'Hàng đợi xác minh', 'mail')}
      ${navLink('admin-security', 'An ninh đăng nhập', 'shield')}
      ${navLink('admin-support', 'Hộp thư hỗ trợ', 'help', adminUi.openTicketCount || 0)}
      ${navLink('admin-announcements', 'Thông báo hệ thống', 'info')}
      ${navLink('admin-settings', 'Cấu hình & Mẫu', 'settings')}
      ${navLink('admin-audit', 'Nhật ký quản trị', 'audit')}
    </nav>
    <div class="admin-sidebar-separator"></div><button class="admin-nav-link" data-action="navigate" data-view="dashboard"><span class="admin-nav-icon" aria-hidden="true">${icon('back', 17)}</span><span>Về khu vực cá nhân</span></button></aside><main class="admin-main"><header class="admin-topbar"><button class="admin-menu-button" data-action="admin-toggle-menu" aria-label="Mở menu">${icon('menu', 20)}</button><div class="admin-topbar-crumb"><small>Ví Mình / Quản trị</small><strong>${title}</strong></div></header><div class="admin-content">${content}</div></main>${adminUi.pendingStatus ? statusDialog() : ''}${adminUi.pendingRole ? roleDialog() : ''}${userDetailDialog()}</div>`;
}

export async function handleAdminAction(action, button, context) {
  const { render, toast } = context;
  if (action === 'admin-toggle-menu') {
    context.appState.adminMenuOpen = !context.appState.adminMenuOpen;
    render();
    return;
  }
  if (action === 'admin-close-menu') {
    context.appState.adminMenuOpen = false;
    render();
    return;
  }
  if (action === 'admin-agent-refresh') {
    const request = loadAdminView('admin-agent');
    render();
    await request;
    render();
    return;
  }
  if (action === 'admin-agent-clear') {
    adminUi.agentMessages = [];
    adminUi.agentDraft = '';
    adminUi.agentExportContext = null;
    render();
    return;
  }
  if (action === 'admin-agent-suggestion') {
    appendAdminAgentPrompt(button.dataset.prompt, context);
    return;
  }
  if (action === 'admin-agent-export') {
    const dataset = button.dataset.dataset;
    const format = button.dataset.format;
    if (!['overview', 'growth', 'users', 'audit', 'analytics'].includes(dataset) || !['xlsx', 'pdf'].includes(format)) return;
    const params = { dataset, format };
    if (button.dataset.from && button.dataset.to) {
      params.from = button.dataset.from;
      params.to = button.dataset.to;
    }
    button.disabled = true;
    try {
      const filename = await downloadExport('/api/admin/exports', params, `vi-minh-admin-${dataset}.${format}`);
      toast(`Đã tải ${filename}.`, 'success');
    } catch (error) {
      toast(error.message || 'Chưa xuất được tệp. Hãy thử lại.', 'error');
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (action === 'admin-retry' || action === 'admin-refresh') {
    const pending = loadAdminView();
    render();
    await pending;
    render();
    return;
  }
  if (action === 'admin-clear-filters') {
    adminUi.filters = { q: '', status: 'all', role: 'all', verified: 'all', sort: 'newest', page: 1, pageSize: 10 };
    const pending = loadAdminView('admin-users');
    render();
    await pending;
    render();
    return;
  }
  if (action === 'admin-clear-audit-filters') {
    adminUi.auditFilters = { q: '', action: 'all', from: '', to: '' };
    adminUi.auditPagination.page = 1;
    const pending = loadAdminView('admin-audit');
    render();
    await pending;
    render();
    return;
  }
  if (action === 'admin-view-user') {
    adminUi.selectedUser = null;
    adminUi.detailError = null;
    adminUi.detailLoading = true;
    const request = fetchAdminUser(button.dataset.id);
    render();
    try {
      const result = await request;
      adminUi.selectedUser = result.user;
    } catch (error) {
      adminUi.detailError = error;
    } finally {
      adminUi.detailLoading = false;
    }
    render();
    return;
  }
  if (action === 'admin-close-user-detail') {
    adminUi.selectedUser = null;
    adminUi.detailError = null;
    adminUi.detailLoading = false;
    render();
    return;
  }
  if (action === 'admin-revoke-sessions') {
    const userId = button.dataset.id;
    if (!userId) return;
    adminUi.revokingSessions = true;
    render();
    try {
      const result = await revokeAdminUserSessions(userId);
      toast(`Đã thu hồi ${result.revokedCount} phiên đăng nhập của người dùng.`, 'success');
      const refreshed = await fetchAdminUser(userId);
      adminUi.selectedUser = refreshed.user;
    } catch (error) {
      toast(error.message || 'Chưa thu hồi được phiên đăng nhập.', 'error');
    } finally {
      adminUi.revokingSessions = false;
      render();
    }
    return;
  }
  if (action === 'admin-confirm-role') {
    adminUi.roleError = '';
    adminUi.pendingRole = {
      id: button.dataset.id,
      fullName: button.dataset.name || 'tài khoản này',
      role: button.dataset.role
    };
    render();
    return;
  }
  if (action === 'admin-cancel-role') {
    adminUi.pendingRole = null;
    adminUi.roleError = '';
    render();
    return;
  }
  if (action === 'admin-purge-unverified') {
    adminUi.purgingQueue = true;
    render();
    try {
      const result = await purgeAdminUnverifiedUsers(7);
      toast(result.purgedCount ? `Đã dọn dẹp ${result.purgedCount} tài khoản chưa xác minh quá 7 ngày.` : 'Không có tài khoản chưa xác minh nào quá 7 ngày cần dọn.', 'success');
      await loadAdminView('admin-verification');
    } catch (error) {
      toast(error.message || 'Chưa dọn dẹp được hàng đợi xác minh.', 'error');
    } finally {
      adminUi.purgingQueue = false;
      render();
    }
    return;
  }
  if (action === 'admin-toggle-announcement') {
    const id = button.dataset.id;
    const isActive = button.dataset.active === 'true';
    button.disabled = true;
    try {
      await updateAdminAnnouncement(id, { isActive });
      toast(isActive ? 'Đã bật hiển thị thông báo.' : 'Đã tạm tắt thông báo.', 'success');
      await loadAdminView('admin-announcements');
      render();
    } catch (error) {
      button.disabled = false;
      toast(error.message || 'Chưa cập nhật được thông báo.', 'error');
    }
    return;
  }
  if (action === 'admin-delete-announcement') {
    const id = button.dataset.id;
    button.disabled = true;
    try {
      await deleteAdminAnnouncement(id);
      toast('Đã xóa thông báo hệ thống.', 'success');
      await loadAdminView('admin-announcements');
      render();
    } catch (error) {
      button.disabled = false;
      toast(error.message || 'Chưa xóa được thông báo.', 'error');
    }
    return;
  }
  if (action === 'admin-toggle-setting') {
    const key = button.dataset.key;
    const enabled = button.dataset.enabled === 'true';
    adminUi.savingSettingKey = key;
    render();
    try {
      await updateAdminSetting(key, enabled);
      toast(`Đã cập nhật cấu hình ${key} → ${enabled ? 'BẬT' : 'TẮT'}.`, 'success');
      await loadAdminView('admin-settings');
    } catch (error) {
      toast(error.message || 'Chưa cập nhật được cấu hình.', 'error');
    } finally {
      adminUi.savingSettingKey = null;
      render();
    }
    return;
  }
  if (action === 'admin-toggle-template') {
    const id = button.dataset.id;
    const isEnabled = button.dataset.enabled === 'true';
    button.disabled = true;
    try {
      await updateAdminCategoryTemplate(id, { isEnabled });
      toast(isEnabled ? 'Đã bật danh mục mẫu.' : 'Đã ẩn danh mục mẫu.', 'success');
      await loadAdminView('admin-settings');
      render();
    } catch (error) {
      button.disabled = false;
      toast(error.message || 'Chưa cập nhật được danh mục mẫu.', 'error');
    }
    return;
  }
  if (action === 'admin-confirm-status') {
    adminUi.pendingStatus = { id: button.dataset.id, fullName: button.dataset.name || 'tài khoản này', status: button.dataset.status };
    render();
    return;
  }
  if (action === 'admin-cancel-status') {
    adminUi.pendingStatus = null;
    render();
    return;
  }
  if (action === 'admin-apply-status' && adminUi.pendingStatus) {
    const pendingStatus = adminUi.pendingStatus;
    adminUi.savingStatus = true;
    render();
    try {
      const result = await updateAdminUserStatus(pendingStatus.id, pendingStatus.status);
      adminUi.pendingStatus = null;
      adminUi.savingStatus = false;
      toast(result.changed ? (pendingStatus.status === 'disabled' ? 'Đã khóa tài khoản và thu hồi các phiên đăng nhập.' : 'Đã mở khóa tài khoản.') : 'Trạng thái tài khoản không thay đổi.', 'success');
      const request = loadAdminView();
      render();
      await request;
      render();
    } catch (error) {
      adminUi.savingStatus = false;
      toast(error.message || 'Chưa cập nhật được trạng thái tài khoản.', 'error');
      render();
    }
    return;
  }
  if (action === 'admin-users-page') {
    adminUi.filters.page = Number(button.dataset.page);
    const request = loadAdminView('admin-users');
    render();
    await request;
    render();
    return;
  }
  if (action === 'admin-security-page') {
    adminUi.securityFilters.page = Number(button.dataset.page);
    const request = loadAdminView('admin-security');
    render();
    await request;
    render();
    return;
  }
  if (action === 'admin-audit-page') {
    adminUi.auditPagination.page = Number(button.dataset.page);
    const request = loadAdminView('admin-audit');
    render();
    await request;
    render();
  }
}

export async function submitAdminSearch(form, context) {
  if (form.id === 'admin-audit-filter-form') {
    adminUi.auditFilters.q = new FormData(form).get('q')?.toString().trim() || '';
    adminUi.auditPagination.page = 1;
    const request = loadAdminView('admin-audit');
    context.render();
    await request;
    context.render();
    return;
  }
  adminUi.filters.q = new FormData(form).get('q')?.toString().trim() || '';
  adminUi.filters.page = 1;
  const request = loadAdminView('admin-users');
  context.render();
  await request;
  context.render();
}

export async function submitAdminForm(form, context) {
  const { render, toast } = context;
  const formType = form.dataset.form;

  if (formType === 'admin-role-change' && adminUi.pendingRole) {
    const adminPassword = new FormData(form).get('adminPassword')?.toString() || '';
    if (!adminPassword) {
      adminUi.roleError = 'Vui lòng nhập mật khẩu Admin để xác nhận.';
      render();
      return;
    }
    adminUi.savingRole = true;
    adminUi.roleError = '';
    render();
    try {
      const target = adminUi.pendingRole;
      const result = await updateAdminUserRole(target.id, target.role, adminPassword);
      adminUi.pendingRole = null;
      adminUi.savingRole = false;
      toast(result.changed ? `Đã cập nhật vai trò của ${target.fullName} thành ${target.role.toUpperCase()}.` : 'Vai trò không thay đổi.', 'success');
      if (adminUi.selectedUser?.id === target.id) {
        const detail = await fetchAdminUser(target.id);
        adminUi.selectedUser = detail.user;
      }
      await loadAdminView();
      render();
    } catch (error) {
      adminUi.savingRole = false;
      adminUi.roleError = error.message || 'Mật khẩu xác nhận không đúng hoặc không thể đổi vai trò.';
      render();
    }
    return;
  }

  if (formType === 'admin-announcement') {
    const fd = new FormData(form);
    const payload = {
      title: fd.get('title')?.toString().trim() || '',
      body: fd.get('body')?.toString().trim() || '',
      severity: fd.get('severity')?.toString() || 'info',
      endsAt: fd.get('endsAt')?.toString() || null
    };
    adminUi.savingAnnouncement = true;
    render();
    try {
      await createAdminAnnouncement(payload);
      form.reset();
      toast('Đã đăng thông báo hệ thống.', 'success');
      await loadAdminView('admin-announcements');
    } catch (error) {
      toast(error.message || 'Chưa tạo được thông báo hệ thống.', 'error');
    } finally {
      adminUi.savingAnnouncement = false;
      render();
    }
    return;
  }

  if (formType === 'admin-category-template') {
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name')?.toString().trim() || '',
      kind: fd.get('kind')?.toString() || 'expense',
      color: fd.get('color')?.toString() || '#2563EB'
    };
    adminUi.savingTemplate = true;
    render();
    try {
      await createAdminCategoryTemplate(payload);
      form.reset();
      toast('Đã thêm danh mục vào bộ mẫu mặc định.', 'success');
      await loadAdminView('admin-settings');
    } catch (error) {
      toast(error.message || 'Chưa thêm được danh mục mẫu.', 'error');
    } finally {
      adminUi.savingTemplate = false;
      render();
    }
    return;
  }

  if (formType === 'admin-support-ticket') {
    const id = form.dataset.id;
    const fd = new FormData(form);
    const payload = {
      status: fd.get('status')?.toString() || 'open',
      adminNote: fd.get('adminNote')?.toString().trim() || ''
    };
    try {
      await updateAdminSupportTicket(id, payload);
      toast('Đã lưu phản hồi và trạng thái phiếu hỗ trợ.', 'success');
      await loadAdminView('admin-support');
      render();
    } catch (error) {
      toast(error.message || 'Chưa cập nhật được phiếu hỗ trợ.', 'error');
    }
  }
}

export async function changeAdminFilter(target, context) {
  const periodViews = new Set(['admin-overview', 'admin-analytics', 'admin-agent']);
  const overviewView = periodViews.has(adminUi.view) ? adminUi.view : 'admin-overview';
  if (target.matches('[data-admin-period]')) {
    setAdminPeriod(target.value);
    context.render();
    if (target.value !== 'custom') {
      const request = loadAdminView(overviewView);
      context.render();
      await request;
      context.render();
    }
    return true;
  }
  if (target.matches('[data-admin-date]')) {
    adminUi[target.dataset.adminDate] = target.value;
    if (adminUi.from && adminUi.to && adminUi.from > adminUi.to) {
      adminUi.dateError = 'Ngày bắt đầu không được sau ngày kết thúc.';
      context.render();
    } else if (adminUi.from && adminUi.to) {
      adminUi.dateError = '';
      const request = loadAdminView(overviewView);
      context.render();
      await request;
      context.render();
    } else {
      adminUi.dateError = 'Chọn ngày bắt đầu và kết thúc.';
      context.render();
    }
    return true;
  }
  if (target.matches('[data-admin-filter]')) {
    adminUi.filters[target.dataset.adminFilter] = target.value;
    adminUi.filters.page = 1;
    const request = loadAdminView('admin-users');
    context.render();
    await request;
    context.render();
    return true;
  }
  if (target.matches('[data-admin-security-filter]')) {
    adminUi.securityFilters[target.dataset.adminSecurityFilter] = target.value;
    adminUi.securityFilters.page = 1;
    const request = loadAdminView('admin-security');
    context.render();
    await request;
    context.render();
    return true;
  }
  if (target.matches('[data-admin-ticket-filter]')) {
    adminUi.ticketFilter = target.value;
    const request = loadAdminView('admin-support');
    context.render();
    await request;
    context.render();
    return true;
  }
  if (target.matches('[data-admin-audit-filter]')) {
    adminUi.auditFilters[target.dataset.adminAuditFilter] = target.value;
    adminUi.auditPagination.page = 1;
    const request = loadAdminView('admin-audit');
    context.render();
    await request;
    context.render();
    return true;
  }
  return false;
}
