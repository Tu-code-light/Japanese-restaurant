import { query } from '../config/database.js';

const mapProduct = (row) => ({
  id: row.id,
  storeId: row.store_id,
  categoryId: row.category_id,
  categoryName: row.category_name,
  name: row.name,
  description: row.description,
  price: row.price,
  imageUrl: row.image_url,
  status: row.is_available ? 'available' : 'unavailable',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const FILTER_COLUMNS = {
  search: (valueIndex) => `p.name ILIKE $${valueIndex}`,
  categoryId: (valueIndex) => `p.category_id = $${valueIndex}`,
  status: (valueIndex) => `p.is_available = $${valueIndex}`,
  minPrice: (valueIndex) => `p.price >= $${valueIndex}`,
  maxPrice: (valueIndex) => `p.price <= $${valueIndex}`,
};

export const productsRepository = {
  async listByStore(storeId, filters) {
    const values = [storeId];
    const clauses = ['p.store_id = $1', 'p.deleted_at IS NULL'];
    const filterValues = {
      search: filters.search ? `%${filters.search}%` : undefined,
      categoryId: filters.categoryId,
      status: filters.status === undefined ? undefined : filters.status === 'available',
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    };

    for (const [field, value] of Object.entries(filterValues)) {
      if (value !== undefined) {
        values.push(value);
        clauses.push(FILTER_COLUMNS[field](values.length));
      }
    }

    const where = clauses.join(' AND ');
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM menu_items p WHERE ${where}`,
      values,
    );
    const listValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
    const sortColumn = filters.sortBy === 'price' ? 'p.price' : 'p.created_at';
    const direction = filters.sort.toUpperCase();
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name
         FROM menu_items p
         JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
        WHERE ${where}
        ORDER BY ${sortColumn} ${direction}, p.id ${direction}
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues,
    );
    const total = countResult.rows[0].total;
    return {
      items: rows.map(mapProduct),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async findById(storeId, id) {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name
         FROM menu_items p
         JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
        WHERE p.store_id = $1 AND p.id = $2 AND p.deleted_at IS NULL`,
      [storeId, id],
    );
    return rows[0] ? mapProduct(rows[0]) : null;
  },

  async create(storeId, dto) {
    const { rows } = await query(
      `INSERT INTO menu_items (store_id, category_id, name, description, price, image_url, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        storeId,
        dto.categoryId,
        dto.name,
        dto.description,
        dto.price,
        dto.imageUrl ?? null,
        dto.status === 'available',
      ],
    );
    return this.findById(storeId, rows[0].id);
  },

  async update(storeId, id, dto) {
    const columns = {
      categoryId: 'category_id',
      name: 'name',
      description: 'description',
      price: 'price',
      imageUrl: 'image_url',
      status: 'is_available',
    };
    const values = [];
    const sets = [];
    for (const [field, column] of Object.entries(columns)) {
      if (dto[field] !== undefined) {
        values.push(field === 'status' ? dto[field] === 'available' : dto[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    values.push(id, storeId);

    const { rows } = await query(
      `UPDATE menu_items
          SET ${sets.join(', ')}, updated_at = now()
        WHERE id = $${values.length - 1}
          AND store_id = $${values.length}
          AND deleted_at IS NULL
        RETURNING id`,
      values,
    );
    return rows[0] ? this.findById(storeId, rows[0].id) : null;
  },

  async updateStatus(storeId, id, status) {
    const { rows } = await query(
      `UPDATE menu_items
          SET is_available = $3, updated_at = now()
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, storeId, status === 'available'],
    );
    return rows[0] ? this.findById(storeId, rows[0].id) : null;
  },

  async softDelete(storeId, id) {
    const { rows } = await query(
      `UPDATE menu_items
          SET deleted_at = now(), updated_at = now(), is_available = FALSE
        WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, storeId],
    );
    return rows.length > 0;
  },
};
