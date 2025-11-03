Online Order Groups (Server)

Overview
- Adds server-side groups, rules, and assignments for online orders.
- SQL migration: supabase/migrations/20251029_online_order_groups.sql
- Frontend RPC client: src/services/onlineOrdersGroupsApi.ts

Database
- Tables:
  - order_groups: organization-scoped groups with strategy and priority.
  - order_group_members: group members with weight, max_open, active.
  - order_group_rules: include/exclude rules by all/product_ids/category_ids/subcategory_ids.
  - online_order_assignments: current assignment per order (unique open via partial index).
  - order_assignment_logs: action log for audit and metrics.
  - order_category_map: denormalized mapping (order_id, product_id, category_id, subcategory_id) kept in sync by triggers.

RLS
- Restricted by organization_id via get_current_organization_id().
- Mutations require permissions: canManageOnlineOrderGroups, canSelfAssignOnlineOrders, canReassignOnlineOrders.

RPCs
- get_online_orders_for_staff(p_org_id, p_staff_id, p_group_id, p_filters jsonb) → jsonb
  - Filters: { page, page_size, status, search, date_from, date_to, provider, include_items, include_counts, mine_only, unassigned_only }.
  - Applies group rules server-side; returns { success, orders, counts, stats, sharedData, metadata }.
- claim_online_order(p_order_id, p_staff_id, p_group_id) → { success, error? }
  - Safe assignment with unique partial constraint; logs claim.
- reassign_online_order(p_order_id, p_from_staff, p_to_staff, p_group_id, p_actor_staff) → { success, error? }
  - Manager-only flow; closes previous open assignment, inserts new, logs action.
- auto_assign_online_order(p_order_id, p_group_id) → { success, staff_id?, error? }
  - Strategies: round_robin, least_busy, weighted, respecting max_open and active.

Frontend Integration
- Hook: src/hooks/useOptimizedOrdersData.ts
  - Switched to get_online_orders_for_staff when onlineOrdersGroupId is set; falls back to legacy RPC otherwise.
- Row Actions: claim button calls claim_online_order with fallback to local Dexie.

Launch Plan
- Phase 1: Claim-only strategy; hook switched to server RPC.
- Phase 2+: Enable auto-assign strategies per group via feature flags.

Notes
- order_category_map is a table maintained by triggers for fast rule evaluation.
- Default group per organization is created via ensure_default_online_orders_group(org_id).

