/** Các trạng thái của đơn hàng */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',       // Khách vừa gửi, chờ nhân viên xác nhận
  CONFIRMED: 'confirmed',   // Nhân viên đã nhận đơn
  PREPARING: 'preparing',   // Bếp/pha chế đang làm
  SERVED: 'served',         // Đã phục vụ ra bàn
  PAID: 'paid',             // Đã thanh toán
  CANCELLED: 'cancelled',   // Đã hủy
});

export const ALL_STATUSES = Object.values(ORDER_STATUS);

/** Đơn còn "đang mở" (chưa kết thúc) */
export const OPEN_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.SERVED,
];

/**
 * Luồng chuyển trạng thái hợp lệ (state machine).
 * Chặn các bước nhảy vô lý như paid -> pending.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SERVED],
  [ORDER_STATUS.SERVED]: [ORDER_STATUS.PAID],
  [ORDER_STATUS.PAID]: [],
  [ORDER_STATUS.CANCELLED]: [],
});

/** Trạng thái nguồn được phép để đi tới `target` */
export const sourcesFor = (target) =>
  Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, targets]) => targets.includes(target))
    .map(([source]) => source);
