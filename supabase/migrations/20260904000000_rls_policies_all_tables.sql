-- Fase 3: Row Level Security (RLS) policies for data isolation
-- Ensures users only access their own data; prevents cross-tenant data leakage

-- Enable RLS on all user-owned tables
alter table profiles enable row level security;
alter table quotes enable row level security;
alter table products enable row level security;
alter table clients enable row level security;
alter table filaments enable row level security;
alter table filament_movements enable row level security;
alter table supplies enable row level security;
alter table supply_movements enable row level security;
alter table integrations enable row level security;
alter table printers enable row level security;
alter table categories enable row level security;
alter table branches enable row level security;
alter table settings enable row level security;
alter table extra_purchases enable row level security;
alter table sales enable row level security;
alter table affiliate_commissions enable row level security;
alter table subscription_events enable row level security;
alter table coupon_campaigns enable row level security;
alter table product_pricing_calculator_inputs enable row level security;

-- === PROFILES ===
-- Users can only view/update their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on profiles for delete
  using (auth.uid() = id);

-- === QUOTES (Sales) ===
-- Users can only access quotes they own
create policy "Users can view own quotes"
  on quotes for select
  using (auth.uid() = user_id);

create policy "Users can create own quotes"
  on quotes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quotes"
  on quotes for update
  using (auth.uid() = user_id);

create policy "Users can delete own quotes"
  on quotes for delete
  using (auth.uid() = user_id);

-- === PRODUCTS ===
-- Users can only access products they own
create policy "Users can view own products"
  on products for select
  using (auth.uid() = user_id);

create policy "Users can create own products"
  on products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on products for update
  using (auth.uid() = user_id);

create policy "Users can delete own products"
  on products for delete
  using (auth.uid() = user_id);

-- === CLIENTS ===
-- Users can only access their own clients
create policy "Users can view own clients"
  on clients for select
  using (auth.uid() = user_id);

create policy "Users can create own clients"
  on clients for insert
  with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on clients for update
  using (auth.uid() = user_id);

create policy "Users can delete own clients"
  on clients for delete
  using (auth.uid() = user_id);

-- === FILAMENTS ===
-- Users can only access their own filaments
create policy "Users can view own filaments"
  on filaments for select
  using (auth.uid() = user_id);

create policy "Users can create own filaments"
  on filaments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own filaments"
  on filaments for update
  using (auth.uid() = user_id);

create policy "Users can delete own filaments"
  on filaments for delete
  using (auth.uid() = user_id);

-- === FILAMENT_MOVEMENTS ===
-- Users can only access movements for their filaments
create policy "Users can view own filament movements"
  on filament_movements for select
  using (
    filament_id in (
      select id from filaments where user_id = auth.uid()
    )
  );

create policy "Users can create filament movements"
  on filament_movements for insert
  with check (
    filament_id in (
      select id from filaments where user_id = auth.uid()
    )
  );

create policy "Users can delete filament movements"
  on filament_movements for delete
  using (
    filament_id in (
      select id from filaments where user_id = auth.uid()
    )
  );

-- === SUPPLIES ===
-- Users can only access their own supplies
create policy "Users can view own supplies"
  on supplies for select
  using (auth.uid() = user_id);

create policy "Users can create own supplies"
  on supplies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own supplies"
  on supplies for update
  using (auth.uid() = user_id);

create policy "Users can delete own supplies"
  on supplies for delete
  using (auth.uid() = user_id);

-- === SUPPLY_MOVEMENTS ===
-- Users can only access movements for their supplies
create policy "Users can view own supply movements"
  on supply_movements for select
  using (
    supply_id in (
      select id from supplies where user_id = auth.uid()
    )
  );

create policy "Users can create supply movements"
  on supply_movements for insert
  with check (
    supply_id in (
      select id from supplies where user_id = auth.uid()
    )
  );

create policy "Users can delete supply movements"
  on supply_movements for delete
  using (
    supply_id in (
      select id from supplies where user_id = auth.uid()
    )
  );

-- === INTEGRATIONS ===
-- Users can only access their own integrations
create policy "Users can view own integrations"
  on integrations for select
  using (auth.uid() = user_id);

create policy "Users can create own integrations"
  on integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own integrations"
  on integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete own integrations"
  on integrations for delete
  using (auth.uid() = user_id);

-- === PRINTERS ===
-- Users can only access their own printers
create policy "Users can view own printers"
  on printers for select
  using (auth.uid() = user_id);

create policy "Users can create own printers"
  on printers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own printers"
  on printers for update
  using (auth.uid() = user_id);

create policy "Users can delete own printers"
  on printers for delete
  using (auth.uid() = user_id);

-- === CATEGORIES ===
-- Users can only access their own categories
create policy "Users can view own categories"
  on categories for select
  using (auth.uid() = user_id);

create policy "Users can create own categories"
  on categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on categories for delete
  using (auth.uid() = user_id);

-- === BRANCHES ===
-- Users can only access their own branches
create policy "Users can view own branches"
  on branches for select
  using (auth.uid() = user_id);

create policy "Users can create own branches"
  on branches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own branches"
  on branches for update
  using (auth.uid() = user_id);

create policy "Users can delete own branches"
  on branches for delete
  using (auth.uid() = user_id);

-- === SETTINGS ===
-- Users can only access their own settings
create policy "Users can view own settings"
  on settings for select
  using (auth.uid() = user_id);

create policy "Users can create own settings"
  on settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on settings for update
  using (auth.uid() = user_id);

-- === EXTRA_PURCHASES ===
-- Users can only access their own expenses
create policy "Users can view own extra purchases"
  on extra_purchases for select
  using (auth.uid() = user_id);

create policy "Users can create own extra purchases"
  on extra_purchases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own extra purchases"
  on extra_purchases for update
  using (auth.uid() = user_id);

create policy "Users can delete own extra purchases"
  on extra_purchases for delete
  using (auth.uid() = user_id);

-- === SALES ===
-- Users can only access their own sales records
create policy "Users can view own sales"
  on sales for select
  using (auth.uid() = user_id);

create policy "Users can create own sales"
  on sales for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sales"
  on sales for update
  using (auth.uid() = user_id);

create policy "Users can delete own sales"
  on sales for delete
  using (auth.uid() = user_id);

-- === AFFILIATE_COMMISSIONS ===
-- Affiliates can view commissions earned; referred users cannot see commission data
-- (commission_id in (select ... where affiliate_user_id = auth.uid()) means "earned commissions")
-- (commission_id in (select ... where referred_user_id = auth.uid()) means they cannot see their referrer's commission)
create policy "Affiliates can view earned commissions"
  on affiliate_commissions for select
  using (auth.uid() = affiliate_user_id);

create policy "Admin only for commission creation"
  on affiliate_commissions for insert
  with check (false); -- Only via trigger from webhook

create policy "Admin only for commission updates"
  on affiliate_commissions for update
  with check (false); -- Only via trigger or admin

-- === SUBSCRIPTION_EVENTS ===
-- Users can only view events for their own account
create policy "Users can view own subscription events"
  on subscription_events for select
  using (auth.uid() = user_id);

-- === COUPON_CAMPAIGNS ===
-- Users can only access their own coupon campaigns
create policy "Users can view own coupon campaigns"
  on coupon_campaigns for select
  using (auth.uid() = user_id);

create policy "Users can create own coupon campaigns"
  on coupon_campaigns for insert
  with check (auth.uid() = user_id);

create policy "Users can update own coupon campaigns"
  on coupon_campaigns for update
  using (auth.uid() = user_id);

create policy "Users can delete own coupon campaigns"
  on coupon_campaigns for delete
  using (auth.uid() = user_id);

-- === PRODUCT_PRICING_CALCULATOR_INPUTS ===
-- Users can only access their own saved calculator inputs
create policy "Users can view own calculator inputs"
  on product_pricing_calculator_inputs for select
  using (auth.uid() = user_id);

create policy "Users can create own calculator inputs"
  on product_pricing_calculator_inputs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own calculator inputs"
  on product_pricing_calculator_inputs for update
  using (auth.uid() = user_id);

create policy "Users can delete own calculator inputs"
  on product_pricing_calculator_inputs for delete
  using (auth.uid() = user_id);
