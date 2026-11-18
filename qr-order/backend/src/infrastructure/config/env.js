import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Validate toàn bộ biến môi trường ngay khi khởi động.
 * Thiếu/sai cấu hình -> dừng server sớm (fail fast) thay vì lỗi lắt léo lúc chạy.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL là bắt buộc'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_POOL_IDLE_MS: z.coerce.number().int().positive().default(30000),
  DB_POOL_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET cần tối thiểu 16 ký tự'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  CUSTOMER_APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Cấu hình môi trường không hợp lệ:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  uploadDirectory: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../',
    parsed.data.UPLOAD_DIR,
  ),
};
