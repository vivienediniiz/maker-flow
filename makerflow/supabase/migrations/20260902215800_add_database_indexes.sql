-- Indexes pra melhorar performance de queries frequentes
-- Criado: 2026-09-02

-- Profiles: busca por user_id, subscription_tier, subscription_status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON profiles(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_paid_until ON profiles(paid_until) WHERE paid_until IS NOT NULL;

-- Quotes (Vendas): busca por user_id, status, created_at
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_status ON quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_created_at ON quotes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_external_order_id ON quotes(user_id, external_order_id) WHERE external_order_id IS NOT NULL;

-- Filaments: busca por user_id, low_stock_threshold
CREATE INDEX IF NOT EXISTS idx_filaments_user_id ON filaments(user_id);
CREATE INDEX IF NOT EXISTS idx_filaments_user_id_brand_material_color ON filaments(user_id, brand, material, color_hex);

-- Filament movements: busca por filament_id, related_quote_id
CREATE INDEX IF NOT EXISTS idx_filament_movements_filament_id ON filament_movements(filament_id);
CREATE INDEX IF NOT EXISTS idx_filament_movements_related_quote_id ON filament_movements(related_quote_id) WHERE related_quote_id IS NOT NULL;

-- Supply movements: busca por supply_id
CREATE INDEX IF NOT EXISTS idx_supply_movements_supply_id ON supply_movements(supply_id);

-- Integrations: busca por user_id, platform
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id_platform ON integrations(user_id, platform);

-- Subscription events: busca por user_id, created_at (para analytics)
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- Affiliate commissions: busca por affiliate_user_id, referred_user_id
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_user_id ON affiliate_commissions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred_user_id ON affiliate_commissions(referred_user_id);

-- Clients: busca por user_id, name
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Products: busca por user_id
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Printers: busca por user_id, api_key (webhook auth)
CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);
CREATE INDEX IF NOT EXISTS idx_printers_api_key_webhook ON printers(api_key_webhook) WHERE api_key_webhook IS NOT NULL;
