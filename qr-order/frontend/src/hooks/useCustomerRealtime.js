import { useEffect, useRef } from 'react';
import { api } from '../api/http';
import { createSocket } from '../lib/socket';
import { useCustomerOrders } from '../stores/ordersStore';

/**
 * Realtime cho điện thoại khách: nhận trạng thái đơn của bàn mình và tín hiệu "menu đổi".
 * @param {string} tableToken
 * @param {() => void} onMenuChanged  gọi khi quán bật/tắt món -> trang tải lại menu
 */
export function useCustomerRealtime(tableToken, onMenuChanged) {
  // Giữ callback mới nhất trong ref để KHÔNG phải mở lại socket mỗi lần component render.
  const menuCb = useRef(onMenuChanged);
  menuCb.current = onMenuChanged;

  useEffect(() => {
    if (!tableToken) return undefined;
    const { setAll, upsert } = useCustomerOrders.getState();
    let alive = true;

    const loadOrders = async () => {
      try {
        const orders = await api.get(`/public/tables/${tableToken}/orders`);
        if (alive) setAll(orders);
      } catch {
        /* lỗi mạng thoáng qua: lần reconnect sau sẽ tải lại */
      }
    };

    const socket = createSocket({ tableToken });
    socket.on('connect', loadOrders); // tải lần đầu + đồng bộ lại sau mỗi lần reconnect
    socket.on('order:updated', upsert);
    socket.on('menu:changed', () => menuCb.current?.());

    return () => {
      alive = false;
      socket.removeAllListeners();
      socket.close();
    };
  }, [tableToken]);
}
