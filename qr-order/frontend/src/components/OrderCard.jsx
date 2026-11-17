import { memo } from 'react';
import { formatTime, formatVND, getStaffActions } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { useTranslation } from '../lib/i18n';
import { translateItemName } from '../lib/menuTranslations';

/**
 * Thẻ đơn hàng hiển thị cho cả nhân viên (có nút thao tác) lẫn khách (chỉ xem).
 * memo: chỉ render lại khi object `order` của chính nó đổi (nhờ store chuẩn hóa theo id).
 */
export const OrderCard = memo(function OrderCard({ order, onChangeStatus, busy }) {
  const { language, t } = useTranslation();
  const actions = onChangeStatus ? getStaffActions(t)[order.status] ?? [] : [];

  return (
    <article className="order-card">
      <header className="order-card__head">
        <div>
          <strong>{order.tableName}</strong>
          <span className="muted"> · #{order.id} · {formatTime(order.createdAt, language)}</span>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <ul className="order-card__items">
        {order.items.map((it) => (
          <li key={it.id}>
            <span>{it.quantity}× {translateItemName(it.name, language)}</span>
            <span className="muted">{formatVND(it.unitPrice * it.quantity, language)}</span>
          </li>
        ))}
      </ul>

      {order.note && <p className="order-card__note">📝 {order.note}</p>}

      <footer className="order-card__foot">
        <strong>{formatVND(order.totalAmount, language)}</strong>
        <div className="row">
          {actions.map((a) => (
            <button
              key={a.to}
              className={`btn ${a.primary ? 'btn-primary' : ''} ${a.danger ? 'btn-danger' : ''}`}
              disabled={busy}
              onClick={() => onChangeStatus(order.id, a.to)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </footer>
    </article>
  );
});
