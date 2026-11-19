import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/http';
import { formatTime, formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';
import { StatusBadge } from '../components/StatusBadge';

const ORDER_PAGE_SIZE = 10;

function FullListModal({ orders, title, onClose, onDelete, language, t }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(orders.length / ORDER_PAGE_SIZE);
  const paged = orders.slice((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE);

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal__header">
          <h2>{title}</h2>
          <button className="report-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="report-modal__body">
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('orderCode') || 'Mã đơn'}</th>
                  <th>{t('table') || 'Bàn'}</th>
                  <th>{t('time') || 'Thời gian'}</th>
                  <th className="text-right">{t('total') || 'Tổng tiền'}</th>
                  <th>{t('status') || 'Trạng thái'}</th>
                  <th>{t('action') || 'Thao tác'}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((ord) => (
                  <tr key={ord.id}>
                    <td><strong>#{ord.id}</strong></td>
                    <td>{ord.tableName}</td>
                    <td className="muted">{formatTime(ord.createdAt, language)}</td>
                    <td className="text-right">
                      <strong>{formatVND(ord.totalAmount, language)}</strong>
                    </td>
                    <td><StatusBadge status={ord.status} /></td>
                    <td>
                      <button
                        className="btn-delete-order"
                        onClick={() => onDelete(ord.id)}
                        title={t('deleteOrder') || 'Xoá đơn'}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="report-pagination">
              <button
                className="report-pagination__btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              <div className="report-pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`report-pagination__btn${p === page ? ' report-pagination__btn--active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="report-pagination__btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesReportPage() {
  const { language, t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [showOrderModal, setShowOrderModal] = useState(false);

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

  const chartData = useMemo(() => {
    if (!data) return [];
    const list = period === 'daily' ? data.daily : data.weekly;
    const maxRev = Math.max(...list.map((d) => d.revenue), 1);
    return list.map((item) => ({
      label: period === 'daily' ? item.day.slice(5) : item.week,
      fullLabel: period === 'daily' ? item.day : item.week,
      revenue: item.revenue,
      orderCount: item.paidOrders,
      heightPercent: Math.min(Math.max(Math.round((item.revenue / maxRev) * 100), 4), 75),
      isPeak: item.revenue === maxRev && item.revenue > 0,
    }));
  }, [data, period]);

  const handleDeleteOrder = useCallback(async (id) => {
    const confirmMsg = t('confirmDeleteOrder') || `Xoá đơn hàng #${id}?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/orders/${id}`, { auth: true });
      setData((prev) => {
        if (!prev) return prev;
        const deleted = prev.recentOrders.find((o) => o.id === id);
        const newRevenue = deleted
          ? (prev.overview.totalRevenue || 0) - (deleted.totalAmount || 0)
          : prev.overview.totalRevenue;
        return {
          ...prev,
          recentOrders: prev.recentOrders.filter((o) => o.id !== id),
          overview: {
            ...prev.overview,
            totalRevenue: Math.max(0, newRevenue),
            totalOrders: Math.max(0, (prev.overview.totalOrders || 0) - 1),
          },
        };
      });
      alert(t('orderDeletedSuccess') || 'Đã xoá đơn hàng thành công.');
    } catch (err) {
      alert(err.message || 'Lỗi khi xoá đơn hàng.');
    }
  }, [t]);

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
      {showOrderModal && (
        <FullListModal
          orders={recentOrders}
          title={t('allRecentOrdersTitle') || 'Tất cả đơn hàng gần đây'}
          onClose={() => setShowOrderModal(false)}
          onDelete={handleDeleteOrder}
          language={language}
          t={t}
        />
      )}

      <div className="row row--between mb-4">
        <div>
          <h1>{t('salesReportTitle') || 'Thống Kê'}</h1>
          <p className="muted">
            {t('salesReportSubtitle') || 'Thống kê tổng quan tình hình kinh doanh nhà hàng theo ngày & tuần'}
          </p>
        </div>
        <button className="btn" onClick={loadReport} disabled={loading}>
          🔄 {loading ? (t('loading') || 'Đang tải...') : (t('refresh') || 'Làm mới')}
        </button>
      </div>

      {error && <p className="error mb-3">{error}</p>}

      <div className="reports-middle-grid mb-4">
        <section className="card chart-section">
          <div className="row row--between mb-2">
            <div>
              <h2>📈 {t('revenueChart') || 'Biến động doanh thu'}</h2>
              <p className="muted">{t('revenueChartSubtitle') || 'Doanh thu theo từng ngày gần đây'}</p>
            </div>
            <div className="row" style={{ gap: '8px' }}>
              <button
                className={`btn btn-sm${period === 'daily' ? ' btn-primary' : ''}`}
                onClick={() => setPeriod('daily')}
              >
                📅 {t('byDay') || 'Theo ngày'}
              </button>
              <button
                className={`btn btn-sm${period === 'weekly' ? ' btn-primary' : ''}`}
                onClick={() => setPeriod('weekly')}
              >
                📆 {t('byWeek') || 'Theo tuần'}
              </button>
            </div>
          </div>
          {chartData.length === 0 ? (
            <p className="muted text-center py-4">{t('noSalesData') || 'Chưa có dữ liệu doanh thu.'}</p>
          ) : (
            <div className="bar-chart">
              <div className="bar-chart__bars">
                {chartData.map((d, i) => (
                  <div className="bar-chart__col" key={i}>
                    {d.isPeak && (
                      <span className="bar-chart__peak-tag">★ {t('peakDay') || 'Cao điểm'}</span>
                    )}
                    <div className="bar-chart__tooltip">
                      <strong>{formatVND(d.revenue, language)}</strong>
                      <small>{d.orderCount} {t('ordersWord') || 'đơn'}</small>
                    </div>
                    <div
                      className={`bar-chart__bar${d.isPeak ? ' bar-chart__bar--peak' : ''}`}
                      style={{ height: `${d.heightPercent}%` }}
                    />
                    <span className="bar-chart__label">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="kpi-column">
          <div className="card kpi-card">
            <span className="kpi-card__label">💰 {t('totalRevenue') || 'Tổng doanh thu'}</span>
            <strong className="kpi-card__val text-brand">
              {formatVND(overview.totalRevenue || 0, language)}
            </strong>
            <span className="muted kpi-card__sub">
              {overview.paidOrders || 0} {t('paidOrdersLabel') || 'đơn thành công'}
            </span>
          </div>

          <div className="card kpi-card">
            <span className="kpi-card__label">📦 {t('totalOrdersCount') || 'Tổng số đơn hàng'}</span>
            <strong className="kpi-card__val">{overview.totalOrders || 0}</strong>
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
            <span className="kpi-card__label">🍽️ {t('activeOrdersCount') || 'Đơn đang phục vụ'}</span>
            <strong className="kpi-card__val">{overview.activeOrders || 0}</strong>
            <span className="muted kpi-card__sub">
              {overview.cancelledOrders || 0} {t('cancelledLabel') || 'đơn huỷ'}
            </span>
          </div>
        </div>
      </div>

      <div className="reports-two-col">
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
                    <th>{t('dishName') || 'Tên món'}</th>
                    <th className="text-right">{t('quantitySold') || 'Số lượng'}</th>
                    <th className="text-right">{t('totalRevenue') || 'Doanh thu'}</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`rank-badge${idx < 3 ? ` rank-badge--${idx + 1}` : ''}`}>
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

        <section className="card">
          <div className="row row--between mb-2">
            <h2>⏱ {t('recentOrdersTitle') || 'Đơn hàng gần đây'}</h2>
            {recentOrders.length > 0 && (
              <button className="btn btn-sm" onClick={() => setShowOrderModal(true)}>
                {t('viewAll') || 'Xem tất cả'} →
              </button>
            )}
          </div>
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
                  {recentOrders.slice(0, 5).map((ord) => (
                    <tr key={ord.id}>
                      <td><strong>#{ord.id}</strong></td>
                      <td>{ord.tableName}</td>
                      <td className="muted">{formatTime(ord.createdAt, language)}</td>
                      <td className="text-right">
                        <strong>{formatVND(ord.totalAmount, language)}</strong>
                      </td>
                      <td><StatusBadge status={ord.status} /></td>
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
