import { AppError } from '../lib/errors.js';
import { objectBody } from '../lib/validation.js';
import { authenticate, forgotPassword, login, logout, register, resendVerification, resetPassword, verifyEmail, verifyRegistrationEmailCode } from '../services/auth-service.js';
import { expiredSessionCookie, readCookie, sessionCookie } from '../lib/security.js';

export async function handleAuthRoute(ctx) {
  const { req, res, url, db } = ctx;
  const { pathname } = url;
  const clientIp = req.socket?.remoteAddress || 'local';
  const body = () => objectBody(ctx.body);
  if (req.method === 'POST' && pathname === '/api/auth/register') return [201, await register(db, body())];
  if (req.method === 'POST' && pathname === '/api/auth/resend-verification') return [200, await resendVerification(db, body().email)];
  if (req.method === 'POST' && pathname === '/api/auth/verify-email-code') {
    const data = body();
    return [200, await verifyRegistrationEmailCode(db, data.email, data.verificationCode, clientIp)];
  }
  if (req.method === 'GET' && pathname === '/api/auth/verify-email') return [200, await verifyEmail(db, url.searchParams.get('token'))];
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const result = await login(db, body(), clientIp);
    ctx.responseHeaders['Set-Cookie'] = sessionCookie(result.token);
    return [200, { user: result.user }];
  }
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    await logout(db, readCookie(req.headers.cookie));
    ctx.responseHeaders['Set-Cookie'] = expiredSessionCookie();
    return [200, { message: 'Bạn đã đăng xuất.' }];
  }
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    if (!ctx.user) throw new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    return [200, { user: ctx.user }];
  }
  if (req.method === 'POST' && pathname === '/api/auth/forgot-password') return [200, await forgotPassword(db, body().email, clientIp)];
  if (req.method === 'POST' && pathname === '/api/auth/reset-password') {
    const data = body();
    return [200, await resetPassword(db, data.token, data.password, data.passwordConfirmation)];
  }
  return null;
}
