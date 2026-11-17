import { memo, useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { api } from '../api/http';
import { useStaffRealtime } from '../hooks/useStaffRealtime';
import { useStaffOrders } from '../stores/ordersStore';
import { OrderCard } from '../components/OrderCard';
import { formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';

const COLUMNS = [
  { status: 'pending', titleKey: 'newOrders' },
  { status: 'confirmed', titleKey: 'confirmedOrders' },
  { status: 'preparing', titleKey: 'preparingOrders' },
  { status: 'served', titleKey: 'servedOrders' },
];

/** Một đơn: subscribe đúng order theo id -> các đơn khác không render lại khi 1 đơn đổi */
const OrderRow = memo(function OrderRow({ id, onChangeStatus, busy }) {
  const order = useStaffOrders((s) => s.byId[id]);
  return order ? <OrderCard order={order} onChangeStatus={onChangeStatus} busy={busy} /> : null;
});

/** Cột: chỉ subscribe danh sách id của đúng trạng thái này (useShallow so sánh nông mảng) */
const Column = memo(function Column({ status, titleKey, onChangeStatus, busy, onCheckout }) {
  const { language, t } = useTranslation();
  const ids = useStaffOrders(
    useShallow((s) => s.ids.filter((id) => s.byId[id]?.status === status)),
  );

  // Cột "Đã phục vụ": gom theo bàn để hiện nút Thanh toán bàn
  const servedTables = useStaffOrders(
    useShallow((s) => {
      if (status !== 'served') return [];
      const sums = new Map();
      for (const id of s.ids) {
        const o = s.byId[id];
        if (o?.status !== 'served') continue;
        const cur = sums.get(o.tableId) ?? { tableId: o.tableId, name: o.tableName, total: 0 };
        cur.total += o.totalAmount;
        sums.set(o.tableId, cur);
      }
      return [...sums.values()].map((t) => `${t.tableId}|${t.name}|${t.total}`);
    }),
  );

  return (
    <section className="kanban__col">
      <h2>{t(titleKey)} <span className="count">{ids.length}</span></h2>

      {servedTables.map((row) => {
        const [tableId, name, total] = row.split('|');
        return (
          <button key={tableId} className="btn btn-primary btn-block" disabled={busy} onClick={() => onCheckout(Number(tableId), name)}>
            {t('checkoutTable', { name, amount: formatVND(Number(total), language) })}
          </button>
        );
      })}

      {ids.map((id) => <OrderRow key={id} id={id} onChangeStatus={onChangeStatus} busy={busy} />)}
      {ids.length === 0 && <p className="muted">{t('noOrders')}</p>}
    </section>
  );
});

export default function StaffDashboardPage() {
  const { connected, error } = useStaffRealtime();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  /** Bọc mọi thao tác ghi: khóa nút khi đang chạy, hiển thị lỗi (vd: người khác đã xử lý trước) */
  const run = useCallback(async (fn) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onChangeStatus = useCallback(
    (id, status) => run(() => api.patch(`/orders/${id}/status`, { status }, { auth: true })),
    [run],
  );

  const onCheckout = useCallback(
    (tableId, name) => {
      if (!window.confirm(t('checkoutConfirm', { name }))) return;
      run(() => api.post(`/orders/tables/${tableId}/checkout`, null, { auth: true }));
    },
    [run, t],
  );

  // Không cần cập nhật store sau khi gọi API: server sẽ phát socket cho mọi nhân viên (kể cả người thao tác).

  return (
    <>
      <div className="row row--between">
        <div>
          <span className="eyebrow">{t('kitchenAndService')}</span>
          <h1>{t('staffOrders')}</h1>
        </div>
        <span className={`dot ${connected ? 'dot--ok' : 'dot--off'}`}>{connected ? t('realtime') : t('disconnected')}</span>
      </div>
      {(error || actionError) && <p className="error">{actionError ?? error}</p>}

      <div className="kanban">
        {COLUMNS.map((c) => (
          <Column key={c.status} {...c} onChangeStatus={onChangeStatus} busy={busy} onCheckout={onCheckout} />
        ))}
      </div>
    </>
  );
}
