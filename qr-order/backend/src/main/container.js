import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { AppError } from '../application/errors/AppError.js';
import { createAuthService } from '../application/services/auth.service.js';
import { createMenuService } from '../application/services/menu.service.js';
import { createOrdersService } from '../application/services/orders.service.js';
import { createTablesService } from '../application/services/tables.service.js';
import { createCategoriesService } from '../application/services/categories.service.js';
import { createProductsService } from '../application/services/products.service.js';
import { createReportsService } from '../application/services/reports.service.js';
import { env } from '../infrastructure/config/env.js';
import { withTransaction } from '../infrastructure/config/database.js';
import { authRepository } from '../infrastructure/persistence/auth.repository.js';
import { menuRepository } from '../infrastructure/persistence/menu.repository.js';
import { ordersRepository } from '../infrastructure/persistence/orders.repository.js';
import { tablesRepository } from '../infrastructure/persistence/tables.repository.js';
import { categoriesRepository } from '../infrastructure/persistence/categories.repository.js';
import { productsRepository } from '../infrastructure/persistence/products.repository.js';
import { reportsRepository } from '../infrastructure/persistence/reports.repository.js';
import { saveProductImage, deleteProductImage } from '../infrastructure/storage/productImages.js';
import { publisher } from '../infrastructure/realtime/publisher.js';
import { TtlCache } from '../shared/utils/ttlCache.js';
import { createAuthController } from '../presentation/http/controllers/auth.controller.js';
import { createMenuController } from '../presentation/http/controllers/menu.controller.js';
import { createOrdersController } from '../presentation/http/controllers/orders.controller.js';
import { createPublicController } from '../presentation/http/controllers/public.controller.js';
import { createTablesController } from '../presentation/http/controllers/tables.controller.js';
import { createCategoriesController } from '../presentation/http/controllers/categories.controller.js';
import { createProductsController } from '../presentation/http/controllers/products.controller.js';
import { createReportsController } from '../presentation/http/controllers/reports.controller.js';
import { createAuthenticate, authorize } from '../presentation/http/middlewares/auth.js';

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw AppError.unauthorized();
  }
};

export const tablesService = createTablesService({
  tablesRepository,
  tableByTokenCache: new TtlCache(60_000),
  withTransaction,
  generateQrToken: () => crypto.randomBytes(24).toString('hex'),
  generateQrDataUrl: (url) => QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 512 }),
  customerAppUrl: env.CUSTOMER_APP_URL,
});

const menuService = createMenuService({
  menuRepository,
  publicMenuCache: new TtlCache(30_000),
  publisher,
});

const categoriesService = createCategoriesService({
  categoriesRepository,
  onMenuChanged: (storeId) => menuService.invalidate(storeId),
});

const productsService = createProductsService({
  productsRepository,
  categoriesRepository,
  saveImage: saveProductImage,
  deleteImage: deleteProductImage,
  onMenuChanged: (storeId) => menuService.invalidate(storeId),
});

const reportsService = createReportsService({ reportsRepository });

const authService = createAuthService({
  authRepository,
  comparePassword: (password, hash) => bcrypt.compare(password, hash),
  signToken: (payload, secret, options) => jwt.sign(payload, secret, options),
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
});

const ordersService = createOrdersService({
  withTransaction,
  menuRepository,
  tablesService,
  ordersRepository,
  publisher,
});

export const controllers = {
  auth: createAuthController(authService),
  menu: createMenuController(menuService),
  orders: createOrdersController(ordersService),
  public: createPublicController({ tablesService, menuService }),
  tables: createTablesController(tablesService),
  categories: createCategoriesController(categoriesService),
  products: createProductsController(productsService),
  reports: createReportsController(reportsService),
};

export const authMiddleware = {
  authenticate: createAuthenticate(verifyToken),
  authorize,
};
