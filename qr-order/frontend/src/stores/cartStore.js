import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Giỏ hàng của khách. Lưu localStorage theo token bàn (reload trang không mất giỏ).
 *
 * items: { [menuItemId]: { menuItemId, name, price, quantity } }
 * Dùng object theo id thay vì mảng để component từng món chỉ subscribe đúng phần của nó
 * (xem selector `useQuantity`) -> bấm + ở món A không làm render lại món B.
 *
 * submitKey: khóa idempotency cho lần gửi hiện tại. Giữ nguyên khi gửi lỗi/mạng chập chờn
 * để bấm lại không tạo đơn trùng; chỉ đổi sau khi gửi THÀNH CÔNG.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      tableToken: null,
      items: {},
      note: '',
      submitKey: null,

      /** Khi sang bàn khác (quét QR khác) thì dọn giỏ cũ */
      bindTable: (token) => {
        if (get().tableToken !== token) set({ tableToken: token, items: {}, note: '', submitKey: null });
      },

      add: (item) =>
        set((s) => {
          const cur = s.items[item.id];
          const quantity = Math.min(99, (cur?.quantity ?? 0) + 1);
          return {
            submitKey: null, // giỏ đổi -> là một đơn mới, cần key mới
            items: { ...s.items, [item.id]: { menuItemId: item.id, name: item.name, price: item.price, quantity } },
          };
        }),

      remove: (id) =>
        set((s) => {
          const cur = s.items[id];
          if (!cur) return s;
          const next = { ...s.items };
          if (cur.quantity <= 1) delete next[id];
          else next[id] = { ...cur, quantity: cur.quantity - 1 };
          return { items: next, submitKey: null };
        }),

      setNote: (note) => set({ note }),

      /** Lấy (hoặc tạo) khóa idempotency cho lần gửi hiện tại */
      ensureSubmitKey: () => {
        let key = get().submitKey;
        if (!key) {
          // Polyfill cho trình duyệt cũ không hỗ trợ crypto.randomUUID()
          key = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
              });
          set({ submitKey: key });
        }
        return key;
      },

      clear: () => set({ items: {}, note: '', submitKey: null }),
    }),
    { name: 'qr-order-cart' },
  ),
);

// ---- Selector nhỏ: mỗi component chỉ re-render khi đúng phần nó dùng thay đổi ----
export const useQuantity = (id) => useCartStore((s) => s.items[id]?.quantity ?? 0);
export const useCartCount = () =>
  useCartStore((s) => Object.values(s.items).reduce((n, i) => n + i.quantity, 0));
export const useCartTotal = () =>
  useCartStore((s) => Object.values(s.items).reduce((n, i) => n + i.price * i.quantity, 0));
