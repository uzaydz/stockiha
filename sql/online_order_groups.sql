-- Online Order Groups: server-side schema and RPC drafts

-- Tables
-- order_groups (per organization)
-- Columns: id uuid pk, organization_id uuid fk, name text, enabled boolean, strategy text,
-- priority int, created_at timestamptz, updated_at timestamptz

-- order_group_members
-- Columns: id uuid pk, group_id uuid fk, staff_id uuid, weight int, max_open int, active boolean

-- order_group_rules
-- Columns: id uuid pk, group_id uuid fk, type text check in ('all','product_ids','category_ids','subcategory_ids'), include boolean, values jsonb

-- online_order_assignments
-- Columns: id uuid pk, order_id uuid fk, group_id uuid fk, staff_id uuid fk, status text, assigned_at timestamptz

-- RPC: get_online_orders_for_staff
-- Args: p_organization_id uuid, p_staff_id uuid, p_group_id uuid, p_filters jsonb
-- Returns: json with { success, orders, counts, stats, sharedData, metadata }
-- Behavior: enforce rule filtering (product_ids/categories/subcategories) and visibility for the staff’s group

-- RPC: claim_online_order
-- Args: p_order_id uuid, p_staff_id uuid, p_group_id uuid
-- Behavior: transactional insert into online_order_assignments if not already assigned; returns success/error

-- RPC: reassign_online_order
-- Args: p_order_id uuid, p_from_staff uuid, p_to_staff uuid, p_group_id uuid, p_actor_staff uuid
-- Behavior: create new assignment row, mark previous as closed/reassigned

-- Notes:
-- 1) Add indexes on online_order_items(product_id), products(category_id, parent_category_id), and materialized view order_categories
-- 2) Enforce RLS policies by organization and role
-- 3) Consider worker/cron for auto-assignment for strategies round_robin/least_busy/weighted

