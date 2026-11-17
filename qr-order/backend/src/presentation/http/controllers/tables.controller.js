import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export const createTablesController = (tablesService) => ({
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await tablesService.list(req.user.storeId));
  }),

  create: asyncHandler(async (req, res) => {
    const table = await tablesService.create(req.user.storeId, req.body);
    sendSuccess(res, table, 'Đã tạo bàn', 201);
  }),

  qr: asyncHandler(async (req, res) => {
    sendSuccess(res, await tablesService.getQr(req.user.storeId, req.params.id));
  }),
});
