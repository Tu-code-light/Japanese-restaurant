import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  updateStatusDto,
  orderIdParamDto,
  listOrdersQueryDto,
  checkoutParamDto,
} from '../dtos/orders.dto.js';

export function createOrdersRoutes({ ordersController, authenticate }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate({ query: listOrdersQueryDto }), ordersController.staffList);
  router.patch(
    '/:id/status',
    validate({ params: orderIdParamDto, body: updateStatusDto }),
    ordersController.changeStatus,
  );
  router.post('/tables/:tableId/checkout', validate({ params: checkoutParamDto }), ordersController.checkout);
  return router;
}
