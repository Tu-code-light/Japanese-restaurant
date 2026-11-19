import { memo } from 'react';
import { formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';
import { translateMenuItem } from '../lib/menuTranslations';
import { useCartStore, useQuantity } from '../stores/cartStore';

export const MenuItemCard = memo(function MenuItemCard({ item }) {
  const quantity = useQuantity(item.id);
  const { language, t } = useTranslation();
  const displayItem = translateMenuItem(item, language);
  const { add, remove } = useCartStore.getState();

  const isAvailable = item.isAvailable !== false; 

  return (
    <div className={`menu-card ${!isAvailable ? 'menu-card--unavailable' : ''}`}>
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={displayItem.name}
          className="menu-card__thumb"
          loading="lazy"
          onError={(e) => (e.target.style.display = 'none')}
        />
      )}

      <div className="menu-card__info" style={{ opacity: isAvailable ? 1 : 0.6 }}>
        <h3>{displayItem.name}</h3>
        {displayItem.description && <p className="muted">{displayItem.description}</p>}
        <strong>{formatVND(displayItem.price, language)}</strong>
      </div>

      <div className="qty">
        {!isAvailable ? (
          <span className="badge-pill">{t('unavailable') || 'Tạm hết'}</span>
        ) : (
          <>
            {quantity > 0 && (
              <>
                <button
                  className="btn-round"
                  onClick={() => remove(item.id)}
                  aria-label={t('removeItem', { name: displayItem.name })}
                >
                  −
                </button>
                <span className="qty__n">{quantity}</span>
              </>
            )}
            <button
              className="btn-round btn-round--primary"
              onClick={() => add(item)}
              aria-label={t('addItem', { name: displayItem.name })}
            >
              +
            </button>
          </>
        )}
      </div>
    </div>
  );
});