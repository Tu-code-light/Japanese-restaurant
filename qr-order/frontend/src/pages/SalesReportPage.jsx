import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/http';
import { formatTime, formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';
import { StatusBadge } from '../components/StatusBadge';

/**
 * [TASK-702] Trang Báo cáo Doanh số & Đơn hàng (Dành riêng cho Quản lý / Admin)
 */
export default function SalesReportPage() {
  const { language, t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly'

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/sales', { auth: true });
      setData(res);
    } catch (err) {
      setError(err.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Tìm giá trị doanh thu lớn nhất để tính chiều cao cột biểu đồ (%)
  const chartData = useMemo(() => {
    if (!data) return [];
    const list = period === 'daily' ? data.daily : data.weekly;
    const maxRev = Math.max(...list.map((d) => d.revenue), 1);
    return list.map((item) => ({
      label: period === 'daily' ? item.day.slice(5) : item.week,
      fullLabel: period === 'daily' ? item.day : item.week,
      revenue: item.revenue,
      orderCount: item.paidOrders,
      heightPercent: Math.max(Math.round((item.revenue / maxRev) * 100), 4),
    }));
  }, [data, period]);

  if (loading && !data) {
    return (
      <div className="center-page">
        <p className="muted">{t('loadingReport') || 'Đang tổng hợp số liệu báo cáo...'}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="center-page">
        <p className="error">{error}</p>
        <button className="btn mt-3" onClick={loadReport}>
          {t('retry') || 'Thử lại'}
        </button>
      </div>
    );
  }

  const { overview = {}, topItems = [], recentOrders = [] } = data || {};
  const completionRate = overview.totalOrders > 0
    ? Math.round((overview.paidOrders / overview.totalOrders) * 100)
    : 0;

  return (
    <div className="reports-page">
      <div className="row row--between mb-4">
        <div>
          <h1>{t('salesReportTitle') || 'Báo cáo Doanh số & Đơn hàng'}</h1>
          <p className="muted">
            {t('salesReportSubtitle') || 'Thống kê tổng quan tình hình kinh doanh nhà hàng theo ngày & tuần'}
          </p>
        </div>
        <button className="btn" onClick={loadReport} disabled={loading}>
          🔄 {loading ? (t('loading') || 'Đang tải...') : (t('refresh') || 'Làm mới')}
        </button>
      </div>

      {error && <p className="error mb-3">{error}</p>}

      {/* 4 Thẻ KPI chính */}
      <section className="kpi-grid mb-4">
        <div className="card kpi-card">
          <span className="kpi-card__label">💰 {t('totalRevenue') || 'Tổng doanh thu (Đã thanh toán)'}</span>
          <strong className="kpi-card__val text-brand">
            {formatVND(overview.totalRevenue || 0, language)}
          </strong>
          <span className="muted kpi-card__sub">
            {t('paidOrdersCount', { count: overview.paidOrders || 0 }) || `${overview.paidOrders || 0} đơn thành công`}
          </span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">📦 {t('totalOrdersCount') || 'Tổng số đơn hàng'}</span>
          <strong className="kpi-card__val">
            {overview.totalOrders || 0}
          </strong>
          <span className="muted kpi-card__sub">
            {t('completionRate') || 'Tỷ lệ hoàn tất'}: <strong>{completionRate}%</strong>
          </span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">🏷️ {t('averageOrderValue') || 'Giá trị trung bình / đơn'}</span>
          <strong className="kpi-card__val">
            {formatVND(overview.averageOrderValue || 0, language)}
          </strong>
          <span className="muted kpi-card__sub">
            {t('aovHint') || 'Doanh thu trung bình trên mỗi hóa đơn'}
          </span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">🍳 {t('activeOrdersNow') || 'Đơn đang phục vụ'}</span>
          <strong className="kpi-card__val text-tea">
            {overview.activeOrders || 0}
          </strong>
          <span className="muted kpi-card__sub">
            {t('cancelledCount', { count: overview.cancelledOrders || 0 }) || `${overview.cancelledOrders || 0} đơn hủy`}
          </span>
        </div>
      </section>

      {/* Biểu đồ biến động doanh thu */}
      <section className="card chart-card mb-4">
        <div className="row row--between mb-3">
          <div>
            <h2>📊 {t('revenueTrend') || 'Biến động doanh thu'}</h2>
            <p className="muted">
              {period === 'daily'
                ? (t('revenueDailyHint') || 'Doanh thu theo từng ngày gần đây')
                : (t('revenueWeeklyHint') || 'Doanh thu theo từng tuần')}
            </p>
          </div>
          <div className="btn-group row">
            <button
              className={`btn btn-sm ${period === 'daily' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('daily')}
            >
              📅 {t('byDay') || 'Theo ngày'}
            </button>
            <button
              className={`btn btn-sm ${period === 'weekly' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('weekly')}
            >
              📆 {t('byWeek') || 'Theo tuần'}
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className="muted text-center py-4">{t('noSalesData') || 'Chưa có dữ liệu doanh thu trong khoảng thời gian này.'}</p>
        ) : (
          <div className="bar-chart">
            <div className="bar-chart__bars">
              {chartData.map((d, i) => (
                <div className="bar-chart__col" key={i}>
                  <div className="bar-chart__tooltip">
                    <strong>{formatVND(d.revenue, language)}</strong>
                    <small>{d.orderCount} {t('ordersWord') || 'đơn'}</small>
                  </div>
                  <div
                    className="bar-chart__bar"
                    style={{ height: `${d.heightPercent}%` }}
                  />
                  <span className="bar-chart__label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Top món ăn bán chạy & Danh sách đơn gần đây */}
      <div className="reports-two-col">
        {/* Top món bán chạy */}
        <section className="card">
          <h2>🏆 {t('topSellingDishes') || 'Top món ăn bán chạy'}</h2>
          {topItems.length === 0 ? (
            <p className="muted">{t('noDishesSold') || 'Chưa có món ăn nào được đặt.'}</p>
          ) : (
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('dishName') || 'Món ăn'}</th>
                    <th className="text-right">{t('quantitySold') || 'Số lượng'}</th>
                    <th className="text-right">{t('totalRevenue') || 'Doanh thu'}</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`rank-badge ${idx < 3 ? `rank-badge--${idx + 1}` : ''}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td><strong>{item.name}</strong></td>
                      <td className="text-right">{item.totalQuantity}</td>
                      <td className="text-right text-brand">
                        <strong>{formatVND(item.totalRevenue, language)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Đơn gần đây */}
        <section className="card">
          <h2>⏱ {t('recentOrdersTitle') || 'Đơn hàng gần đây'}</h2>
          {recentOrders.length === 0 ? (
            <p className="muted">{t('noRecentOrders') || 'Chưa có đơn hàng nào.'}</p>
          ) : (
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('orderCode') || 'Mã đơn'}</th>
                    <th>{t('table') || 'Bàn'}</th>
                    <th>{t('time') || 'Thời gian'}</th>
                    <th className="text-right">{t('total') || 'Tổng tiền'}</th>
                    <th>{t('status') || 'Trạng thái'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td><strong>#{ord.id}</strong></td>
                      <td>{ord.tableName}</td>
                      <td className="muted">{formatTime(ord.createdAt, language)}</td>
                      <td className="text-right">
                        <strong>{formatVND(ord.totalAmount, language)}</strong>
                      </td>
                      <td>
                        <StatusBadge status={ord.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
