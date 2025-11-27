# Sync Fix Verification

## Issue
Synchronization was failing with `400 Bad Request` errors because the application was trying to send local-only columns to Supabase:
- `orders` table: `local_order_number` was being sent but doesn't exist on the server.
- `order_items` table: `updated_at` was being sent but doesn't exist on the server.
- `order_items` table: `unit_price` was being incorrectly renamed to `price`.

## Fix Applied
Modified `src/lib/sync/delta/BatchSender.ts` to:
1.  Add `local_order_number` and `local_order_number_str` to the exclusion list for `orders`.
2.  Add `updated_at` to the exclusion list for `order_items`.
3.  Remove incorrect column mappings for `order_items` so `unit_price` and `total_price` are sent correctly.

## Verification Steps

1.  **Restart the Application**:
    - Fully close and reopen the application to load the updated `BatchSender` configuration.

2.  **Monitor Logs**:
    - Open the developer console.
    - Watch for `[BatchSender]` logs.

3.  **Test Synchronization**:
    - If you have pending orders (failed previously), the system might try to resend them.
    - Create a **new** POS order to verify that new data syncs correctly.
    - You should see:
        ```
        [BatchSender] 📤 INSERT orders/...
        [BatchSender] ✅ Success: INSERT orders/...
        [BatchSender] 📤 INSERT order_items/...
        [BatchSender] ✅ Success: INSERT order_items/...
        ```

4.  **Confirm Success**:
    - Ensure no `400 Bad Request` errors appear for `orders` or `order_items`.
    - The Sync Indicator in the navbar should eventually show all items synced.
