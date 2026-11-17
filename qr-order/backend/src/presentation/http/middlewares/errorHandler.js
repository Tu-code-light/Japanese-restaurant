import { AppError } from '../../../application/errors/AppError.js';
import { sendError } from '../../../shared/utils/response.js';
import { logger } from '../../../shared/utils/logger.js';

const statusByType = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
};

/** 404 cho route không tồn tại */
export const notFoundHandler = (req, _res, next) =>
  next(AppError.notFound(`Không tìm thấy route ${req.method} ${req.originalUrl}`));

/**
 * Error handler tập trung - điểm duy nhất biến lỗi thành response.
 * - AppError: trả đúng message/status đã định nghĩa.
 * - Lỗi lạ: log đầy đủ ở server, client chỉ nhận thông báo chung (không lộ chi tiết nội bộ).
 */
export const createErrorHandler = (env) => (err, req, res, _next) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, statusByType[err.type] ?? 500, err.details ?? null);
  }

  if (err?.type === 'entity.parse.failed') {
    return sendError(res, 'Body JSON không hợp lệ', 400);
  }

  logger.error(`Unhandled error ở ${req.method} ${req.originalUrl}`, err);
  return sendError(res, 'Lỗi hệ thống, vui lòng thử lại sau', 500, env.isProd ? null : { stack: err?.stack });
};
