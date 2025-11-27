# Comprehensive Sync Analysis & Fix Plan

## 1. Current State Analysis
The user is experiencing persistent synchronization errors between the local SQLite database and Supabase. Despite previous fixes, new schema mismatches keep appearing.

### Recent Errors from Logs:
1.  **`orders` Table:**
    *   `Could not find the 'pending_updates' column of 'orders' in the schema cache`
    *   `Could not find the 'payload' column of 'orders' in the schema cache` (Previously fixed, but might need verification)
    *   `Could not find the 'message' column of 'orders' in the schema cache` (Previously fixed)

2.  **`order_items` Table:**
    *   `null value in column "name" of relation "order_items" violates not-null constraint`
    *   `null value in column "slug" of relation "order_items" violates not-null constraint` (Previously fixed)

### Root Cause:
The local data models (`LocalPOSOrder`, `LocalPOSOrderItem`) contain several fields that are used for local state management (e.g., `pending_updates`, `payload`, `message`, `local_order_number`) or have different names than the Supabase schema (e.g., `product_name` vs `name`). The `BatchSender` is not filtering out all these local-only fields or mapping them correctly before sending the payload to Supabase.

## 2. Comprehensive Fix Plan

To solve this permanently, we need a strict whitelist/blacklist approach and a thorough review of all local vs. remote columns.

### Step 1: Update `BatchSender.ts` - Strict Column Filtering
Instead of just adding to the exclusion list one by one, we will perform a comprehensive audit of `LOCAL_ONLY_COLUMNS` for `orders` and `pos_orders`.

**Fields to Exclude for `orders` / `pos_orders`:**
- `pending_updates` (New error)
- `payload`
- `message`
- `extra_fields`
- `local_order_number`
- `local_order_number_str`
- `synced`, `syncStatus`, `sync_status`, `pendingOperation`, `pending_operation`
- `lastSyncAttempt`, `last_sync_attempt`, `error`
- `remote_order_id`, `remote_customer_order_number`
- `local_created_at`, `server_created_at`, `created_at_ts`
- `customer_name_lower`, `work_session_id`, `items`
- `localCreatedAt`, `serverCreatedAt`

### Step 2: Update `BatchSender.ts` - Column Mapping
Ensure `order_items` are correctly mapped.
- Map `product_name` -> `name` (Supabase requires `name`).

### Step 3: Verify `localPosOrderService.ts`
Ensure that `slug` and `name` are always generated for `order_items` before saving to the local DB, so they are ready for sync.

## 3. Execution

I will now update `BatchSender.ts` to include `pending_updates` in the exclusion list and verify the `product_name` -> `name` mapping is robust.
