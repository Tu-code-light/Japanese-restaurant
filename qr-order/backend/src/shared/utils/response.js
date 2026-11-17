/**
 * Format response chuẩn cho toàn hệ thống:
 *   { status: 'success' | 'error', message: string, data: any }
 * HTTP status code vẫn được set đúng ngữ nghĩa (200, 201, 400, 404, ...).
 */
export const sendSuccess = (res, data = null, message = 'Thành công', statusCode = 200) =>
  res.status(statusCode).json({ status: 'success', message, data });

export const sendError = (res, message = 'Có lỗi xảy ra', statusCode = 500, data = null) =>
  res.status(statusCode).json({ status: 'error', message, data });
