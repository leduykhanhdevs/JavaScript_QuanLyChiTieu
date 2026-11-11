import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env, hasSePayBankHubConfig } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const apiRoot = `${env.sepayBankHub.apiBaseUrl}/v1`;
const hostedLinkOrigin = 'https://bankhub.sepay.vn';

function encryptionKey() {
  if (!hasSePayBankHubConfig) throw new AppError(503, 'BANK_HUB_NOT_CONFIGURED', 'SePay Bank Hub sandbox chưa được cấu hình đầy đủ trên máy chủ.');
  return Buffer.from(env.sepayBankHub.encryptionKey, 'hex');
}

export function encryptBankSecret(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptBankSecret(value) {
  const buffer = Buffer.from(value);
  if (buffer.length < 30 || buffer[0] !== 1) throw new AppError(500, 'BANK_SECRET_UNREADABLE', 'Không thể đọc thông tin kết nối đã mã hóa.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), buffer.subarray(1, 13));
  decipher.setAuthTag(buffer.subarray(13, 29));
  try {
    return Buffer.concat([decipher.update(buffer.subarray(29)), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError(500, 'BANK_SECRET_UNREADABLE', 'Không thể đọc thông tin kết nối đã mã hóa.');
  }
}

async function requestJson(path, { method = 'GET', authorization, body } = {}) {
  let response;
  try {
    response = await fetch(`${apiRoot}${path}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(authorization ? { Authorization: authorization } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new AppError(502, 'BANK_PROVIDER_UNAVAILABLE', 'Chưa kết nối được SePay Bank Hub sandbox. Vui lòng thử lại sau.');
  }

  let payload;
  try { payload = await response.json(); } catch {
    throw new AppError(502, 'BANK_PROVIDER_BAD_RESPONSE', 'SePay Bank Hub trả về phản hồi không hợp lệ.');
  }
  if (!response.ok) {
    const status = response.status === 401 ? 503 : 502;
    const code = response.status === 401 ? 'BANK_PROVIDER_CREDENTIALS_REJECTED' : 'BANK_PROVIDER_REQUEST_FAILED';
    const message = response.status === 401
      ? 'SePay chưa chấp nhận thông tin sandbox. Kiểm tra credential và Company XID với SePay.'
      : 'SePay Bank Hub chưa xử lý được yêu cầu. Vui lòng thử lại sau.';
    throw new AppError(status, code, message);
  }
  return payload?.data ?? payload;
}

async function getAccessToken() {
  if (!hasSePayBankHubConfig) throw new AppError(503, 'BANK_HUB_NOT_CONFIGURED', 'SePay Bank Hub sandbox chưa được cấu hình đầy đủ trên máy chủ.');
  const basic = Buffer.from(`${env.sepayBankHub.clientId}:${env.sepayBankHub.clientSecret}`).toString('base64');
  const payload = await requestJson('/token', { method: 'POST', authorization: `Basic ${basic}` });
  if (typeof payload?.access_token !== 'string' || !payload.access_token) {
    throw new AppError(502, 'BANK_PROVIDER_BAD_RESPONSE', 'SePay Bank Hub chưa trả về access token hợp lệ.');
  }
  return payload.access_token;
}

export function isSafeHostedLink(value) {
  try {
    const link = new URL(value);
    return link.protocol === 'https:'
      && link.origin === hostedLinkOrigin
      && /^\/link\/[a-z0-9-]{20,80}$/i.test(link.pathname)
      && !link.search
      && !link.hash
      && !link.username
      && !link.password;
  } catch {
    return false;
  }
}

function parseExpiry(value) {
  const parsed = new Date(value);
  if (Number.isFinite(parsed.getTime())) return parsed;
  throw new AppError(502, 'BANK_PROVIDER_BAD_RESPONSE', 'SePay không trả về thời hạn Hosted Link hợp lệ.');
}

export async function createSePayBankLink() {
  const accessToken = await getAccessToken();
  const completionUrl = new URL('/?bankhub=returned#settings-bank', env.appBaseUrl).toString();
  const payload = await requestJson('/link-token/create', {
    method: 'POST',
    authorization: `Bearer ${accessToken}`,
    body: {
      company_xid: env.sepayBankHub.companyXid,
      purpose: 'LINK_BANK_ACCOUNT',
      completion_redirect_uri: completionUrl,
      is_mobile_app: 0,
      language: 'vi'
    }
  });

  const linkToken = payload?.link_token;
  const tokenXid = payload?.xid;
  const hostedLinkUrl = payload?.hosted_link_url;
  if (typeof linkToken !== 'string' || !linkToken || typeof tokenXid !== 'string' || !hostedLinkUrl || !isSafeHostedLink(hostedLinkUrl)) {
    throw new AppError(502, 'BANK_PROVIDER_BAD_RESPONSE', 'Hosted Link do SePay trả về không đúng miền an toàn đã cho phép. Chưa chuyển hướng trình duyệt.');
  }
  const expiresAt = parseExpiry(payload.expires_at);
  if (expiresAt <= new Date()) throw new AppError(502, 'BANK_PROVIDER_LINK_EXPIRED', 'SePay trả về Link Token đã hết hạn. Hãy thử lại.');
  return {
    tokenXid,
    linkToken,
    hostedLinkUrl,
    expiresAt
  };
}

export async function getSePayLinkTokenStatus(linkToken) {
  const accessToken = await getAccessToken();
  return requestJson('/link-token/get', {
    method: 'POST',
    authorization: `Bearer ${accessToken}`,
    body: { link_token: linkToken }
  });
}
