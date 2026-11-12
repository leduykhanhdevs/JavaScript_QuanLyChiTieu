import { createReadStream } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { env, hasCurrencyApiConfig, validateRuntimeConfig } from './config/env.js';
import { pool } from './db/pool.js';
import { sendError, sendJson, readJson } from './lib/http.js';
import { AppError } from './lib/errors.js';
import { mapDatabaseError } from './lib/validation.js';
import { readCookie } from './lib/security.js';
import { authenticate } from './services/auth-service.js';
import { handleAuthRoute } from './routes/auth-routes.js';
import { handleAdminRoute } from './routes/admin-routes.js';
import { handleFinanceRoute } from './routes/finance-routes.js';
import { handleBankHubRoute } from './routes/bank-hub-routes.js';
import { recordSecurityEvent } from './services/admin-service.js';

validateRuntimeConfig();
const publicDir = env.serveStatic
  ? resolve(dirname(fileURLToPath(import.meta.url)), '../public')
  : '';
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.webp', 'image/webp'], ['.ico', 'image/x-icon'], ['.ttf', 'font/ttf'],
  ['.wasm', 'application/wasm'], ['.gz', 'application/gzip']
]);
const attempts = new Map();
const RATE_LIMITS = new Map([
  ['/api/auth/login', [20, 15 * 60_000]], ['/api/auth/register', [8, 60 * 60_000]], ['/api/auth/forgot-password', [5, 15 * 60_000]],
  ['/api/auth/resend-verification', [5, 15 * 60_000]], ['/api/auth/verify-email-code', [10, 15 * 60_000]], ['/api/auth/reset-password', [10, 15 * 60_000]],
  ['/api/settings/profile/email-change/authorization', [3, 15 * 60_000]], ['/api/settings/profile/email-change/authorization/confirm', [10, 15 * 60_000]],
  ['/api/settings/profile/email-change/cancel', [5, 15 * 60_000]],
  ['/api/settings/profile/email-verification', [3, 15 * 60_000]], ['/api/settings/profile/email-verification/confirm', [10, 15 * 60_000]],
  ['/api/bank-hub/connections/start', [3, 15 * 60_000]], ['/api/bank-hub/attempt/status', [10, 60_000]],
  ['/api/support-tickets', [5, 15 * 60_000]]
]);

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  };
}

function checkRateLimit(pathname, ip) {
  const rule = RATE_LIMITS.get(pathname);
  if (!rule) return;
  const [limit, duration] = rule;
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const old = attempts.get(key);
  const record = !old || old.resetAt <= now ? { count: 0, resetAt: now + duration } : old;
  record.count += 1;
  attempts.set(key, record);
  if (record.count > limit) {
    void recordSecurityEvent(pool, { eventType: 'rate_limited', email: null, ip, routePath: pathname });
    throw new AppError(429, 'RATE_LIMITED', 'Bạn thử quá nhiều lần. Hãy đợi một lúc rồi thử lại.');
  }
  if (attempts.size > 5_000) for (const [savedKey, value] of attempts) if (value.resetAt <= now) attempts.delete(savedKey);
}

function checkOrigin(req) {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return;
  const origin = req.headers.origin;
  if (!origin) return;
  let parsed;
  try { parsed = new URL(origin); } catch { throw new AppError(403, 'INVALID_ORIGIN', 'Nguồn gửi yêu cầu không hợp lệ.'); }
  if (parsed.origin !== new URL(env.appBaseUrl).origin) throw new AppError(403, 'INVALID_ORIGIN', 'Yêu cầu phải được gửi từ website Ví Mình.');
}

function hasValidEdgeProxySecret(req) {
  if (!env.edgeProxySecret) return !env.nodeEnv || env.nodeEnv !== 'production';
  const receivedSecret = req.headers['x-edge-proxy-secret'];
  if (typeof receivedSecret !== 'string') return false;
  const expected = Buffer.from(env.edgeProxySecret);
  const received = Buffer.from(receivedSecret);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function requestClientIp(req) {
  const forwardedIp = req.headers['x-edge-client-ip'];
  if (env.edgeProxySecret && typeof forwardedIp === 'string' && forwardedIp.length <= 64) return forwardedIp;
  return req.socket.remoteAddress || 'local';
}

async function sendStatic(pathname, res) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return false; }
  if (decoded === '/') decoded = '/index.html';
  const file = resolve(publicDir, `.${decoded === '/admin' || decoded.startsWith('/admin/') ? '/index.html' : decoded}`);
  if (file !== publicDir && !file.startsWith(`${publicDir}${sep}`)) return false;
  try {
    const details = await stat(file);
    if (!details.isFile()) return false;
    const fileExtension = extname(file).toLowerCase();
    const contentType = MIME_TYPES.get(fileExtension);
    if (!contentType) return false;
    res.writeHead(200, {
      ...securityHeaders(), 'Content-Type': contentType, 'Content-Length': details.size,
      'Cache-Control': fileExtension === '.html' ? 'no-store' : ['.css', '.js'].includes(fileExtension) ? 'no-cache' : 'public, max-age=300'
    });
    createReadStream(file).pipe(res);
    return true;
  } catch { return false; }
}

async function handler(req, res) {
  Object.entries(securityHeaders()).forEach(([name, value]) => res.setHeader(name, value));
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/healthz' && req.method === 'GET') {
      try { await pool.query('SELECT 1'); return sendJson(res, 200, { status: 'ok', database: 'connected' }); }
      catch { return sendJson(res, 503, { status: 'degraded', database: 'unavailable' }); }
    }
    if (!url.pathname.startsWith('/api/')) {
      if (env.serveStatic && await sendStatic(url.pathname, res)) return;
      return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy trang.' } });
    }
    if (!hasValidEdgeProxySecret(req)) throw new AppError(403, 'EDGE_PROXY_REQUIRED', 'Yêu cầu API phải đi qua Cloudflare.');
    checkOrigin(req);
    checkRateLimit(url.pathname, requestClientIp(req));
    const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? await readJson(req) : {};
    let user = null;
    if (url.pathname === '/api/auth/me' || (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'))) {
      const sessionToken = readCookie(req.headers.cookie);
      if (sessionToken) user = await authenticate(pool, sessionToken);
    }
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
      && !url.pathname.startsWith('/api/auth/')
      && !url.pathname.startsWith('/api/admin')
      && user?.role !== 'admin') {
      const maint = await pool.query("SELECT enabled FROM app_settings WHERE key = 'maintenance_mode'").catch(() => ({ rows: [] }));
      if (maint.rows[0]?.enabled === true) {
        throw new AppError(503, 'MAINTENANCE_MODE', 'Hệ thống đang trong chế độ bảo trì định kỳ. Các thao tác ghi tạm thời gián đoạn, vui lòng thử lại sau.');
      }
    }
    const ctx = { req, res, url, body, db: pool, user, responseHeaders: {} };
    let response = await handleAuthRoute(ctx);
    if (response === true) return;
    if (!response) response = await handleAdminRoute(ctx);
    if (response === true) return;
    if (!response) response = await handleBankHubRoute(ctx);
    if (response === true) return;
    if (!response) response = await handleFinanceRoute(ctx);
    if (response === true) return;
    if (!response) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy chức năng API.' } });
    const [status, payload] = response;
    sendJson(res, status, payload, ctx.responseHeaders);
  } catch (error) {
    const safeDatabaseError = mapDatabaseError(error);
    if (safeDatabaseError) return sendError(res, safeDatabaseError);
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '28P01', '3D000'].includes(error.code)) return sendError(res, new AppError(503, 'DATABASE_UNAVAILABLE', 'Không kết nối được PostgreSQL. Kiểm tra dịch vụ và cấu hình DATABASE_* trong .env.'));
    return sendError(res, error);
  }
}

export function createAppServer() {
  const server = createServer(handler);
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
