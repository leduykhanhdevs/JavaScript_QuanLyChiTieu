import { hasSePayBankHubConfig, isProduction } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { hashToken, randomToken, readCookie } from '../lib/security.js';
import {
  createSePayBankLink,
  decryptBankSecret,
  encryptBankSecret,
  getSePayLinkTokenStatus,
  isSafeHostedLink
} from '../services/sepay-bankhub-service.js';

export const BANK_CONSENT_VERSION = '1.0.0';
const providerCode = 'sepay_bankhub';
const launchCookieName = 'qlct_bankhub_launch';
const bankCodes = new Set(['vpbank', 'tpbank', 'vietinbank', 'acb', 'bidv', 'mbbank', 'ocb', 'kienlongbank', 'msb', 'sacombank']);
const sandboxBankCodes = new Set(['vpbank', 'vietinbank', 'acb', 'bidv', 'mbbank', 'ocb', 'kienlongbank', 'sacombank']);

function requireUser(user) {
  if (!user?.id) throw new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
}

function launchCookie(value, maxAge) {
  const secure = isProduction ? '; Secure' : '';
  return `${launchCookieName}=${encodeURIComponent(value)}; Path=/api/bank-hub/launch; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function clearedLaunchCookie() {
  const secure = isProduction ? '; Secure' : '';
  return `${launchCookieName}=; Path=/api/bank-hub/launch; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function noSecrets(attempt) {
  return {
    status: attempt.status,
    bankCode: attempt.requested_bank_code,
    bankName: attempt.provider_bank_name || null,
    accountNumberLast4: attempt.account_number_last4?.trim() || null,
    createdAt: attempt.created_at,
    expiresAt: attempt.expires_at
  };
}

function maskLastFour(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

async function beginBankLink(ctx) {
  requireUser(ctx.user);
  if (!ctx.req.headers.origin) throw new AppError(403, 'ORIGIN_REQUIRED', 'Yêu cầu liên kết phải bắt đầu từ website Ví Mình.');
  if (!hasSePayBankHubConfig) throw new AppError(503, 'BANK_HUB_NOT_CONFIGURED', 'SePay Bank Hub sandbox chưa được cấu hình đầy đủ trên máy chủ.');

  const bankCode = String(ctx.body.bankCode || '').trim().toLowerCase();
  if (!bankCodes.has(bankCode)) throw new AppError(400, 'BANK_NOT_SUPPORTED', 'Ngân hàng này không nằm trong danh sách Bank Hub của Ví Mình.');
  if (!sandboxBankCodes.has(bankCode)) throw new AppError(400, 'BANK_NOT_IN_SANDBOX', 'Ngân hàng này chưa có tài khoản mẫu trong sandbox SePay.');
  if (ctx.body.consent !== true || ctx.body.consentVersion !== BANK_CONSENT_VERSION) {
    throw new AppError(400, 'BANK_CONSENT_REQUIRED', 'Hãy đọc và đồng ý riêng với nội dung liên kết ngân hàng trước khi tiếp tục.');
  }

  const openAttempt = await ctx.db.query(
    `SELECT 1 FROM bank_link_attempts
     WHERE user_id = $1 AND status = 'launched' AND expires_at > now()
     LIMIT 1`,
    [ctx.user.id]
  );
  if (openAttempt.rowCount) throw new AppError(409, 'BANK_LINK_ALREADY_OPEN', 'Bạn đang có một phiên SePay đang mở. Hãy hoàn tất phiên đó hoặc chờ link hết hạn rồi thử lại.');

  const consent = await ctx.db.query(
    `INSERT INTO bank_link_consents (user_id, provider_code, bank_code, consent_version)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [ctx.user.id, providerCode, bankCode, BANK_CONSENT_VERSION]
  );
  const providerLink = await createSePayBankLink();
  const rawLaunchToken = randomToken(32);
  const launchTokenHash = hashToken(rawLaunchToken);
  const maxAge = Math.max(1, Math.min(300, Math.floor((providerLink.expiresAt.getTime() - Date.now()) / 1000)));
  const client = await ctx.db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bank_link_attempts
       SET status = 'abandoned', launch_token_hash = NULL,
           link_token_ciphertext = NULL, hosted_link_url_ciphertext = NULL
       WHERE user_id = $1 AND status = 'ready'`,
      [ctx.user.id]
    );
    const attempt = await client.query(
      `INSERT INTO bank_link_attempts (
         user_id, consent_id, provider_code, requested_bank_code,
         provider_link_token_xid, link_token_ciphertext, hosted_link_url_ciphertext,
         launch_token_hash, status, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready', $9)
       RETURNING id`,
      [
        ctx.user.id,
        consent.rows[0].id,
        providerCode,
        bankCode,
        providerLink.tokenXid,
        encryptBankSecret(providerLink.linkToken),
        encryptBankSecret(providerLink.hostedLinkUrl),
        launchTokenHash,
        providerLink.expiresAt
      ]
    );
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }

  ctx.responseHeaders['Set-Cookie'] = launchCookie(rawLaunchToken, maxAge);
  return [201, { launchPath: '/api/bank-hub/launch' }];
}

async function launchHostedLink(ctx) {
  requireUser(ctx.user);
  const launchToken = readCookie(ctx.req.headers.cookie, launchCookieName);
  if (!launchToken) throw new AppError(410, 'BANK_LINK_LAUNCH_EXPIRED', 'Liên kết đã hết hạn hoặc đã được sử dụng. Hãy bắt đầu lại.');

  const client = await ctx.db.connect();
  let hostedLinkUrl;
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id, hosted_link_url_ciphertext, expires_at
       FROM bank_link_attempts
       WHERE user_id = $1 AND launch_token_hash = $2 AND status = 'ready'
       FOR UPDATE`,
      [ctx.user.id, hashToken(launchToken)]
    );
    if (!found.rowCount || new Date(found.rows[0].expires_at) <= new Date()) {
      if (found.rowCount) {
        await client.query(
          `UPDATE bank_link_attempts SET status = 'expired', launch_token_hash = NULL,
             link_token_ciphertext = NULL, hosted_link_url_ciphertext = NULL
           WHERE id = $1`,
          [found.rows[0].id]
        );
      }
      await client.query('COMMIT');
      ctx.res.writeHead(410, {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Set-Cookie': clearedLaunchCookie(),
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      ctx.res.end('<!doctype html><title>Liên kết đã hết hạn</title><p>Liên kết đã hết hạn hoặc đã được sử dụng. Hãy quay lại Ví Mình và bắt đầu lại.</p>');
      return true;
    }
    hostedLinkUrl = decryptBankSecret(found.rows[0].hosted_link_url_ciphertext);
    if (!isSafeHostedLink(hostedLinkUrl)) throw new AppError(502, 'BANK_PROVIDER_BAD_RESPONSE', 'Hosted Link không thuộc miền SePay đã xác thực.');
    await client.query(
      `UPDATE bank_link_attempts
       SET status = 'launched', launched_at = now(), launch_token_hash = NULL,
           hosted_link_url_ciphertext = NULL
       WHERE id = $1`,
      [found.rows[0].id]
    );
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }

  ctx.res.writeHead(303, {
    Location: hostedLinkUrl,
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'Set-Cookie': clearedLaunchCookie(),
    'X-Content-Type-Options': 'nosniff'
  });
  ctx.res.end();
  return true;
}

async function readAttemptStatus(ctx) {
  requireUser(ctx.user);
  const found = await ctx.db.query(
    `SELECT * FROM bank_link_attempts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [ctx.user.id]
  );
  if (!found.rowCount) return [200, { attempt: null }];
  let attempt = found.rows[0];

  if (['ready', 'launched'].includes(attempt.status) && new Date(attempt.expires_at) <= new Date()) {
    const expired = await ctx.db.query(
      `UPDATE bank_link_attempts SET status = 'expired', launch_token_hash = NULL,
         link_token_ciphertext = NULL, hosted_link_url_ciphertext = NULL
       WHERE id = $1 RETURNING *`,
      [attempt.id]
    );
    attempt = expired.rows[0];
    return [200, { attempt: noSecrets(attempt) }];
  }

  if (attempt.status !== 'launched') return [200, { attempt: noSecrets(attempt) }];
  const providerStatus = await getSePayLinkTokenStatus(decryptBankSecret(attempt.link_token_ciphertext));
  const events = Array.isArray(providerStatus?.events) ? providerStatus.events : [];
  const linkedEvent = events.find((event) => event?.name === 'BANK_ACCOUNT_LINKED'
    && String(event?.metadata?.link_token_xid || '').toLowerCase() === String(attempt.provider_link_token_xid).toLowerCase());
  const failedEvent = events.find((event) => ['LINK_SESSION_FAILED', 'LINK_SESSION_ABANDONED', 'LINK_SESSION_EXPIRED'].includes(event?.name)
    && String(event?.metadata?.link_token_xid || '').toLowerCase() === String(attempt.provider_link_token_xid).toLowerCase());

  if (linkedEvent) {
    const metadata = linkedEvent.metadata || {};
    const updated = await ctx.db.query(
      `UPDATE bank_link_attempts
       SET status = 'linked', completed_at = now(), provider_bank_name = $2,
           account_number_last4 = $3, link_token_ciphertext = NULL
       WHERE id = $1 RETURNING *`,
      [attempt.id, String(metadata.brand_name || '').slice(0, 80) || null, maskLastFour(metadata.account_number)]
    );
    attempt = updated.rows[0];
  } else if (failedEvent || String(providerStatus?.status || '').toLowerCase() === 'expired') {
    const status = failedEvent?.name === 'LINK_SESSION_EXPIRED' || String(providerStatus?.status || '').toLowerCase() === 'expired'
      ? 'expired'
      : failedEvent?.name === 'LINK_SESSION_ABANDONED' ? 'abandoned' : 'failed';
    const updated = await ctx.db.query(
      `UPDATE bank_link_attempts SET status = $2, completed_at = now(), link_token_ciphertext = NULL
       WHERE id = $1 RETURNING *`,
      [attempt.id, status]
    );
    attempt = updated.rows[0];
  }
  return [200, { attempt: noSecrets(attempt) }];
}

export async function handleBankHubRoute(ctx) {
  const { pathname } = ctx.url;
  if (pathname === '/api/bank-hub/status' && ctx.req.method === 'GET') {
    requireUser(ctx.user);
    const recent = await ctx.db.query(
      `SELECT * FROM bank_link_attempts
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [ctx.user.id]
    );
    return [200, {
      configured: hasSePayBankHubConfig,
      environment: 'sandbox',
      bankSelectionSupported: false,
      consentVersion: BANK_CONSENT_VERSION,
      attempt: recent.rowCount ? noSecrets(recent.rows[0]) : null
    }];
  }
  if (pathname === '/api/bank-hub/connections/start' && ctx.req.method === 'POST') return beginBankLink(ctx);
  if (pathname === '/api/bank-hub/launch' && ctx.req.method === 'GET') return launchHostedLink(ctx);
  if (pathname === '/api/bank-hub/attempt/status' && ctx.req.method === 'GET') return readAttemptStatus(ctx);
  return false;
}
