export class AppError extends Error {
  constructor(status, code, message, fields = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (code, message, fields) => new AppError(400, code, message, fields);
export const unauthorized = (message = 'Vui lòng đăng nhập để tiếp tục.') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (code, message) => new AppError(403, code, message);
export const notFound = (message = 'Không tìm thấy dữ liệu.') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (code, message, fields) => new AppError(409, code, message, fields);
