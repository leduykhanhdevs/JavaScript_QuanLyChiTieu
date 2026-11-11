import { AppError } from '../lib/errors.js';
import { objectBody } from '../lib/validation.js';
import {
  changeAdminUserRole,
  changeAdminUserStatus,
  createAdminAnnouncement,
  createAdminCategoryTemplate,
  deleteAdminAnnouncement,
  getAdminAnalytics,
  getAdminDetailedHealth,
  getAdminOverview,
  getAdminSettingsAndTemplates,
  getAdminUser,
  getAdminVerificationQueue,
  listAdminAnnouncements,
  listAdminAuditLogs,
  listAdminSecurityEvents,
  listAdminSupportTickets,
  listAdminUsers,
  purgeStaleUnverifiedUsers,
  revokeAdminUserSessions,
  updateAdminAnnouncement,
  updateAdminAppSetting,
  updateAdminCategoryTemplate,
  updateAdminSupportTicket
} from '../services/admin-service.js';
import { sendBuffer } from '../lib/http.js';
import { createAdminExport } from '../services/export-service.js';

export async function handleAdminRoute(ctx) {
  const { req, res, url, db, user } = ctx;
  const { pathname } = url;
  if (pathname !== '/api/admin' && !pathname.startsWith('/api/admin/')) return null;
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập bằng tài khoản Admin.');
  if (user.role !== 'admin') throw new AppError(403, 'ADMIN_REQUIRED', 'Bạn không có quyền truy cập khu vực quản trị.');
  const body = () => objectBody(ctx.body);

  if (req.method === 'GET' && pathname === '/api/admin/exports') {
    const file = await createAdminExport(db, url.searchParams);
    sendBuffer(res, 200, file.buffer, file.contentType, { 'Content-Disposition': `attachment; filename="${file.filename}"` });
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/admin/overview') return [200, await getAdminOverview(db, url.searchParams)];
  if (req.method === 'GET' && pathname === '/api/admin/analytics') return [200, await getAdminAnalytics(db, url.searchParams)];
  if (req.method === 'GET' && pathname === '/api/admin/verification-queue') return [200, await getAdminVerificationQueue(db)];
  if (req.method === 'POST' && pathname === '/api/admin/verification-queue/purge') {
    return [200, await purgeStaleUnverifiedUsers(db, user.id, body().olderThanDays)];
  }
  if (req.method === 'GET' && pathname === '/api/admin/health/detailed') return [200, await getAdminDetailedHealth(db)];
  if (req.method === 'GET' && pathname === '/api/admin/health') {
    try { await db.query('SELECT 1'); return [200, { api: 'available', database: 'available' }]; }
    catch { return [200, { api: 'available', database: 'unavailable' }]; }
  }
  if (req.method === 'GET' && pathname === '/api/admin/users') return [200, await listAdminUsers(db, url.searchParams)];
  if (req.method === 'GET' && pathname === '/api/admin/audit-logs') return [200, await listAdminAuditLogs(db, url.searchParams)];
  if (req.method === 'GET' && pathname === '/api/admin/security-events') return [200, await listAdminSecurityEvents(db, url.searchParams)];

  if (req.method === 'GET' && pathname === '/api/admin/announcements') return [200, await listAdminAnnouncements(db)];
  if (req.method === 'POST' && pathname === '/api/admin/announcements') {
    return [201, await createAdminAnnouncement(db, user.id, body())];
  }
  const announcementMatch = pathname.match(/^\/api\/admin\/announcements\/([^/]+)$/);
  if (announcementMatch && req.method === 'PATCH') {
    return [200, await updateAdminAnnouncement(db, user.id, announcementMatch[1], body())];
  }
  if (announcementMatch && req.method === 'DELETE') {
    return [200, await deleteAdminAnnouncement(db, user.id, announcementMatch[1])];
  }

  if (req.method === 'GET' && pathname === '/api/admin/settings') return [200, await getAdminSettingsAndTemplates(db)];
  if (req.method === 'PATCH' && pathname === '/api/admin/settings') {
    return [200, await updateAdminAppSetting(db, user.id, body())];
  }
  if (req.method === 'POST' && pathname === '/api/admin/category-templates') {
    return [201, await createAdminCategoryTemplate(db, user.id, body())];
  }
  const templateMatch = pathname.match(/^\/api\/admin\/category-templates\/([^/]+)$/);
  if (templateMatch && req.method === 'PATCH') {
    return [200, await updateAdminCategoryTemplate(db, user.id, templateMatch[1], body())];
  }

  if (req.method === 'GET' && pathname === '/api/admin/support-tickets') {
    return [200, await listAdminSupportTickets(db, url.searchParams)];
  }
  const ticketMatch = pathname.match(/^\/api\/admin\/support-tickets\/([^/]+)$/);
  if (ticketMatch && req.method === 'PATCH') {
    return [200, await updateAdminSupportTicket(db, user.id, ticketMatch[1], body())];
  }

  const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (req.method === 'GET' && userMatch) return [200, await getAdminUser(db, userMatch[1])];
  const statusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (req.method === 'PATCH' && statusMatch) {
    return [200, await changeAdminUserStatus(db, user.id, statusMatch[1], body().status)];
  }
  const roleMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
  if (req.method === 'PATCH' && roleMatch) {
    const data = body();
    return [200, await changeAdminUserRole(db, user.id, roleMatch[1], data.role, data.adminPassword)];
  }
  const revokeMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/revoke-sessions$/);
  if (req.method === 'POST' && revokeMatch) {
    return [200, await revokeAdminUserSessions(db, user.id, revokeMatch[1])];
  }
  return null;
}
