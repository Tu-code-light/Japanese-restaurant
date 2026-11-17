import pg from 'pg';
import { env } from './env.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Connection Pool dùng chung cho toàn app.
 * - max: số kết nối tối đa. 20 là đủ cho >= 50 user đồng thời vì mỗi query rất ngắn
 *   (request thừa sẽ xếp hàng trong pool thay vì mở thêm kết nối làm quá tải Postgres).
 * - Mọi truy vấn đều async -> không chặn Event Loop.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_MS,
  connectionTimeoutMillis: env.DB_POOL_CONN_TIMEOUT_MS,
});

// Lỗi trên client đang idle không được làm sập process.
pool.on('error', (err) => logger.error('Lỗi pool PostgreSQL (idle client)', err));

/**
 * Chạy 1 câu query đơn lẻ (pool tự mượn/trả client).
 * @param {string} text
 * @param {any[]} [params]
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Chạy nhiều câu lệnh trong 1 transaction.
 * Tự COMMIT khi thành công, ROLLBACK khi lỗi, và luôn trả client về pool.
 * @template T
 * @param {(client: pg.PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
