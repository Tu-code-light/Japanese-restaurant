# Quản lý bán hàng & Gọi món tại bàn qua QR Code

Khách quét QR trên bàn → xem menu → gửi order. Nhân viên thấy đơn **realtime**, xử lý theo luồng
`Chờ xác nhận → Đã nhận → Đang làm → Đã phục vụ → Thanh toán`.

**Stack:** Node.js 20+ · Express · Socket.io · PostgreSQL (`pg` Pool) · Zod · JWT — React 18 · Vite · Zustand.

## Chạy nhanh

```bash
# Chạy từ Git repository root
# 1. Backend
cd qr-order/backend
cp .env.example .env          # sửa DATABASE_URL, JWT_SECRET
npm install
npm run db:init               # tạo bảng + dữ liệu mẫu (10 bàn, 7 món)
npm run dev                   # http://localhost:4000

# 2. Frontend (terminal mới, cũng bắt đầu từ Git repository root)
cd qr-order/frontend
npm install
npm run dev                   # http://localhost:5173
```

- Nhân viên: `http://localhost:5173/staff` — tài khoản mẫu `staff / staff123`, quản lý `admin / admin123` (**đổi khi triển khai**).
- Trang gốc `http://localhost:5173/` cho phép chọn **Tiếng Việt / English**; lựa chọn được lưu trên trình duyệt và có thể đổi lại ở các màn hình chính. Khách quét QR vẫn đi thẳng vào trang gọi món.
- Vào **Bàn & QR** để xem/in mã QR từng bàn. Khi test bằng điện thoại, đặt `CUSTOMER_APP_URL` trong `.env`
  thành IP LAN của máy (vd `http://192.168.1.10:5173`) để QR trỏ đúng.
- Load test: `npm run test:load` (mặc định 50 khách đồng thời; `CONCURRENCY=100 npm run test:load`).

## Kiến trúc

```text
Git repository root/
├── package-lock.json             # lockfile gốc rỗng (không có package.json tương ứng)
└── qr-order/
    ├── .gitignore
    ├── README.md
    ├── backend/
    │   ├── .env.example
    │   ├── package.json
    │   ├── db/schema.sql
    │   ├── scripts/{initDb.js,loadTest.js}
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
    ├── frontend/
    │   ├── package.json
    │   ├── vite.config.js
    │   └── src/
    │       ├── api/
    │       ├── components/
    │       ├── hooks/
    │       ├── lib/
    │       ├── pages/
    │       └── stores/
```

Quy tắc phụ thuộc backend: `domain` không phụ thuộc framework; `application` dùng các port được truyền vào; `infrastructure` triển khai các adapter; `presentation/http` chuyển HTTP thành lời gọi controller. `main/container.js` ghép use case với adapter và controller; `main/server.js` khởi chạy HTTP app và Socket.io. Controller theo MVC, xử lý request/response; nghiệp vụ nằm trong application/domain.

Response chuẩn: `{ "status": "success" | "error", "message": "...", "data": ... }`.

## Cách đáp ứng yêu cầu hiệu năng (≥ 50 user đồng thời)

| Vấn đề | Giải pháp |
| --- | --- |
| Quá tải DB | `pg.Pool` (max 20), mọi query async; insert món bằng 1 câu `unnest`; lấy đơn + món bằng 1 query `json_agg` (không N+1) |
| 50 khách mở menu cùng lúc | Cache menu 30s (xóa ngay khi sửa menu), cache `token → bàn` 60s |
| Socket trễ / tốn tài nguyên | Phân room `store:{id}` (nhân viên) và `table:{id}` (khách) → sự kiện chỉ đến đúng nhóm; tắt `perMessageDeflate`; giới hạn `maxHttpBufferSize`; khách chỉ nhận, mọi thao tác ghi đi qua REST có validate |
| Gửi trùng đơn (bấm 2 lần, mạng chập chờn) | `idempotencyKey` + `UNIQUE` trong DB; request đến sau nhận lại đơn cũ |
| 2 nhân viên bấm cùng lúc | `UPDATE ... WHERE status = ANY(nguồn hợp lệ)` (optimistic) → người đến sau nhận 409 |
| Thanh toán đua với đơn mới | `SELECT ... FOR UPDATE` các đơn mở của bàn trong transaction |
| Gian lận giá | Giá & tên món lấy từ DB khi đặt, không tin client; lưu snapshot vào `order_items` |
| Spam | Rate limit gửi order theo **bàn** (không theo IP, vì cả quán dùng chung WiFi) |
| Frontend re-render | Store chuẩn hóa theo id, selector nhỏ (`useQuantity`), `React.memo`, `useShallow`, tách `CartBar`, code-splitting theo trang |
| Mất kết nối | Socket tự reconnect + `connectionStateRecovery`; mỗi lần connect tải lại danh sách từ REST để bù sự kiện đã lỡ |

### Kết quả load test (máy dev, Postgres local)

| Khách đồng thời | Thành công | Độ trễ API p95 | Đơn đến nhân viên qua socket | Trễ end-to-end p95 |
| --- | --- | --- | --- | --- |
| 50 | 50/50 | 68 ms | 50/50 | 64 ms |
| 100 | 100/100 | 226 ms | 100/100 | 225 ms |

## Khi cần scale thêm

- Chạy nhiều instance: thêm `@socket.io/redis-adapter` (room dùng chung) và thay `TtlCache` bằng Redis.
- Production: đặt sau Nginx/Caddy có HTTPS (camera điện thoại & PWA cần HTTPS), đặt `NODE_ENV=production`,
  dùng `JWT_SECRET` dài ngẫu nhiên, đổi mật khẩu tài khoản mẫu.
- Chưa có (có thể mở rộng): thanh toán online, in bill/bếp, báo cáo doanh thu, tách đơn theo bếp/quầy bar, upload ảnh món.
