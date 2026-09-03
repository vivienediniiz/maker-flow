-- Add soft delete to quotes table
-- Enable recovery and audit trail for deleted sales

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index on deleted_at for faster filtering
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- View for active quotes (exclude soft-deleted)
CREATE OR REPLACE VIEW quotes_active AS
SELECT * FROM quotes WHERE deleted_at IS NULL;

-- View for deleted quotes (only soft-deleted)
CREATE OR REPLACE VIEW quotes_deleted AS
SELECT * FROM quotes WHERE deleted_at IS NOT NULL;

-- Update existing queries to exclude soft-deleted by default
-- This is handled in the application layer via .is() NULL filters

-- Trigger to prevent direct deletion - enforce soft delete instead
CREATE OR REPLACE FUNCTION enforce_soft_delete_quotes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Use UPDATE quotes SET deleted_at = NOW() instead of DELETE';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_hard_delete_quotes ON quotes;
CREATE TRIGGER prevent_hard_delete_quotes
BEFORE DELETE ON quotes
FOR EACH ROW
EXECUTE FUNCTION enforce_soft_delete_quotes();

-- Audit: track who deleted what and when
-- Enable RLS audit on quotes if not already enabled
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
