import { memo } from 'react';
import { formatTime, formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';

/**
 * [TASK-504] Modal xác nhận đặt món thành công
 * Hiển thị tóm tắt đơn hàng vừa đặt và cung cấp nút điều hướng:
 * 1. "Theo dõi đơn hàng (Real-time)" -> chuyển sang màn hình tracking
 * 2. "Xem thực đơn / Gọi thêm món" -> đóng modal
 */
export const OrderConfirmationModal = memo(function OrderConfirmationModal({
  order,
  tableName,
  onClose,
  onTrackOrder,
}) {
  const { language, t } = useTranslation();

  if (!order) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet order-confirm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="order-confirm__header">
          <div className="order-confirm__icon" aria-hidden="true">✓</div>
          <span className="eyebrow">{t('orderSuccessEyebrow') || 'ĐẶT MÓN THÀNH CÔNG'}</span>
          <h2>{t('orderPlacedTitle') || 'Đơn hàng đã được gửi tới bếp!'}</h2>
          <p className="muted">
            {t('orderCode') || 'Mã đơn'}: <strong>#{order.id}</strong> · {tableName} · {formatTime(order.createdAt, language)}
          </p>
        </div>

        <div className="order-confirm__body">
          <h3>{t('orderedItems') || 'Món đã đặt'}</h3>
          <ul className="sheet__list order-confirm__list">
            {order.items?.map((item) => (
              <li key={item.id || item.menuItemId}>
                <span className="order-confirm__item-name">
                  <strong>{item.quantity}×</strong> {item.name}
                </span>
                <span className="order-confirm__item-price">
                  {formatVND(item.unitPrice * item.quantity, language)}
                </span>
              </li>
            ))}
          </ul>

          {order.note && (
            <p className="order-card__note">
              📝 {t('note') || 'Ghi chú'}: {order.note}
            </p>
          )}

          <div className="order-confirm__total row row--between">
            <span>{t('total')}:</span>
            <strong>{formatVND(order.totalAmount, language)}</strong>
          </div>
        </div>

        <div className="order-confirm__actions">
          <button className="btn btn-primary btn-block" onClick={onTrackOrder}>
            ⏱ {t('trackOrderNow') || 'Theo dõi trạng thái đơn hàng (Realtime)'}
          </button>
          <button className="btn btn-block" onClick={onClose}>
            🍽 {t('continueOrdering') || 'Tiếp tục xem thực đơn / Gọi thêm'}
          </button>
        </div>
      </div>
    </div>
  );
});
