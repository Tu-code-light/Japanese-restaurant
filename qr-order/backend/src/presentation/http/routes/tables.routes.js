import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  createTableDto,
  listTablesQueryDto,
  tableIdParamDto,
  updateTableDto,
  updateTableStatusDto,
} from '../dtos/tables.dto.js';

export function createTablesRoutes({ tablesController, authenticate, authorize }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate({ query: listTablesQueryDto }), tablesController.list);
  router.post('/', authorize('admin'), validate({ body: createTableDto }), tablesController.create);
  router.get('/:id/qr/download', validate({ params: tableIdParamDto }), tablesController.downloadQr);
  router.post(
    '/:id/qr/regenerate',
    authorize('admin'),
    validate({ params: tableIdParamDto }),
    tablesController.regenerateQr,
  );
  router.get('/:id/qr', validate({ params: tableIdParamDto }), tablesController.qr);
  router.get('/:id', validate({ params: tableIdParamDto }), tablesController.get);
  router.put(
    '/:id',
    authorize('admin'),
    validate({ params: tableIdParamDto, body: updateTableDto }),
    tablesController.update,
  );
  router.patch(
    '/:id/status',
    authorize('admin', 'staff'),
    validate({ params: tableIdParamDto, body: updateTableStatusDto }),
    tablesController.updateStatus,
  );
  router.delete(
    '/:id',
    authorize('admin'),
    validate({ params: tableIdParamDto }),
    tablesController.remove,
  );
  return router;
}
