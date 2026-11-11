import { get, patch, post, remove } from './client.js';

const queryString = (values = {}) => new URLSearchParams(
  Object.entries(values).filter(([, value]) => value !== '' && value != null)
).toString();

export const fetchAdminOverview = (params) => get(`/api/admin/overview?${queryString(params)}`);
export const fetchAdminAnalytics = (params) => get(`/api/admin/analytics?${queryString(params)}`);
export const fetchAdminVerificationQueue = () => get('/api/admin/verification-queue');
export const purgeAdminUnverifiedUsers = (olderThanDays = 7) => post('/api/admin/verification-queue/purge', { olderThanDays });
export const fetchAdminDetailedHealth = () => get('/api/admin/health/detailed');
export const fetchAdminUsers = (params) => get(`/api/admin/users?${queryString(params)}`);
export const fetchAdminUser = (id) => get(`/api/admin/users/${encodeURIComponent(id)}`);
export const updateAdminUserStatus = (id, status) => patch(`/api/admin/users/${encodeURIComponent(id)}/status`, { status });
export const updateAdminUserRole = (id, role, adminPassword) => patch(`/api/admin/users/${encodeURIComponent(id)}/role`, { role, adminPassword });
export const revokeAdminUserSessions = (id) => post(`/api/admin/users/${encodeURIComponent(id)}/revoke-sessions`, {});
export const fetchAdminAuditLogs = (params) => get(`/api/admin/audit-logs?${queryString(params)}`);
export const fetchAdminSecurityEvents = (params) => get(`/api/admin/security-events?${queryString(params)}`);
export const fetchAdminAnnouncements = () => get('/api/admin/announcements');
export const createAdminAnnouncement = (payload) => post('/api/admin/announcements', payload);
export const updateAdminAnnouncement = (id, payload) => patch(`/api/admin/announcements/${encodeURIComponent(id)}`, payload);
export const deleteAdminAnnouncement = (id) => remove(`/api/admin/announcements/${encodeURIComponent(id)}`);
export const fetchAdminSettings = () => get('/api/admin/settings');
export const updateAdminSetting = (key, enabled) => patch('/api/admin/settings', { key, enabled });
export const createAdminCategoryTemplate = (payload) => post('/api/admin/category-templates', payload);
export const updateAdminCategoryTemplate = (id, payload) => patch(`/api/admin/category-templates/${encodeURIComponent(id)}`, payload);
export const fetchAdminSupportTickets = (params) => get(`/api/admin/support-tickets?${queryString(params)}`);
export const updateAdminSupportTicket = (id, payload) => patch(`/api/admin/support-tickets/${encodeURIComponent(id)}`, payload);
