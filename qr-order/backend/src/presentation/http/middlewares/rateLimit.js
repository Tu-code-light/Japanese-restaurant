import rateLimit from 'express-rate-limit';
import { sendError } from '../../../shared/utils/response.js';

const handler = (_req, res) => sendError(res, 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít giây', 429);

/** Giới hạn chung cho toàn bộ API (theo IP, đủ rộng vì nhiều khách có thể dùng chung WiFi quán). */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Chống spam đăng nhập. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/**
 * Giới hạn gửi order theo TỪNG BÀN (không theo IP) -
 * vì khách trong quán dùng chung IP WiFi, giới hạn theo IP sẽ chặn nhầm.
 */
export const orderLimiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `table:${req.body?.tableToken ?? 'unknown'}`,
  handler,
});
