-- =====================================================================
-- Schema: Quản lý bán hàng & gọi món tại bàn qua QR
-- Chạy idempotent (IF NOT EXISTS) nên có thể chạy lại an toàn.
-- =====================================================================

CREATE TABLE IF NOT EXISTS stores (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  store_id       INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  username       VARCHAR(50) NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  role           VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bàn: mỗi bàn có qr_token ngẫu nhiên (khó đoán) gắn vào mã QR.
CREATE TABLE IF NOT EXISTS tables (
  id          SERIAL PRIMARY KEY,
  store_id    INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  area        VARCHAR(50) NOT NULL DEFAULT 'Tầng 1',
  qr_token    VARCHAR(64) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  store_id    INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            SERIAL PRIMARY KEY,
  store_id      INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id   INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price         INT NOT NULL CHECK (price >= 0),          -- VND, số nguyên
  image_url     TEXT,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trạng thái đơn: pending -> confirmed -> preparing -> served -> paid  (hoặc cancelled)
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  store_id         INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  table_id         INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status           VARCHAR(12) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','preparing','served','paid','cancelled')),
  note             VARCHAR(500) NOT NULL DEFAULT '',
  total_amount     INT NOT NULL DEFAULT 0,
  -- Khóa chống trùng: khách bấm 2 lần / mạng chập chờn gửi lại -> chỉ tạo 1 đơn.
  idempotency_key  VARCHAR(64) NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lưu "ảnh chụp" tên + giá tại thời điểm đặt, đổi giá menu sau này không ảnh hưởng đơn cũ.
CREATE TABLE IF NOT EXISTS order_items (
  id             SERIAL PRIMARY KEY,
  order_id       INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   INT NOT NULL REFERENCES menu_items(id),
  name           VARCHAR(150) NOT NULL,
  unit_price     INT NOT NULL,
  quantity       INT NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  note           VARCHAR(200) NOT NULL DEFAULT ''
);

-- Index phục vụ các truy vấn nóng
CREATE INDEX IF NOT EXISTS idx_orders_store_status   ON orders (store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table_status   ON orders (table_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order     ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_store_cat  ON menu_items (store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tables_store          ON tables (store_id);
