BEGIN;

ALTER TABLE tables
  ALTER COLUMN name TYPE VARCHAR(100),
  ALTER COLUMN area TYPE VARCHAR(255),
  ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tables
  DROP CONSTRAINT IF EXISTS tables_store_id_name_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_tables_capacity_positive' AND conrelid = 'tables'::regclass
  ) THEN
    ALTER TABLE tables
      ADD CONSTRAINT chk_tables_capacity_positive CHECK (capacity > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_tables_status' AND conrelid = 'tables'::regclass
  ) THEN
    ALTER TABLE tables
      ADD CONSTRAINT chk_tables_status
      CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tables_store_status
  ON tables (store_id, status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_active_store_name
  ON tables (store_id, lower(name))
  WHERE deleted_at IS NULL;

COMMIT;
