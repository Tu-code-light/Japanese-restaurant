import { AppError } from '../errors/AppError.js';
import { ORDER_STATUS, sourcesFor } from '../../domain/orders/constants.js';

export function createOrdersService({
  withTransaction,
  menuRepository,
  tablesService,
  ordersRepository,
  publisher,
}) {
  return {
    /**
     * Khách gửi order từ QR.
     *  1. Xác thực bàn qua token.
     *  2. Idempotency: gửi lặp cùng key -> trả lại đơn cũ, không tạo đơn thứ hai.
     *  3. Giá & tên món lấy từ DB (không tin client), từ chối món đã hết/không tồn tại.
     *  4. Ghi order + order_items trong 1 transaction.
     *  5. Sau khi COMMIT mới phát realtime.
     */
    async createFromCustomer({ tableToken, idempotencyKey, note, items }) {
      const table = await tablesService.resolveByToken(tableToken);

      // Đường tắt: request trùng (double click / retry mạng)
      const existingId = await ordersRepository.findIdByIdempotencyKey(idempotencyKey);
      if (existingId) return { order: await ordersRepository.findById(existingId), duplicated: true };

      // Gộp các dòng trùng món + trùng ghi chú để đơn gọn hơn.
      const merged = new Map();
      for (const item of items) {
        const key = `${item.menuItemId}|${item.note}`;
        const current = merged.get(key);
        if (current) current.quantity += item.quantity;
        else merged.set(key, { ...item });
      }
      const lines = [...merged.values()];
      if (lines.some((line) => line.quantity > 99)) throw AppError.badRequest('Mỗi món tối đa 99 phần');

      const menuItems = await menuRepository.findByIds(
        table.storeId,
        [...new Set(lines.map((line) => line.menuItemId))],
      );
      const menuById = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));

      const unavailable = [];
      const priced = lines.map((line) => {
        const menuItem = menuById.get(line.menuItemId);
        if (!menuItem || !menuItem.isAvailable) unavailable.push(menuItem?.name ?? `#${line.menuItemId}`);
        return {
          menuItemId: line.menuItemId,
          name: menuItem?.name,
          unitPrice: menuItem?.price,
          quantity: line.quantity,
          note: line.note,
        };
      });
      if (unavailable.length) {
        throw AppError.conflict(`Món không còn phục vụ: ${unavailable.join(', ')}`, { unavailable });
      }

      const totalAmount = priced.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      let orderId;
      try {
        orderId = await withTransaction(async (client) => {
          const id = await ordersRepository.insertOrder(client, {
            storeId: table.storeId,
            tableId: table.id,
            note,
            totalAmount,
            idempotencyKey,
          });
          await ordersRepository.insertItems(client, id, priced);
          return id;
        });
      } catch (err) {
        // Hai request cùng key chạy song song: request đến sau vi phạm UNIQUE -> trả đơn đã có.
        if (err.code === '23505') {
          const duplicateId = await ordersRepository.findIdByIdempotencyKey(idempotencyKey);
          if (duplicateId) {
            return { order: await ordersRepository.findById(duplicateId), duplicated: true };
          }
        }
        throw err;
      }

      const order = await ordersRepository.findById(orderId);
      publisher.orderCreated(order);
      return { order, duplicated: false };
    },

    /** Khách xem các đơn đang mở của bàn mình */
    async listForCustomer(token) {
      const table = await tablesService.resolveByToken(token);
      return ordersRepository.listByTable(table.id);
    },

    /** Nhân viên xem danh sách đơn */
    listForStaff(storeId, filters) {
      return ordersRepository.listByStore(storeId, filters);
    },

    /** Nhân viên đổi trạng thái đơn (có kiểm tra state machine + chống đua) */
    async changeStatus(storeId, orderId, target) {
      const updated = await ordersRepository.updateStatus(storeId, orderId, target, sourcesFor(target));

      if (!updated) {
        const current = await ordersRepository.findById(orderId);
        if (!current || current.storeId !== storeId) throw AppError.notFound('Không tìm thấy đơn hàng');
        throw AppError.conflict(
          `Không thể chuyển đơn từ "${current.status}" sang "${target}" (có thể đã có người thao tác trước)`,
          { currentStatus: current.status },
        );
      }

      const order = await ordersRepository.findById(orderId);
      publisher.orderUpdated(order);
      return order;
    },

    /**
     * Thanh toán cả bàn: chuyển mọi đơn "served" của bàn sang "paid".
     * Khóa FOR UPDATE để một đơn mới không chen vào giữa lúc tính tiền.
     */
    async checkoutTable(storeId, tableId) {
      const paidIds = await withTransaction(async (client) => {
        const openOrders = await ordersRepository.lockOpenByTable(client, storeId, tableId);
        if (openOrders.length === 0) throw AppError.badRequest('Bàn không có đơn nào cần thanh toán');

        const notServed = openOrders.filter((order) => order.status !== ORDER_STATUS.SERVED);
        if (notServed.length) {
          throw AppError.conflict('Bàn còn đơn chưa phục vụ xong, chưa thể thanh toán', {
            pendingOrderIds: notServed.map((order) => order.id),
          });
        }
        const ids = openOrders.map((order) => order.id);
        await ordersRepository.markPaid(client, ids);
        return ids;
      });

      const orders = await Promise.all(paidIds.map((id) => ordersRepository.findById(id)));
      orders.forEach((order) => publisher.orderUpdated(order));
      return orders;
    },
  };
}
