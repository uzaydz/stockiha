# 🎯 PowerSync Conversion Plan - خطة تحويل شاملة

## 📊 تحليل النظام الحالي

### ملفات تستخدم النظام القديم (sqliteDB):

1. **src/api/appInitializationService.ts** (946 سطر) - ⭐ أولوية قصوى
2. **src/api/local*Service.ts** files (~20 ملف):
   - localPosOrderService.ts
   - localProductService.ts
   - localCustomerService.ts
   - localWorkSessionService.ts
   - localExpenseService.ts
   - localRepairService.ts
   - localLossDeclarationService.ts
   - localCustomerDebtService.ts
   - localSupplierService.ts
   - localCategoryService.ts
   - والمزيد...

3. **src/context/** files:
   - POSDataContext.tsx ✅ (تم تحويله)
   - POSOrdersDataContext.tsx ✅ (تم تحويله)
   - WorkSessionContext.tsx ⚠️ (يحتاج تحويل)
   - SuperUnifiedDataContext.tsx ⚠️ (يحتاج تحويل)

4. **src/services/** files:
   - DeltaWriteService.ts
   - LocalProductSearchService.ts
   - AdvancedInventoryService.ts
   - LocalAnalyticsService.ts
   - PrintHistoryService.ts
   - PrintSettingsService.ts

5. **src/lib/sync/** - النظام القديم الكامل (للحذف):
   - SmartSyncEngine.ts
   - SyncManager.ts
   - PullEngine.ts
   - PushEngine.ts
   - OutboxManager.ts
   - ConflictResolver.ts
   - RealtimeEngine.ts
   - SyncValidator.ts
   - SyncDiagnostics.ts
   - SyncTracker.ts
   - queue/OutboxManager.ts
   - delta/* (جميع ملفات Delta Sync)

6. **src/api/** - ملفات المزامنة القديمة:
   - syncScheduler.ts
   - syncQueueHelper.ts
   - syncMetadataService.ts
   - syncCustomerDebts.ts
   - syncRepairs.ts
   - syncExpenses.ts
   - comprehensiveSyncService.ts

7. **src/components/** - مكونات واجهة المزامنة:
   - navbar/NavbarSyncIndicator.tsx
   - navbar/sync/useSyncStats.ts
   - navbar/sync/useSyncActions.ts
   - navbar/sync/OutboxDetailsPanel.tsx
   - sync/ConflictResolutionDialog.tsx

---

## 🚀 استراتيجية التحويل

### المرحلة 1: تبسيط النظام ✅

**ما تم إنجازه:**
- ✅ إنشاء PowerSync Schema (31 جدول)
- ✅ إنشاء SupabaseConnector
- ✅ إنشاء PowerSyncService
- ✅ إنشاء Hooks (usePowerSync, usePowerSyncQuery, usePowerSyncStatus)
- ✅ إنشاء PowerSyncProvider
- ✅ تحويل POSDataContext
- ✅ تحويل POSOrdersDataContext
- ✅ تحديث AppComponents.tsx
- ✅ إضافة PowerSync workers إلى public/
- ✅ تحديث vite.config.ts

### المرحلة 2: تحويل الـ Services (الحالية) 🔄

#### 2.1 استراتيجية تحويل appInitializationService.ts

**المشكلة**: الملف يستخدم `sqliteDB` في 50+ موضع

**الحل البسيط**:
```typescript
// بدلاً من:
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
const result = await sqliteDB.query('SELECT * FROM products', []);

// نستخدم:
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
const result = await powerSyncService.getAll('SELECT * FROM products');
```

**التغييرات المطلوبة**:
1. استبدال `sqliteDB.query()` بـ `powerSyncService.getAll()`
2. استبدال `sqliteDB.execute()` بـ `powerSyncService.execute()`
3. استبدال `sqliteDB.upsert()` بـ `powerSyncService.writeTransaction()`
4. إزالة `sqliteDB.initialize()` - PowerSync يُهيأ تلقائياً
5. إزالة فحص `isSQLiteAvailable()` - PowerSync دائماً متاح

#### 2.2 تحويل local*Service.ts files

**النمط المتبع**:
```typescript
// OLD:
export const getLocalProducts = async (organizationId: string) => {
  const result = await sqliteDB.query(
    'SELECT * FROM products WHERE organization_id = ?',
    [organizationId]
  );
  return result.data || [];
};

// NEW:
export const getLocalProducts = async (organizationId: string) => {
  return await powerSyncService.getAll(
    'SELECT * FROM products WHERE organization_id = ?',
    [organizationId]
  );
};
```

**الملفات للتحويل** (20 ملف):
- [x] localPosOrderService.ts
- [ ] localProductService.ts
- [ ] localCustomerService.ts
- [ ] localWorkSessionService.ts
- [ ] localExpenseService.ts
- [ ] localRepairService.ts
- [ ] localLossDeclarationService.ts
- [ ] localCustomerDebtService.ts
- [ ] localSupplierService.ts
- [ ] localCategoryService.ts
- [ ] localSubscriptionTransactionService.ts
- [ ] localStaffService.ts
- [ ] localRepairLocationsService.ts
- [ ] localProductReturnService.ts
- [ ] localPosSettingsService.ts
- [ ] localInvoiceService.ts
- [ ] localExpenseCategoryService.ts
- [ ] localStoreSettingsService.ts
- [ ] localSubscriptionService.ts

### المرحلة 3: تحويل Contexts 🔄

#### 3.1 WorkSessionContext

```typescript
// OLD:
const sessions = await sqliteDB.query(
  'SELECT * FROM staff_work_sessions WHERE organization_id = ?',
  [organizationId]
);

// NEW:
const sessions = await powerSyncService.getAll(
  'SELECT * FROM staff_work_sessions WHERE organization_id = ?',
  [organizationId]
);
```

#### 3.2 SuperUnifiedDataContext

نفس النمط - استبدال `sqliteDB` بـ `powerSyncService`

### المرحلة 4: تحديث Services الأخرى

#### 4.1 DeltaWriteService

**الحل**: إزالته بالكامل! PowerSync يقوم بكل شيء تلقائياً:

```typescript
// OLD (DeltaWriteService):
await deltaWriteService.write('products', productData);
// - يضيف إلى Outbox
// - يحدد pending_operation
// - يُزامن لاحقاً

// NEW (PowerSync):
await powerSyncService.writeTransaction(async () => {
  await db.execute(
    'INSERT INTO products (...) VALUES (...)',
    [values]
  );
});
// PowerSync يرفع تلقائياً إلى Supabase! ✨
```

#### 4.2 LocalProductSearchService

```typescript
// بسيط - استبدال sqliteDB بـ powerSyncService
const results = await powerSyncService.getAll(
  'SELECT * FROM products WHERE name LIKE ?',
  [`%${searchTerm}%`]
);
```

### المرحلة 5: حذف النظام القديم 🗑️

#### 5.1 ملفات للحذف (50+ ملف):

```bash
# حذف نظام المزامنة القديم
rm -rf src/lib/sync/
rm src/api/syncScheduler.ts
rm src/api/syncQueueHelper.ts
rm src/api/syncMetadataService.ts
rm src/api/syncCustomerDebts.ts
rm src/api/syncRepairs.ts
rm src/api/syncExpenses.ts
rm src/api/comprehensiveSyncService.ts
rm src/services/DeltaWriteService.ts

# حذف ملفات backup القديمة
rm src/context/POSDataContext.old.tsx
rm src/context/POSOrdersDataContext.old.tsx
```

#### 5.2 ملفات للتحديث (إزالة الاستيرادات):

```typescript
// في جميع الملفات التي تستورد من lib/sync:
// OLD:
import { SmartSyncEngine } from '@/lib/sync/SmartSyncEngine';
import { OutboxManager } from '@/lib/sync/queue/OutboxManager';

// DELETE THESE IMPORTS - لا حاجة لها مع PowerSync
```

### المرحلة 6: تحديث UI Components

#### 6.1 NavbarSyncIndicator

```typescript
// OLD:
const { syncStatus } = useSyncStats();
<span>{syncStatus.pendingUploads} pending</span>

// NEW:
const { isSyncing, pendingUploads } = usePowerSyncStatus();
<span>{pendingUploads} pending</span>
```

#### 6.2 OutboxDetailsPanel

**الحل**: إزالته أو تبسيطه - PowerSync لا يحتاج Outbox UI معقد

---

## 📝 خطة التنفيذ المرحلية

### Phase 1: Core Services (اليوم) ✅
- [x] تحديث vite.config.ts
- [x] نسخ PowerSync workers
- [in_progress] تحويل appInitializationService.ts
- [ ] اختبار التطبيق

### Phase 2: Local Services (الخطوة التالية)
- [ ] تحويل جميع local*Service.ts files (20 ملف)
- [ ] اختبار كل service بعد التحويل

### Phase 3: Contexts
- [ ] تحويل WorkSessionContext
- [ ] تحويل SuperUnifiedDataContext
- [ ] اختبار الـ contexts

### Phase 4: Advanced Services
- [ ] حذف DeltaWriteService (استبداله بـ PowerSync)
- [ ] تحديث LocalProductSearchService
- [ ] تحديث AdvancedInventoryService
- [ ] تحديث LocalAnalyticsService

### Phase 5: UI Components
- [ ] تحديث NavbarSyncIndicator
- [ ] تبسيط/حذف OutboxDetailsPanel
- [ ] تحديث useSyncStats
- [ ] تحديث useSyncActions

### Phase 6: Cleanup (النهائي)
- [ ] حذف src/lib/sync/ بالكامل
- [ ] حذف جميع ملفات sync* من src/api/
- [ ] حذف جميع ملفات .old.tsx
- [ ] تحديث package.json (إزالة dependencies غير مستخدمة)
- [ ] اختبار شامل

---

## 🎯 الخطوة التالية المباشرة

### نبدأ بـ appInitializationService.ts

**الاستراتيجية**:
1. إنشاء helper functions لتحويل sqliteDB → powerSyncService
2. استبدال جميع استدعاءات sqliteDB
3. إزالة كود initialization (PowerSync يُهيأ تلقائياً)
4. اختبار

**Helper Functions المطلوبة**:

```typescript
// في أعلى الملف
const isPowerSyncReady = () => {
  try {
    const db = powerSyncService.getDatabase();
    return !!db;
  } catch {
    return false;
  }
};

const powerSyncQuery = async (sql: string, params: any[] = []) => {
  try {
    const results = await powerSyncService.getAll(sql, params);
    return { success: true, data: results };
  } catch (error) {
    console.error('[PowerSync] Query failed:', error);
    return { success: false, data: [] };
  }
};

const powerSyncExecute = async (sql: string, params: any[] = []) => {
  try {
    await powerSyncService.execute(sql, params);
    return { success: true };
  } catch (error) {
    console.error('[PowerSync] Execute failed:', error);
    return { success: false };
  }
};
```

**ثم نستبدل**:
```typescript
// OLD:
if (!isSQLiteAvailable()) return null;
const result = await sqliteDB.query('SELECT ...', [params]);
if (result.success && result.data) { ... }

// NEW:
if (!isPowerSyncReady()) return null;
const result = await powerSyncQuery('SELECT ...', [params]);
if (result.success && result.data) { ... }
```

---

## ✅ الفوائد المتوقعة

### بعد التحويل الكامل:

1. **تقليل الكود**:
   - حذف ~5,000 سطر من كود المزامنة
   - تبسيط 70+ ملف
   - إزالة 50+ ملف غير مطلوب

2. **تحسين الأداء**:
   - مزامنة فورية (بدلاً من 30 ثانية)
   - لا توجد database locks
   - Optimistic UI

3. **تحسين الصيانة**:
   - نظام واحد فقط (PowerSync)
   - لا حاجة لإدارة Outbox/PushEngine/PullEngine
   - لا حاجة لحل التضاربات يدوياً

4. **تحسين الموثوقية**:
   - PowerSync مُختبر في مئات التطبيقات
   - دعم احترافي
   - تحديثات منتظمة

---

## 🚨 المخاطر والحلول

### مخاطر محتملة:

1. **فقدان بيانات محلية** أثناء التحويل
   - ✅ الحل: نسخ احتياطي قبل كل خطوة
   - ✅ الحل: اختبار على بيانات تجريبية أولاً

2. **تعارض بين النظامين** (القديم والجديد)
   - ✅ الحل: تحويل تدريجي + اختبار بعد كل خطوة
   - ✅ الحل: إيقاف النظام القديم قبل بدء PowerSync

3. **مشاكل أداء** مع كمية كبيرة من البيانات
   - ✅ الحل: PowerSync مُحسّن للأداء
   - ✅ الحل: فهرسة صحيحة في Schema

---

## 📅 Timeline

- **Phase 1**: اليوم (2-3 ساعات)
- **Phase 2**: غداً (4-5 ساعات)
- **Phase 3**: بعد غد (2-3 ساعات)
- **Phase 4-6**: 2-3 أيام

**إجمالي**: 5-7 أيام للتحويل الكامل

---

**Created by:** Claude Code 🤖
**Date:** 2025-12-03
**Status:** 🔄 In Progress
