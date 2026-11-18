import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

/**
 * [TASK-702] Controller xử lý yêu cầu báo cáo doanh số
 */
export const createReportsController = (reportsService) => ({
  getSalesReport: asyncHandler(async (req, res) => {
    const report = await reportsService.getSalesReport(req.user.storeId);
    sendSuccess(res, report, 'Tải báo cáo doanh số thành công');
  }),
});
