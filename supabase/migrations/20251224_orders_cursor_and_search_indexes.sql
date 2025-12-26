-- ========================================
-- Indexes for fast cursor pagination + faster search
-- ========================================

-- Trigram extension (for ILIKE '%...%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Cursor pagination support (created_at desc, id desc)
CREATE INDEX IF NOT EXISTS idx_online_orders_org_created_id_desc
  ON public.online_orders (organization_id, created_at DESC, id DESC);

-- Common filter combinations
CREATE INDEX IF NOT EXISTS idx_online_orders_org_status_created_desc
  ON public.online_orders (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_orders_org_call_status_created_desc
  ON public.online_orders (organization_id, call_confirmation_status_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_orders_org_shipping_provider_created_desc
  ON public.online_orders (organization_id, shipping_provider, created_at DESC);

-- Faster exact order number lookups (numeric searches)
CREATE INDEX IF NOT EXISTS idx_online_orders_org_customer_order_number
  ON public.online_orders (organization_id, customer_order_number);

-- Trigram indexes for fuzzy search (best-effort).
-- Note: These are expression indexes; planner can combine with org_id index via BitmapAnd.
CREATE INDEX IF NOT EXISTS idx_online_orders_form_phone_trgm
  ON public.online_orders USING gin ((form_data->>'phone') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_online_orders_form_fullname_trgm
  ON public.online_orders USING gin ((form_data->>'fullName') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON public.customers USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
  ON public.customers USING gin (phone gin_trgm_ops);

