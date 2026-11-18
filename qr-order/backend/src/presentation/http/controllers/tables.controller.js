import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export const createTablesController = (tablesService) => ({
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await tablesService.list(req.user.storeId, req.validatedQuery));
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, await tablesService.get(req.user.storeId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    const table = await tablesService.create(req.user.storeId, req.body);
    sendSuccess(res, table, 'Đã tạo bàn', 201);
  }),

  update: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tablesService.update(req.user.storeId, req.params.id, req.body),
      'Đã cập nhật bàn',
    );
  }),

  updateStatus: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tablesService.updateStatus(req.user.storeId, req.params.id, req.body.status),
      'Đã cập nhật trạng thái bàn',
    );
  }),

  remove: asyncHandler(async (req, res) => {
    await tablesService.remove(req.user.storeId, req.params.id);
    sendSuccess(res, null, 'Đã xóa bàn');
  }),

  qr: asyncHandler(async (req, res) => {
    sendSuccess(res, await tablesService.getQr(req.user.storeId, req.params.id));
  }),

  downloadQr: asyncHandler(async (req, res) => {
    const qr = await tablesService.getQr(req.user.storeId, req.params.id);
    const image = Buffer.from(qr.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    res.attachment(`table-${qr.tableId}.png`).type('png').send(image);
  }),

  regenerateQr: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tablesService.regenerateQr(req.user.storeId, req.params.id),
      'Đã tạo lại mã QR',
    );
  }),
});
