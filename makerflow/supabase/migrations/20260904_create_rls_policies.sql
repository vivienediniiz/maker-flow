-- ============================================================================
-- ROW LEVEL SECURITY POLICIES — SECURITY AUDIT FIX
-- Date: 2026-09-04
-- Purpose: Implement proper data isolation between makers in multi-tenant system
-- ============================================================================

-- First, create webhook deduplication table (for idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  request_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider, request_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_req
  ON webhook_events(provider, request_id);

-- ============================================================================
-- RLS POLICIES FOR QUOTES TABLE
-- Each maker sees only their own sales
-- ============================================================================

CREATE POLICY "quotes_select_own" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quotes_insert_own" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_update_own" ON quotes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_delete_own" ON quotes
  FOR DELETE USING (auth.uid() = user_id);

-- Admin bypass
CREATE POLICY "quotes_admin_all" ON quotes
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES FOR INTEGRATIONS TABLE
-- Each maker sees only their own integrations (OAuth credentials)
-- ============================================================================

CREATE POLICY "integrations_select_own" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "integrations_insert_own" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "integrations_update_own" ON integrations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "integrations_delete_own" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "integrations_admin_all" ON integrations
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES FOR PROFILES TABLE
-- Each maker sees only their own profile
-- ============================================================================

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES FOR FILAMENTS TABLE
-- Each maker sees only their own filaments
-- ============================================================================

CREATE POLICY "filaments_select_own" ON filaments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "filaments_insert_own" ON filaments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "filaments_update_own" ON filaments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "filaments_delete_own" ON filaments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES FOR CLIENTS TABLE
-- Each maker sees only their own clients
-- ============================================================================

CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_delete_own" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES FOR PRODUCTS TABLE
-- Each maker sees only their own products
-- ============================================================================

CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFY RLS IS ENABLED (it should be, but double-check)
-- ============================================================================

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE filaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin-only access to webhook_events
CREATE POLICY "webhook_events_admin" ON webhook_events
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Allow service_role (webhooks) to insert without RLS
-- This is necessary because webhooks run as service_role, not as a user
-- The `user_id` is validated in application code before insert

CREATE POLICY "webhook_events_insert_service_role" ON webhook_events
  FOR INSERT WITH CHECK (true);
