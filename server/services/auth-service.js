import { randomInt } from 'node:crypto';
import { AppError, conflict, unauthorized } from '../lib/errors.js';
import { validateEmail, validatePassword, requiredText } from '../lib/validation.js';
import { hashPassword, hashToken, randomToken, verifyPassword } from '../lib/security.js';
import { env, hasSmtpConfig } from '../config/env.js';
import { LEGAL_VERSIONS } from '../config/legal.js';
import { sendPasswordResetEmail, sendRegistrationVerificationCode } from '../lib/mail.js';
import { recordSecurityEvent } from './admin-service.js';

const DEFAULT_CATEGORIES = [
  ['Lương', 'income', 'salary', '#2563EB'], ['Thưởng', 'income', 'gift', '#60A5FA'], ['Đầu tư', 'income', 'chart', '#7C3AED'], ['Thu nhập khác', 'income', 'plus', '#0EA5E9'],
  ['Ăn uống', 'expense', 'utensils', '#F07D68'], ['Di chuyển', 'expense', 'car', '#3B82F6'], ['Nhà ở', 'expense', 'home', '#8B5CF6'], ['Hóa đơn', 'expense', 'receipt', '#6366F1'],
  ['Mua sắm', 'expense', 'bag', '#EC4899'], ['Sức khỏe', 'expense', 'heart', '#EF4444'], ['Giải trí', 'expense', 'sparkles', '#EAB308'], ['Giáo dục', 'expense', 'book', '#06B6D4'], ['Chi phí khác', 'expense', 'dots', '#64748B']
];
const REGISTRATION_OTP_SEND_COOLDOWN_MS = 60_000;

function userView(row) {
  const version = row.avatarUpdatedAt ? new Date(row.avatarUpdatedAt).getTime() : null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    currency: row.currency || 'VND',
    emailVerifiedAt: row.emailVerifiedAt,
    avatarUrl: row.hasAvatar && version ? `/api/settings/profile/avatar?v=${version}` : null,
    ...(row.status ? { status: row.status } : {})
  };
}

async function inTransaction(db, callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const value = await callback(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function issueEmailToken(db, userId, purpose, ttlMinutes) {
  const token = randomToken();
  await db.query('UPDATE email_tokens SET revoked_at = now() WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL AND revoked_at IS NULL', [userId, purpose]);
  await db.query('INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, now() + ($4 * interval \'1 minute\'))', [userId, purpose, hashToken(token), ttlMinutes]);
  return token;
}

async function deliverRegistrationCode(user, code) {
  const delivery = await sendRegistrationVerificationCode(user.email, user.full_name, code);
  if (!delivery.accepted?.length) {
    const error = new Error('SMTP did not accept the verification recipient.');
    error.code = 'SMTP_RECIPIENT_NOT_ACCEPTED';
    throw error;
  }
  if (env.nodeEnv !== 'production') console.info('[mail] signup_otp accepted by SMTP', { messageId: delivery.messageId, acceptedCount: delivery.accepted.length });
}

async function seedNewAccount(client, userId) {
  let templates = DEFAULT_CATEGORIES;
  try {
    const dbTemplates = await client.query(
      'SELECT name, kind, icon_key, color FROM default_category_templates WHERE is_enabled = true ORDER BY sort_order ASC, name ASC'
    );
    if (dbTemplates.rowCount > 0) {
      templates = dbTemplates.rows.map((row) => [row.name, row.kind, row.icon_key, row.color]);
    }
  } catch {
    templates = DEFAULT_CATEGORIES;
  }
  for (const [name, kind, icon, color] of templates) {
    await client.query('INSERT INTO categories (user_id, name, kind, icon_key, color, is_default) VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT DO NOTHING', [userId, name, kind, icon, color]);
  }
  await client.query("INSERT INTO accounts (user_id, name, kind, opening_balance, icon_key, color) VALUES ($1, 'Tiền mặt', 'cash', 0, 'wallet', '#2563EB') ON CONFLICT DO NOTHING", [userId]);
}

async function activatePendingUser(client, userId) {
  const activated = await client.query(
    "UPDATE users SET status = 'active', email_verified_at = now() WHERE id = $1 AND status = 'pending_email' RETURNING id",
    [userId]
  );
  if (!activated.rowCount) throw new AppError(400, 'EMAIL_NOT_PENDING', 'Tài khoản này không còn chờ xác minh email.');
  await seedNewAccount(client, userId);
}

function requireCurrentLegalConsent(payload) {
  const fields = {};
  if (payload.termsAccepted !== true) fields.termsAccepted = 'Bạn cần đồng ý với Điều khoản sử dụng để tiếp tục.';
  else if (payload.termsVersion !== LEGAL_VERSIONS.terms) fields.termsAccepted = 'Điều khoản đã được cập nhật. Hãy tải lại trang và xem phiên bản mới.';
  if (payload.privacyAccepted !== true) fields.privacyAccepted = 'Bạn cần đồng ý với Thông báo quyền riêng tư để tiếp tục.';
  else if (payload.privacyVersion !== LEGAL_VERSIONS.privacy) fields.privacyAccepted = 'Thông báo quyền riêng tư đã được cập nhật. Hãy tải lại trang và xem phiên bản mới.';
  if (Object.keys(fields).length) throw new AppError(400, 'LEGAL_CONSENT_REQUIRED', 'Vui lòng xem và xác nhận các tài liệu trước khi tiếp tục.', fields);
}

async function recordLegalConsents(db, userId, source) {
  await db.query(
    `INSERT INTO user_consents (user_id, consent_type, document_version, source)
     VALUES ($1, 'terms_of_use', $2, $4), ($1, 'privacy_notice', $3, $4)`,
    [userId, LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy, source]
  );
}

export async function register(db, payload) {
  const regFlag = await db.query("SELECT enabled FROM app_settings WHERE key = 'allow_registration'").catch(() => ({ rows: [] }));
  if (regFlag.rows[0] && regFlag.rows[0].enabled === false) {
    throw new AppError(403, 'REGISTRATION_DISABLED', 'Hệ thống đang tạm khóa đăng ký tài khoản mới theo cấu hình quản trị.');
  }
  requireCurrentLegalConsent(payload);
  if (!hasSmtpConfig) throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP chưa được cấu hình. Hãy điền .env trước khi tạo tài khoản để nhận email xác minh.');
  const { email, normalized } = validateEmail(payload.email);
  const fullName = requiredText(payload.fullName, 'Tên hiển thị', 120);
  const password = validatePassword(payload.password);
  if (payload.passwordConfirmation !== password) throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu xác nhận chưa khớp.', { passwordConfirmation: 'Nhập lại mật khẩu giống nhau.' });
  const passwordHash = await hashPassword(password);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await hashPassword(code);
  const user = await inTransaction(db, async (client) => {
    const inserted = await client.query(
      `INSERT INTO users (email, email_normalized, full_name, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, email, full_name`,
      [email, normalized, fullName, passwordHash]
    );
    await recordLegalConsents(client, inserted.rows[0].id, 'registration');
    const issued = await client.query(
      `INSERT INTO registration_email_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, now() + ($3 * interval '1 minute')) RETURNING expires_at`,
      [inserted.rows[0].id, codeHash, env.emailOtpTtlMinutes]
    );
    return { ...inserted.rows[0], expiresAt: issued.rows[0].expires_at };
  });
  try { await deliverRegistrationCode(user, code); }
  catch (error) {
    if (env.nodeEnv !== 'production') console.error('[mail] signup_otp delivery failed', { code: error.code || error.name || 'UNKNOWN', responseCode: error.responseCode || null });
    await db.query('UPDATE registration_email_codes SET revoked_at = now() WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL', [user.id]);
    throw new AppError(503, 'EMAIL_SEND_FAILED', 'Tài khoản đã được tạo nhưng chưa gửi được mã OTP. Bạn có thể gửi mã sau khi kiểm tra lại cấu hình email.');
  }
  return {
    message: `Tài khoản đã tạo. Mã OTP 6 số đã được gửi đến ${user.email}; mã có hiệu lực trong ${env.emailOtpTtlMinutes} phút.`,
    expiresAt: new Date(user.expiresAt).toISOString()
  };
}

export async function resendVerification(db, emailValue, force = false) {
  if (!hasSmtpConfig) throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP chưa được cấu hình để gửi email.');
  const { normalized } = validateEmail(emailValue);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await hashPassword(code);
  const issued = await inTransaction(db, async (client) => {
    const user = (await client.query(
      "SELECT id, email, full_name FROM users WHERE email_normalized = $1 AND status = 'pending_email' FOR UPDATE",
      [normalized]
    )).rows[0];
    if (!user) return { notPending: true };

    const activeCode = (await client.query(
      `SELECT expires_at, created_at FROM registration_email_codes
       WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       FOR UPDATE`, [user.id]
    )).rows[0];
    if (activeCode && !force) return { notExpired: true, expiresAt: activeCode.expires_at };
    if (activeCode && force && Date.now() - new Date(activeCode.created_at).getTime() < REGISTRATION_OTP_SEND_COOLDOWN_MS) {
      return { recentlySent: true, expiresAt: activeCode.expires_at };
    }

    await client.query('UPDATE registration_email_codes SET revoked_at = now() WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL', [user.id]);
    const result = await client.query(
      `INSERT INTO registration_email_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, now() + ($3 * interval '1 minute')) RETURNING expires_at`,
      [user.id, codeHash, env.emailOtpTtlMinutes]
    );
    return { user, expiresAt: result.rows[0].expires_at };
  });
  if (issued.notPending) return { message: 'Nếu tài khoản còn chờ xác minh, mã OTP mới sẽ được gửi khi mã cũ hết hạn.' };
  if (issued.notExpired) throw new AppError(409, 'OTP_NOT_EXPIRED', 'Mã OTP hiện tại vẫn còn hiệu lực. Hãy nhập mã đó; bạn có thể gửi mã mới khi mã hết hạn.', { expiresAt: new Date(issued.expiresAt).toISOString() });
  if (issued.recentlySent) return {
    message: 'Mã OTP vừa được gửi đến email đăng ký. Hãy nhập mã đó để xác minh.',
    expiresAt: new Date(issued.expiresAt).toISOString()
  };
  try { await deliverRegistrationCode(issued.user, code); }
  catch (error) {
    if (env.nodeEnv !== 'production') console.error('[mail] signup_otp resend failed', { code: error.code || error.name || 'UNKNOWN', responseCode: error.responseCode || null });
    await db.query('UPDATE registration_email_codes SET revoked_at = now() WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL', [issued.user.id]);
    throw new AppError(503, 'EMAIL_SEND_FAILED', 'Chưa gửi được mã OTP mới. Kiểm tra cấu hình SMTP rồi thử lại.');
  }
  return {
    message: `Mã OTP 6 số mới đã được gửi đến email đăng ký. Mã có hiệu lực trong ${env.emailOtpTtlMinutes} phút.`,
    expiresAt: new Date(issued.expiresAt).toISOString()
  };
}

export async function verifyRegistrationEmailCode(db, emailValue, codeValue, clientIp = 'local') {
  const { normalized } = validateEmail(emailValue);
  if (typeof codeValue !== 'string' || !/^\d{6}$/.test(codeValue)) {
    throw new AppError(400, 'INVALID_EMAIL_CODE', 'Mã xác minh cần gồm đúng 6 chữ số.', { verificationCode: 'Nhập mã OTP gồm đúng 6 chữ số.' });
  }
  const outcome = await inTransaction(db, async (client) => {
    const user = (await client.query(
      'SELECT id, status, email_verified_at FROM users WHERE email_normalized = $1 FOR UPDATE', [normalized]
    )).rows[0];
    if (!user) return { invalid: true };
    if (user.status === 'active' && user.email_verified_at) return { alreadyVerified: true };
    if (user.status !== 'pending_email') return { invalid: true };

    const codeRecord = (await client.query(
      `SELECT id, code_hash, attempts, expires_at FROM registration_email_codes
       WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [user.id]
    )).rows[0];
    if (!codeRecord) return { expired: true };
    if (new Date(codeRecord.expires_at).getTime() <= Date.now()) {
      await client.query('UPDATE registration_email_codes SET revoked_at = now() WHERE id = $1', [codeRecord.id]);
      return { expired: true };
    }
    if (codeRecord.attempts >= 5) {
      await client.query('UPDATE registration_email_codes SET revoked_at = now() WHERE id = $1', [codeRecord.id]);
      return { expired: true };
    }
    if (!await verifyPassword(codeValue, codeRecord.code_hash)) {
      const attempts = codeRecord.attempts + 1;
      await client.query(
        `UPDATE registration_email_codes SET attempts = $2,
         revoked_at = CASE WHEN $2 >= 5 THEN now() ELSE revoked_at END WHERE id = $1`,
        [codeRecord.id, attempts]
      );
      return { invalidCode: true, locked: attempts >= 5 };
    }

    await activatePendingUser(client, user.id);
    await client.query('UPDATE registration_email_codes SET consumed_at = now() WHERE id = $1', [codeRecord.id]);
    await client.query('UPDATE registration_email_codes SET revoked_at = now() WHERE user_id = $1 AND id <> $2 AND consumed_at IS NULL AND revoked_at IS NULL', [user.id, codeRecord.id]);
    await client.query("UPDATE email_tokens SET revoked_at = now() WHERE user_id = $1 AND purpose = 'verify_email' AND consumed_at IS NULL AND revoked_at IS NULL", [user.id]);
    return { verified: true };
  });
  if (outcome.alreadyVerified) return { message: 'Email này đã được xác minh.' };
  if (outcome.expired) throw new AppError(400, 'OTP_EXPIRED', 'Mã OTP đã hết hạn hoặc hết lượt thử. Hãy gửi lại mã mới.');
  if (outcome.invalidCode) {
    await recordSecurityEvent(db, {
      eventType: outcome.locked ? 'otp_locked' : 'otp_failed',
      email: normalized,
      ip: clientIp,
      routePath: '/api/auth/verify-email-code'
    });
    const message = outcome.locked ? 'Bạn đã nhập sai 5 lần. Mã OTP này đã bị khóa; hãy gửi mã mới khi hết hạn.' : 'Mã OTP chưa chính xác.';
    throw new AppError(400, outcome.locked ? 'OTP_ATTEMPTS_EXCEEDED' : 'INVALID_EMAIL_CODE', message, { verificationCode: message });
  }
  if (!outcome.verified) throw new AppError(400, 'INVALID_EMAIL_CODE', 'Mã OTP không hợp lệ hoặc tài khoản không còn chờ xác minh.');
  return { message: 'Email đã được xác minh. Bạn có thể đăng nhập.' };
}

export async function verifyEmail(db, tokenValue) {
  if (typeof tokenValue !== 'string' || tokenValue.length < 32 || tokenValue.length > 128) throw new AppError(400, 'INVALID_TOKEN', 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.');
  return inTransaction(db, async (client) => {
    const token = (await client.query(
      `SELECT id, user_id FROM email_tokens
       WHERE token_hash = $1 AND purpose = 'verify_email' AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       FOR UPDATE`, [hashToken(tokenValue)]
    )).rows[0];
    if (!token) throw new AppError(400, 'INVALID_TOKEN', 'Liên kết xác minh không hợp lệ, đã dùng hoặc đã hết hạn.');
    await activatePendingUser(client, token.user_id);
    await client.query('UPDATE email_tokens SET consumed_at = now() WHERE id = $1', [token.id]);
    return { message: 'Email đã xác minh. Bạn có thể đăng nhập.' };
  });
}

export async function login(db, payload, clientIp = 'local') {
  requireCurrentLegalConsent(payload);
  const { normalized } = validateEmail(payload.email);
  if (typeof payload.password !== 'string' || !payload.password) throw new AppError(400, 'VALIDATION_ERROR', 'Hãy nhập mật khẩu.', { password: 'Trường này là bắt buộc.' });
  const user = (await db.query(
    `SELECT id, email, full_name AS "fullName", password_hash, status, role, currency,
            email_verified_at AS "emailVerifiedAt", (avatar_data IS NOT NULL) AS "hasAvatar", avatar_updated_at AS "avatarUpdatedAt"
     FROM users WHERE email_normalized = $1`, [normalized]
  )).rows[0];
  const passwordOk = user ? await verifyPassword(payload.password, user.password_hash) : await verifyPassword(payload.password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  if (!user || !passwordOk) {
    await recordSecurityEvent(db, { eventType: 'login_failed', email: normalized, ip: clientIp, routePath: '/api/auth/login' });
    throw unauthorized('Email hoặc mật khẩu chưa chính xác.');
  }
  if (user.status === 'pending_email') {
    try {
      const otp = await resendVerification(db, user.email, true);
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', otp.message, { expiresAt: otp.expiresAt });
    } catch (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') throw error;
      if (!['SMTP_NOT_CONFIGURED', 'EMAIL_SEND_FAILED'].includes(error.code)) throw error;
      const message = error.code === 'SMTP_NOT_CONFIGURED'
        ? 'Email chưa xác minh. Chưa thể gửi OTP vì SMTP chưa được cấu hình.'
        : 'Email chưa xác minh. Chưa gửi được OTP; hãy kiểm tra cấu hình email rồi thử lại.';
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', message, { deliveryFailed: true });
    }
  }
  if (user.status !== 'active') {
    await recordSecurityEvent(db, { eventType: 'login_failed', email: normalized, ip: clientIp, routePath: '/api/auth/login' });
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản hiện không thể đăng nhập.');
  }
  const token = randomToken();
  await inTransaction(db, async (client) => {
    await recordLegalConsents(client, user.id, 'login');
    await client.query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 * interval \'1 hour\'))', [user.id, hashToken(token), env.sessionTtlHours]);
  });
  await recordSecurityEvent(db, { eventType: 'login_succeeded', email: normalized, ip: clientIp, routePath: '/api/auth/login' });
  return { token, user: userView(user) };
}

export async function authenticate(db, token) {
  if (!token || token.length < 32) throw unauthorized();
  const result = await db.query(
    `SELECT u.id, u.email, u.full_name AS "fullName", u.status, u.role, u.currency,
            u.email_verified_at AS "emailVerifiedAt", (u.avatar_data IS NOT NULL) AS "hasAvatar", u.avatar_updated_at AS "avatarUpdatedAt"
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
    [hashToken(token)]
  );
  if (!result.rowCount) throw unauthorized();
  await db.query('UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1', [hashToken(token)]);
  return userView(result.rows[0]);
}

export async function logout(db, token) {
  if (token) await db.query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [hashToken(token)]);
}

export async function forgotPassword(db, emailValue, clientIp = 'local') {
  if (!hasSmtpConfig) throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP chưa được cấu hình để gửi email khôi phục.');
  const { normalized } = validateEmail(emailValue);
  await recordSecurityEvent(db, { eventType: 'password_reset_requested', email: normalized, ip: clientIp, routePath: '/api/auth/forgot-password' });
  const user = (await db.query("SELECT id, email, full_name FROM users WHERE email_normalized = $1 AND status = 'active'", [normalized])).rows[0];
  if (user) {
    const token = await issueEmailToken(db, user.id, 'password_reset', env.passwordResetTtlMinutes);
    try {
      const delivery = await sendPasswordResetEmail(user.email, user.full_name, token);
      if (env.nodeEnv !== 'production') console.info('[mail] password_reset accepted by SMTP', { messageId: delivery.messageId, acceptedCount: delivery.accepted?.length || 0 });
    } catch (error) {
      if (env.nodeEnv !== 'production') console.error('[mail] password_reset delivery failed', { code: error.code || error.name || 'UNKNOWN', responseCode: error.responseCode || null });
      throw new AppError(503, 'EMAIL_SEND_FAILED', 'Chưa gửi được email khôi phục. Kiểm tra cấu hình SMTP rồi thử lại.');
    }
  } else if (env.nodeEnv !== 'production') {
    console.info('[mail] password_reset skipped: no active account matched');
  }
  return { message: 'Nếu email đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi.' };
}

export async function resetPassword(db, tokenValue, passwordValue, confirmation) {
  const password = validatePassword(passwordValue);
  if (confirmation !== password) throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu xác nhận chưa khớp.', { passwordConfirmation: 'Nhập lại mật khẩu giống nhau.' });
  if (typeof tokenValue !== 'string' || tokenValue.length < 32 || tokenValue.length > 128) throw new AppError(400, 'INVALID_TOKEN', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  const passwordHash = await hashPassword(password);
  return inTransaction(db, async (client) => {
    const token = (await client.query("SELECT id, user_id FROM email_tokens WHERE token_hash = $1 AND purpose = 'password_reset' AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now() FOR UPDATE", [hashToken(tokenValue)])).rows[0];
    if (!token) throw new AppError(400, 'INVALID_TOKEN', 'Liên kết đặt lại mật khẩu không hợp lệ, đã dùng hoặc đã hết hạn.');
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, token.user_id]);
    await client.query('UPDATE email_tokens SET consumed_at = now() WHERE id = $1', [token.id]);
    await client.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [token.user_id]);
    return { message: 'Mật khẩu đã được cập nhật. Hãy đăng nhập lại.' };
  });
}
