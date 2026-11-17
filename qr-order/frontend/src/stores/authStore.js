import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Phiên đăng nhập của nhân viên (lưu localStorage để F5 không mất). */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'qr-order-auth' },
  ),
);
