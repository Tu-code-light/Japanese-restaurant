import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export const createProductsController = (productsService) => ({
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await productsService.list(req.user.storeId, req.validatedQuery));
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, await productsService.get(req.user.storeId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await productsService.create(req.user.storeId, req.body, req.file),
      'Đã thêm món ăn',
      201,
    );
  }),

  update: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await productsService.update(req.user.storeId, req.params.id, req.body, req.file),
      'Đã cập nhật món ăn',
    );
  }),

  updateStatus: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await productsService.updateStatus(req.user.storeId, req.params.id, req.body.status),
      'Đã cập nhật trạng thái món ăn',
    );
  }),

  remove: asyncHandler(async (req, res) => {
    await productsService.remove(req.user.storeId, req.params.id);
    sendSuccess(res, null, 'Đã xóa món ăn');
  }),
});
