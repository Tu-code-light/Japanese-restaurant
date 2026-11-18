BEGIN;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS status BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE categories
  ALTER COLUMN name TYPE VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_categories_store_name
  ON categories (store_id, name);

CREATE INDEX IF NOT EXISTS idx_categories_store_status
  ON categories (store_id, status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_active_store_name
  ON categories (store_id, lower(name))
  WHERE deleted_at IS NULL AND status = TRUE;

COMMIT;
