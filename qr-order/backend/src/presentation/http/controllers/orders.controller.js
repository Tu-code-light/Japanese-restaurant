import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export const createOrdersController = (ordersService) => ({
  // ---------- Luồng khách (public, xác thực bằng tableToken) ----------
  customerCreate: asyncHandler(async (req, res) => {
    const { order, duplicated } = await ordersService.createFromCustomer(req.body);
    sendSuccess(
      res,
      order,
      duplicated ? 'Đơn đã được ghi nhận trước đó' : 'Đặt món thành công',
      duplicated ? 200 : 201,
    );
  }),

  customerList: asyncHandler(async (req, res) => {
    sendSuccess(res, await ordersService.listForCustomer(req.params.token));
  }),

  // ---------- Luồng nhân viên (JWT) ----------
  staffList: asyncHandler(async (req, res) => {
    const { status, includeClosed } = req.validatedQuery;
    sendSuccess(res, await ordersService.listForStaff(req.user.storeId, { status, includeClosed }));
  }),

  changeStatus: asyncHandler(async (req, res) => {
    const order = await ordersService.changeStatus(req.user.storeId, req.params.id, req.body.status);
    sendSuccess(res, order, 'Đã cập nhật trạng thái đơn');
  }),

  checkout: asyncHandler(async (req, res) => {
    const orders = await ordersService.checkoutTable(req.user.storeId, req.params.tableId);
    sendSuccess(res, orders, 'Đã thanh toán bàn');
  }),

  remove: asyncHandler(async (req, res) => {
    await ordersService.deleteOrder(req.user.storeId, req.params.id);
    sendSuccess(res, null, 'Đã xóa đơn hàng thành công');
  }),
});
