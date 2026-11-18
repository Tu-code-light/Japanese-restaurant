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
import { OrderConfirmationModal } from '../components/OrderConfirmationModal';
import { OrderTrackingView } from '../components/OrderTrackingView';

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
      const createdOrder = await api.post('/public/orders', {
        tableToken,
        idempotencyKey: ensureSubmitKey(), // gửi lại do mạng lỗi vẫn dùng đúng key này -> không tạo đơn trùng
        note,
        items: list.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      clear();
      onClose(true, createdOrder);
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
  
  // Tab điều hướng: 'menu' (Thực đơn) hoặc 'tracking' (Theo dõi đơn Realtime)
  const [activeTab, setActiveTab] = useState('menu');
  // Modal xác nhận đơn hàng thành công [TASK-504]
  const [confirmedOrder, setConfirmedOrder] = useState(null);

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
  const ordersById = useCustomerOrders((s) => s.byId);

  // Đếm số đơn đang mở (chưa thanh toán / chưa hủy)
  const activeOrdersCount = useMemo(() => {
    return orderIds.filter((id) => {
      const o = ordersById[id];
      return o && o.status !== 'paid' && o.status !== 'cancelled';
    }).length;
  }, [orderIds, ordersById]);

  const handleCloseCart = useCallback((sent, createdOrder) => {
    setShowCart(false);
    if (sent && createdOrder) {
      // Upsert vào store ngay lập tức để đồng bộ realtime
      useCustomerOrders.getState().upsert(createdOrder);
      // Hiển thị modal xác nhận đơn hàng [TASK-504]
      setConfirmedOrder(createdOrder);
    } else if (sent) {
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

        {/* Tab chuyển đổi linh hoạt giữa Thực đơn & Theo dõi đơn [TASK-505] */}
        <nav className="customer-tabs" aria-label="Customer views">
          <button
            className={`customer-tabs__btn ${activeTab === 'menu' ? 'customer-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            🍜 {t('tabMenu') || 'Thực đơn'}
          </button>
          <button
            className={`customer-tabs__btn ${activeTab === 'tracking' ? 'customer-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab('tracking')}
          >
            ⏱ {t('tabTracking') || 'Đơn của bàn'}
            {orderIds.length > 0 && (
              <span className={`badge-pill ${activeOrdersCount > 0 ? 'badge-pill--active' : ''}`}>
                {activeOrdersCount > 0 ? activeOrdersCount : orderIds.length}
              </span>
            )}
          </button>
        </nav>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {/* Hiển thị View theo Tab đã chọn */}
      {activeTab === 'tracking' ? (
        <OrderTrackingView
          tableName={data.table.name}
          onGoToMenu={() => setActiveTab('menu')}
        />
      ) : (
        <>
          {/* Nhắc nhở nhanh khi bàn có đơn đang xử lý */}
          {activeOrdersCount > 0 && (
            <div className="card customer-active-banner row row--between" onClick={() => setActiveTab('tracking')}>
              <div>
                <strong>⏱ {t('activeOrdersNotice', { count: activeOrdersCount }) || `Bàn có ${activeOrdersCount} đơn đang được phục vụ`}</strong>
                <p className="muted">{t('clickToTrack') || 'Nhấn để xem trạng thái bếp nấu theo thời gian thực'}</p>
              </div>
              <button className="btn btn-sm">{t('trackNow') || 'Xem ngay'}</button>
            </div>
          )}

          {data.menu.map((cat) => (
            <section className="section" key={cat.id}>
              <h2>{cat.name}</h2>
              {cat.items.map((item) => <MenuItemCard key={item.id} item={item} />)}
            </section>
          ))}
        </>
      )}

      {/* Thanh giỏ hàng chỉ hiện khi ở tab menu */}
      {activeTab === 'menu' && (
        <>
          <div className="cart-spacer" />
          <CartBar onOpen={() => setShowCart(true)} />
        </>
      )}

      {/* Sheet xem giỏ hàng */}
      {showCart && (
        <CartSheet
          tableToken={token}
          onClose={handleCloseCart}
          onUnavailable={loadMenu}
        />
      )}

      {/* [TASK-504] Modal Xác nhận Đơn hàng Thành công */}
      {confirmedOrder && (
        <OrderConfirmationModal
          order={confirmedOrder}
          tableName={data.table.name}
          onClose={() => setConfirmedOrder(null)}
          onTrackOrder={() => {
            setConfirmedOrder(null);
            setActiveTab('tracking');
          }}
        />
      )}
    </div>
  );
}
