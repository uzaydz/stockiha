-- =====================================================
-- Online Orders: Assignment Groups, Rules, RPCs, and RLS
-- Date: 2025-10-29
-- This migration introduces server-side groups for online order assignment,
-- rule-based visibility, and safe claim/reassign flows with RLS.
-- =====================================================

-- Safety: required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: ensure function helpers exist
-- We reference public.get_current_organization_id() and
-- public.check_user_permissions_for_org(text) which exist in this project.

-- =============================
-- Tables
-- =============================

CREATE TABLE IF NOT EXISTS public.order_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  strategy TEXT NOT NULL DEFAULT 'claim_only' CHECK (strategy IN ('claim_only','round_robin','least_busy','weighted','manual')),
  priority INTEGER NOT NULL DEFAULT 1,
  last_assigned_member UUID NULL, -- optional for round_robin pointer
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL DEFAULT 1,
  max_open INTEGER NOT NULL DEFAULT 20,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_group_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('all','product_ids','category_ids','subcategory_ids')),
  include BOOLEAN NOT NULL DEFAULT TRUE,
  values JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.online_order_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('assigned','accepted','reassigned','closed')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS public.order_assignment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  from_staff_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  to_staff_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  group_id UUID NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('claim','auto_assign','reassign','close')),
  actor_staff_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT NULL
);

-- =============================
-- Indexes
-- =============================

-- Fast lookup
CREATE INDEX IF NOT EXISTS idx_order_groups_org_name ON public.order_groups (organization_id, name);
CREATE INDEX IF NOT EXISTS idx_order_group_rules_group ON public.order_group_rules (group_id);
CREATE INDEX IF NOT EXISTS idx_order_group_members_group_staff ON public.order_group_members (group_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_online_order_assignments_org_order ON public.online_order_assignments (organization_id, order_id);
-- For quick lookup of a staff member's open assignments
CREATE INDEX IF NOT EXISTS idx_online_order_assignments_org_staff_open
  ON public.online_order_assignments (organization_id, staff_id)
  WHERE status IN ('assigned','accepted');

-- Partial unique: one open assignment (assigned|accepted) per order
CREATE UNIQUE INDEX IF NOT EXISTS online_order_assignments_unique_open
  ON public.online_order_assignments (order_id)
  WHERE (status IN ('assigned','accepted'));

-- =============================
-- Denormalization table for filters: order_category_map
-- =============================

CREATE TABLE IF NOT EXISTS public.order_category_map (
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NULL REFERENCES public.product_categories(id) ON DELETE SET NULL,
  subcategory_id UUID NULL REFERENCES public.product_subcategories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_category_map_order ON public.order_category_map (order_id);
CREATE INDEX IF NOT EXISTS idx_order_category_map_cat ON public.order_category_map (category_id);
CREATE INDEX IF NOT EXISTS idx_order_category_map_subcat ON public.order_category_map (subcategory_id);

-- Upsert mapping when items change
CREATE OR REPLACE FUNCTION public.sync_order_category_map_for_item(p_order_id UUID, p_product_id UUID) RETURNS VOID AS $$
DECLARE
  v_cat UUID;
  v_subcat UUID;
BEGIN
  SELECT p.category_id, p.subcategory_id INTO v_cat, v_subcat
  FROM public.products p WHERE p.id = p_product_id;

  -- Remove existing mapping for this product in order (idempotent)
  DELETE FROM public.order_category_map WHERE order_id = p_order_id AND product_id = p_product_id;

  -- Re-insert mapping
  INSERT INTO public.order_category_map(order_id, product_id, category_id, subcategory_id)
  VALUES (p_order_id, p_product_id, v_cat, v_subcat)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Triggers on online_order_items (single trigger function handles ins/upd/del)
CREATE OR REPLACE FUNCTION public.trg_sync_order_category_map()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_order_category_map_for_item(NEW.order_id, NEW.product_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      DELETE FROM public.order_category_map WHERE order_id = OLD.order_id AND product_id = OLD.product_id;
    END IF;
    PERFORM public.sync_order_category_map_for_item(NEW.order_id, NEW.product_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.order_category_map WHERE order_id = OLD.order_id AND product_id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_online_order_items_after_ins ON public.online_order_items;
CREATE TRIGGER trg_online_order_items_after_ins
AFTER INSERT ON public.online_order_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_order_category_map();

DROP TRIGGER IF EXISTS trg_online_order_items_after_upd ON public.online_order_items;
CREATE TRIGGER trg_online_order_items_after_upd
AFTER UPDATE OF product_id ON public.online_order_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_order_category_map();

DROP TRIGGER IF EXISTS trg_online_order_items_after_del ON public.online_order_items;
CREATE TRIGGER trg_online_order_items_after_del
AFTER DELETE ON public.online_order_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_order_category_map();

-- Bootstrap existing mappings once (safe to run multiple times)
DO $$ BEGIN
  INSERT INTO public.order_category_map (order_id, product_id, category_id, subcategory_id)
  SELECT DISTINCT oi.order_id, oi.product_id, p.category_id, p.subcategory_id
  FROM public.online_order_items oi
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.order_category_map ocm
    ON ocm.order_id = oi.order_id AND ocm.product_id = oi.product_id
  WHERE ocm.order_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================
-- Auto-assign on items change
-- =============================

-- Determine best matching rule type for a group
DROP FUNCTION IF EXISTS public.match_group_rule_type(UUID, UUID);
CREATE OR REPLACE FUNCTION public.match_group_rule_type(p_group_id UUID, p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_org UUID;
  v_all_include BOOLEAN := FALSE;
  v_included_products UUID[];
  v_excluded_products UUID[];
  v_included_categories UUID[];
  v_excluded_categories UUID[];
  v_included_subcategories UUID[];
  v_excluded_subcategories UUID[];
  v_not_excluded BOOLEAN := TRUE;
BEGIN
  SELECT organization_id INTO v_org FROM public.order_groups WHERE id = p_group_id;
  IF v_org IS NULL THEN RETURN NULL; END IF;

  -- Aggregate rules
  SELECT
    EXISTS (
      SELECT 1 FROM public.order_group_rules r1
      WHERE r1.group_id = p_group_id AND r1.organization_id = v_org AND r1.type = 'all' AND r1.include = TRUE
    ) AS all_include,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r2,
           LATERAL jsonb_array_elements_text(r2.values) e
      WHERE r2.group_id = p_group_id AND r2.organization_id = v_org AND r2.type = 'product_ids' AND r2.include = TRUE
    ) AS inc_prod,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r3,
           LATERAL jsonb_array_elements_text(r3.values) e
      WHERE r3.group_id = p_group_id AND r3.organization_id = v_org AND r3.type = 'product_ids' AND r3.include = FALSE
    ) AS exc_prod,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r4,
           LATERAL jsonb_array_elements_text(r4.values) e
      WHERE r4.group_id = p_group_id AND r4.organization_id = v_org AND r4.type = 'category_ids' AND r4.include = TRUE
    ) AS inc_cat,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r5,
           LATERAL jsonb_array_elements_text(r5.values) e
      WHERE r5.group_id = p_group_id AND r5.organization_id = v_org AND r5.type = 'category_ids' AND r5.include = FALSE
    ) AS exc_cat,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r6,
           LATERAL jsonb_array_elements_text(r6.values) e
      WHERE r6.group_id = p_group_id AND r6.organization_id = v_org AND r6.type = 'subcategory_ids' AND r6.include = TRUE
    ) AS inc_sub,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r7,
           LATERAL jsonb_array_elements_text(r7.values) e
      WHERE r7.group_id = p_group_id AND r7.organization_id = v_org AND r7.type = 'subcategory_ids' AND r7.include = FALSE
    ) AS exc_sub
  INTO v_all_include, v_included_products, v_excluded_products, v_included_categories, v_excluded_categories, v_included_subcategories, v_excluded_subcategories;

  -- Exclusion check (order-level): exclude if any item hits any exclusion
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.online_order_items oi
    LEFT JOIN public.order_category_map ocm ON ocm.order_id = oi.order_id AND ocm.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND (
        (v_excluded_products IS NOT NULL AND array_length(v_excluded_products,1) IS NOT NULL AND oi.product_id = ANY(v_excluded_products))
        OR (v_excluded_subcategories IS NOT NULL AND array_length(v_excluded_subcategories,1) IS NOT NULL AND ocm.subcategory_id = ANY(v_excluded_subcategories))
        OR (v_excluded_categories IS NOT NULL AND array_length(v_excluded_categories,1) IS NOT NULL AND ocm.category_id = ANY(v_excluded_categories))
      )
  ) INTO v_not_excluded;

  IF NOT v_not_excluded THEN RETURN NULL; END IF;

  -- Highest priority match wins: product_ids > subcategory_ids > category_ids > all
  IF EXISTS (
    SELECT 1 FROM public.online_order_items oi
    WHERE oi.order_id = p_order_id
      AND v_included_products IS NOT NULL AND array_length(v_included_products,1) IS NOT NULL
      AND oi.product_id = ANY(v_included_products)
  ) THEN
    RETURN 'product_ids';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.online_order_items oi
    JOIN public.order_category_map ocm ON ocm.order_id = oi.order_id AND ocm.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND v_included_subcategories IS NOT NULL AND array_length(v_included_subcategories,1) IS NOT NULL
      AND ocm.subcategory_id = ANY(v_included_subcategories)
  ) THEN
    RETURN 'subcategory_ids';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.online_order_items oi
    JOIN public.order_category_map ocm ON ocm.order_id = oi.order_id AND ocm.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND v_included_categories IS NOT NULL AND array_length(v_included_categories,1) IS NOT NULL
      AND ocm.category_id = ANY(v_included_categories)
  ) THEN
    RETURN 'category_ids';
  END IF;

  IF v_all_include THEN RETURN 'all'; END IF;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_group_rule_type(UUID, UUID) TO authenticated;

-- Find best group for an order across the organization
DROP FUNCTION IF EXISTS public.find_best_group_for_order(UUID, UUID);
CREATE OR REPLACE FUNCTION public.find_best_group_for_order(p_org_id UUID, p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  g RECORD;
  best_group UUID := NULL;
  best_score INT := 0;
  best_prio INT := -2147483648; -- minimal int
  best_id UUID := NULL;
  t TEXT;
  score INT;
BEGIN
  FOR g IN SELECT id, priority FROM public.order_groups WHERE organization_id = p_org_id AND enabled = TRUE LOOP
    t := public.match_group_rule_type(g.id, p_order_id);
    IF t IS NULL THEN CONTINUE; END IF;
    score := CASE t WHEN 'product_ids' THEN 4 WHEN 'subcategory_ids' THEN 3 WHEN 'category_ids' THEN 2 WHEN 'all' THEN 1 ELSE 0 END;
    IF (score > best_score)
        OR (score = best_score AND g.priority > best_prio)
        OR (score = best_score AND g.priority = best_prio AND (best_id IS NULL OR g.id::text < best_id::text)) THEN
      best_group := g.id;
      best_score := score;
      best_prio := g.priority;
      best_id := g.id;
    END IF;
  END LOOP;
  RETURN best_group;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_best_group_for_order(UUID, UUID) TO authenticated;

-- Trigger function: auto-assign when items change if no open assignment exists
DROP FUNCTION IF EXISTS public.auto_assign_on_items_change();
CREATE OR REPLACE FUNCTION public.auto_assign_on_items_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID := COALESCE(NEW.order_id, OLD.order_id);
  v_org UUID;
  v_has_open BOOLEAN;
  v_group UUID;
  v_strategy TEXT;
BEGIN
  IF v_order_id IS NULL THEN RETURN NULL; END IF;
  SELECT organization_id INTO v_org FROM public.online_orders WHERE id = v_order_id;
  IF v_org IS NULL THEN RETURN NULL; END IF;

  -- skip if already assigned (open)
  SELECT EXISTS (
    SELECT 1 FROM public.online_order_assignments a
    WHERE a.organization_id = v_org AND a.order_id = v_order_id AND a.status IN ('assigned','accepted')
  ) INTO v_has_open;
  IF v_has_open THEN RETURN NULL; END IF;

  -- pick best group
  v_group := public.find_best_group_for_order(v_org, v_order_id);
  IF v_group IS NULL THEN RETURN NULL; END IF;

  SELECT strategy INTO v_strategy FROM public.order_groups WHERE id = v_group;
  IF v_strategy IN ('round_robin','least_busy','weighted') THEN
    PERFORM public.auto_assign_online_order(v_order_id, v_group);
  END IF;
  RETURN NULL;
END;
$$;

-- Fire after the category map triggers; name with suffix to run later (alphabetical)
DROP TRIGGER IF EXISTS trg_online_order_items_after_ins_auto_assign_z ON public.online_order_items;
CREATE TRIGGER trg_online_order_items_after_ins_auto_assign_z
AFTER INSERT ON public.online_order_items
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_on_items_change();

DROP TRIGGER IF EXISTS trg_online_order_items_after_upd_auto_assign_z ON public.online_order_items;
CREATE TRIGGER trg_online_order_items_after_upd_auto_assign_z
AFTER UPDATE OF product_id ON public.online_order_items
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_on_items_change();

DROP TRIGGER IF EXISTS trg_online_order_items_after_del_auto_assign_z ON public.online_order_items;
CREATE TRIGGER trg_online_order_items_after_del_auto_assign_z
AFTER DELETE ON public.online_order_items
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_on_items_change();

-- =============================
-- RLS Policies
-- =============================

ALTER TABLE public.order_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_group_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_category_map ENABLE ROW LEVEL SECURITY;

-- order_groups
DROP POLICY IF EXISTS order_groups_select ON public.order_groups;
DROP POLICY IF EXISTS order_groups_modify ON public.order_groups;
CREATE POLICY order_groups_select ON public.order_groups
  FOR SELECT TO authenticated
  USING (organization_id = public.get_current_organization_id());

CREATE POLICY order_groups_modify ON public.order_groups
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_current_organization_id()
    AND public.check_user_permissions_for_org('canManageOnlineOrderGroups')
  )
  WITH CHECK (
    organization_id = public.get_current_organization_id()
    AND public.check_user_permissions_for_org('canManageOnlineOrderGroups')
  );

-- order_group_members
DROP POLICY IF EXISTS order_group_members_select ON public.order_group_members;
DROP POLICY IF EXISTS order_group_members_modify ON public.order_group_members;
CREATE POLICY order_group_members_select ON public.order_group_members
  FOR SELECT TO authenticated
  USING (organization_id = public.get_current_organization_id());

CREATE POLICY order_group_members_modify ON public.order_group_members
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_current_organization_id()
    AND public.check_user_permissions_for_org('canManageOnlineOrderGroups')
  )
  WITH CHECK (
    organization_id = public.get_current_organization_id()
    AND public.check_user_permissions_for_org('canManageOnlineOrderGroups')
  );

-- order_group_rules
DROP POLICY IF EXISTS order_group_rules_select ON public.order_group_rules;
DROP POLICY IF EXISTS order_group_rules_modify ON public.order_group_rules;
CREATE POLICY order_group_rules_select ON public.order_group_rules
  FOR SELECT TO authenticated
  USING (organization_id = public.get_current_organization_id());

CREATE POLICY order_group_rules_modify ON public.order_group_rules
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_current_organization_id()
    AND public.check_user_permissions_for_org('canManageOnlineOrderGroups')
  )
  WITH CHECK (
    organization_id = public.get_current_organization_id()
    AND public.check_user_permissions_for_org('canManageOnlineOrderGroups')
  );

-- online_order_assignments
DROP POLICY IF EXISTS online_order_assignments_select ON public.online_order_assignments;
DROP POLICY IF EXISTS online_order_assignments_insert ON public.online_order_assignments;
DROP POLICY IF EXISTS online_order_assignments_update ON public.online_order_assignments;
CREATE POLICY online_order_assignments_select ON public.online_order_assignments
  FOR SELECT TO authenticated
  USING (organization_id = public.get_current_organization_id());

-- insert allowed for claim/self (canSelfAssignOnlineOrders) and managers
CREATE POLICY online_order_assignments_insert ON public.online_order_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_current_organization_id()
    AND (
      public.check_user_permissions_for_org('canSelfAssignOnlineOrders')
      OR public.check_user_permissions_for_org('canManageOnlineOrderGroups')
      OR public.check_user_permissions_for_org('canReassignOnlineOrders')
    )
  );

-- update allowed for managers/reassigners
CREATE POLICY online_order_assignments_update ON public.online_order_assignments
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_current_organization_id()
    AND (
      public.check_user_permissions_for_org('canManageOnlineOrderGroups')
      OR public.check_user_permissions_for_org('canReassignOnlineOrders')
    )
  )
  WITH CHECK (
    organization_id = public.get_current_organization_id()
    AND (
      public.check_user_permissions_for_org('canManageOnlineOrderGroups')
      OR public.check_user_permissions_for_org('canReassignOnlineOrders')
    )
  );

-- order_assignment_logs (read-only for org; insert by RPC)
DROP POLICY IF EXISTS order_assignment_logs_select ON public.order_assignment_logs;
DROP POLICY IF EXISTS order_assignment_logs_insert ON public.order_assignment_logs;
CREATE POLICY order_assignment_logs_select ON public.order_assignment_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.get_current_organization_id());
CREATE POLICY order_assignment_logs_insert ON public.order_assignment_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_current_organization_id());

-- order_category_map: select within org
DROP POLICY IF EXISTS order_category_map_select ON public.order_category_map;
CREATE POLICY order_category_map_select ON public.order_category_map
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.online_orders o
      WHERE o.id = order_id AND o.organization_id = public.get_current_organization_id()
    )
  );

-- =============================
-- Helper function: apply_group_rules
-- =============================

DROP FUNCTION IF EXISTS public.apply_group_rules(UUID, UUID);
CREATE OR REPLACE FUNCTION public.apply_group_rules(p_group_id UUID, p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_org UUID;
  v_visible BOOLEAN := FALSE;
  v_has_rules BOOLEAN := FALSE;
  v_all_include BOOLEAN := FALSE;
  v_included_products UUID[] := ARRAY[]::UUID[];
  v_excluded_products UUID[] := ARRAY[]::UUID[];
  v_included_categories UUID[] := ARRAY[]::UUID[];
  v_excluded_categories UUID[] := ARRAY[]::UUID[];
  v_included_subcategories UUID[] := ARRAY[]::UUID[];
  v_excluded_subcategories UUID[] := ARRAY[]::UUID[];
BEGIN
  SELECT organization_id INTO v_org FROM public.order_groups WHERE id = p_group_id;
  IF v_org IS NULL THEN
    RETURN FALSE;
  END IF;

  -- aggregate rule sets (use LATERAL expansion to build arrays)
  SELECT
    EXISTS (
      SELECT 1 FROM public.order_group_rules r1
      WHERE r1.group_id = p_group_id AND r1.organization_id = v_org AND r1.type = 'all' AND r1.include = TRUE
    ) AS all_include,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r2,
           LATERAL jsonb_array_elements_text(r2.values) e
      WHERE r2.group_id = p_group_id AND r2.organization_id = v_org AND r2.type = 'product_ids' AND r2.include = TRUE
    ) AS inc_prod,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r3,
           LATERAL jsonb_array_elements_text(r3.values) e
      WHERE r3.group_id = p_group_id AND r3.organization_id = v_org AND r3.type = 'product_ids' AND r3.include = FALSE
    ) AS exc_prod,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r4,
           LATERAL jsonb_array_elements_text(r4.values) e
      WHERE r4.group_id = p_group_id AND r4.organization_id = v_org AND r4.type = 'category_ids' AND r4.include = TRUE
    ) AS inc_cat,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r5,
           LATERAL jsonb_array_elements_text(r5.values) e
      WHERE r5.group_id = p_group_id AND r5.organization_id = v_org AND r5.type = 'category_ids' AND r5.include = FALSE
    ) AS exc_cat,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r6,
           LATERAL jsonb_array_elements_text(r6.values) e
      WHERE r6.group_id = p_group_id AND r6.organization_id = v_org AND r6.type = 'subcategory_ids' AND r6.include = TRUE
    ) AS inc_sub,
    (
      SELECT array_agg((e)::UUID)
      FROM public.order_group_rules r7,
           LATERAL jsonb_array_elements_text(r7.values) e
      WHERE r7.group_id = p_group_id AND r7.organization_id = v_org AND r7.type = 'subcategory_ids' AND r7.include = FALSE
    ) AS exc_sub
  INTO v_all_include, v_included_products, v_excluded_products, v_included_categories, v_excluded_categories, v_included_subcategories, v_excluded_subcategories;

  v_has_rules := EXISTS (SELECT 1 FROM public.order_group_rules r WHERE r.group_id = p_group_id);
  IF NOT v_has_rules THEN
    RETURN FALSE; -- default deny without rules
  END IF;

  -- collect order’s products and categories
  WITH o AS (
    SELECT o.id AS order_id
    FROM public.online_orders o
    WHERE o.id = p_order_id AND o.organization_id = v_org
  ),
  items AS (
    SELECT oi.product_id, ocm.category_id, ocm.subcategory_id
    FROM public.online_order_items oi
    JOIN o ON o.order_id = oi.order_id
    LEFT JOIN public.order_category_map ocm
      ON ocm.order_id = oi.order_id AND ocm.product_id = oi.product_id
  )
  SELECT EXISTS (
    -- inclusion check: any matching product/subcategory/category OR all include
    SELECT 1
    FROM items i
    WHERE (
      (v_included_products IS NOT NULL AND array_length(v_included_products,1) IS NOT NULL AND i.product_id = ANY(v_included_products))
      OR (v_included_subcategories IS NOT NULL AND array_length(v_included_subcategories,1) IS NOT NULL AND i.subcategory_id = ANY(v_included_subcategories))
      OR (v_included_categories IS NOT NULL AND array_length(v_included_categories,1) IS NOT NULL AND i.category_id = ANY(v_included_categories))
      OR v_all_include = TRUE
    )
  )
  AND NOT EXISTS (
    -- exclusion check: product/subcategory/category excluded
    SELECT 1 FROM items i
    WHERE (
      (v_excluded_products IS NOT NULL AND array_length(v_excluded_products,1) IS NOT NULL AND i.product_id = ANY(v_excluded_products))
      OR (v_excluded_subcategories IS NOT NULL AND array_length(v_excluded_subcategories,1) IS NOT NULL AND i.subcategory_id = ANY(v_excluded_subcategories))
      OR (v_excluded_categories IS NOT NULL AND array_length(v_excluded_categories,1) IS NOT NULL AND i.category_id = ANY(v_excluded_categories))
    )
  ) INTO v_visible;

  RETURN COALESCE(v_visible, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_group_rules(UUID, UUID) TO authenticated;

-- =============================
-- RPC: get_online_orders_for_staff
-- =============================

DROP FUNCTION IF EXISTS public.get_online_orders_for_staff(UUID, UUID, UUID, JSONB);
CREATE OR REPLACE FUNCTION public.get_online_orders_for_staff(
  p_org_id UUID,
  p_staff_id UUID,
  p_group_id UUID,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page INTEGER := COALESCE((p_filters->>'page')::INT, 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE((p_filters->>'page_size')::INT, 20), 1), 200);
  v_status TEXT := NULLIF(p_filters->>'status','');
  v_search TEXT := NULLIF(p_filters->>'search','');
  v_date_from TIMESTAMPTZ := NULLIF(p_filters->>'date_from','')::timestamptz;
  v_date_to TIMESTAMPTZ := NULLIF(p_filters->>'date_to','')::timestamptz;
  v_provider TEXT := NULLIF(p_filters->>'provider','');
  v_include_items BOOLEAN := COALESCE((p_filters->>'include_items')::BOOLEAN, TRUE);
  v_include_counts BOOLEAN := COALESCE((p_filters->>'include_counts')::BOOLEAN, TRUE);
  v_unassigned_only BOOLEAN := COALESCE((p_filters->>'unassigned_only')::BOOLEAN, FALSE);
  v_mine_only BOOLEAN := COALESCE((p_filters->>'mine_only')::BOOLEAN, FALSE);
  v_total BIGINT := 0;
  v_success BOOLEAN := TRUE;
  v_error TEXT := NULL;
  v_enabled BOOLEAN := TRUE;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Guard: org match
  IF p_org_id IS DISTINCT FROM public.get_current_organization_id() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'unauthorized_org');
  END IF;

  -- ensure group exists and enabled
  SELECT enabled INTO v_enabled FROM public.order_groups WHERE id = p_group_id AND organization_id = p_org_id;
  IF v_enabled IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', TRUE, 'orders', jsonb_build_array(), 'counts', jsonb_build_object(), 'stats', jsonb_build_object(), 'sharedData', jsonb_build_object(), 'metadata', jsonb_build_object('pagination', jsonb_build_object('page',1,'pageSize',v_page_size,'totalItems',0,'hasNextPage',false,'hasPreviousPage',false)));
  END IF;

  WITH base AS (
    SELECT o.*
    FROM public.online_orders o
    WHERE o.organization_id = p_org_id
      AND (v_status IS NULL OR o.status = v_status)
      AND (v_provider IS NULL OR o.shipping_provider = v_provider)
      AND (v_date_from IS NULL OR o.created_at >= v_date_from)
      AND (v_date_to IS NULL OR o.created_at <= v_date_to)
      AND (
        v_search IS NULL OR
        o.customer_order_number::text ILIKE '%'||v_search||'%' OR
        o.notes ILIKE '%'||v_search||'%' OR
        (o.form_data->>'fullName') ILIKE '%'||v_search||'%' OR
        (o.form_data->>'phone') ILIKE '%'||v_search||'%'
      )
  ),
  allowed AS (
    -- Orders visible by rules
    SELECT b.* FROM base b WHERE public.apply_group_rules(p_group_id, b.id) = TRUE
    UNION
    -- Orders assigned to this staff (open), even if not matching rules
    SELECT b.*
    FROM base b
    JOIN public.online_order_assignments a
      ON a.order_id = b.id AND a.organization_id = p_org_id AND a.status IN ('assigned','accepted')
    WHERE a.staff_id = p_staff_id
  ),
  with_assign AS (
    SELECT v.*, a.staff_id AS assigned_staff_id, a.status AS assignment_status
    FROM allowed v
    LEFT JOIN public.online_order_assignments a
      ON a.order_id = v.id AND a.organization_id = p_org_id AND a.status IN ('assigned','accepted')
  ),
  filtered AS (
    SELECT * FROM with_assign wa
    WHERE (NOT v_unassigned_only OR wa.assigned_staff_id IS NULL)
      AND (NOT v_mine_only OR wa.assigned_staff_id = p_staff_id)
  ),
  counted AS (
    SELECT COUNT(*)::BIGINT AS total FROM filtered
  ),
  paged AS (
    SELECT *
    FROM filtered
    ORDER BY created_at DESC
    OFFSET GREATEST((v_page - 1),0) * v_page_size
    LIMIT v_page_size
  ),
  items_agg AS (
    SELECT oi.order_id, jsonb_agg(jsonb_build_object(
      'id', oi.id,
      'product_id', oi.product_id,
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'total_price', oi.total_price
    )) AS items
    FROM public.online_order_items oi
    WHERE v_include_items
      AND EXISTS (SELECT 1 FROM paged p WHERE p.id = oi.order_id)
    GROUP BY oi.order_id
  )
  SELECT (SELECT total FROM counted) INTO v_total;

  v_result := jsonb_build_object(
    'success', TRUE,
    'orders', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'customer_order_number', p.customer_order_number,
          'status', p.status,
          'payment_method', p.payment_method,
          'payment_status', p.payment_status,
          'subtotal', p.subtotal,
          'tax', p.tax,
          'discount', p.discount,
          'total', p.total,
          'shipping_cost', p.shipping_cost,
          'notes', p.notes,
          'created_at', p.created_at,
          'updated_at', p.updated_at,
          'form_data', p.form_data,
          'metadata', p.metadata,
          'shipping_provider', p.shipping_provider,
          'assignment', jsonb_build_object('staff_id', p.assigned_staff_id, 'status', p.assignment_status),
          'assigned_staff_name', (
            SELECT COALESCE(u.name, pss.staff_name)
            FROM public.users u
            FULL JOIN public.pos_staff_sessions pss ON pss.id = p.assigned_staff_id
            WHERE u.id = p.assigned_staff_id OR pss.id = p.assigned_staff_id
            LIMIT 1
          ),
          'order_items', COALESCE(ia.items, '[]'::jsonb)
        )
      ), '[]'::jsonb)
      FROM paged p
      LEFT JOIN items_agg ia ON ia.order_id = p.id
    ),
    'counts', CASE WHEN v_include_counts THEN (
      SELECT jsonb_build_object(
        'pending', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'pending'),0),
        'processing', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'processing'),0),
        'shipped', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'shipped'),0),
        'delivered', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'delivered'),0),
        'cancelled', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'cancelled'),0)
      )
    ) ELSE '{}'::jsonb END,
    'stats', jsonb_build_object(
      'totalSales', COALESCE((SELECT SUM(total) FROM allowed), 0),
      'avgOrderValue', COALESCE((SELECT AVG(total) FROM allowed), 0),
      'salesTrend', 0,
      'pendingAmount', COALESCE((SELECT SUM(total) FROM allowed WHERE status IN ('pending','processing')), 0)
    ),
    'sharedData', jsonb_build_object(
      'shippingProviders', (
        SELECT COALESCE(jsonb_agg(DISTINCT sp.provider_code), '[]'::jsonb)
        FROM public.shipping_providers sp
        WHERE sp.organization_id = p_org_id
      ),
      'callConfirmationStatuses', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'icon', icon)), '[]'::jsonb)
        FROM public.call_confirmation_statuses ccs
        WHERE ccs.organization_id = p_org_id
      ),
      'organizationSettings', (
        SELECT settings FROM public.organizations WHERE id = p_org_id
      )
    ),
    'metadata', jsonb_build_object(
      'pagination', jsonb_build_object(
        'page', v_page,
        'pageSize', v_page_size,
        'totalItems', COALESCE(v_total,0),
        'totalPages', CASE WHEN v_page_size > 0 THEN CEIL(COALESCE(v_total,0)::NUMERIC / v_page_size)::INT ELSE 1 END,
        'hasNextPage', (v_page * v_page_size) < COALESCE(v_total,0),
        'hasPreviousPage', v_page > 1
      )
    )
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_online_orders_for_staff(UUID, UUID, UUID, JSONB) TO authenticated;

-- =============================
-- RPC: claim_online_order
-- =============================

DROP FUNCTION IF EXISTS public.claim_online_order(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.claim_online_order(
  p_order_id UUID,
  p_staff_id UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT organization_id INTO v_org FROM public.order_groups WHERE id = p_group_id;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_group');
  END IF;

  -- Ensure order belongs to same org
  IF NOT EXISTS (SELECT 1 FROM public.online_orders o WHERE o.id = p_order_id AND o.organization_id = v_org) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_order');
  END IF;

  -- Ensure rules allow visibility
  IF public.apply_group_rules(p_group_id, p_order_id) IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'not_eligible');
  END IF;

  -- Try insert under unique partial constraint for open assignment
  BEGIN
    INSERT INTO public.online_order_assignments (organization_id, order_id, group_id, staff_id, status, assigned_at)
    VALUES (v_org, p_order_id, p_group_id, p_staff_id, 'assigned', v_now);

    INSERT INTO public.order_assignment_logs (organization_id, order_id, from_staff_id, to_staff_id, group_id, action, actor_staff_id, at, notes)
    VALUES (v_org, p_order_id, NULL, p_staff_id, p_group_id, 'claim', p_staff_id, v_now, 'claim_online_order');

    RETURN jsonb_build_object('success', TRUE);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_assigned');
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_online_order(UUID, UUID, UUID) TO authenticated;

-- =============================
-- RPC: reassign_online_order
-- =============================

DROP FUNCTION IF EXISTS public.reassign_online_order(UUID, UUID, UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.reassign_online_order(
  p_order_id UUID,
  p_from_staff UUID,
  p_to_staff UUID,
  p_group_id UUID,
  p_actor_staff UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT organization_id INTO v_org FROM public.order_groups WHERE id = p_group_id;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_group');
  END IF;

  -- Authorization: manager or canReassign
  IF NOT (
    public.check_user_permissions_for_org('canManageOnlineOrderGroups') OR
    public.check_user_permissions_for_org('canReassignOnlineOrders')
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'forbidden');
  END IF;

  PERFORM 1 FROM public.online_orders o WHERE o.id = p_order_id AND o.organization_id = v_org;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_order');
  END IF;

  -- Close previous open assignment if exists
  UPDATE public.online_order_assignments
  SET status = 'reassigned', assigned_at = v_now
  WHERE order_id = p_order_id AND organization_id = v_org AND status IN ('assigned','accepted');

  -- Insert new
  INSERT INTO public.online_order_assignments (organization_id, order_id, group_id, staff_id, status, assigned_at)
  VALUES (v_org, p_order_id, p_group_id, p_to_staff, 'assigned', v_now);

  INSERT INTO public.order_assignment_logs (organization_id, order_id, from_staff_id, to_staff_id, group_id, action, actor_staff_id, at, notes)
  VALUES (v_org, p_order_id, p_from_staff, p_to_staff, p_group_id, 'reassign', p_actor_staff, v_now, 'reassign_online_order');

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_online_order(UUID, UUID, UUID, UUID, UUID) TO authenticated;

-- =============================
-- RPC: auto_assign_online_order (basic strategies)
-- =============================

DROP FUNCTION IF EXISTS public.auto_assign_online_order(UUID, UUID);
CREATE OR REPLACE FUNCTION public.auto_assign_online_order(
  p_order_id UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org UUID;
  v_strategy TEXT;
  v_now TIMESTAMPTZ := now();
  v_target_staff UUID;
BEGIN
  SELECT organization_id, strategy INTO v_org, v_strategy FROM public.order_groups WHERE id = p_group_id;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_group');
  END IF;

  IF public.apply_group_rules(p_group_id, p_order_id) IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'not_eligible');
  END IF;

  -- Select active members with capacity
  WITH open_cte AS (
    SELECT staff_id, COUNT(*) AS open_count
    FROM public.online_order_assignments
    WHERE organization_id = v_org AND status IN ('assigned','accepted')
    GROUP BY staff_id
  ),
  members AS (
    SELECT m.*, COALESCE(o.open_count, 0) AS open_count
    FROM public.order_group_members m
    LEFT JOIN open_cte o ON o.staff_id = m.staff_id
    WHERE m.organization_id = v_org AND m.group_id = p_group_id AND m.active = TRUE
      AND (m.max_open <= 0 OR COALESCE(o.open_count,0) < m.max_open)
  )
  SELECT CASE
    WHEN v_strategy = 'round_robin' THEN (
      SELECT m.staff_id FROM members m
      ORDER BY (m.staff_id = (SELECT last_assigned_member FROM public.order_groups WHERE id = p_group_id)) ASC, m.created_at ASC
      LIMIT 1
    )
    WHEN v_strategy = 'least_busy' THEN (
      SELECT m.staff_id FROM members m ORDER BY m.open_count ASC, m.weight DESC, m.created_at ASC LIMIT 1
    )
    WHEN v_strategy = 'weighted' THEN (
      -- simple weighted pick: highest weight among available
      SELECT m.staff_id FROM members m ORDER BY m.weight DESC, m.created_at ASC LIMIT 1
    )
    ELSE NULL
  END INTO v_target_staff;

  IF v_target_staff IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'no_member_available');
  END IF;

  BEGIN
    INSERT INTO public.online_order_assignments (organization_id, order_id, group_id, staff_id, status, assigned_at)
    VALUES (v_org, p_order_id, p_group_id, v_target_staff, 'assigned', v_now);

    UPDATE public.order_groups SET last_assigned_member = v_target_staff, updated_at = v_now WHERE id = p_group_id;

    INSERT INTO public.order_assignment_logs (organization_id, order_id, from_staff_id, to_staff_id, group_id, action, actor_staff_id, at, notes)
    VALUES (v_org, p_order_id, NULL, v_target_staff, p_group_id, 'auto_assign', v_target_staff, v_now, v_strategy);

    RETURN jsonb_build_object('success', TRUE, 'staff_id', v_target_staff);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_assigned');
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_assign_online_order(UUID, UUID) TO authenticated;

-- =============================
-- Seed: ensure default group per organization (optional)
-- =============================

CREATE OR REPLACE FUNCTION public.ensure_default_online_orders_group(p_org_id UUID) RETURNS UUID AS $$
DECLARE v_group_id UUID; BEGIN
  SELECT id INTO v_group_id FROM public.order_groups WHERE organization_id = p_org_id AND name = 'المجموعة الافتراضية (كل المنتجات)' LIMIT 1;
  IF v_group_id IS NULL THEN
    INSERT INTO public.order_groups(organization_id, name, enabled, strategy, priority)
    VALUES (p_org_id, 'المجموعة الافتراضية (كل المنتجات)', TRUE, 'claim_only', 1)
    RETURNING id INTO v_group_id;
    INSERT INTO public.order_group_rules(organization_id, group_id, type, include, values)
    VALUES (p_org_id, v_group_id, 'all', TRUE, '[]'::jsonb);
  END IF;
  RETURN v_group_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ensure_default_online_orders_group(UUID) TO authenticated;
