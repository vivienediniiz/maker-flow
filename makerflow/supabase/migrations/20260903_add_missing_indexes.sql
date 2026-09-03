-- Critical indexes for calculator_drafts and other frequently queried tables
-- Addresses silent performance degradation with data volume

-- calculator_drafts indexes (commonly filtered by user_id, created_at)
CREATE INDEX IF NOT EXISTS idx_calculator_drafts_user_id 
  ON calculator_drafts(user_id);

CREATE INDEX IF NOT EXISTS idx_calculator_drafts_user_id_created_at 
  ON calculator_drafts(user_id, created_at DESC);

-- supply_movements indexes (frequently filtered by user_id, supply_id)
CREATE INDEX IF NOT EXISTS idx_supply_movements_user_id 
  ON supply_movements(user_id);

CREATE INDEX IF NOT EXISTS idx_supply_movements_supply_id 
  ON supply_movements(supply_id);

CREATE INDEX IF NOT EXISTS idx_supply_movements_user_id_created_at 
  ON supply_movements(user_id, created_at DESC);

-- supplies indexes (user owns supplies)
CREATE INDEX IF NOT EXISTS idx_supplies_user_id 
  ON supplies(user_id);

-- extra_purchases indexes (expenses by user/date)
CREATE INDEX IF NOT EXISTS idx_extra_purchases_user_id 
  ON extra_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_extra_purchases_user_id_created_at 
  ON extra_purchases(user_id, created_at DESC);

-- store_products_public indexes (public store queries)
CREATE INDEX IF NOT EXISTS idx_store_products_public_user_id 
  ON store_products_public(user_id);

-- store_banners_public indexes
CREATE INDEX IF NOT EXISTS idx_store_banners_public_user_id 
  ON store_banners_public(user_id);

-- store_profiles_public indexes (slug lookup)
CREATE INDEX IF NOT EXISTS idx_store_profiles_public_slug 
  ON store_profiles_public(store_slug);

-- Ensure soft delete queries don't scan deleted rows
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at 
  ON quotes(deleted_at) WHERE deleted_at IS NULL;

-- created_at indexes for time-based queries (recent activity)
CREATE INDEX IF NOT EXISTS idx_calculator_drafts_created_at 
  ON calculator_drafts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplies_created_at 
  ON supplies(created_at DESC);
