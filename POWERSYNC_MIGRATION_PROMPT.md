# 🎯 PowerSync Migration - Complete AI Prompt

## 📋 Context & Background

You are tasked with converting a large-scale React/TypeScript POS (Point of Sale) application from a **custom SQLite sync system** to **PowerSync** - a modern offline-first sync framework.

### What is PowerSync?
- **PowerSync** is a production-ready sync framework for offline-first apps
- It syncs local SQLite database with Supabase (PostgreSQL) automatically
- Handles conflicts, offline operations, and real-time sync
- Uses WebAssembly SQLite in browsers, native SQLite in Tauri/Electron

### Current State
The application currently uses:
- ❌ **Old System**: Custom `sqliteDB` API from `@/lib/db/sqliteAPI`
- ❌ **Old Sync**: Custom sync engine in `@/lib/sync/` (SmartSyncEngine, OutboxManager, PushEngine, etc.)
- ❌ **Tauri Queries**: `tauriQuery`, `tauriExecute`, `tauriUpsert` from `@/lib/db/tauriSqlClient`

### Target State
- ✅ **New System**: PowerSync via `@/lib/powersync/PowerSyncService`
- ✅ **Auto Sync**: PowerSync handles all sync automatically
- ✅ **Simple API**: `powerSyncService.getAll()`, `powerSyncService.writeTransaction()`

---

## 🎯 Your Mission

Convert **42 files** that still import from the old system to use PowerSync.

### Files List (42 files total):

```
src/api/localPosOrderService.ts
src/components/navbar/sync/useSyncStats.ts
src/api/supplierService.ts
src/api/productSyncUtils.ts
src/hooks/useDatabaseInitialization.ts ✅ (ALREADY DONE)
src/hooks/useUnifiedPOSData.ts
src/lib/db/inventoryDB.ts
src/components/auth/LoginForm.tsx
src/hooks/usePOSAdvancedState.ts
src/pages/debug/SyncPanel.tsx
src/hooks/useDeltaSyncStatus.ts
src/components/sync/ConflictResolutionDialog.tsx
src/components/navbar/NavbarSyncIndicator.tsx
src/context/auth/utils/authStorage.ts
src/context/tenant/TenantEventHandlers.tsx
src/lib/notifications/offlineSyncBridge.ts
src/lib/notifications/offlineNotificationService.ts
src/hooks/useProductsForPrinting.ts
src/components/navbar/sync/OutboxDetailsPanel.tsx
src/lib/db/schema/migrations/v43_unify_schema.ts
src/lib/api/employees.ts
src/lib/subscription-cache.ts
src/context/AuthContext.tsx
src/services/ImageOfflineService.ts
src/lib/security/subscriptionAudit.ts
src/lib/notifications/orderNotificationService.ts
src/lib/notifications/customerNotificationService.ts
src/lib/license/licenseService.ts
src/lib/auth/sqliteStorage.ts

# IGNORE THESE (old backup files):
src/api/appInitializationService.old.ts
src/services/LocalProductSearchService.old.ts
src/services/DeltaWriteService.old.ts
src/lib/sync.old/* (entire directory)
src/api/syncCustomerDebts.old.ts
src/api/syncScheduler.old.ts
src/services/PrintHistoryService.old.ts
src/services/PrintSettingsService.old.ts
src/services/LocalAnalyticsService.old.ts
```

---

## 📖 PowerSync API Reference

### PowerSyncService Location
```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
```

### Available Methods

#### 1. **Initialization**
```typescript
// Initialize PowerSync (usually done once in app)
await powerSyncService.initialize();

// Check if ready
const db = powerSyncService.getDatabase();
```

#### 2. **Read Operations**
```typescript
// Get all rows
const products = await powerSyncService.getAll<Product>(
  'SELECT * FROM products WHERE organization_id = ?',
  [orgId]
);

// Get single row
const product = await powerSyncService.get<Product>(
  'SELECT * FROM products WHERE id = ?',
  [productId]
);

// Execute query (no return)
await powerSyncService.execute('DELETE FROM products WHERE id = ?', [id]);
```

#### 3. **Write Operations** (IMPORTANT!)
All writes (INSERT, UPDATE, DELETE) **MUST** use `writeTransaction`:

```typescript
await powerSyncService.writeTransaction(async () => {
  const db = powerSyncService.getDatabase();

  // INSERT
  await db.execute(
    'INSERT INTO products (id, name, price) VALUES (?, ?, ?)',
    [id, name, price]
  );

  // UPDATE
  await db.execute(
    'UPDATE products SET name = ? WHERE id = ?',
    [newName, id]
  );

  // DELETE
  await db.execute('DELETE FROM products WHERE id = ?', [id]);
});
```

#### 4. **Sync Status**
```typescript
// Get sync status
const status = powerSyncService.syncStatus;

// Force sync
await powerSyncService.forceSync();

// Check pending uploads
const hasPending = await powerSyncService.hasPendingUploads();
```

---

## 🔄 Migration Patterns

### Pattern 1: Simple Query Replacement

**BEFORE (sqliteDB):**
```typescript
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';

const result = await sqliteDB.query(
  'SELECT * FROM products WHERE organization_id = ?',
  [orgId]
);
const products = result.data || [];
```

**AFTER (PowerSync):**
```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const products = await powerSyncService.getAll<Product>(
  'SELECT * FROM products WHERE organization_id = ?',
  [orgId]
);
```

---

### Pattern 2: Tauri Query Replacement

**BEFORE (tauriQuery):**
```typescript
import { tauriQuery, tauriQueryOne } from '@/lib/db/tauriSqlClient';

const result = await tauriQuery(
  organizationId,
  'SELECT * FROM staff_members WHERE organization_id = ?',
  [organizationId]
);
const staff = result.data || [];
```

**AFTER (PowerSync):**
```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const staff = await powerSyncService.getAll<StaffMember>(
  'SELECT * FROM staff_members WHERE organization_id = ?',
  [organizationId]
);
```

---

### Pattern 3: Write Operations

**BEFORE (sqliteDB.upsert):**
```typescript
await sqliteDB.upsert('products', productData);
```

**AFTER (PowerSync):**
```typescript
await powerSyncService.writeTransaction(async () => {
  const db = powerSyncService.getDatabase();
  const keys = Object.keys(productData).filter(k => k !== 'id');
  const values = keys.map(k => productData[k]);

  // Try UPDATE first
  const updateSet = keys.map(k => `${k} = ?`).join(', ');
  const updateResult = await db.execute(
    `UPDATE products SET ${updateSet}, updated_at = ? WHERE id = ?`,
    [...values, new Date().toISOString(), productData.id]
  );

  // If no rows updated, INSERT
  if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
    const placeholders = keys.map(() => '?').join(', ');
    await db.execute(
      `INSERT INTO products (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
      [productData.id, ...values, new Date().toISOString(), new Date().toISOString()]
    );
  }
});
```

---

### Pattern 4: Sync-Related Code Removal

**BEFORE:**
```typescript
import { SmartSyncEngine } from '@/lib/sync/SmartSyncEngine';
import { OutboxManager } from '@/lib/sync/queue/OutboxManager';

// Trigger sync
await syncEngine.pushPendingChanges();

// Check outbox
const pending = await OutboxManager.getPendingCount();
```

**AFTER:**
```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// PowerSync syncs automatically! No need to trigger manually.
// But you can force sync for testing:
await powerSyncService.forceSync();

// Check pending
const hasPending = await powerSyncService.hasPendingUploads();
```

---

## 🎯 Specific File Instructions

### 1. **src/api/localPosOrderService.ts**
- Replace all `tauriQuery`, `tauriExecute`, `tauriUpsert` with PowerSync
- Pattern: Same as `localStaffService.ts` (which was already converted)
- Use `writeTransaction` for all writes

### 2. **src/components/navbar/sync/useSyncStats.ts**
- Remove dependency on `OutboxManager`
- Use `powerSyncService.hasPendingUploads()` instead
- Use `powerSyncService.syncStatus` for status

**Example:**
```typescript
// BEFORE
const pending = await OutboxManager.getPendingCount();

// AFTER
const hasPending = await powerSyncService.hasPendingUploads();
```

### 3. **src/components/navbar/NavbarSyncIndicator.tsx**
- Replace sync stats with PowerSync status
- Listen to `window` events: `powersync-status-changed`, `powersync-uploads-changed`

**Example:**
```typescript
useEffect(() => {
  const handleStatusChange = (e: CustomEvent) => {
    setSyncStatus(e.detail);
  };

  window.addEventListener('powersync-status-changed', handleStatusChange);
  return () => window.removeEventListener('powersync-status-changed', handleStatusChange);
}, []);
```

### 4. **src/hooks/useUnifiedPOSData.ts**
- Replace `sqliteDB.query` with `powerSyncService.getAll`
- Remove any sync-related logic
- PowerSync handles reactivity automatically

### 5. **src/hooks/usePOSAdvancedState.ts**
- Same as above
- Replace all database calls with PowerSync

### 6. **src/context/AuthContext.tsx**
- If it has database init code, use `powerSyncService.initialize()`
- Remove `sqliteDB` imports

### 7. **src/lib/db/inventoryDB.ts**
- Convert all functions to use PowerSync
- Pattern: Same as `localProductService.ts`

### 8. **src/pages/debug/SyncPanel.tsx**
- Replace OutboxManager with PowerSync status
- Show `powerSyncService.syncStatus`
- Add button to call `powerSyncService.forceSync()`

### 9. **Notification Services** (offlineSyncBridge, offlineNotificationService, etc.)
- If they use `sqliteDB` for storing notifications locally:
  - Replace with PowerSync
  - Use `writeTransaction` for writes

### 10. **src/lib/auth/sqliteStorage.ts**
- Rename to `powerSyncStorage.ts`
- Replace all `sqliteDB` calls with PowerSync

---

## 🚫 What to REMOVE/IGNORE

### Delete These Imports:
```typescript
// ❌ Remove these:
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { tauriQuery, tauriExecute, tauriUpsert } from '@/lib/db/tauriSqlClient';
import { SmartSyncEngine } from '@/lib/sync/SmartSyncEngine';
import { OutboxManager } from '@/lib/sync/queue/OutboxManager';
import { PushEngine } from '@/lib/sync/PushEngine';
import { PullEngine } from '@/lib/sync/PullEngine';
import { RealtimeEngine } from '@/lib/sync/RealtimeEngine';
import { SyncValidator } from '@/lib/sync/SyncValidator';
import { SyncDiagnostics } from '@/lib/sync/SyncDiagnostics';
import { SQLiteWriteQueue } from '@/lib/db/SQLiteWriteQueue';

// ✅ Replace with:
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
```

### Remove These Concepts:
- **Outbox**: PowerSync handles this internally
- **Pending Operations**: PowerSync tracks this (`pending_operation` field is for debugging only)
- **Manual Sync Triggers**: PowerSync syncs automatically
- **Conflict Resolution UI**: PowerSync handles conflicts (you can add UI later if needed)
- **Sync Metadata Tables**: PowerSync manages its own metadata

---

## ✅ Examples of Already Converted Files

These files are **already converted** and can serve as reference:

1. **src/api/appInitializationService.ts** ✅
   - Uses helper functions: `powerSyncQuery`, `powerSyncExecute`, `powerSyncUpsert`
   - Good pattern for complex services

2. **src/api/localProductService.ts** ✅
   - Clean PowerSync implementation
   - Shows `writeTransaction` usage

3. **src/api/localCustomerService.ts** ✅
4. **src/api/localWorkSessionService.ts** ✅
5. **src/api/localExpenseService.ts** ✅
6. **src/api/localRepairService.ts** ✅
7. **src/api/localSupplierService.ts** ✅
8. **src/api/localCategoryService.ts** ✅
9. **src/api/localCustomerDebtService.ts** ✅
10. **src/api/localLossDeclarationService.ts** ✅
11. **src/api/localStaffService.ts** ✅
12. **src/hooks/useDatabaseInitialization.ts** ✅

You can read these files to understand the pattern!

---

## 🎨 Special Cases & Edge Cases

### Case 1: Files with Complex Queries
If a file has very complex SQL with JOINs:
- PowerSync supports all SQLite features
- Just replace the API call, keep the SQL

### Case 2: Files that Check `isSQLiteAvailable()`
```typescript
// BEFORE
if (!isSQLiteAvailable()) {
  return null;
}

// AFTER - PowerSync is always available
// Just remove the check or replace with:
if (!powerSyncService.getDatabase()) {
  return null;
}
```

### Case 3: Tauri-Specific Code
```typescript
// BEFORE
import { invoke } from '@tauri-apps/api/tauri';
const result = await invoke('execute_sql', { sql, params });

// AFTER - Use PowerSync directly
const result = await powerSyncService.execute(sql, params);
```

### Case 4: React Hooks that Watch Database
If a hook uses `useEffect` to watch SQLite changes:
- PowerSync is reactive by default
- You can still use `useEffect` but may not need manual refresh

### Case 5: Offline Detection
```typescript
// BEFORE
import { isOnline } from '@/lib/connectivity';

// AFTER - PowerSync handles this
// But you can check:
const isConnected = powerSyncService.syncStatus?.connected || false;
```

---

## 🧪 Testing Guidelines

After converting each file:

1. **Check imports**: No imports from `@/lib/db/sqliteAPI` or `@/lib/sync/`
2. **Check writes**: All INSERT/UPDATE/DELETE use `writeTransaction`
3. **Check types**: Use TypeScript generics `<Type>` for type safety
4. **Test functionality**: Make sure the feature still works

---

## 📝 Comment Style

Add comments to converted code:
```typescript
// ⚡ استخدام PowerSync مباشرة
await powerSyncService.writeTransaction(async () => {
  // ...
});

// ⚡ PowerSync يزامن تلقائياً - لا حاجة لـ manual sync
```

Use the ⚡ emoji to mark PowerSync-related changes.

---

## 🚀 Execution Order (Recommended)

Convert files in this order for minimal breakage:

### Phase 1: Core Hooks (High Priority)
1. ✅ src/hooks/useDatabaseInitialization.ts (DONE)
2. src/hooks/useUnifiedPOSData.ts
3. src/hooks/usePOSAdvancedState.ts
4. src/hooks/useDeltaSyncStatus.ts

### Phase 2: API Services
5. src/api/localPosOrderService.ts (big file, important)
6. src/api/supplierService.ts
7. src/api/productSyncUtils.ts
8. src/lib/db/inventoryDB.ts
9. src/lib/api/employees.ts

### Phase 3: UI Components
10. src/components/navbar/sync/useSyncStats.ts
11. src/components/navbar/NavbarSyncIndicator.tsx
12. src/components/navbar/sync/OutboxDetailsPanel.tsx
13. src/pages/debug/SyncPanel.tsx
14. src/components/auth/LoginForm.tsx
15. src/components/sync/ConflictResolutionDialog.tsx

### Phase 4: Contexts
16. src/context/AuthContext.tsx
17. src/context/tenant/TenantEventHandlers.tsx
18. src/context/auth/utils/authStorage.ts

### Phase 5: Services
19. src/services/ImageOfflineService.ts
20. src/lib/notifications/offlineSyncBridge.ts
21. src/lib/notifications/offlineNotificationService.ts
22. src/lib/notifications/orderNotificationService.ts
23. src/lib/notifications/customerNotificationService.ts

### Phase 6: Utilities & Misc
24. src/lib/subscription-cache.ts
25. src/lib/security/subscriptionAudit.ts
26. src/lib/license/licenseService.ts
27. src/lib/auth/sqliteStorage.ts
28. src/lib/db/schema/migrations/v43_unify_schema.ts
29. src/hooks/useProductsForPrinting.ts

---

## 🎯 Success Criteria

You'll know you're done when:

1. ✅ No files import from `@/lib/db/sqliteAPI`
2. ✅ No files import from `@/lib/sync/`
3. ✅ No files import from `@/lib/db/tauriSqlClient`
4. ✅ App runs without 404 errors for missing modules
5. ✅ All features work as before

---

## 📚 PowerSync Schema Reference

The database schema is defined in `src/lib/powersync/PowerSyncSchema.ts`.

Tables include:
- `products`, `product_categories`, `product_subcategories`
- `customers`, `addresses`
- `orders`, `order_items`, `order_payments`
- `staff_members`, `staff_pins`, `staff_work_sessions`
- `suppliers`, `supplier_purchases`, `supplier_payments`
- `expenses`, `expense_categories`
- `losses`, `loss_items`
- `returns`, `return_items`
- `repairs`, `repair_items`
- And many more...

All tables have:
- `id` (TEXT, primary key)
- `organization_id` (TEXT)
- `created_at`, `updated_at` (TEXT, ISO timestamps)
- Sync fields: `synced`, `sync_status`, `pending_operation`, `local_updated_at`

---

## 🆘 Common Errors & Solutions

### Error: "PowerSync not initialized"
**Solution**: Make sure `powerSyncService.initialize()` is called before any queries

### Error: "Cannot read property 'execute' of null"
**Solution**: Wrap in `writeTransaction` or check if database is ready

### Error: "404 Not Found: sqliteAPI.ts"
**Solution**: File still imports from old system - replace with PowerSync

### Error: "ps_crud table not found"
**Solution**: This is PowerSync's internal table - should work automatically if schema is correct

---

## 💡 Tips & Tricks

1. **Use Find & Replace**: Search for `from '@/lib/db/sqliteAPI'` and replace
2. **Copy Patterns**: Look at already-converted files for patterns
3. **Test Early**: Convert a few files, test, then continue
4. **Comment Out**: If unsure about a function, comment it out temporarily
5. **Keep Console Open**: Watch for PowerSync logs: `[PowerSync]`, `[PowerSyncService]`

---

## 📞 Need Help?

If you encounter a pattern not covered here:
1. Check the already-converted files (11 files done)
2. Look at PowerSyncService.ts implementation
3. Refer to PowerSync docs: https://docs.powersync.com

---

## 🎉 Final Note

**PowerSync is simpler than the old system!** Don't overthink it:
- Read = `getAll()` or `get()`
- Write = `writeTransaction(() => db.execute())`
- That's 90% of the work!

Good luck! You've got this! 🚀
