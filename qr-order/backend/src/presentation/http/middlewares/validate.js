import { AppError } from '../../../application/errors/AppError.js';

/**
 * Middleware validate dữ liệu đầu vào bằng Zod (đóng vai trò DTO).
 * Dữ liệu hợp lệ được GHI ĐÈ lại vào req (đã ép kiểu, loại field thừa),
 * nên controller/service chỉ làm việc với dữ liệu sạch.
 *
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const part of /** @type {const} */ (['params', 'query', 'body'])) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ in: part, field: issue.path.join('.'), message: issue.message });
      }
    } else if (part === 'query') {
      // Express 5 coi req.query là getter; gán vào req.validatedQuery cho an toàn.
      req.validatedQuery = result.data;
    } else {
      req[part] = result.data;
    }
  }

  if (errors.length) return next(AppError.badRequest('Dữ liệu không hợp lệ', errors));
  next();
};
