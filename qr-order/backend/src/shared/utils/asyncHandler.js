/**
 * Bọc controller async để mọi lỗi (reject) tự chuyển sang errorHandler,
 * tránh lặp lại try/catch ở từng route mà vẫn không bỏ sót lỗi.
 * @param {(req, res, next) => Promise<any>} fn
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
