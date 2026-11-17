import { useEffect, useState } from 'react';
import { api } from '../api/http';
import { createSocket } from '../lib/socket';
import { beep } from '../lib/format';
import { useAuthStore } from '../stores/authStore';
import { useStaffOrders } from '../stores/ordersStore';

const CLOSED = new Set(['paid', 'cancelled']);

/**
 * Giữ danh sách đơn của nhân viên luôn đồng bộ:
 *  1. Tải danh sách đơn đang mở từ REST.
 *  2. Mở socket, nhận order:new / order:updated và ghi thẳng vào store.
 *  3. Mỗi lần (re)connect tải lại từ REST để bù các sự kiện có thể đã lỡ khi mất mạng.
 * @returns {{ connected: boolean, error: string|null }}
 */
export function useStaffRealtime() {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    const { setAll, upsert, prune } = useStaffOrders.getState();
    let alive = true;

    const load = async () => {
      try {
        const orders = await api.get('/orders', { auth: true });
        if (alive) {
          setAll(orders);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    };

    const socket = createSocket({ token });
    socket.on('connect', () => {
      setConnected(true);
      load();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('order:new', (order) => {
      upsert(order);
      beep();
    });
    socket.on('order:updated', (order) => {
      if (CLOSED.has(order.status)) prune(order.id);
      else upsert(order);
    });

    return () => {
      alive = false;
      socket.removeAllListeners();
      socket.close();
    };
  }, [token]);

  return { connected, error };
}
