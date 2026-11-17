import { query } from '../config/database.js';

const mapTable = (r) => ({
  id: r.id,
  storeId: r.store_id,
  name: r.name,
  area: r.area,
  qrToken: r.qr_token,
  isActive: r.is_active,
});

export const tablesRepository = {
  /** Tìm bàn theo token trong QR (khách quét) */
  async findByToken(token) {
    const { rows } = await query(
      `SELECT t.*, s.name AS store_name
         FROM tables t JOIN stores s ON s.id = t.store_id
        WHERE t.qr_token = $1 AND t.is_active = TRUE`,
      [token],
    );
    if (!rows[0]) return null;
    return { ...mapTable(rows[0]), storeName: rows[0].store_name };
  },

  async findById(id, storeId) {
    const { rows } = await query(
      'SELECT * FROM tables WHERE id = $1 AND store_id = $2',
      [id, storeId],
    );
    return rows[0] ? mapTable(rows[0]) : null;
  },

  /** Danh sách bàn kèm số đơn đang mở (để nhân viên biết bàn nào đang có khách) */
  async listByStore(storeId) {
    const { rows } = await query(
      `SELECT t.*,
              COUNT(o.id) FILTER (WHERE o.status IN ('pending','confirmed','preparing','served')) AS open_orders
         FROM tables t
         LEFT JOIN orders o ON o.table_id = t.id
        WHERE t.store_id = $1 AND t.is_active = TRUE
        GROUP BY t.id
        ORDER BY t.area, t.name`,
      [storeId],
    );
    return rows.map((r) => ({ ...mapTable(r), openOrders: Number(r.open_orders) }));
  },

  async create({ storeId, name, area, qrToken }) {
    const { rows } = await query(
      `INSERT INTO tables (store_id, name, area, qr_token)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [storeId, name, area, qrToken],
    );
    return mapTable(rows[0]);
  },
};
