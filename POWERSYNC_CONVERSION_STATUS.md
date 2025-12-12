# حالة تحويل PowerSync - Conversion Status

## ✅ ما تم إنجازه (Completed)

### 1. تحويل appInitializationService.ts ✅
- تم استبدال جميع استدعاءات `sqliteDB` بـ `powerSyncService`
- تم استبدال `isSQLiteAvailable()` بـ `isPowerSyncReady()`
- تم إنشاء helper functions للتوافق مع PowerSync:
  - `powerSyncQuery()` - بديل `sqliteDB.query()`
  - `powerSyncQueryOne()` - بديل `sqliteDB.queryOne()`
  - `powerSyncExecute()` - بديل `sqliteDB.execute()`
  - `powerSyncUpsert()` - بديل `sqliteDB.upsert()`
  - `setAppInitCache()` - بديل `sqliteDB.setAppInitCache()`
  - `getAppInitCacheById()` - بديل `sqliteDB.getAppInitCacheById()`
  - `getLatestAppInitCacheByUserOrg()` - بديل `sqliteDB.getLatestAppInitCacheByUserOrg()`

### 2. إعادة تسمية الملفات القديمة ✅
تم إعادة تسمية الملفات التالية إلى `.old`:

#### النظام القديم (src/lib/sync/)
- ✅ `src/lib/sync/` → `src/lib/sync.old/`

#### Services القديمة
- ✅ `src/services/DeltaWriteService.ts` → `DeltaWriteService.old.ts`
- ✅ `src/services/LocalProductSearchService.ts` → `LocalProductSearchService.old.ts`
- ✅ `src/services/AdvancedInventoryService.ts` → `AdvancedInventoryService.old.ts`
- ✅ `src/services/LocalAnalyticsService.ts` → `LocalAnalyticsService.old.ts`
- ✅ `src/services/PrintHistoryService.ts` → `PrintHistoryService.old.ts`
- ✅ `src/services/PrintSettingsService.ts` → `PrintSettingsService.old.ts`

#### API القديمة
- ✅ `src/api/syncScheduler.ts` → `syncScheduler.old.ts`
- ✅ `src/api/syncQueueHelper.ts` → `syncQueueHelper.old.ts`
- ✅ `src/api/syncMetadataService.ts` → `syncMetadataService.old.ts`
- ✅ `src/api/syncCustomerDebts.ts` → `syncCustomerDebts.old.ts`
- ✅ `src/api/syncRepairs.ts` → `syncRepairs.old.ts`
- ✅ `src/api/syncExpenses.ts` → `syncExpenses.old.ts`
- ✅ `src/api/comprehensiveSyncService.ts` → `comprehensiveSyncService.old.ts`

#### Database API القديم
- ✅ `src/lib/db/sqliteAPI.ts` → `sqliteAPI.old.ts`

---

## 🔄 ما يحتاج إلى التحويل (Pending)

### 1. ملفات local*Service.ts (20 ملف)
هذه الملفات تستخدم `deltaWriteService` الذي تم إعادة تسميته إلى `.old`:

- [ ] `src/api/localProductService.ts` - يستخدم `deltaWriteService` (18 استدعاء)
- [ ] `src/api/localCustomerService.ts` - يستخدم `deltaWriteService`
- [ ] `src/api/localWorkSessionService.ts` - يستخدم `deltaWriteService` (21 استدعاء)
- [ ] `src/api/localExpenseService.ts`
- [ ] `src/api/localRepairService.ts`
- [ ] `src/api/localLossDeclarationService.ts`
- [ ] `src/api/localCustomerDebtService.ts`
- [ ] `src/api/localSupplierService.ts`
- [ ] `src/api/localCategoryService.ts`
- [ ] `src/api/localSubscriptionTransactionService.ts`
- [ ] `src/api/localStaffService.ts`
- [ ] `src/api/localRepairLocationsService.ts`
- [ ] `src/api/localProductReturnService.ts`
- [ ] `src/api/localPosSettingsService.ts`
- [ ] `src/api/localInvoiceService.ts`
- [ ] `src/api/localExpenseCategoryService.ts`
- [ ] `src/api/localStoreSettingsService.ts`
- [ ] `src/api/localSubscriptionService.ts`
- [ ] `src/api/localPosOrderService.ts` (قد يكون محولاً بالفعل)

### 2. Contexts
- [ ] `src/context/WorkSessionContext.tsx` - يعتمد على `localWorkSessionService`
- [ ] `src/context/SuperUnifiedDataContext.tsx`

### 3. ملفات أخرى تستخدم sqliteAPI
- [ ] `src/hooks/useDatabaseInitialization.ts`
- [ ] `src/lib/db/dbAdapter.ts`
- [ ] `src/lib/db/inventoryDB.ts`
- [ ] `src/components/auth/LoginForm.tsx`
- [ ] `src/hooks/useUnifiedPOSData.ts`
- [ ] `src/hooks/usePOSAdvancedState.ts`
- [ ] `src/api/supplierService.ts`
- [ ] `src/context/auth/utils/authStorage.ts`
- [ ] `src/context/tenant/TenantEventHandlers.tsx`
- [ ] `src/lib/notifications/offlineSyncBridge.ts`
- [ ] `src/lib/notifications/offlineNotificationService.ts`
- [ ] `src/hooks/useProductsForPrinting.ts`

### 4. UI Components
- [ ] `src/components/navbar/NavbarSyncIndicator.tsx`
- [ ] `src/components/navbar/sync/useSyncStats.ts`
- [ ] `src/components/navbar/sync/useSyncActions.ts`
- [ ] `src/components/navbar/sync/OutboxDetailsPanel.tsx`
- [ ] `src/components/sync/ConflictResolutionDialog.tsx`

---

## 📝 استراتيجية التحويل

### النمط المتبع للتحويل:

#### 1. استبدال deltaWriteService بـ PowerSync:

```typescript
// OLD:
import { deltaWriteService } from '@/services/DeltaWriteService';
const result = await deltaWriteService.create('products', productData, orgId);
const product = await deltaWriteService.get('products', productId);
const products = await deltaWriteService.getAll('products', orgId);
await deltaWriteService.update('products', productId, updates);
await deltaWriteService.delete('products', productId);

// NEW:
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// CREATE
await powerSyncService.writeTransaction(async () => {
  const db = powerSyncService.getDatabase();
  await db.execute(
    'INSERT INTO products (id, name, ...) VALUES (?, ?, ...)',
    [id, name, ...]
  );
});

// GET
const product = await powerSyncService.get('SELECT * FROM products WHERE id = ?', [productId]);

// GET ALL
const products = await powerSyncService.getAll('SELECT * FROM products WHERE organization_id = ?', [orgId]);

// UPDATE
await powerSyncService.writeTransaction(async () => {
  const db = powerSyncService.getDatabase();
  await db.execute(
    'UPDATE products SET name = ?, updated_at = ? WHERE id = ?',
    [name, new Date().toISOString(), productId]
  );
});

// DELETE
await powerSyncService.writeTransaction(async () => {
  const db = powerSyncService.getDatabase();
  await db.execute('DELETE FROM products WHERE id = ?', [productId]);
});
```

#### 2. استبدال sqliteDB بـ PowerSync:

```typescript
// OLD:
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
if (!isSQLiteAvailable()) return;
const result = await sqliteDB.query('SELECT * FROM table', []);
await sqliteDB.execute('UPDATE table SET ...', []);
await sqliteDB.upsert('table', data);

// NEW:
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const isPowerSyncReady = () => {
  try {
    return !!powerSyncService.getDatabase();
  } catch {
    return false;
  }
};

if (!isPowerSyncReady()) return;
const result = await powerSyncService.getAll('SELECT * FROM table', []);
await powerSyncService.execute('UPDATE table SET ...', []);
await powerSyncService.writeTransaction(async () => {
  const db = powerSyncService.getDatabase();
  // INSERT or UPDATE logic
});
```

---

## ⚠️ ملاحظات مهمة

1. **PowerSync لا يحتاج تهيئة صريحة لكل مؤسسة** - يتم تهيئته مرة واحدة عند بدء التطبيق
2. **المزامنة تلقائية** - لا حاجة لإدارة Outbox أو PushEngine/PullEngine
3. **writeTransaction** - يجب استخدامه لجميع عمليات الكتابة (INSERT, UPDATE, DELETE)
4. **الاستعلامات** - استخدام `getAll()` للاستعلامات و `get()` لجلب سجل واحد
5. **لا حاجة لحقول المزامنة اليدوية** - PowerSync يدير `_synced`, `pending_operation` تلقائياً

---

## 🚀 الخطوات التالية الموصى بها

1. **إنشاء PowerSync Adapter** - ملف مساعد يوفر واجهة مشابهة لـ `deltaWriteService` لسهولة التحويل
2. **تحويل local*Service files** - البدء بالملفات الأكثر استخداماً:
   - `localProductService.ts`
   - `localCustomerService.ts`
   - `localWorkSessionService.ts`
3. **تحويل Contexts** - بعد تحويل الـ services
4. **تحويل UI Components** - استخدام `usePowerSyncStatus()` بدلاً من `useSyncStats()`
5. **اختبار شامل** - التأكد من عمل جميع الوظائف بعد التحويل

---

**تاريخ التحديث:** $(date)
**الحالة:** 🔄 قيد التنفيذ





























