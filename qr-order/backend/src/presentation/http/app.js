import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createErrorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createMenuRoutes } from './routes/menu.routes.js';
import { createOrdersRoutes } from './routes/orders.routes.js';
import { createTablesRoutes } from './routes/tables.routes.js';
import { createPublicRoutes } from './routes/public.routes.js';

/** Tạo Express app (tách khỏi server.js để dễ test) */
export function createApp({ env, query, apiLimiter, limiters, controllers, authMiddleware }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // chạy sau Nginx/Load balancer -> lấy đúng IP client
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiLimiter);

  // Health check: kiểm tra cả kết nối DB
  app.get('/api/health', async (_req, res, next) => {
    try {
      await query('SELECT 1');
      sendSuccess(res, { uptime: process.uptime() }, 'OK');
    } catch (err) {
      next(err);
    }
  });

  app.use(
    '/api/public',
    createPublicRoutes({
      publicController: controllers.public,
      ordersController: controllers.orders,
      orderLimiter: limiters.order,
    }),
  );
  app.use(
    '/api/auth',
    createAuthRoutes({
      authController: controllers.auth,
      authenticate: authMiddleware.authenticate,
      loginLimiter: limiters.login,
    }),
  );
  app.use(
    '/api/tables',
    createTablesRoutes({
      tablesController: controllers.tables,
      authenticate: authMiddleware.authenticate,
      authorize: authMiddleware.authorize,
    }),
  );
  app.use(
    '/api/menu',
    createMenuRoutes({
      menuController: controllers.menu,
      authenticate: authMiddleware.authenticate,
      authorize: authMiddleware.authorize,
    }),
  );
  app.use(
    '/api/orders',
    createOrdersRoutes({
      ordersController: controllers.orders,
      authenticate: authMiddleware.authenticate,
      orderLimiter: limiters.order,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(env));
  return app;
}
