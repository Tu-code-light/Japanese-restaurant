import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  createOrderDto,
  updateStatusDto,
  orderIdParamDto,
  listOrdersQueryDto,
  checkoutParamDto,
} from '../dtos/orders.dto.js';

export function createOrdersRoutes({ ordersController, authenticate, orderLimiter }) {
  const router = Router();

  // TASK-401: POST /api/orders (Khách đặt món, lưu trạng thái mặc định 'pending')
  router.post('/', validate({ body: createOrderDto }), orderLimiter, ordersController.customerCreate);

  // Các route cho nhân viên cần xác thực JWT
  router.use(authenticate);
  router.get('/', validate({ query: listOrdersQueryDto }), ordersController.staffList);
  
  // TASK-403: Cập nhật trạng thái đơn hàng (hỗ trợ cả PATCH và PUT)
  router.patch(
    '/:id/status',
    validate({ params: orderIdParamDto, body: updateStatusDto }),
    ordersController.changeStatus,
  );
  router.put(
    '/:id/status',
    validate({ params: orderIdParamDto, body: updateStatusDto }),
    ordersController.changeStatus,
  );
  router.post('/tables/:tableId/checkout', validate({ params: checkoutParamDto }), ordersController.checkout);
  return router;
}
