import { query } from '../config/database.js';

const mapItem = (r) => ({
  id: r.id,
  categoryId: r.category_id,
  name: r.name,
  description: r.description,
  price: r.price,
  imageUrl: r.image_url,
  isAvailable: r.is_available,
});

// Cột được phép cập nhật (whitelist) -> chống SQL injection qua tên cột.
const UPDATABLE = {
  categoryId: 'category_id',
  name: 'name',
  description: 'description',
  price: 'price',
  imageUrl: 'image_url',
  isAvailable: 'is_available',
};

export const menuRepository = {
  /** Trả danh mục kèm món. `onlyAvailable` = true cho khách, false cho quản lý. */
  async listCategoriesWithItems(storeId, onlyAvailable) {
    const [cats, items] = await Promise.all([
      query('SELECT id, name FROM categories WHERE store_id = $1 ORDER BY sort_order, id', [storeId]),
      query(
        `SELECT * FROM menu_items
          WHERE store_id = $1 ${onlyAvailable ? 'AND is_available = TRUE' : ''}
          ORDER BY id`,
        [storeId],
      ),
    ]);

    const byCategory = new Map(cats.rows.map((c) => [c.id, { id: c.id, name: c.name, items: [] }]));
    for (const row of items.rows) byCategory.get(row.category_id)?.items.push(mapItem(row));

    // Với khách, ẩn danh mục rỗng.
    return [...byCategory.values()].filter((c) => !onlyAvailable || c.items.length > 0);
  },

  /** Lấy nhiều món theo id (dùng để tính tiền phía server). Nhận cả client trong transaction. */
  async findByIds(storeId, ids, db = { query }) {
    const { rows } = await db.query(
      'SELECT * FROM menu_items WHERE store_id = $1 AND id = ANY($2::int[])',
      [storeId, ids],
    );
    return rows.map(mapItem);
  },

  async create(storeId, dto) {
    const { rows } = await query(
      `INSERT INTO menu_items (store_id, category_id, name, description, price, image_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [storeId, dto.categoryId, dto.name, dto.description, dto.price, dto.imageUrl ?? null],
    );
    return mapItem(rows[0]);
  },

  async update(storeId, id, dto) {
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(UPDATABLE)) {
      if (dto[key] !== undefined) {
        values.push(dto[key]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    values.push(id, storeId);
    const { rows } = await query(
      `UPDATE menu_items SET ${sets.join(', ')}
        WHERE id = $${values.length - 1} AND store_id = $${values.length}
        RETURNING *`,
      values,
    );
    return rows[0] ? mapItem(rows[0]) : null;
  },

  async delete(storeId, id) {
    // Kiểm tra xem món đã từng được đặt trong đơn hàng nào chưa
    const { rows: used } = await query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.menu_item_id = $1 AND o.store_id = $2
       LIMIT 1`,
      [id, storeId],
    );

    if (used.length > 0) {
      // Đã có trong đơn cũ: ẩn khỏi menu (is_available = false) để giữ toàn vẹn dữ liệu hóa đơn/báo cáo
      await query(
        `UPDATE menu_items SET is_available = FALSE WHERE id = $1 AND store_id = $2`,
        [id, storeId],
      );
      return { softDeleted: true, message: 'Món đã có trong đơn hàng cũ nên được chuyển sang trạng thái ngưng bán' };
    }

    const { rowCount } = await query(
      `DELETE FROM menu_items WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );
    return { softDeleted: false, deleted: rowCount > 0 };
  },
};
