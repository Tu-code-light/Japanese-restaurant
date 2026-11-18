import { query } from '../config/database.js';

const mapCategory = (row) => ({
  id: row.id,
  storeId: row.store_id,
  name: row.name,
  description: row.description,
  imageUrl: row.image_url,
  status: row.status,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const UPDATABLE_COLUMNS = {
  name: 'name',
  description: 'description',
  imageUrl: 'image_url',
  status: 'status',
  sortOrder: 'sort_order',
};

export const categoriesRepository = {
  async listByStore(storeId, { page, limit, search, status, sort }) {
    const values = [storeId];
    const filters = ['store_id = $1', 'deleted_at IS NULL'];

    if (search) {
      values.push(`%${search}%`);
      filters.push(`name ILIKE $${values.length}`);
    }
    if (status !== undefined) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }

    const where = filters.join(' AND ');
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM categories WHERE ${where}`,
      values,
    );

    const offset = (page - 1) * limit;
    const listValues = [...values, limit, offset];
    const { rows } = await query(
      `SELECT * FROM categories
        WHERE ${where}
        ORDER BY created_at ${sort.toUpperCase()}, id ${sort.toUpperCase()}
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues,
    );
    const total = countResult.rows[0].total;
    return {
      items: rows.map(mapCategory),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findById(storeId, id) {
    const { rows } = await query(
      `SELECT * FROM categories
        WHERE store_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [storeId, id],
    );
    return rows[0] ? mapCategory(rows[0]) : null;
  },

  async create(storeId, dto) {
    const { rows } = await query(
      `INSERT INTO categories (store_id, name, description, image_url, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [storeId, dto.name, dto.description, dto.imageUrl ?? null, dto.status, dto.sortOrder],
    );
    return mapCategory(rows[0]);
  },

  async update(storeId, id, dto) {
    const values = [];
    const sets = [];
    for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
      if (dto[field] !== undefined) {
        values.push(dto[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    values.push(id, storeId);

    const { rows } = await query(
      `UPDATE categories
          SET ${sets.join(', ')}, updated_at = now()
        WHERE id = $${values.length - 1}
          AND store_id = $${values.length}
          AND deleted_at IS NULL
        RETURNING *`,
      values,
    );
    return rows[0] ? mapCategory(rows[0]) : null;
  },

  async countProducts(storeId, categoryId) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total
         FROM menu_items
        WHERE store_id = $1 AND category_id = $2 AND deleted_at IS NULL`,
      [storeId, categoryId],
    );
    return rows[0].total;
  },

  async softDelete(storeId, id) {
    const { rows } = await query(
      `UPDATE categories
          SET status = FALSE, deleted_at = now(), updated_at = now()
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, storeId],
    );
    return rows.length > 0;
  },
};
