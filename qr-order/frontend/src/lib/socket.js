import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || undefined; // undefined = cùng origin (dev dùng proxy)

/**
 * Tạo kết nối socket. `auth` là { token } (nhân viên) hoặc { tableToken } (khách).
 * Tự reconnect với backoff; ưu tiên WebSocket, tránh polling gây tốn request.
 */
export function createSocket(auth) {
  return io(URL, {
    auth,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
}
