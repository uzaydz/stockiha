# Sync Fix Verification - Round 3

## Issues Resolved
1.  **`orders` Error:** `Could not find the 'payload' column...`
    - **Fix:** Added `payload` to the exclusion list in `BatchSender.ts`.
2.  **`order_items` Error:** `null value in column "name"...`
    - **Fix:** Added column mapping `product_name` -> `name` in `BatchSender.ts`.

## Verification Steps

1.  **Restart the Application**:
    - Close and reopen the app to apply the code changes.

2.  **Monitor Logs**:
    - Open the developer console.
    - Watch for `[BatchSender]` logs.

3.  **Test New Order**:
    - **Go Offline** (or simulate offline mode).
    - Create a new POS order.
    - **Go Online**.
    - Watch the sync process.
    - You should see:
        ```
        [BatchSender] 📤 INSERT orders/...
        [BatchSender] ✅ Success: INSERT orders/...
        [BatchSender] 📤 INSERT order_items/...
        [BatchSender] ✅ Success: INSERT order_items/...
        ```

4.  **Confirm Success**:
    - Ensure no `400 Bad Request` errors appear.
    - Verify that the Sync Indicator shows all items synced.
