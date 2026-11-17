import { z } from 'zod';

export const loginDto = z.object({
  username: z.string().trim().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(50),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
});
