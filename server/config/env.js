import 'dotenv/config';

const bool = (value, fallback = false) => value == null || value === '' ? fallback : value.toLowerCase() === 'true';

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  database: {
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5432),
    name: process.env.DATABASE_NAME || 'quan_ly_chi_tieu_dev',
    user: process.env.DATABASE_USER || '',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: bool(process.env.DATABASE_SSL)
  },
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'qlct_session',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 168),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  emailTokenTtlMinutes: Number(process.env.EMAIL_TOKEN_TTL_MINUTES || 30),
  emailOtpTtlMinutes: Number(process.env.EMAIL_OTP_TTL_MINUTES || 10),
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30),
  currencyApiKey: process.env.CURRENCYAPI_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: bool(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromName: process.env.SMTP_FROM_NAME || 'Ví Mình',
    fromEmail: process.env.SMTP_FROM_EMAIL || ''
  },
  sepayBankHub: {
    environment: 'sandbox',
    apiBaseUrl: 'https://bankhub-api-sandbox.sepay.vn',
    clientId: process.env.SEPAY_BANKHUB_CLIENT_ID || '',
    clientSecret: process.env.SEPAY_BANKHUB_CLIENT_SECRET || '',
    companyXid: process.env.SEPAY_BANKHUB_COMPANY_XID || '',
    encryptionKey: process.env.SEPAY_BANKHUB_ENCRYPTION_KEY || ''
  }
});

export const isProduction = env.nodeEnv === 'production';
export const hasSmtpConfig = Boolean(env.smtp.host && env.smtp.fromEmail && env.smtp.user && env.smtp.password);
export const hasCurrencyApiConfig = Boolean(env.currencyApiKey);
export const hasSePayBankHubConfig = Boolean(
  env.sepayBankHub.clientId
  && env.sepayBankHub.clientSecret
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.sepayBankHub.companyXid)
  && /^[a-fA-F0-9]{64}$/.test(env.sepayBankHub.encryptionKey)
);

export function validateRuntimeConfig() {
  if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) throw new Error('PORT không hợp lệ.');
  if (!Number.isInteger(env.sessionTtlHours) || env.sessionTtlHours < 1) throw new Error('SESSION_TTL_HOURS không hợp lệ.');
  if (!Number.isInteger(env.emailOtpTtlMinutes) || env.emailOtpTtlMinutes < 1 || env.emailOtpTtlMinutes > 30) throw new Error('EMAIL_OTP_TTL_MINUTES cần là số nguyên từ 1 đến 30.');
}
