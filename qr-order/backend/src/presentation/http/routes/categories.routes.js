import { Router } from 'express';
import {
  categoryIdParamDto,
  createCategoryDto,
  listCategoriesQueryDto,
  updateCategoryDto,
} from '../dtos/categories.dto.js';
import { validate } from '../middlewares/validate.js';

export function createCategoriesRoutes({ categoriesController, authenticate, authorize }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate({ query: listCategoriesQueryDto }), categoriesController.list);
  router.get('/:id', validate({ params: categoryIdParamDto }), categoriesController.get);
  router.post(
    '/',
    authorize('admin'),
    validate({ body: createCategoryDto }),
    categoriesController.create,
  );
  router.put(
    '/:id',
    authorize('admin'),
    validate({ params: categoryIdParamDto, body: updateCategoryDto }),
    categoriesController.update,
  );
  router.delete(
    '/:id',
    authorize('admin'),
    validate({ params: categoryIdParamDto }),
    categoriesController.remove,
  );
  return router;
}
