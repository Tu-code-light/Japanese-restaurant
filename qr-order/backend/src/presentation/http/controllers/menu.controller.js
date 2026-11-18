import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import { AppError } from '../../../application/errors/AppError.js';

export const createMenuController = (menuService) => ({
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await menuService.getAdminMenu(req.user.storeId));
  }),

  create: asyncHandler(async (req, res) => {
    sendSuccess(res, await menuService.createItem(req.user.storeId, req.body), 'Đã thêm món', 201);
  }),

  update: asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && Object.keys(req.body).some((k) => k !== 'isAvailable')) {
      throw AppError.forbidden('Chỉ quản lý mới được sửa thông tin món');
    }
    sendSuccess(res, await menuService.updateItem(req.user.storeId, req.params.id, req.body), 'Đã cập nhật món');
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await menuService.deleteItem(req.user.storeId, req.params.id);
    sendSuccess(
      res,
      result,
      result.softDeleted
        ? 'Món đã có trong đơn cũ nên được chuyển sang trạng thái ngưng bán'
        : 'Đã xóa món ăn thành công',
    );
  }),
});
