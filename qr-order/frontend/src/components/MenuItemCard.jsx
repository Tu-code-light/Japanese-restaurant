import { memo } from 'react';
import { formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';
import { useCartStore, useQuantity } from '../stores/cartStore';

/**
 * Thẻ món. Được memo + chỉ subscribe số lượng CỦA CHÍNH MÓN NÀY,
 * nên thêm món khác vào giỏ không làm thẻ này render lại.
 */
export const MenuItemCard = memo(function MenuItemCard({ item }) {
  const quantity = useQuantity(item.id);
  const { language, t } = useTranslation();
  // Lấy action qua getState: không subscribe -> không gây render.
  const { add, remove } = useCartStore.getState();

  return (
    <div className="menu-card">
      <div className="menu-card__info">
        <h3>{item.name}</h3>
        {item.description && <p className="muted">{item.description}</p>}
        <strong>{formatVND(item.price, language)}</strong>
      </div>
      <div className="qty">
        {quantity > 0 && (
          <>
            <button className="btn-round" onClick={() => remove(item.id)} aria-label={t('removeItem', { name: item.name })}>−</button>
            <span className="qty__n">{quantity}</span>
          </>
        )}
        <button className="btn-round btn-round--primary" onClick={() => add(item)} aria-label={t('addItem', { name: item.name })}>+</button>
      </div>
    </div>
  );
});
