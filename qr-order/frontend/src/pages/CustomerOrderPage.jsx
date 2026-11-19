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
import { translateMenuItem } from '../lib/menuTranslations';
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
  const handleClearCart = () => {
    if (window.confirm(t('confirmClearCart') || 'Bạn muốn xóa toàn bộ món trong giỏ?')) {
      useCartStore.getState().clear();
    }
  };
  const submit = async () => {
    if (submitting || list.length === 0) return;
    const { ensureSubmitKey, clear } = useCartStore.getState();
    setSubmitting(true);
    setError(null);
    try {
      const createdOrder = await api.post('/public/orders', {
        tableToken,
        idempotencyKey: ensureSubmitKey(), // gửi lại do mạng lỗi vẫn dùng đúng key này -> không tạo đơn trùng
        note: note.trim(),
        items: list.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      clear();
      onClose(true, createdOrder);
    } catch (e) {
      if (e.status === 409 && Array.isArray(e.data?.unavailable)) {
        onUnavailable?.();
        const names = e.data.unavailable.map((u) => u.name || u).join(', ');
        setError(
          names
            ? `${e.message} (${names})`
            : e.message
        );
      } else {
        setError(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={() => onClose(false)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row row--between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>{t('cart')}</h2>
          {list.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleClearCart}
            >
              🗑️ {t('clearCart') || 'Xóa tất cả'}
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            {t('emptyCart') || 'Giỏ hàng đang trống. Hãy chọn thêm món từ thực đơn nhé!'}
          </p>
        ) : (
          <ul className="sheet__list">
            {list.map((i) => {
              const displayItem = translateMenuItem({ id: i.menuItemId, name: i.name, price: i.price }, language);
              return (
                <li key={i.menuItemId}>
                  <span>{displayItem.name}</span>
                  <span className="qty">
                    <button
                      className="btn-round"
                      onClick={() => useCartStore.getState().remove(i.menuItemId)}
                      aria-label={t('removeItem', { name: displayItem.name })}
                    >
                      −
                    </button>
                    <span className="qty__n">{i.quantity}</span>
                    <button
                      className="btn-round btn-round--primary"
                      onClick={() => useCartStore.getState().add({ id: i.menuItemId, name: i.name, price: i.price })}
                      aria-label={t('addItem', { name: displayItem.name })}
                    >
                      +
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => useCartStore.getState().removeAll(i.menuItemId)}
                      title={t('delete') || 'Xóa món'}
                      style={{ marginLeft: '0.25rem', padding: '0.15rem 0.4rem' }}
                    >
                      ✕
                    </button>
                  </span>
                  <strong>{formatVND(i.price * i.quantity, language)}</strong>
                </li>
              );
            })}
          </ul>
        )}

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
  const { language, t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState(null);

  // [TASK-501] Tìm kiếm & lọc danh mục món ăn
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

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

      const available = new Set(
        res.menu.flatMap((c) => c.items.filter((i) => i.isAvailable !== false).map((i) => i.id))
      );
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

  // Lọc thực đơn theo danh mục và từ khóa (hỗ trợ cả tên dịch theo ngôn ngữ đang chọn)
  const filteredMenu = useMemo(() => {
    if (!data?.menu) return [];
    const q = search.trim().toLowerCase();
    return data.menu
      .filter((cat) => selectedCat === 'all' || String(cat.id) === String(selectedCat))
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          if (!q) return true;
          const translated = translateMenuItem(item, language);
          return (
            translated.name.toLowerCase().includes(q) ||
            translated.description?.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [data, search, selectedCat, language]);

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

          {/* Thanh tìm kiếm & lọc nhanh theo danh mục [TASK-501] */}
          <div className="menu-filter-bar" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="input search-input"
              placeholder={t('searchDish') || 'Tìm kiếm món ăn...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: '0.5rem' }}
            />
            <div className="row" style={{ overflowX: 'auto', gap: '0.5rem', paddingBottom: '0.25rem' }}>
              <button
                className={`btn btn-sm ${selectedCat === 'all' ? 'btn-primary' : ''}`}
                onClick={() => setSelectedCat('all')}
              >
                {t('allCategories') || 'Tất cả'}
              </button>
              {data.menu.map((cat) => (
                <button
                  key={cat.id}
                  className={`btn btn-sm ${String(selectedCat) === String(cat.id) ? 'btn-primary' : ''}`}
                  onClick={() => setSelectedCat(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách thực đơn đã lọc */}
          {filteredMenu.length === 0 ? (
            <p className="muted center-page">{t('noMatchingItems') || 'Không tìm thấy món phù hợp'}</p>
          ) : (
            filteredMenu.map((cat) => (
              <section className="section" key={cat.id}>
                <h2>{cat.name}</h2>
                {cat.items.map((item) => <MenuItemCard key={item.id} item={item} />)}
              </section>
            ))
          )}
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