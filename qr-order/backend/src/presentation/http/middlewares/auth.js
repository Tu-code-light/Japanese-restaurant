import { AppError } from '../../../application/errors/AppError.js';

/** Yêu cầu đăng nhập (header: Authorization: Bearer <token>) */
export const createAuthenticate = (verifyToken) => (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(AppError.unauthorized());

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, storeId: payload.storeId, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Phân quyền theo vai trò.
 * @param {...('admin'|'staff')} roles
 */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(AppError.forbidden());
  next();
};
