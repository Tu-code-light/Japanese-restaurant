/**
 * Publisher: cầu nối giữa tầng Service và Socket.io.
 *
 * Service KHÔNG import socket trực tiếp -> tách biệt tầng nghiệp vụ khỏi hạ tầng realtime
 * (dễ test, dễ thay bằng Redis pub/sub khi scale nhiều instance).
 *
 * Quy ước room:
 *   store:{storeId}  -> toàn bộ nhân viên của quán (nhận đơn mới, đơn đổi trạng thái)
 *   table:{tableId}  -> các điện thoại khách đang ngồi ở bàn đó (chỉ nhận đơn của bàn mình)
 */
let io = null;

export const rooms = Object.freeze({
  store: (storeId) => `store:${storeId}`,
  table: (tableId) => `table:${tableId}`,
});

export function bindIo(instance) {
  io = instance;
}

/** Gửi realtime là "best effort": lỗi socket không bao giờ được làm hỏng nghiệp vụ đã commit. */
function safeEmit(room, event, payload) {
  try {
    io?.to(room).emit(event, payload);
  } catch (err) {
    console.error(`Emit ${event} thất bại`, err);
  }
}

export const publisher = {
  /** Có đơn mới -> báo cho nhân viên & chính bàn đó (TASK-402: phát sự kiện 'new_order') */
  orderCreated(order) {
    safeEmit(rooms.store(order.storeId), 'order:new', order);
    safeEmit(rooms.store(order.storeId), 'new_order', order);
    safeEmit(rooms.store(order.storeId), 'notification', {
      type: 'order:new',
      orderId: order.id,
      tableId: order.tableId,
    });
    safeEmit(rooms.table(order.tableId), 'order:updated', order);
    safeEmit(rooms.table(order.tableId), 'new_order', order);
  },

  /** Đơn đổi trạng thái -> báo cho nhân viên & bàn (TASK-403: phát sự kiện đồng bộ) */
  orderUpdated(order) {
    safeEmit(rooms.store(order.storeId), 'order:updated', order);
    safeEmit(rooms.store(order.storeId), 'order_status_updated', order);
    safeEmit(rooms.table(order.tableId), 'order:updated', order);
    safeEmit(rooms.table(order.tableId), 'order_status_updated', order);
  },

  /** Thực đơn thay đổi (hết món...) -> các bàn đang mở app tự cập nhật */
  menuChanged(storeId) {
    safeEmit(rooms.store(storeId), 'menu:changed', { storeId });
    // Khách join thêm room cửa hàng dạng "public" để nhận tín hiệu menu.
    safeEmit(`${rooms.store(storeId)}:public`, 'menu:changed', { storeId });
  },
};
