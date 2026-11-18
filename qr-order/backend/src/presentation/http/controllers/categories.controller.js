import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export const createCategoriesController = (categoriesService) => ({
  list: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await categoriesService.list(req.user.storeId, req.validatedQuery),
    );
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await categoriesService.get(req.user.storeId, req.params.id),
    );
  }),

  create: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await categoriesService.create(req.user.storeId, req.body),
      'Đã thêm danh mục',
      201,
    );
  }),

  update: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await categoriesService.update(req.user.storeId, req.params.id, req.body),
      'Đã cập nhật danh mục',
    );
  }),

  remove: asyncHandler(async (req, res) => {
    await categoriesService.remove(req.user.storeId, req.params.id);
    sendSuccess(res, null, 'Đã xóa danh mục');
  }),
});
