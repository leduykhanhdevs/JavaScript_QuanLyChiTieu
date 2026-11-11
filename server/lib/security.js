import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env, isProduction } from '../config/env.js';

const scrypt = promisify(scryptCallback);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const hashToken = (token) => createHash('sha256').update(token).digest();
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}
export async function verifyPassword(password, saved) {
  const [algorithm, N, r, p, saltText, hashText] = String(saved).split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64url');
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, { N: Number(N), r: Number(r), p: Number(p) }));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function sessionCookie(token, maxAge = env.sessionTtlHours * 3600) {
  const secure = isProduction ? '; Secure' : '';
  return `${env.sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export const expiredSessionCookie = () => sessionCookie('', 0);
export function readCookie(header = '', name = env.sessionCookieName) {
  const pair = header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!pair) return null;
  try { return decodeURIComponent(pair.slice(name.length + 1)); } catch { return null; }
}
export function maskEmail(value) {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  const splitAt = trimmed.lastIndexOf('@');
  if (splitAt < 1) return '—';
  const local = trimmed.slice(0, splitAt);
  const hidden = '•'.repeat(Math.min(5, Math.max(3, local.length - 1)));
  return `${local[0]}${hidden}@${trimmed.slice(splitAt + 1)}`;
}
const DAILY_SALT_SEED = randomBytes(32);
export function dailyIpBucketHash(ip = 'local') {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return createHash('sha256').update(DAILY_SALT_SEED).update(`${day}:${ip || 'local'}`).digest('hex');
}

