import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { createOrderDto, tokenParamDto } from '../dtos/orders.dto.js';

/**
 * API công khai cho khách quét QR (không cần đăng nhập).
 * Danh tính = tableToken ngẫu nhiên nằm trong mã QR của bàn.
 */
export function createPublicRoutes({ publicController, ordersController, orderLimiter }) {
  const router = Router();
  router.get('/tables/:token', validate({ params: tokenParamDto }), publicController.getTableMenu);
  router.get('/tables/:token/orders', validate({ params: tokenParamDto }), ordersController.customerList);
  router.post('/orders', validate({ body: createOrderDto }), orderLimiter, ordersController.customerCreate);
  return router;
}
