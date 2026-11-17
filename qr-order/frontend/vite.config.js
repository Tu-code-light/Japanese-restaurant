import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: proxy /api và /socket.io sang backend để không phải xử lý CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // cho phép điện thoại trong cùng WiFi truy cập khi test quét QR
    port: 5173,
    open: true, // Tự động mở trình duyệt web khi chạy dev
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
