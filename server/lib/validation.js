import { badRequest, conflict } from './errors.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const COLOR_RE = /^#[0-9a-f]{6}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_KINDS = new Set(['cash', 'bank', 'e_wallet']);
const CATEGORY_KINDS = new Set(['income', 'expense']);

export function objectBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest('INVALID_BODY', 'Dữ liệu gửi lên không hợp lệ.');
  return value;
}
export function requiredText(value, label, max = 120) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw badRequest('VALIDATION_ERROR', `${label} không được để trống.`, { [label]: 'Trường này là bắt buộc.' });
  if (text.length > max) throw badRequest('VALIDATION_ERROR', `${label} tối đa ${max} ký tự.`, { [label]: `Tối đa ${max} ký tự.` });
  return text;
}
export function optionalText(value, max = 500) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > max) throw badRequest('VALIDATION_ERROR', `Nội dung tối đa ${max} ký tự.`);
  return text || null;
}
export function positiveAmount(value, label = 'Số tiền') {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw badRequest('VALIDATION_ERROR', `${label} phải là số nguyên VND lớn hơn 0.`, { amount: 'Nhập số nguyên dương, không dùng phần thập phân.' });
  return amount;
}
export function nonNegativeAmount(value, label = 'Số dư ban đầu') {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0) throw badRequest('VALIDATION_ERROR', `${label} không được âm.`);
  return amount;
}
export function validDate(value, label = 'Ngày') {
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw badRequest('VALIDATION_ERROR', `${label} không hợp lệ.`, { date: 'Chọn ngày hợp lệ.' });
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw badRequest('VALIDATION_ERROR', `${label} không hợp lệ.`, { date: 'Chọn ngày hợp lệ.' });
  return value;
}
export function optionalDate(value, label = 'Ngày') { return value == null || value === '' ? null : validDate(value, label); }
export function uuid(value, label = 'Mã dữ liệu') {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw badRequest('VALIDATION_ERROR', `${label} không hợp lệ.`);
  return value;
}
export function validateEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  if (email.length > 320 || !EMAIL_RE.test(email)) throw badRequest('VALIDATION_ERROR', 'Email chưa đúng định dạng.', { email: 'Nhập email hợp lệ.' });
  return { email, normalized: email.toLowerCase() };
}
export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw badRequest('VALIDATION_ERROR', 'Mật khẩu cần từ 10 đến 128 ký tự.', { password: 'Mật khẩu cần ít nhất 10 ký tự.' });
  return value;
}
export function enumValue(value, values, label) {
  if (!values.has(value)) throw badRequest('VALIDATION_ERROR', `${label} không hợp lệ.`);
  return value;
}
export const accountKind = (value) => enumValue(value, ACCOUNT_KINDS, 'Loại tài khoản');
export const categoryKind = (value) => enumValue(value, CATEGORY_KINDS, 'Loại danh mục');
export const colorValue = (value) => COLOR_RE.test(value || '') ? value : '#2563EB';
export function monthStart(value) {
  const date = validDate(value, 'Tháng');
  if (!date.endsWith('-01')) throw badRequest('VALIDATION_ERROR', 'Tháng ngân sách phải bắt đầu từ ngày mùng 1.');
  return date;
}
export function mapDatabaseError(error) {
  if (error.code === '23505') return conflict('DUPLICATE', 'Dữ liệu đã tồn tại. Hãy kiểm tra tên hoặc kỳ đã chọn.');
  if (error.code === '23503') return badRequest('INVALID_REFERENCE', 'Tài khoản hoặc danh mục không hợp lệ.');
  if (error.code === '23514' || error.code === '22P02' || error.code === '22003') return badRequest('VALIDATION_ERROR', 'Dữ liệu chưa đúng định dạng hoặc phạm vi cho phép.');
  return null;
}
