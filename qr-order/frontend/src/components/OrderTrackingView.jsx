import { memo, useEffect, useMemo, useRef } from 'react';
import { useCustomerOrders } from '../stores/ordersStore';
import { formatTime, formatVND } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { useTranslation } from '../lib/i18n';

/**
 * Phát âm thanh chuông báo tinh tế bằng Web Audio API khi trạng thái đổi sang Đã phục vụ hoặc Đang làm
 */
function playChime(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // 3 nốt nhạc thăng hoa: C5 -> E5 -> G5
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } else {
      // 2 nốt nhẹ
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Trình duyệt có thể chặn tự phát nếu chưa có tương tác người dùng
  }
}

const STEPS = [
  { key: 'pending', labelVi: 'Chờ xác nhận', labelEn: 'Pending', icon: '⏳' },
  { key: 'confirmed', labelVi: 'Bếp đã nhận', labelEn: 'Accepted', icon: '📋' },
  { key: 'preparing', labelVi: 'Đang nấu', labelEn: 'Cooking', icon: '🍳' },
  { key: 'served', labelVi: 'Đã phục vụ', labelEn: 'Served', icon: '🍽' },
  { key: 'paid', labelVi: 'Đã thanh toán', labelEn: 'Paid', icon: '💵' },
];

const STATUS_RANK = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  served: 3,
  paid: 4,
  cancelled: -1,
};

/** Thanh tiến trình Stepper trực quan từng bước */
const OrderStepper = memo(function OrderStepper({ status, language }) {
  const currentRank = STATUS_RANK[status] ?? 0;
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="stepper stepper--cancelled">
        <span className="stepper__cancelled-text">
          ⚠️ {language === 'en' ? 'This order was cancelled' : 'Đơn hàng này đã bị hủy'}
        </span>
      </div>
    );
  }

  return (
    <div className="stepper" aria-label="Order progress">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentRank;
        const isCurrent = idx === currentRank;
        const isUpcoming = idx > currentRank;

        return (
          <div
            key={step.key}
            className={`stepper__step ${isCompleted ? 'stepper__step--completed' : ''} ${
              isCurrent ? 'stepper__step--current' : ''
            } ${isUpcoming ? 'stepper__step--upcoming' : ''}`}
          >
            <div className="stepper__node">
              {isCompleted ? '✓' : step.icon}
            </div>
            <span className="stepper__label">
              {language === 'en' ? step.labelEn : step.labelVi}
            </span>
          </div>
        );
      })}
    </div>
  );
});

/**
 * [TASK-505] Màn hình tra cứu & theo dõi trạng thái đơn hàng thời gian thực
 */
export const OrderTrackingView = memo(function OrderTrackingView({
  tableName,
  onGoToMenu,
}) {
  const { language, t } = useTranslation();
  const ordersById = useCustomerOrders((s) => s.byId);
  const orderIds = useCustomerOrders((s) => s.ids);

  // Lưu lại snapshot status của từng đơn để phát hiện khi có thay đổi trạng thái
  const prevStatusesRef = useRef({});

  const orders = useMemo(() => {
    return orderIds
      .map((id) => ordersById[id])
      .filter(Boolean)
      .reverse(); // Đơn mới nhất lên đầu
  }, [orderIds, ordersById]);

  // Tổng tiền các đơn chưa thanh toán
  const unpaidTotal = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'paid' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders]);

  // Phát hiện sự kiện đổi trạng thái từ Socket và kích hoạt chuông âm thanh
  useEffect(() => {
    orders.forEach((order) => {
      const prev = prevStatusesRef.current[order.id];
      if (prev && prev !== order.status) {
        if (order.status === 'served') {
          playChime('success');
        } else if (order.status === 'preparing') {
          playChime('info');
        }
      }
      prevStatusesRef.current[order.id] = order.status;
    });
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="card text-center tracking-empty">
        <span className="tracking-empty__icon" aria-hidden="true">🍜</span>
        <h2>{t('noOrdersYetTitle') || 'Chưa có đơn hàng nào'}</h2>
        <p className="muted">
          {t('noOrdersYetHint') || 'Bàn của bạn chưa gọi món nào. Hãy chọn món ngon trong thực đơn để gửi bếp nhé!'}
        </p>
        <button className="btn btn-primary mt-4" onClick={onGoToMenu}>
          🍽 {t('viewMenuAndOrder') || 'Xem thực đơn & Gọi món'}
        </button>
      </div>
    );
  }

  return (
    <div className="tracking-view">
      <div className="tracking-view__header">
        <div>
          <h2>{t('trackingTitle') || 'Theo dõi đơn hàng tại bàn'}</h2>
          <p className="muted">
            {tableName} · {t('totalActiveOrders') || 'Tổng số đơn'}: <strong>{orders.length}</strong>
          </p>
        </div>
        <button className="btn" onClick={onGoToMenu}>
          + {t('orderMore') || 'Gọi thêm món'}
        </button>
      </div>

      {unpaidTotal > 0 && (
        <div className="tracking-bill-summary card">
          <div className="row row--between">
            <div>
              <span className="eyebrow">{t('currentBill') || 'HÓA ĐƠN TẠM TÍNH'}</span>
              <p className="muted">{t('unpaidNotice') || 'Tổng các đơn đang phục vụ'}</p>
            </div>
            <strong className="tracking-bill-summary__amount">
              {formatVND(unpaidTotal, language)}
            </strong>
          </div>
        </div>
      )}

      <div className="tracking-orders-list">
        {orders.map((order) => (
          <article className="order-card order-card--tracking card" key={order.id}>
            <header className="order-card__head">
              <div>
                <strong>#{order.id}</strong>
                <span className="muted"> · {formatTime(order.createdAt, language)}</span>
              </div>
              <StatusBadge status={order.status} />
            </header>

            {/* Stepper tiến trình chế biến */}
            <OrderStepper status={order.status} language={language} />

            <ul className="order-card__items">
              {order.items?.map((it) => (
                <li key={it.id || it.menuItemId}>
                  <span>
                    <strong>{it.quantity}×</strong> {it.name}
                  </span>
                  <span className="muted">
                    {formatVND(it.unitPrice * it.quantity, language)}
                  </span>
                </li>
              ))}
            </ul>

            {order.note && <p className="order-card__note">📝 {order.note}</p>}

            <footer className="order-card__foot">
              <span className="muted">{t('orderTotal') || 'Thành tiền'}:</span>
              <strong>{formatVND(order.totalAmount, language)}</strong>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
});
