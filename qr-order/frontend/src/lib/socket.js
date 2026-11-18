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

export function sendRealtimeMessage(socket, text) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit('message:send', { text }, (timeoutError, response) => {
      if (timeoutError) {
        reject(new Error('Realtime message timed out'));
      } else if (!response?.ok) {
        reject(new Error(response?.error || 'Realtime message failed'));
      } else {
        resolve();
      }
    });
  });
}

export function requestServerStatus(socket) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit('server:status', (timeoutError, status) => {
      if (timeoutError) reject(new Error('Realtime status request timed out'));
      else resolve(status);
    });
  });
}
