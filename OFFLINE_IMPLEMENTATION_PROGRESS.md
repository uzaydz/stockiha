# 📊 تقرير تطبيق نظام Offline-First للصفحات الجديدة

## ✅ ما تم إنجازه

### 1. تحديث قاعدة البيانات المحلية (Dexie) ✅

**الملف**: `src/database/localDb.ts`

**الجداول المضافة**:
- ✅ `customerDebts` - ديون العملاء
- ✅ `productReturns` - إرجاع المنتجات  
- ✅ `returnItems` - عناصر الإرجاع
- ✅ `lossDeclarations` - التصريح بالخسائر
- ✅ `lossItems` - عناصر الخسائر
- ✅ `invoices` - الفواتير
- ✅ `invoiceItems` - عناصر الفواتير

**الواجهات المضافة**:
- ✅ `LocalCustomerDebt` - مع حقول المزامنة الكاملة
- ✅ `LocalProductReturn` + `LocalReturnItem` - مع دعم تحديث المخزون
- ✅ `LocalLossDeclaration` + `LocalLossItem` - مع دعم تحديث المخزون
- ✅ `LocalInvoice` + `LocalInvoiceItem` - مع دعم TVA والحسابات

**Version**: تم الترقية إلى Version 5

---

### 2. الخدمات المحلية (Local Services) ✅

#### أ. خدمة ديون العملاء ✅
**الملف**: `src/api/localCustomerDebtService.ts`

**الوظائف**:
- ✅ `createLocalCustomerDebt()` - إنشاء دين محلياً
- ✅ `updateLocalCustomerDebt()` - تحديث دين
- ✅ `deleteLocalCustomerDebt()` - حذف دين (soft delete)
- ✅ `getLocalCustomerDebt()` - جلب دين واحد
- ✅ `getLocalCustomerDebts()` - جلب ديون عميل
- ✅ `getAllLocalCustomerDebts()` - جلب جميع الديون
- ✅ `getUnsyncedCustomerDebts()` - جلب الديون غير المتزامنة
- ✅ `recordDebtPayment()` - تسجيل دفعة
- ✅ `updateCustomerDebtSyncStatus()` - تحديث حالة المزامنة
- ✅ `cleanupSyncedDebts()` - تنظيف الديون المتزامنة

**الميزات**:
- ✅ دعم كامل للأوفلاين
- ✅ إضافة تلقائية لصف المزامنة (UnifiedQueue)
- ✅ حساب تلقائي للمبالغ المتبقية
- ✅ تحديث حالة الدين (pending/partial/paid)

---

#### ب. خدمة إرجاع المنتجات ✅
**الملف**: `src/api/localProductReturnService.ts`

**الوظائف**:
- ✅ `createLocalProductReturn()` - إنشاء إرجاع مع عناصره
- ✅ `updateLocalProductReturn()` - تحديث إرجاع
- ✅ `approveLocalProductReturn()` - الموافقة على إرجاع + تحديث المخزون
- ✅ `rejectLocalProductReturn()` - رفض إرجاع
- ✅ `getLocalProductReturn()` - جلب إرجاع مع عناصره
- ✅ `getAllLocalProductReturns()` - جلب جميع الإرجاعات
- ✅ `getUnsyncedProductReturns()` - جلب الإرجاعات غير المتزامنة
- ✅ `updateProductReturnSyncStatus()` - تحديث حالة المزامنة
- ✅ `cleanupSyncedReturns()` - تنظيف الإرجاعات المتزامنة

**الميزات**:
- ✅ تحديث المخزون تلقائياً عند الموافقة
- ✅ دعم المنتجات القابلة لإعادة البيع (resellable)
- ✅ دعم Variants (الألوان والمقاسات)
- ✅ تتبع حالة تحديث المخزون (inventory_returned)

---

#### ج. خدمة التصريح بالخسائر ✅
**الملف**: `src/api/localLossDeclarationService.ts`

**الوظائف**:
- ✅ `createLocalLossDeclaration()` - إنشاء تصريح مع عناصره
- ✅ `updateLocalLossDeclaration()` - تحديث تصريح
- ✅ `approveLocalLossDeclaration()` - الموافقة + تحديث المخزون
- ✅ `rejectLocalLossDeclaration()` - رفض تصريح
- ✅ `processLocalLossDeclaration()` - معالجة تصريح
- ✅ `getLocalLossDeclaration()` - جلب تصريح مع عناصره
- ✅ `getAllLocalLossDeclarations()` - جلب جميع التصاريح
- ✅ `getUnsyncedLossDeclarations()` - جلب التصاريح غير المتزامنة
- ✅ `updateLossDeclarationSyncStatus()` - تحديث حالة المزامنة
- ✅ `cleanupSyncedLossDeclarations()` - تنظيف التصاريح المتزامنة
- ✅ `calculateLossTotals()` - حساب الإجماليات

**الميزات**:
- ✅ تحديث المخزون تلقائياً عند الموافقة (decrease)
- ✅ دعم أنواع الخسائر (damage/theft/expiry/other)
- ✅ تتبع حالة تحديث المخزون (inventory_adjusted)
- ✅ حساب القيمة بالتكلفة والبيع

---

#### د. خدمة الفواتير ✅
**الملف**: `src/api/localInvoiceService.ts`

**الوظائف**:
- ✅ `createLocalInvoice()` - إنشاء فاتورة مع عناصرها
- ✅ `updateLocalInvoice()` - تحديث فاتورة (مع دعم تحديث العناصر)
- ✅ `deleteLocalInvoice()` - حذف فاتورة (soft delete)
- ✅ `getLocalInvoice()` - جلب فاتورة مع عناصرها
- ✅ `getLocalInvoiceByNumber()` - جلب فاتورة برقمها
- ✅ `getAllLocalInvoices()` - جلب جميع الفواتير
- ✅ `getUnsyncedInvoices()` - جلب الفواتير غير المتزامنة
- ✅ `updateInvoiceSyncStatus()` - تحديث حالة المزامنة
- ✅ `updateInvoicePaymentStatus()` - تحديث حالة الدفع
- ✅ `cleanupSyncedInvoices()` - تنظيف الفواتير المتزامنة
- ✅ `calculateInvoiceTotals()` - حساب الإجماليات (HT/TVA/TTC)
- ✅ `generateLocalInvoiceNumber()` - توليد رقم فاتورة مؤقت

**الميزات**:
- ✅ دعم كامل لحسابات TVA (HT/TTC)
- ✅ دعم التخفيضات والشحن
- ✅ دعم أنواع الفواتير (invoice/proforma/bon_commande)
- ✅ توليد أرقام مؤقتة للفواتير المحلية

---

### 3. خدمات المزامنة (Sync Services) ⏳

#### أ. مزامنة ديون العملاء ✅
**الملف**: `src/api/syncCustomerDebts.ts`

**الوظائف**:
- ✅ `syncSingleDebt()` - مزامنة دين واحد
- ✅ `syncPendingCustomerDebts()` - مزامنة جميع الديون المعلقة
- ✅ `fetchCustomerDebtsFromServer()` - جلب الديون من السيرفر

**الميزات**:
- ✅ Pool محدود (SYNC_POOL_SIZE)
- ✅ Server Win لفض النزاعات
- ✅ Retry تلقائي عند الفشل
- ✅ تنظيف تلقائي للديون المتزامنة

---

#### ب. مزامنة إرجاع المنتجات ⏳ (قيد الإنشاء)
**الملف**: `src/api/syncProductReturns.ts`

**المطلوب**:
- ⏳ `syncSingleReturn()` - مزامنة إرجاع واحد
- ⏳ `syncPendingProductReturns()` - مزامنة جميع الإرجاعات
- ⏳ `fetchProductReturnsFromServer()` - جلب الإرجاعات من السيرفر

---

#### ج. مزامنة التصريح بالخسائر ⏳ (قيد الإنشاء)
**الملف**: `src/api/syncLossDeclarations.ts`

**المطلوب**:
- ⏳ `syncSingleLoss()` - مزامنة تصريح واحد
- ⏳ `syncPendingLossDeclarations()` - مزامنة جميع التصاريح
- ⏳ `fetchLossDeclarationsFromServer()` - جلب التصاريح من السيرفر

---

#### د. مزامنة الفواتير ⏳ (قيد الإنشاء)
**الملف**: `src/api/syncInvoices.ts`

**المطلوب**:
- ⏳ `syncSingleInvoice()` - مزامنة فاتورة واحدة
- ⏳ `syncPendingInvoices()` - مزامنة جميع الفواتير
- ⏳ `fetchInvoicesFromServer()` - جلب الفواتير من السيرفر

---

## 🔄 الخطوات المتبقية

### 1. إكمال خدمات المزامنة ⏳

**الأولوية**: عالية

**المطلوب**:
- [ ] إنشاء `src/api/syncProductReturns.ts`
- [ ] إنشاء `src/api/syncLossDeclarations.ts`
- [ ] تحديث `src/api/syncInvoices.ts` (موجود لكن يحتاج تحديث)

**النمط المطلوب**:
```typescript
// نفس نمط syncCustomerDebts.ts
- استخدام runWithPool للتحكم بالتوازي
- تطبيق Server Win لفض النزاعات
- دعم create/update/delete
- تنظيف تلقائي للعناصر المتزامنة
```

---

### 2. تحديث SyncEngine ⏳

**الملف**: `src/sync/SyncEngine.ts`

**المطلوب**:
```typescript
// إضافة المهام الجديدة في دالة run()

const debts = await this.runWithRetry('customerDebts', async () => {
  this.notify('customerDebts');
  return await syncPendingCustomerDebts();
});

const returns = await this.runWithRetry('productReturns', async () => {
  this.notify('productReturns');
  return await syncPendingProductReturns();
});

const losses = await this.runWithRetry('lossDeclarations', async () => {
  this.notify('lossDeclarations');
  return await syncPendingLossDeclarations();
});

const invoices = await this.runWithRetry('invoices', async () => {
  this.notify('invoices');
  return await syncPendingInvoices();
});
```

**تحديث SyncEngineResult**:
```typescript
export interface SyncEngineResult {
  baseSynced: boolean;
  posOrders: { synced: number; failed: number };
  posOrderUpdates: { synced: number; failed: number };
  workSessions: number;
  inventory: number;
  customerDebts: { synced: number; failed: number }; // جديد
  productReturns: { synced: number; failed: number }; // جديد
  lossDeclarations: { synced: number; failed: number }; // جديد
  invoices: { synced: number; failed: number }; // جديد
  timings?: Record<string, number>;
  attempts?: Record<string, number>;
}
```

---

### 3. تحديث الصفحات لاستخدام الخدمات المحلية ⏳

#### أ. صفحة إدارة العملاء
**الملف**: `src/pages/dashboard/Customers.tsx`

**المطلوب**:
- [ ] استخدام `inventoryDB.customers` بدلاً من API مباشرة
- [ ] إضافة مؤشرات حالة المزامنة (synced/pending/error)
- [ ] دعم الإنشاء/التحديث/الحذف أوفلاين

---

#### ب. صفحة ديون العملاء
**الملف**: `src/pages/dashboard/CustomerDebts.tsx`

**المطلوب**:
- [ ] استخدام `localCustomerDebtService` بدلاً من API مباشرة
- [ ] إضافة مؤشرات حالة المزامنة
- [ ] دعم تسجيل الدفعات أوفلاين
- [ ] عرض Badge للديون غير المتزامنة

---

#### ج. صفحة إرجاع المنتجات
**الملف**: `src/pages/returns/ProductReturns.tsx`

**المطلوب**:
- [ ] استخدام `localProductReturnService`
- [ ] إضافة مؤشرات حالة المزامنة
- [ ] دعم الموافقة/الرفض أوفلاين
- [ ] تحديث المخزون محلياً عند الموافقة

---

#### د. صفحة التصريح بالخسائر
**الملف**: `src/pages/losses/LossDeclarations.tsx`

**المطلوب**:
- [ ] استخدام `localLossDeclarationService`
- [ ] إضافة مؤشرات حالة المزامنة
- [ ] دعم الموافقة/الرفض أوفلاين
- [ ] تحديث المخزون محلياً عند الموافقة

---

#### هـ. صفحة الفواتير
**الملف**: `src/pages/dashboard/Invoices.tsx`

**المطلوب**:
- [ ] استخدام `localInvoiceService`
- [ ] إضافة مؤشرات حالة المزامنة
- [ ] دعم الإنشاء/التحديث/الحذف أوفلاين
- [ ] عرض Badge للفواتير غير المتزامنة

---

### 4. إضافة Logging موحد ومقاييس للمزامنة ⏳

**المطلوب**:
- [ ] إنشاء `src/utils/syncLogger.ts`
- [ ] تتبع أوقات المزامنة
- [ ] تتبع معدلات النجاح/الفشل
- [ ] تخزين السجلات محلياً

---

### 5. إنشاء صفحة Debug SyncPanel ⏳

**المطلوب**:
- [ ] إنشاء `src/pages/debug/SyncPanel.tsx`
- [ ] عرض حالة جميع الكيانات
- [ ] عرض السجلات والأخطاء
- [ ] أزرار لتشغيل المزامنة يدوياً
- [ ] إحصائيات الأداء

---

## 📊 الإحصائيات

### ما تم إنجازه:
- ✅ **4 واجهات** جديدة في Dexie
- ✅ **7 جداول** جديدة في Dexie
- ✅ **4 خدمات محلية** كاملة (40+ دالة)
- ✅ **1 خدمة مزامنة** كاملة (ديون العملاء)
- ✅ **Version 5** من قاعدة البيانات المحلية

### ما تبقى:
- ⏳ **3 خدمات مزامنة** (إرجاع، خسائر، فواتير)
- ⏳ **تحديث SyncEngine** لإضافة المهام الجديدة
- ⏳ **تحديث 5 صفحات** لاستخدام الخدمات المحلية
- ⏳ **نظام Logging** موحد
- ⏳ **صفحة Debug** للمزامنة

---

## 🎯 الأولويات

### عالية (High Priority):
1. إكمال خدمات المزامنة الثلاثة المتبقية
2. تحديث SyncEngine
3. تحديث صفحة الفواتير (الأكثر استخداماً)

### متوسطة (Medium Priority):
4. تحديث صفحة ديون العملاء
5. تحديث صفحة إرجاع المنتجات
6. تحديث صفحة التصريح بالخسائر

### منخفضة (Low Priority):
7. تحديث صفحة إدارة العملاء (أقل تعقيداً)
8. نظام Logging
9. صفحة Debug

---

## 📝 ملاحظات مهمة

### النمط المتبع:
- ✅ **Server Win** لفض النزاعات في جميع الخدمات
- ✅ **Pool محدود** (SYNC_POOL_SIZE=2) للتحكم بالتوازي
- ✅ **Soft Delete** بدلاً من الحذف الفوري
- ✅ **UnifiedQueue** لجميع عمليات المزامنة
- ✅ **تحديث المخزون محلياً** عند الموافقة على الإرجاع/الخسائر

### التحديات:
- ⚠️ تحديث المخزون يجب أن يكون متزامناً بين الإرجاع والخسائر
- ⚠️ أرقام الفواتير المؤقتة يجب استبدالها بالأرقام النهائية بعد المزامنة
- ⚠️ العلاقات بين الجداول (orders → debts، returns → orders)

---

## 🚀 الخطوة التالية الموصى بها

**ابدأ بإكمال خدمات المزامنة الثلاثة:**
1. `src/api/syncProductReturns.ts`
2. `src/api/syncLossDeclarations.ts`
3. تحديث `src/api/syncInvoices.ts`

**ثم قم بتحديث SyncEngine لإضافة المهام الجديدة**

**بعد ذلك ابدأ بتحديث الصفحات واحدة تلو الأخرى**
