import { create } from 'zustand';

/**
 * Factory tạo store đơn hàng (dùng cho cả màn nhân viên lẫn màn khách).
 *
 * Cấu trúc chuẩn hóa: byId (map) + ids (thứ tự). Khi 1 đơn đổi trạng thái chỉ
 * object của đơn đó đổi -> <OrderCard> của các đơn khác giữ nguyên tham chiếu, không render lại.
 */
const createOrdersStore = () =>
  create((set) => ({
    byId: {},
    ids: [],

    /** Thay toàn bộ (khi tải lần đầu / reconnect để đồng bộ lại) */
    setAll: (orders) =>
      set({
        byId: Object.fromEntries(orders.map((o) => [o.id, o])),
        ids: orders.map((o) => o.id),
      }),

    /** Thêm mới hoặc cập nhật 1 đơn (từ socket). Bỏ qua bản cũ hơn bản đang có. */
    upsert: (order) =>
      set((s) => {
        const cur = s.byId[order.id];
        if (cur && new Date(cur.updatedAt) > new Date(order.updatedAt)) return s;
        return {
          byId: { ...s.byId, [order.id]: order },
          ids: cur ? s.ids : [...s.ids, order.id],
        };
      }),

    /** Loại đơn đã kết thúc (paid/cancelled) khỏi danh sách đang theo dõi */
    prune: (orderId) =>
      set((s) => {
        if (!s.byId[orderId]) return s;
        const { [orderId]: _removed, ...rest } = s.byId;
        return { byId: rest, ids: s.ids.filter((id) => id !== orderId) };
      }),
  }));

export const useStaffOrders = createOrdersStore();
export const useCustomerOrders = createOrdersStore();
