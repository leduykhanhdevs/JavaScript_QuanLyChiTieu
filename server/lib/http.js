import { AppError } from './errors.js';
export function sendJson(res, status, data, headers = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(payload);
}
export function sendError(res, error) {
  const status = error instanceof AppError ? error.status : 500;
  const payload = { error: { code: error.code || 'INTERNAL_ERROR', message: status === 500 ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại.' : error.message, ...(error.fields ? { fields: error.fields } : {}) } };
  if (status === 500) console.error('[api]', error);
  sendJson(res, status, payload);
}
export async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new AppError(413, 'BODY_TOO_LARGE', 'Dữ liệu gửi lên vượt quá giới hạn.');
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError(400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.'); }
}
export function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(text);
}

export function sendBuffer(res, status, buffer, contentType, headers = {}) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': buffer.length,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(buffer);
}
