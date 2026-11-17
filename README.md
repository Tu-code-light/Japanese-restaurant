# Quản lý bán hàng & Gọi món tại bàn qua QR Code (Japanese Restaurant)

Khách quét QR trên bàn bằng điện thoại → xem menu món Nhật → gửi order. Nhân viên thấy đơn **realtime**, xử lý theo luồng:
`Chờ xác nhận → Đã nhận → Đang làm → Đã phục vụ → Thanh toán`.

**Stack:** Node.js 20+ · Express · Socket.io · PostgreSQL (`pg` Pool) · Zod · JWT — React 18 · Vite · Zustand.

---

## Chạy nhanh

### Bước 1: Khởi động cơ sở dữ liệu PostgreSQL
Có sẵn file `docker-compose.yml` trong thư mục `qr-order/`:
```bash
cd qr-order
docker compose up -d
```
*(Hoặc dùng PostgreSQL cài trên máy / cloud và chỉnh `DATABASE_URL` trong file `.env`).*

### Bước 2: Chạy Backend
```bash
cd qr-order/backend
# Copy file cấu hình (nếu chưa có)
cp .env.example .env      # Trên Windows PowerShell: Copy-Item .env.example .env
npm install
npm run db:init           # Tạo bảng + nạp dữ liệu mẫu (10 bàn, 32 món Nhật, 2 tài khoản)
# Hoặc: npm run db:reset  # Để làm mới và nạp lại menu từ đầu
npm run dev               # http://localhost:4000
```

### Bước 3: Chạy Frontend (Mở Terminal mới)
```bash
cd qr-order/frontend
npm install
npm run dev               # http://localhost:5173 (tự động bật trình duyệt)
```
*(Trong VS Code / IDE: bạn cũng có thể bấm phím **F5** để tự động mở ứng dụng trên trình duyệt).*

---

## Hướng dẫn trải nghiệm & Đăng nhập

- **Trang nhân viên & quản lý:** `http://localhost:5173/staff`
  - Quản lý: tài khoản `admin` / mật khẩu `admin123`
  - Nhân viên: tài khoản `staff` / mật khẩu `staff123`
- **Trang chủ / Chọn ngôn ngữ:** `http://localhost:5173/` hỗ trợ song ngữ **Tiếng Việt / English**.
- **Quản lý Bàn & QR:** Vào mục **Bàn & QR** (`/staff/tables`) bằng tài khoản `admin` để xem, tạo bàn và in mã QR.
- **Quét QR bằng điện thoại cùng mạng Wi-Fi:**
  - Đặt `CUSTOMER_APP_URL` trong file `backend/.env` thành IP máy tính trong mạng Wi-Fi (ví dụ: `http://192.168.1.102:5173`).
  - Thêm IP đó vào `CORS_ORIGINS`.
  - Khách dùng điện thoại quét mã QR sẽ vào thẳng trang gọi món của bàn tương ứng.
- **Load test (kiểm tra tải):** `npm run test:load` (mặc định 50 khách đồng thời gửi order cùng lúc; hoặc `CONCURRENCY=100 npm run test:load`).

---

## Kiến trúc dự án

```text
Git repository root/
├── .vscode/
│   └── launch.json               # Cấu hình phím F5 tự mở trang web
├── package-lock.json             # Lockfile gốc
└── qr-order/
    ├── .gitignore
    ├── README.md
    ├── docker-compose.yml        # Docker compose khởi chạy PostgreSQL 16
    ├── backend/
    │   ├── .env.example
    │   ├── package.json
    │   ├── db/schema.sql         # Cấu trúc bảng PostgreSQL
    │   ├── scripts/
    │   │   ├── initDb.js         # Nạp schema & menu món Nhật (hỗ trợ --reset)
    │   │   └── loadTest.js       # Kịch bản test chịu tải WebSocket + REST
    │   └── src/
    │       ├── domain/orders/constants.js
    │       ├── application/
    │       │   ├── errors/AppError.js
    │       │   └── services/{auth,menu,orders,tables}.service.js
    │       ├── infrastructure/
    │       │   ├── config/{database,env}.js
    │       │   ├── persistence/{auth,menu,orders,tables}.repository.js
    │       │   └── realtime/{publisher,socket}.js
    │       ├── presentation/http/
    │       │   ├── app.js
    │       │   ├── controllers/
    │       │   ├── dtos/
    │       │   ├── middlewares/
    │       │   └── routes/
    │       ├── main/{container,server}.js
    │       └── shared/utils/
    ├── docs/
    │   ├── database/schema.sql
    │   └── wireframe/
    └── frontend/
        ├── package.json
        ├── vite.config.js
        └── src/
            ├── api/
            ├── components/
            ├── hooks/
            ├── lib/
            ├── pages/
            └── stores/
```

---

## Các tính năng kỹ thuật & Tối ưu hiệu năng (≥ 50 user đồng thời)

| Vấn đề | Giải pháp đã triển khai |
| --- | --- |
| Quá tải DB | `pg.Pool` (max 20), mọi query async; insert món bằng 1 câu `unnest`; lấy đơn + món bằng 1 query `json_agg` (không N+1) |
| Khách mở menu cùng lúc | Cache menu 30s (xóa ngay khi sửa menu), cache `token → bàn` 60s |
| Socket trễ / tốn tài nguyên | Phân room `store:{id}` (nhân viên) và `table:{id}` (khách) → sự kiện chỉ đến đúng nhóm; tắt `perMessageDeflate`; giới hạn `maxHttpBufferSize`; khách chỉ nhận, mọi thao tác ghi đi qua REST có validate |
| Gửi trùng đơn (bấm 2 lần, mạng chập) | `idempotencyKey` + `UNIQUE` trong DB; request đến sau nhận lại đơn cũ |
| 2 nhân viên bấm cùng lúc | `UPDATE ... WHERE status = ANY(nguồn hợp lệ)` (optimistic) → người đến sau nhận 409 |
| Thanh toán đua với đơn mới | `SELECT ... FOR UPDATE` các đơn mở của bàn trong transaction |
| Gian lận giá | Giá & tên món lấy từ DB khi đặt, không tin client; lưu snapshot vào `order_items` |
| Spam | Rate limit gửi order theo **bàn** (không theo IP, vì cả quán dùng chung WiFi) |
| Frontend re-render | Store chuẩn hóa theo id, selector nhỏ (`useQuantity`), `React.memo`, `useShallow`, tách `CartBar`, code-splitting theo trang |
| Mất kết nối | Socket tự reconnect + `connectionStateRecovery`; mỗi lần connect tải lại danh sách từ REST để bù sự kiện đã lỡ |

---

## Khi cần mở rộng thêm (Scale)

- **Chạy nhiều instance:** Thêm `@socket.io/redis-adapter` (room dùng chung) và thay `TtlCache` bằng Redis.
- **Triển khai Production:** Đặt sau Nginx/Caddy có HTTPS (camera điện thoại quét QR & PWA cần HTTPS), đặt `NODE_ENV=production`, dùng `JWT_SECRET` dài ngẫu nhiên, đổi mật khẩu tài khoản mẫu.
- **Tính năng có thể mở rộng tiếp:** Thanh toán trực tuyến (VNPAY/MoMo/ZaloPay), in bill qua máy in nhiệt (ESC/POS), thống kê báo cáo doanh thu theo ca.
