-- =====================================================
-- Fix: Add replica identity to order_category_map
-- Date: 2025-10-30
-- Issue: cannot delete from table because it does not have a replica identity
-- Solution: Add composite primary key
-- =====================================================

-- Drop existing table and recreate with primary key
DROP TABLE IF EXISTS public.order_category_map CASCADE;

CREATE TABLE public.order_category_map (
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NULL REFERENCES public.product_categories(id) ON DELETE SET NULL,
  subcategory_id UUID NULL REFERENCES public.product_subcategories(id) ON DELETE SET NULL,
  -- Add composite primary key to enable replica identity
  PRIMARY KEY (order_id, product_id)
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_order_category_map_order ON public.order_category_map (order_id);
CREATE INDEX IF NOT EXISTS idx_order_category_map_cat ON public.order_category_map (category_id);
CREATE INDEX IF NOT EXISTS idx_order_category_map_subcat ON public.order_category_map (subcategory_id);

-- Disable RLS for this internal denormalized table
-- This table is managed entirely by triggers and should not have RLS restrictions
-- The security is enforced at the online_orders and online_order_items level
ALTER TABLE public.order_category_map DISABLE ROW LEVEL SECURITY;

-- Note: We don't need RLS policies here because:
-- 1. This is an internal denormalized table
-- 2. It's populated automatically by triggers
-- 3. Users never directly insert/update/delete from it
-- 4. Security is enforced at the source tables (online_orders, online_order_items)

-- Bootstrap existing mappings (safe to run - will populate from existing data)
INSERT INTO public.order_category_map (order_id, product_id, category_id, subcategory_id)
SELECT DISTINCT oi.order_id, oi.product_id, p.category_id, p.subcategory_id
FROM public.online_order_items oi
JOIN public.products p ON p.id = oi.product_id
ON CONFLICT (order_id, product_id) DO NOTHING;

-- Verify replica identity is set
-- Note: PRIMARY KEY automatically sets REPLICA IDENTITY to DEFAULT which includes the PK
-- This is sufficient for Supabase Realtime and logical replication

COMMENT ON TABLE public.order_category_map IS 'Denormalized category mapping for online orders. Includes composite PK for replica identity support.';
