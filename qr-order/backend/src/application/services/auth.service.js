import { AppError } from '../errors/AppError.js';

// Hash giả để so sánh khi user không tồn tại -> thời gian phản hồi như nhau (chống dò username).
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8hQeQ0FqkYV8y3Hq1k1Zm7m8m2m2mO';

export function createAuthService({ authRepository, comparePassword, signToken, jwtSecret, jwtExpiresIn }) {
  /**
   * Đăng nhập nhân viên/quản lý.
   * bcrypt.compare là async (chạy ở thread pool của libuv) nên không chặn Event Loop.
   */
  return {
    async login({ username, password }) {
      const user = await authRepository.findByUsername(username);
      const ok = await comparePassword(password, user?.password_hash ?? DUMMY_HASH);
      if (!user || !ok) throw AppError.unauthorized('Sai tên đăng nhập hoặc mật khẩu');

      const payload = { sub: user.id, storeId: user.store_id, role: user.role, name: user.full_name };
      const token = signToken(payload, jwtSecret, { expiresIn: jwtExpiresIn });

      return {
        token,
        user: { id: user.id, storeId: user.store_id, role: user.role, name: user.full_name },
      };
    },
  };
}
