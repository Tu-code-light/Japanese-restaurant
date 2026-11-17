import { query } from '../config/database.js';
import { OPEN_STATUSES } from '../../domain/orders/constants.js';

/**
 * SELECT chuẩn: 1 query lấy đơn + tên bàn + toàn bộ món (json_agg) -> tránh N+1.
 */
const ORDER_SELECT = `
  SELECT o.id, o.store_id, o.table_id, o.status, o.note, o.total_amount,
         o.created_at, o.updated_at,
         t.name AS table_name, t.area AS table_area,
         COALESCE(
           json_agg(
             json_build_object(
               'id', oi.id, 'menuItemId', oi.menu_item_id, 'name', oi.name,
               'unitPrice', oi.unit_price, 'quantity', oi.quantity, 'note', oi.note
             ) ORDER BY oi.id
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items
    FROM orders o
    JOIN tables t ON t.id = o.table_id
    LEFT JOIN order_items oi ON oi.order_id = o.id`;

const mapOrder = (r) => ({
  id: r.id,
  storeId: r.store_id,
  tableId: r.table_id,
  tableName: r.table_name,
  tableArea: r.table_area,
  status: r.status,
  note: r.note,
  totalAmount: r.total_amount,
  items: r.items,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * Các hàm nhận tham số `db` (mặc định là pool) để có thể chạy trong transaction
 * bằng cách truyền client của withTransaction vào.
 */
export const ordersRepository = {
  async insertOrder(db, { storeId, tableId, note, totalAmount, idempotencyKey }) {
    const { rows } = await db.query(
      `INSERT INTO orders (store_id, table_id, note, total_amount, idempotency_key)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [storeId, tableId, note, totalAmount, idempotencyKey],
    );
    return rows[0].id;
  },

  /** Insert nhiều dòng món bằng 1 câu lệnh duy nhất (unnest) thay vì N câu. */
  async insertItems(db, orderId, items) {
    await db.query(
      `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, note)
       SELECT $1, * FROM unnest($2::int[], $3::text[], $4::int[], $5::int[], $6::text[])`,
      [
        orderId,
        items.map((i) => i.menuItemId),
        items.map((i) => i.name),
        items.map((i) => i.unitPrice),
        items.map((i) => i.quantity),
        items.map((i) => i.note),
      ],
    );
  },

  async findById(id, db = { query }) {
    const { rows } = await db.query(`${ORDER_SELECT} WHERE o.id = $1 GROUP BY o.id, t.id`, [id]);
    return rows[0] ? mapOrder(rows[0]) : null;
  },

  async findIdByIdempotencyKey(key) {
    const { rows } = await query('SELECT id FROM orders WHERE idempotency_key = $1', [key]);
    return rows[0]?.id ?? null;
  },

  /** Đơn của 1 bàn (khách xem lại đơn của bàn mình) */
  async listByTable(tableId) {
    const { rows } = await query(
      `${ORDER_SELECT} WHERE o.table_id = $1 AND o.status = ANY($2::text[])
        GROUP BY o.id, t.id ORDER BY o.created_at DESC`,
      [tableId, OPEN_STATUSES],
    );
    return rows.map(mapOrder);
  },

  /** Đơn của cả quán cho màn hình nhân viên */
  async listByStore(storeId, { status, includeClosed }) {
    const params = [storeId];
    let where = 'o.store_id = $1';
    if (status) {
      params.push(status);
      where += ` AND o.status = $${params.length}`;
    } else if (!includeClosed) {
      params.push(OPEN_STATUSES);
      where += ` AND o.status = ANY($${params.length}::text[])`;
    }
    const { rows } = await query(
      `${ORDER_SELECT} WHERE ${where} GROUP BY o.id, t.id ORDER BY o.created_at ASC LIMIT 200`,
      params,
    );
    return rows.map(mapOrder);
  },

  /**
   * Cập nhật trạng thái có điều kiện (optimistic): chỉ thành công nếu trạng thái hiện tại
   * nằm trong `allowedSources`. Hai nhân viên bấm cùng lúc -> chỉ 1 người thắng, người kia nhận 0 dòng.
   * @returns {Promise<boolean>} true nếu đã cập nhật
   */
  async updateStatus(storeId, id, target, allowedSources) {
    const { rowCount } = await query(
      `UPDATE orders SET status = $3, updated_at = now()
        WHERE id = $1 AND store_id = $2 AND status = ANY($4::text[])`,
      [id, storeId, target, allowedSources],
    );
    return rowCount === 1;
  },

  /** Khóa các đơn đang mở của bàn (trong transaction) để thanh toán không bị đua với đơn mới. */
  async lockOpenByTable(db, storeId, tableId) {
    const { rows } = await db.query(
      `SELECT id, status FROM orders
        WHERE store_id = $1 AND table_id = $2 AND status = ANY($3::text[])
        FOR UPDATE`,
      [storeId, tableId, OPEN_STATUSES],
    );
    return rows;
  },

  async markPaid(db, ids) {
    await db.query(
      `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = ANY($1::int[])`,
      [ids],
    );
  },
};
