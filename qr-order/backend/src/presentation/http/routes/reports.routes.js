import { Router } from 'express';

/**
 * [TASK-702] Tuyến đường API báo cáo doanh số (Chỉ dành cho Admin)
 */
export function createReportsRoutes({ reportsController, authenticate, authorize }) {
  const router = Router();
  router.use(authenticate);
  router.get('/sales', authorize('admin'), reportsController.getSalesReport);
  return router;
}
