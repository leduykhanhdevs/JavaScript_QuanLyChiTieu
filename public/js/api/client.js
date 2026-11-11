export class ApiError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });
  } catch (error) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.');
  }
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (!response.ok) {
    const detail = payload.error || {};
    throw new ApiError(response.status, detail.code || 'REQUEST_FAILED', detail.message || 'Yêu cầu chưa thành công.', detail.fields || {});
  }
  return payload;
}

export const get = (path, options) => api(path, options);
export const post = (path, body) => api(path, { method: 'POST', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const remove = (path) => api(path, { method: 'DELETE' });
