/**
 * [TASK-702] Service tổng hợp báo cáo kinh doanh cho nhà hàng
 */
export function createReportsService({ reportsRepository }) {
  return {
    async getSalesReport(storeId) {
      const [overview, daily, weekly, topItems, recentOrders] = await Promise.all([
        reportsRepository.getOverview(storeId),
        reportsRepository.getDailyStats(storeId),
        reportsRepository.getWeeklyStats(storeId),
        reportsRepository.getTopSellingItems(storeId),
        reportsRepository.getRecentOrders(storeId),
      ]);

      return {
        overview,
        daily,
        weekly,
        topItems,
        recentOrders,
      };
    },
  };
}
