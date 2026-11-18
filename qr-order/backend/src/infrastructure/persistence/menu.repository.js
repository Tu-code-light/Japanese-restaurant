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
      query(
        `SELECT id, name FROM categories
          WHERE store_id = $1 AND deleted_at IS NULL ${onlyAvailable ? 'AND status = TRUE' : ''}
          ORDER BY sort_order, id`,
        [storeId],
      ),
      query(
        `SELECT * FROM menu_items
          WHERE store_id = $1 AND deleted_at IS NULL ${onlyAvailable ? 'AND is_available = TRUE' : ''}
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
      `SELECT item.*
         FROM menu_items item
         JOIN categories category
           ON category.id = item.category_id
          AND category.store_id = item.store_id
          AND category.status = TRUE
          AND category.deleted_at IS NULL
        WHERE item.store_id = $1 AND item.id = ANY($2::int[]) AND item.deleted_at IS NULL`,
      [storeId, ids],
    );
    return rows.map(mapItem);
  },

  async create(storeId, dto) {
    const { rows } = await query(
      `INSERT INTO menu_items (store_id, category_id, name, description, price, image_url)
       SELECT $1, $2, $3, $4, $5, $6
        WHERE EXISTS (
          SELECT 1 FROM categories
           WHERE id = $2 AND store_id = $1 AND status = TRUE AND deleted_at IS NULL
        )
       RETURNING *`,
      [storeId, dto.categoryId, dto.name, dto.description, dto.price, dto.imageUrl ?? null],
    );
    return rows[0] ? mapItem(rows[0]) : null;
  },

  async update(storeId, id, dto) {
    const sets = [];
    const values = [];
    let categoryIdPlaceholder = null;
    for (const [key, column] of Object.entries(UPDATABLE)) {
      if (dto[key] !== undefined) {
        values.push(dto[key]);
        sets.push(`${column} = $${values.length}`);
        if (key === 'categoryId') categoryIdPlaceholder = `$${values.length}`;
      }
    }
    values.push(id, storeId);
    const categoryGuard = categoryIdPlaceholder
      ? `AND EXISTS (
           SELECT 1 FROM categories
            WHERE id = ${categoryIdPlaceholder}
              AND store_id = $${values.length}
              AND status = TRUE
              AND deleted_at IS NULL
         )`
      : '';
    const { rows } = await query(
      `UPDATE menu_items SET ${sets.join(', ')}
        WHERE id = $${values.length - 1} AND store_id = $${values.length} AND deleted_at IS NULL
          ${categoryGuard}
        RETURNING *`,
      values,
    );
    return rows[0] ? mapItem(rows[0]) : null;
  },
};
