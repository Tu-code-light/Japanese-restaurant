import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { createMenuItemDto, updateMenuItemDto, menuItemIdParamDto } from '../dtos/menu.dto.js';

export function createMenuRoutes({ menuController, authenticate, authorize }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', menuController.list);
  router.post('/items', authorize('admin'), validate({ body: createMenuItemDto }), menuController.create);
  router.patch(
    '/items/:id',
    validate({ params: menuItemIdParamDto, body: updateMenuItemDto }),
    menuController.update,
  );
  if (menuController.delete) {
    router.delete(
      '/items/:id',
      authorize('admin'),
      validate({ params: menuItemIdParamDto }),
      menuController.delete,
    );
  }
  return router;
}
