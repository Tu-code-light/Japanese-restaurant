import { query } from '../config/database.js';

const mapTable = (r, includeQr = false) => ({
  id: r.id,
  storeId: r.store_id,
  name: r.name,
  area: r.area,
  location: r.area,
  capacity: r.capacity,
  status: r.status,
  qrToken: r.qr_token,
  isActive: r.is_active,
  ...(includeQr ? { qrCode: r.qr_code } : {}),
});

export const tablesRepository = {
  /** Tìm bàn theo token trong QR (khách quét) */
  async findByToken(token) {
    const { rows } = await query(
      `SELECT t.*, s.name AS store_name
         FROM tables t JOIN stores s ON s.id = t.store_id
        WHERE t.qr_token = $1 AND t.is_active = TRUE
          AND t.status <> 'maintenance' AND t.deleted_at IS NULL`,
      [token],
    );
    if (!rows[0]) return null;
    return { ...mapTable(rows[0]), storeName: rows[0].store_name };
  },

  async lockForOrder(db, storeId, tableId) {
    const { rows } = await db.query(
      `SELECT id FROM tables
        WHERE id = $1 AND store_id = $2 AND is_active = TRUE
          AND status <> 'maintenance' AND deleted_at IS NULL
        FOR SHARE`,
      [tableId, storeId],
    );
    return rows.length > 0;
  },

  async findById(id, storeId) {
    const { rows } = await query(
      'SELECT * FROM tables WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL',
      [id, storeId],
    );
    return rows[0] ? mapTable(rows[0], true) : null;
  },

  async listByStore(storeId, { page, limit, search, location, status }) {
    const values = [storeId];
    const filters = ['t.store_id = $1', 't.deleted_at IS NULL'];
    if (search) {
      values.push(`%${search}%`);
      filters.push(`t.name ILIKE $${values.length}`);
    }
    if (location) {
      values.push(`%${location}%`);
      filters.push(`t.area ILIKE $${values.length}`);
    }
    if (status) {
      values.push(status);
      filters.push(`t.status = $${values.length}`);
    }
    const where = filters.join(' AND ');
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM tables t WHERE ${where}`,
      values,
    );
    const listValues = [...values, limit, (page - 1) * limit];
    const { rows } = await query(
      `SELECT t.*,
              COUNT(o.id) FILTER (WHERE o.status IN ('pending','confirmed','preparing','served')) AS open_orders
         FROM tables t
         LEFT JOIN orders o ON o.table_id = t.id
        WHERE ${where}
        GROUP BY t.id
        ORDER BY t.area, t.name
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues,
    );
    const total = countResult.rows[0].total;
    return {
      items: rows.map((r) => ({ ...mapTable(r), openOrders: Number(r.open_orders) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async create({ storeId, name, area, capacity, status, qrToken, qrCode }) {
    const { rows } = await query(
      `INSERT INTO tables (store_id, name, area, capacity, status, qr_token, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [storeId, name, area, capacity, status, qrToken, qrCode],
    );
    return mapTable(rows[0]);
  },

  async update(storeId, id, dto) {
    const fields = {
      name: 'name',
      capacity: 'capacity',
      location: 'area',
      area: 'area',
      status: 'status',
    };
    const values = [];
    const sets = [];
    for (const [field, column] of Object.entries(fields)) {
      if (dto[field] !== undefined) {
        values.push(dto[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    values.push(id, storeId);
    const { rows } = await query(
      `UPDATE tables
          SET ${sets.join(', ')}, updated_at = now()
        WHERE id = $${values.length - 1}
          AND store_id = $${values.length}
          AND deleted_at IS NULL
        RETURNING *`,
      values,
    );
    return rows[0] ? mapTable(rows[0]) : null;
  },

  async updateStatus(storeId, id, status) {
    const { rows } = await query(
      `UPDATE tables SET status = $3, updated_at = now()
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        RETURNING *`,
      [id, storeId, status],
    );
    return rows[0] ? mapTable(rows[0]) : null;
  },

  async updateQr(storeId, id, qrToken, qrCode) {
    const { rows } = await query(
      `UPDATE tables
          SET qr_token = $3, qr_code = $4, updated_at = now()
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        RETURNING *`,
      [id, storeId, qrToken, qrCode],
    );
    return rows[0] ? mapTable(rows[0]) : null;
  },

  async softDeleteIfNoOpenOrders(db, storeId, id) {
    const { rows: lockedTables } = await db.query(
      `SELECT qr_token FROM tables
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        FOR UPDATE`,
      [id, storeId],
    );
    if (!lockedTables[0]) return null;

    const { rows: openOrders } = await db.query(
      `SELECT COUNT(*)::int AS total FROM orders
        WHERE store_id = $1 AND table_id = $2
          AND status IN ('pending', 'confirmed', 'preparing', 'served')`,
      [storeId, id],
    );
    if (openOrders[0].total > 0) return { openOrders: openOrders[0].total };

    await db.query(
      `UPDATE tables
          SET is_active = FALSE, deleted_at = now(), updated_at = now()
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, storeId],
    );
    return { qrToken: lockedTables[0].qr_token, openOrders: 0 };
  },
};
