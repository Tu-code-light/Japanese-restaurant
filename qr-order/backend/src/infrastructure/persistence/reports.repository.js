import { query } from '../config/database.js';

/**
 * [TASK-702] Repository truy vấn báo cáo doanh số và đơn hàng
 */
export const reportsRepository = {
  /**
   * Thống kê tổng quan KPI
   */
  async getOverview(storeId) {
    const { rows } = await query(
      `SELECT
        COUNT(*)::int AS total_orders,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int AS paid_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int AS cancelled_orders,
        COUNT(CASE WHEN status IN ('pending', 'confirmed', 'preparing', 'served') THEN 1 END)::int AS active_orders,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0)::int AS total_revenue,
        COALESCE(ROUND(AVG(CASE WHEN status = 'paid' THEN total_amount END)), 0)::int AS average_order_value
       FROM orders
       WHERE store_id = $1`,
      [storeId],
    );

    const r = rows[0] || {};
    return {
      totalOrders: r.total_orders || 0,
      paidOrders: r.paid_orders || 0,
      cancelledOrders: r.cancelled_orders || 0,
      activeOrders: r.active_orders || 0,
      totalRevenue: r.total_revenue || 0,
      averageOrderValue: r.average_order_value || 0,
    };
  },

  /**
   * Thống kê theo ngày (14 ngày gần nhất)
   */
  async getDailyStats(storeId) {
    const { rows } = await query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS total_orders,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int AS paid_orders,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0)::int AS revenue
       FROM orders
       WHERE store_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
       ORDER BY day ASC`,
      [storeId],
    );

    return rows.map((r) => ({
      day: r.day,
      totalOrders: r.total_orders,
      paidOrders: r.paid_orders,
      revenue: r.revenue,
    }));
  },

  /**
   * Thống kê theo tuần (8 tuần gần nhất)
   */
  async getWeeklyStats(storeId) {
    const { rows } = await query(
      `SELECT
        TO_CHAR(created_at, 'IYYY-"W"IW') AS week,
        COUNT(*)::int AS total_orders,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int AS paid_orders,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0)::int AS revenue
       FROM orders
       WHERE store_id = $1 AND created_at >= NOW() - INTERVAL '8 weeks'
       GROUP BY TO_CHAR(created_at, 'IYYY-"W"IW')
       ORDER BY week ASC`,
      [storeId],
    );

    return rows.map((r) => ({
      week: r.week,
      totalOrders: r.total_orders,
      paidOrders: r.paid_orders,
      revenue: r.revenue,
    }));
  },

  /**
   * Top 8 món ăn bán chạy nhất
   */
  async getTopSellingItems(storeId) {
    const { rows } = await query(
      `SELECT
        oi.name,
        SUM(oi.quantity)::int AS total_quantity,
        SUM(oi.quantity * oi.unit_price)::int AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.store_id = $1 AND o.status != 'cancelled'
       GROUP BY oi.name
       ORDER BY total_quantity DESC
       LIMIT 8`,
      [storeId],
    );

    return rows.map((r) => ({
      name: r.name,
      totalQuantity: r.total_quantity,
      totalRevenue: r.total_revenue,
    }));
  },

  async getRecentOrders(storeId) {
    const { rows } = await query(
      `SELECT o.id, t.name AS table_name, o.total_amount, o.status, o.created_at
       FROM orders o
       JOIN tables t ON t.id = o.table_id
       WHERE o.store_id = $1
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [storeId],
    );

    return rows.map((r) => ({
      id: r.id,
      tableName: r.table_name,
      totalAmount: r.total_amount,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
};
