import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { createTableDto, tableIdParamDto } from '../dtos/tables.dto.js';

export function createTablesRoutes({ tablesController, authenticate, authorize }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', tablesController.list);
  router.post('/', authorize('admin'), validate({ body: createTableDto }), tablesController.create);
  router.get('/:id/qr', validate({ params: tableIdParamDto }), tablesController.qr);
  return router;
}
