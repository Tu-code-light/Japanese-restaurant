/**
 * Lỗi ứng dụng có chủ đích. HTTP status được ánh xạ ở presentation layer.
 */
export class AppError extends Error {
  /**
   * @param {string} message  Thông điệp thân thiện cho client
   * @param {'bad_request'|'unauthorized'|'forbidden'|'not_found'|'conflict'} [type='bad_request']
   * @param {any} [details]   Dữ liệu bổ sung (vd: danh sách field lỗi)
   */
  constructor(message, type = 'bad_request', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg, details) { return new AppError(msg, 'bad_request', details); }
  static unauthorized(msg = 'Chưa đăng nhập hoặc phiên đã hết hạn') { return new AppError(msg, 'unauthorized'); }
  static forbidden(msg = 'Bạn không có quyền thực hiện thao tác này') { return new AppError(msg, 'forbidden'); }
  static notFound(msg = 'Không tìm thấy dữ liệu') { return new AppError(msg, 'not_found'); }
  static conflict(msg, details) { return new AppError(msg, 'conflict', details); }
}
