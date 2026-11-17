import { Server } from 'socket.io';
import { logger } from '../../shared/utils/logger.js';
import { bindIo, rooms } from './publisher.js';

/**
 * Khởi tạo Socket.io, gắn vào HTTP server.
 *
 * Tối ưu cho >= 50 kết nối đồng thời:
 *  - Phân ROOM: nhân viên vào `store:{id}`, khách vào `table:{id}` -> mỗi sự kiện chỉ gửi đến đúng
 *    nhóm cần nhận, không broadcast toàn server.
 *  - Tắt perMessageDeflate: payload nhỏ, nén tốn CPU + bộ nhớ cho từng kết nối mà lợi ích không đáng kể.
 *  - Giới hạn maxHttpBufferSize: chặn client gửi payload lớn.
 *  - Ưu tiên transport WebSocket, polling chỉ là dự phòng.
 *  - Khách KHÔNG được gửi sự kiện lên server (server -> client một chiều); mọi thao tác ghi đi qua
 *    REST API có validate, nên không có "cổng sau" nào ở socket để lạm dụng.
 *
 * Khi scale ra nhiều instance: dùng @socket.io/redis-adapter để các instance chia sẻ room.
 *
 * @param {import('node:http').Server} httpServer
 */
export function initSocket(httpServer, { corsOrigins, verifyToken, resolveTableToken }) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    transports: ['websocket', 'polling'],
    perMessageDeflate: false,
    maxHttpBufferSize: 1e5,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60_000 }, // mất mạng ngắn vẫn nhận lại sự kiện
  });

  /**
   * Xác thực khi handshake:
   *  - Nhân viên: auth.token = JWT
   *  - Khách:     auth.tableToken = token trong QR
   */
  io.use(async (socket, next) => {
    try {
      const { token, tableToken } = socket.handshake.auth ?? {};

      if (token) {
        const payload = verifyToken(String(token));
        socket.data = { kind: 'staff', storeId: payload.storeId, userId: payload.sub };
        return next();
      }

      if (tableToken) {
        const table = await resolveTableToken(String(tableToken));
        socket.data = { kind: 'customer', storeId: table.storeId, tableId: table.id };
        return next();
      }

      return next(new Error('UNAUTHORIZED'));
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { kind, storeId, tableId } = socket.data;

    if (kind === 'staff') {
      socket.join(rooms.store(storeId));
    } else {
      socket.join(rooms.table(tableId));
      socket.join(`${rooms.store(storeId)}:public`); // chỉ nhận tín hiệu menu:changed
    }

    socket.on('error', (err) => logger.warn('Socket error', err?.message));
  });

  bindIo(io);
  return io;
}
