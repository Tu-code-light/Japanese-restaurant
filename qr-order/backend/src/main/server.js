import http from 'node:http';
import { env } from '../infrastructure/config/env.js';
import { closePool, query } from '../infrastructure/config/database.js';
import { createApp } from '../presentation/http/app.js';
import { initSocket } from '../infrastructure/realtime/socket.js';
import { logger } from '../shared/utils/logger.js';
import { apiLimiter, loginLimiter, orderLimiter } from '../presentation/http/middlewares/rateLimit.js';
import { authMiddleware, controllers, tablesService, verifyToken } from './container.js';

const app = createApp({
  env,
  query,
  apiLimiter,
  limiters: { login: loginLimiter, order: orderLimiter },
  controllers,
  authMiddleware,
});
const server = http.createServer(app);
const io = initSocket(server, {
  corsOrigins: env.corsOrigins,
  verifyToken,
  resolveTableToken: tablesService.resolveByToken,
});

server.listen(env.PORT, () => {
  logger.info(`🚀 Server chạy tại http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/** Tắt êm: ngừng nhận kết nối mới -> đóng socket -> đóng pool DB. */
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Nhận ${signal}, đang tắt server...`);

  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();

  try {
    await new Promise((resolve) => io.close(resolve)); // đóng socket + http server
    await closePool();
    logger.info('Đã tắt gọn gàng.');
    process.exit(0);
  } catch (err) {
    logger.error('Lỗi khi tắt server', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Lỗi không bắt được: log lại, không để process chết âm thầm.
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', reason));
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', err);
  shutdown('uncaughtException');
});
