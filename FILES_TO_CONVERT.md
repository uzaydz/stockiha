# 📋 Files to Convert - Detailed Checklist

## ✅ Already Converted (12 files)

These files are DONE and can be used as reference:

1. ✅ `src/api/appInitializationService.ts`
2. ✅ `src/api/localProductService.ts`
3. ✅ `src/api/localCustomerService.ts`
4. ✅ `src/api/localWorkSessionService.ts`
5. ✅ `src/api/localExpenseService.ts`
6. ✅ `src/api/localRepairService.ts`
7. ✅ `src/api/localSupplierService.ts`
8. ✅ `src/api/localCategoryService.ts`
9. ✅ `src/api/localCustomerDebtService.ts`
10. ✅ `src/api/localLossDeclarationService.ts`
11. ✅ `src/api/localStaffService.ts`
12. ✅ `src/hooks/useDatabaseInitialization.ts`

---

## 🔴 HIGH PRIORITY - Convert These First (10 files)

These files are critical for app startup and basic functionality:

### 1. `src/api/localPosOrderService.ts`
**Why Critical**: Core POS functionality - orders, payments, cart
**Current State**: Uses `tauriQuery`, `tauriExecute`, `tauriUpsert`
**Pattern to Follow**: `localStaffService.ts` (same Tauri API pattern)
**Estimated Complexity**: HIGH (large file, ~800 lines)

**Key Changes Needed**:
```typescript
// Replace all:
import { tauriQuery, tauriExecute, tauriUpsert, tauriDelete } from '@/lib/db/tauriSqlClient';

// With:
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// Replace patterns:
tauriQuery(orgId, sql, params) → powerSyncService.getAll(sql, params)
tauriQueryOne(orgId, sql, params) → powerSyncService.get(sql, params)
tauriExecute(orgId, sql, params) → powerSyncService.writeTransaction(() => db.execute(sql, params))
tauriUpsert(orgId, table, data) → powerSyncService.writeTransaction(() => { UPDATE then INSERT })
```

---

### 2. `src/hooks/useUnifiedPOSData.ts`
**Why Critical**: Provides POS data to multiple components
**Current State**: Uses `sqliteDB.query`
**Pattern to Follow**: `useDatabaseInitialization.ts`
**Estimated Complexity**: MEDIUM

**Key Changes**:
```typescript
// BEFORE
import { sqliteDB } from '@/lib/db/sqliteAPI';
const result = await sqliteDB.query(sql, params);
const data = result.data || [];

// AFTER
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
const data = await powerSyncService.getAll(sql, params);
```

---

### 3. `src/hooks/usePOSAdvancedState.ts`
**Why Critical**: Advanced POS features
**Current State**: Uses `sqliteDB`
**Pattern to Follow**: Same as `useUnifiedPOSData.ts`
**Estimated Complexity**: MEDIUM

---

### 4. `src/context/AuthContext.tsx`
**Why Critical**: Authentication and initialization
**Current State**: May have database init code
**Pattern to Follow**: `useDatabaseInitialization.ts`
**Estimated Complexity**: MEDIUM

**Look For**:
- Database initialization calls
- `isSQLiteAvailable()` checks
- Replace with `powerSyncService.initialize()`

---

### 5. `src/components/navbar/sync/useSyncStats.ts`
**Why Critical**: Shows sync status in navbar
**Current State**: Uses `OutboxManager`
**Pattern to Follow**: Create new implementation
**Estimated Complexity**: LOW

**Key Changes**:
```typescript
// BEFORE
import { OutboxManager } from '@/lib/sync/queue/OutboxManager';
const pending = await OutboxManager.getPendingCount();

// AFTER
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
const hasPending = await powerSyncService.hasPendingUploads();
const status = powerSyncService.syncStatus;
```

---

### 6. `src/components/navbar/NavbarSyncIndicator.tsx`
**Why Critical**: Visual sync indicator
**Current State**: Uses custom sync stats
**Pattern to Follow**: Use PowerSync events
**Estimated Complexity**: MEDIUM

**Implementation**:
```typescript
useEffect(() => {
  const handleStatusChange = (e: CustomEvent) => {
    setSyncStatus(e.detail);
  };

  window.addEventListener('powersync-status-changed', handleStatusChange);
  window.addEventListener('powersync-uploads-changed', handleStatusChange);

  return () => {
    window.removeEventListener('powersync-status-changed', handleStatusChange);
    window.removeEventListener('powersync-uploads-changed', handleStatusChange);
  };
}, []);
```

---

### 7. `src/lib/db/inventoryDB.ts`
**Why Critical**: Inventory management
**Current State**: Uses `sqliteDB`
**Pattern to Follow**: `localProductService.ts`
**Estimated Complexity**: HIGH

---

### 8. `src/api/supplierService.ts`
**Why Critical**: Supplier management
**Current State**: Imports from `localSupplierService` (already converted!)
**Pattern to Follow**: Just remove old comments
**Estimated Complexity**: VERY LOW

**Quick Fix**:
```typescript
// Just remove these commented lines:
// ⚡ تم إزالة isSQLiteAvailable - استخدام PowerSync الآن
// import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';
```

---

### 9. `src/api/productSyncUtils.ts`
**Why Critical**: Product sync utilities
**Current State**: Uses `sqliteDB` and `powerSyncService` (partially converted!)
**Pattern to Follow**: Complete the conversion
**Estimated Complexity**: LOW

**Already Has**:
```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
```

**Just Remove**:
```typescript
// ⚡ تم إزالة sqliteDB و isSQLiteAvailable - استخدام PowerSync الآن
// import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
```

---

### 10. `src/hooks/useDeltaSyncStatus.ts`
**Why Critical**: Shows delta sync status
**Current State**: Uses old sync system
**Pattern to Follow**: Replace with PowerSync status
**Estimated Complexity**: MEDIUM

**New Implementation**:
```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export const useDeltaSyncStatus = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(powerSyncService.syncStatus);
    };

    window.addEventListener('powersync-status-changed', updateStatus);
    updateStatus(); // Initial

    return () => window.removeEventListener('powersync-status-changed', updateStatus);
  }, []);

  return status;
};
```

---

## 🟡 MEDIUM PRIORITY - Convert After High Priority (12 files)

### 11. `src/components/auth/LoginForm.tsx`
**Why**: May have DB checks
**Complexity**: LOW
**Action**: Remove `isSQLiteAvailable()` checks

---

### 12. `src/pages/debug/SyncPanel.tsx`
**Why**: Debug panel for sync
**Complexity**: MEDIUM
**Action**: Replace OutboxManager with PowerSync stats

---

### 13. `src/components/sync/ConflictResolutionDialog.tsx`
**Why**: Conflict resolution UI
**Complexity**: LOW
**Action**: May not be needed - PowerSync handles conflicts automatically
**Consider**: Comment out or simplify

---

### 14. `src/components/navbar/sync/OutboxDetailsPanel.tsx`
**Why**: Shows outbox details
**Complexity**: MEDIUM
**Action**: Replace with PowerSync pending uploads view

---

### 15. `src/context/tenant/TenantEventHandlers.tsx`
**Why**: Tenant-specific events
**Complexity**: MEDIUM
**Action**: Replace any sqliteDB calls

---

### 16. `src/context/auth/utils/authStorage.ts`
**Why**: Auth storage
**Complexity**: LOW
**Action**: Replace sqliteDB with PowerSync for storing auth data

---

### 17. `src/lib/api/employees.ts`
**Why**: Employee API
**Complexity**: LOW
**Action**: Replace sqliteDB calls

---

### 18. `src/services/ImageOfflineService.ts`
**Why**: Offline image handling
**Complexity**: MEDIUM
**Action**: Replace sqliteDB for image metadata storage

---

### 19. `src/lib/notifications/offlineSyncBridge.ts`
**Why**: Notification sync bridge
**Complexity**: MEDIUM
**Action**: Replace with PowerSync-based sync

---

### 20. `src/lib/notifications/offlineNotificationService.ts`
**Why**: Offline notifications
**Complexity**: MEDIUM
**Action**: Replace sqliteDB calls

---

### 21. `src/lib/notifications/orderNotificationService.ts`
**Why**: Order notifications
**Complexity**: LOW
**Action**: Replace sqliteDB calls

---

### 22. `src/lib/notifications/customerNotificationService.ts`
**Why**: Customer notifications
**Complexity**: LOW
**Action**: Replace sqliteDB calls

---

## 🟢 LOW PRIORITY - Convert Last (7 files)

### 23. `src/lib/subscription-cache.ts`
**Why**: Subscription caching
**Complexity**: LOW

---

### 24. `src/lib/security/subscriptionAudit.ts`
**Why**: Subscription audit
**Complexity**: LOW

---

### 25. `src/lib/license/licenseService.ts`
**Why**: License management
**Complexity**: LOW

---

### 26. `src/lib/auth/sqliteStorage.ts`
**Why**: Auth storage (duplicate of #16?)
**Complexity**: LOW
**Action**: Rename to `powerSyncStorage.ts`

---

### 27. `src/lib/db/schema/migrations/v43_unify_schema.ts`
**Why**: Old migration
**Complexity**: N/A
**Action**: **SKIP** - This is an old migration, not needed with PowerSync

---

### 28. `src/hooks/useProductsForPrinting.ts`
**Why**: Product printing
**Complexity**: LOW

---

### 29. Any remaining files
**Check**: Run grep again after converting above files

---

## 🗑️ Files to DELETE/IGNORE

**DO NOT CONVERT** - These are old backups:

```
src/api/appInitializationService.old.ts
src/services/LocalProductSearchService.old.ts
src/services/DeltaWriteService.old.ts
src/api/syncCustomerDebts.old.ts
src/api/syncScheduler.old.ts
src/services/PrintHistoryService.old.ts
src/services/PrintSettingsService.old.ts
src/services/LocalAnalyticsService.old.ts
src/lib/sync.old/* (entire directory - can be deleted later)
```

---

## 📊 Progress Tracking

**Total Files**: 42
**Already Converted**: 12 ✅
**Remaining**: 30 ⏳

### By Priority:
- 🔴 High Priority: 10 files
- 🟡 Medium Priority: 12 files
- 🟢 Low Priority: 7 files
- 🗑️ To Delete/Ignore: ~13 files

---

## 🎯 Recommended Conversion Order

1. Start with **supplierService.ts** and **productSyncUtils.ts** (easiest - just remove comments)
2. Then **useSyncStats.ts** and **NavbarSyncIndicator.tsx** (UI feedback)
3. Then **useUnifiedPOSData.ts** and **usePOSAdvancedState.ts** (data providers)
4. Then **localPosOrderService.ts** (biggest file, but critical)
5. Then **AuthContext.tsx** (initialization)
6. Then rest of Medium Priority
7. Finally Low Priority

---

## ✅ How to Mark as Complete

After converting each file:
1. Remove all imports from `@/lib/db/sqliteAPI`, `@/lib/sync/`, `@/lib/db/tauriSqlClient`
2. Ensure all writes use `writeTransaction`
3. Test the feature
4. Mark with ✅ in this document

---

## 🆘 If You Get Stuck

1. Check already-converted files for similar patterns
2. Read `POWERSYNC_MIGRATION_PROMPT.md` for detailed patterns
3. Look at `PowerSyncService.ts` implementation
4. Test incrementally - don't convert everything at once

---

**Good luck! Remember: PowerSync is simpler than the old system!** 🚀
