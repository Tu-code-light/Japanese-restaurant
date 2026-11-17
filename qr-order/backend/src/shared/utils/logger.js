/**
 * Logger tối giản (đủ dùng, không thêm dependency).
 * Khi lên production có thể thay bằng pino/winston mà không phải sửa nơi gọi.
 */
const ts = () => new Date().toISOString();

export const logger = {
  info: (msg, ...rest) => console.log(`[${ts()}] INFO  ${msg}`, ...rest),
  warn: (msg, ...rest) => console.warn(`[${ts()}] WARN  ${msg}`, ...rest),
  error: (msg, ...rest) => console.error(`[${ts()}] ERROR ${msg}`, ...rest),
};
