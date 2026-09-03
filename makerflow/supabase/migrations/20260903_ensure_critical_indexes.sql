-- Garantir índices críticos de performance
-- Silent failure fix: Forçar índices em user_id, status, created_at

-- Quotes (Vendas) - CRÍTICO
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_status ON quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_created_at ON quotes(user_id, created_at DESC);

-- Filaments - Performance com volume
CREATE INDEX IF NOT EXISTS idx_filaments_user_id ON filaments(user_id);
CREATE INDEX IF NOT EXISTS idx_filaments_user_id_brand_material_color ON filaments(user_id, brand, material, color_hex);

-- Integrations - Webhook performance
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- Clients - Listagem
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Products - Dashboard
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Printers - Telemetria
CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);

-- Subscription events - Analytics
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);
