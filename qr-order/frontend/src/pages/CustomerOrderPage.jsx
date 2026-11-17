import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/http';
import { formatVND } from '../lib/format';
import { useCustomerRealtime } from '../hooks/useCustomerRealtime';
import { MenuItemCard } from '../components/MenuItemCard';
import { OrderCard } from '../components/OrderCard';
import { useCartStore, useCartCount, useCartTotal } from '../stores/cartStore';
import { useCustomerOrders } from '../stores/ordersStore';
import { useTranslation } from '../lib/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

/** Một đơn của bàn: subscribe theo id để chỉ render lại khi chính đơn đó đổi */
const CustomerOrderRow = memo(function CustomerOrderRow({ id }) {
  const order = useCustomerOrders((s) => s.byId[id]);
  return order ? <OrderCard order={order} /> : null;
});

/** Thanh giỏ hàng cố định dưới đáy: tách riêng để tổng tiền đổi không kéo cả trang render lại */
function CartBar({ onOpen }) {
  const count = useCartCount();
  const total = useCartTotal();
  const { language, t } = useTranslation();
  if (count === 0) return null;
  return (
    <button className="cart-bar" onClick={onOpen}>
      <span>🛒 {t('cartItems', { count })}</span>
      <strong>{formatVND(total, language)} · {t('viewCart')}</strong>
    </button>
  );
}

function CartSheet({ tableToken, onClose, onUnavailable }) {
  const { language, t } = useTranslation();
  const items = useCartStore((s) => s.items);
  const note = useCartStore((s) => s.note);
  const total = useCartTotal();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const list = Object.values(items);

  const submit = async () => {
    const { ensureSubmitKey, clear } = useCartStore.getState();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/public/orders', {
        tableToken,
        idempotencyKey: ensureSubmitKey(), // gửi lại do mạng lỗi vẫn dùng đúng key này -> không tạo đơn trùng
        note,
        items: list.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      clear();
      onClose(true);
    } catch (e) {
      if (e.status === 409 && e.data?.unavailable) onUnavailable?.();
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={() => onClose(false)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t('cart')}</h2>
        <ul className="sheet__list">
          {list.map((i) => (
            <li key={i.menuItemId}>
              <span>{i.name}</span>
              <span className="qty">
                <button className="btn-round" onClick={() => useCartStore.getState().remove(i.menuItemId)}>−</button>
                <span className="qty__n">{i.quantity}</span>
                <button
                  className="btn-round btn-round--primary"
                  onClick={() => useCartStore.getState().add({ id: i.menuItemId, name: i.name, price: i.price })}
                >
                  +
                </button>
              </span>
              <strong>{formatVND(i.price * i.quantity, language)}</strong>
            </li>
          ))}
        </ul>

        <textarea
          className="input"
          rows={2}
          maxLength={500}
          placeholder={t('notePlaceholder')}
          value={note}
          onChange={(e) => useCartStore.getState().setNote(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <div className="row row--between">
          <strong>{t('total')}: {formatVND(total, language)}</strong>
          <div className="row">
            <button className="btn" onClick={() => onClose(false)}>{t('close')}</button>
            <button className="btn btn-primary" disabled={submitting || list.length === 0} onClick={submit}>
              {submitting ? t('sending') : t('sendOrder')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerOrderPage() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState(null);

  // Giỏ hàng gắn với bàn hiện tại
  useEffect(() => {
    useCartStore.getState().bindTable(token);
  }, [token]);

  /** Tải menu; sau đó loại khỏi giỏ những món không còn bán */
  const loadMenu = useCallback(async () => {
    try {
      const res = await api.get(`/public/tables/${token}`);
      setData(res);
      setError(null);

      const available = new Set(res.menu.flatMap((c) => c.items.map((i) => i.id)));
      const { items, remove } = useCartStore.getState();
      Object.values(items).forEach((i) => {
        if (!available.has(i.menuItemId)) for (let n = 0; n < i.quantity; n++) remove(i.menuItemId);
      });
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useCustomerRealtime(token, loadMenu);

  const orderIds = useCustomerOrders((s) => s.ids);
  const visibleOrderIds = useMemo(() => [...orderIds].reverse(), [orderIds]);

  const handleCloseCart = useCallback((sent) => {
    setShowCart(false);
    if (sent) {
      setToast(t('orderSent'));
      setTimeout(() => setToast(null), 4000);
    }
  }, [t]);

  if (error && !data) return <div className="center-page"><p className="error">{error}</p></div>;
  if (!data) return <div className="center-page"><p className="muted">{t('loadingMenu')}</p></div>;

  return (
    <div className="customer">
      <header className="customer__head">
        <div className="customer__head-top">
          <span className="eyebrow">お食事処 · {t('customerOrder')}</span>
          <LanguageSwitcher />
        </div>
        <h1>{data.store.name}</h1>
        <p className="customer__table"><span aria-hidden="true">⌖</span>{data.table.name} · {data.table.area}</p>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {visibleOrderIds.length > 0 && (
        <section className="section">
          <h2>{t('customerOrders')}</h2>
          {visibleOrderIds.map((id) => <CustomerOrderRow key={id} id={id} />)}
        </section>
      )}

      {data.menu.map((cat) => (
        <section className="section" key={cat.id}>
          <h2>{cat.name}</h2>
          {cat.items.map((item) => <MenuItemCard key={item.id} item={item} />)}
        </section>
      ))}

      <div className="cart-spacer" />
      <CartBar onOpen={() => setShowCart(true)} />
      {showCart && <CartSheet tableToken={token} onClose={handleCloseCart} onUnavailable={loadMenu} />}
    </div>
  );
}
