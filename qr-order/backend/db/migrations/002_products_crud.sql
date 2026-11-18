BEGIN;

ALTER TABLE menu_items
  ALTER COLUMN name TYPE VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE order_items
  ALTER COLUMN name TYPE VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_menu_items_store_status
  ON menu_items (store_id, is_available)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_store_name
  ON menu_items (store_id, name)
  WHERE deleted_at IS NULL;

COMMIT;
