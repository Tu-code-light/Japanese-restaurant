import { Router } from 'express';
import {
  createProductDto,
  listProductsQueryDto,
  productIdParamDto,
  updateProductDto,
  updateProductStatusDto,
} from '../dtos/products.dto.js';
import { uploadProductImage } from '../middlewares/productImageUpload.js';
import { validate } from '../middlewares/validate.js';

export function createProductsRoutes({ productsController, authenticate, authorize }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate({ query: listProductsQueryDto }), productsController.list);
  router.get('/:id', validate({ params: productIdParamDto }), productsController.get);
  router.post(
    '/',
    authorize('admin'),
    uploadProductImage,
    validate({ body: createProductDto }),
    productsController.create,
  );
  router.put(
    '/:id',
    authorize('admin'),
    uploadProductImage,
    validate({ params: productIdParamDto, body: updateProductDto }),
    productsController.update,
  );
  router.patch(
    '/:id/status',
    authorize('admin', 'staff'),
    validate({ params: productIdParamDto, body: updateProductStatusDto }),
    productsController.updateStatus,
  );
  router.delete(
    '/:id',
    authorize('admin'),
    validate({ params: productIdParamDto }),
    productsController.remove,
  );
  return router;
}
