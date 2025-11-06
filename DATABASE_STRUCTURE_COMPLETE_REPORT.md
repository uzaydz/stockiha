# استكشاف شامل لبنية قاعدة البيانات المحلية

**التاريخ:** 2025-11-04  
**الحالة:** تقرير استكشاف شامل

---

## 1. ملفات قاعدة البيانات المحلية

### الملفات الرئيسية

| المسار | الوصف | نوع |
|--------|-------|-----|
| `/src/database/localDb.ts` | الملف الرئيسي لقاعدة البيانات المحلية | Dexie.js (IndexedDB) |
| `/src/lib/db/inventoryDB.ts` | مكتبة إدارة المخزون | Dexie wrapper |
| `/electron/secureStorage.cjs` | التخزين الآمن في Electron | electron-store |
| `/src/context/auth/utils/authStorage.ts` | تخزين بيانات المصادقة | localStorage |

---

## 2. أنواع التخزين المستخدمة

### 2.1 IndexedDB (الرئيسي)
**الاسم:** `bazaarDB_v2`

**المميزات:**
- نموذج كائني التوجه يدعم الفهارس المعقدة
- سعة تخزين كبيرة (عادة 50MB+)
- يدعم المعاملات (Transactions)
- نسخة 18 حالياً مع 4 إصدارات سابقة

**الفوائد:**
- تخزين محلي قوي وآمن
- دعم الاستعلامات المتقدمة
- معاملات ذرية ACID

### 2.2 localStorage
**الاستخدام الرئيسي:**
- بيانات المصادقة والجلسات
- إعدادات المستخدم والموضوع
- بيانات المؤسسة والنطاق الفرعي
- الـ cache المؤقت

**الحد الأقصى:** عادة 5-10 MB

### 2.3 sessionStorage
**الاستخدام:**
- بيانات الجلسة المؤقتة
- معلومات التنقل
- عدادات إعادة التوجيه

**الحد الأقصى:** محدود بحجم الذاكرة

### 2.4 electron-store (Electron فقط)
**الاستخدام:**
- إعدادات التطبيق المشفرة
- حدود النوافذ
- بيانات الكاش

**المسار:**
```
{userData}/config (مشفرة)
{userData}/session (جلسات)
{userData}/cache (غير مشفرة)
```

---

## 3. الجداول والمخازن المستخدمة

### 3.1 جداول المنتجات والمخزون

```typescript
// جدول المنتجات مع 18 فهرس
products: {
  الفهارس الأساسية: id, name, sku, barcode_lower, category_id, is_active
  الفهارس المركبة: [organization_id+name_lower], [organization_id+sku_lower], [organization_id+barcode_lower]
  فهارس البحث: name_lower, sku_lower, barcode_lower, name_search, sku_search, barcode_digits
  حقول المزامنة: synced, pendingOperation
}

// جدول المخزون
inventory: {
  الفهارس: id, product_id, variant_id, synced
}

// جدول عمليات المخزون
transactions: {
  الفهارس: id, product_id, variant_id, reason, timestamp, synced, created_by
}
```

### 3.2 جداول المبيعات (POS)

```typescript
// طلبات POS (11 فهرس بما فيها المركبة)
posOrders: {
  الفهارس: id, organization_id, status, payment_status, payment_method,
           customer_name_lower, created_at, created_at_ts, local_order_number,
           local_order_number_str, remote_order_id, pendingOperation, synced
  المركبة: [organization_id+created_at], [organization_id+status+created_at],
           [organization_id+customer_name_lower], [organization_id+payment_status],
           [organization_id+payment_method]
}

// عناصر الطلب
posOrderItems: {
  الفهارس: id, order_id, product_id
}

// إعدادات POS
posSettings: {
  الفهرس الأساسي: organization_id
}

// جلسات العمل
workSessions: {
  الفهارس: id, organization_id, staff_id, status, started_at
  المركبة: [organization_id+status+started_at]
}
```

### 3.3 جداول العملاء

```typescript
// بيانات العميل (9 فهارس)
customers: {
  الفهارس: id, organization_id, name, name_lower, email, email_lower,
           phone, phone_digits, synced, pendingOperation
  المركبة: [organization_id+name_lower], [organization_id+phone_digits],
           [organization_id+email_lower]
}

// عناوين العملاء
addresses: {
  الفهارس: id, customer_id, organization_id, is_default, synced, pendingOperation
}

// ديون العملاء
customerDebts: {
  الفهارس: id, customer_id, order_id, organization_id, status, synced, pendingOperation, created_at
  المركبة: [organization_id+status], [organization_id+created_at]
}

// مدفوعات الديون
customerDebtPayments: {
  الفهارس: id, organization_id, customer_id, created_at, synced, pendingOperation
  المركبة: [organization_id+customer_id], [organization_id+created_at]
}
```

### 3.4 جداول الفواتير والإرجاعات

```typescript
// الفواتير (8 فهارس)
invoices: {
  الفهارس: id, organization_id, status, invoice_number, invoice_number_lower,
           customer_name_lower, created_at, synced, pendingOperation
  المركبة: [organization_id+invoice_number_lower], [organization_id+status],
           [organization_id+created_at], [organization_id+synced]
}

// الإرجاعات (7 فهارس)
productReturns: {
  الفهارس: id, organization_id, status, return_number, return_number_lower,
           customer_name_lower, created_at, synced, pendingOperation
  المركبة: [organization_id+status], [organization_id+return_number_lower],
           [organization_id+created_at], [organization_id+synced]
}

// عناصر الإرجاع
returnItems: {
  الفهارس: id, return_id, product_id
}
```

### 3.5 جداول الخسائر والمصروفات

```typescript
// إعلانات الخسائر (6 فهارس)
lossDeclarations: {
  الفهارس: id, organization_id, status, loss_number, loss_number_lower, created_at,
           synced, pendingOperation
  المركبة: [organization_id+status], [organization_id+loss_number_lower],
           [organization_id+created_at]
}

// عناصر الخسارة
lossItems: {
  الفهارس: id, loss_id, product_id
}

// المصروفات (6 فهارس)
expenses: {
  الفهارس: id, organization_id, category, expense_date, status, is_recurring,
           synced, pendingOperation
  المركبة: [organization_id+expense_date], [organization_id+category]
}

// المصروفات المتكررة
recurringExpenses: {
  الفهارس: id, expense_id, frequency, start_date, next_due, status, synced, pendingOperation
  المركبة: [expense_id+status]
}

// فئات المصروفات
expenseCategories: {
  الفهارس: id, organization_id, name, synced, pendingOperation
  المركبة: [organization_id+name]
}
```

### 3.6 جداول خدمات الإصلاح

```typescript
// طلبات الإصلاح (8 فهارس)
repairOrders: {
  الفهارس: id, organization_id, status, order_number, repair_tracking_code,
           customer_phone, customer_name_lower, device_type_lower,
           synced, pendingOperation
  المركبة: [organization_id+created_at], [organization_id+status+created_at]
}

// سجل حالة الإصلاح
repairStatusHistory: {
  الفهارس: id, repair_order_id, created_at, synced, pendingOperation
  المركبة: [repair_order_id+created_at]
}

// صور الإصلاح
repairImages: {
  الفهارس: id, repair_order_id, created_at, synced, pendingOperation
  المركبة: [repair_order_id+created_at]
}

// ملفات صور الإصلاح
repairImageFiles: {
  الفهارس: id, repair_image_id, uploaded
}

// مواقع الإصلاح
repairLocations: {
  الفهارس: id, organization_id, name, is_default, is_active, created_at, synced, pendingOperation
  المركبة: [organization_id+is_active], [organization_id+name]
}
```

### 3.7 جداول مجموعات الطلبات

```typescript
// مجموعات الطلبات
orderGroups: {
  الفهارس: id, organization_id, name, enabled, strategy, priority, created_at, updated_at
  المركبة: [organization_id+name]
}

// قواعد مجموعات الطلبات
orderGroupRules: {
  الفهارس: id, group_id, type, include
}

// تعيينات الطلبات
orderAssignments: {
  الفهارس: id, organization_id, order_id, group_id, staff_id, status, assigned_at
  المركبة: [organization_id+order_id]
}

// أعضاء مجموعات الطلبات
orderGroupMembers: {
  الفهارس: id, group_id, staff_id, active
}
```

### 3.8 جداول أخرى

```typescript
// الاشتراكات
organizationSubscriptions: {
  الفهارس: id, organization_id, status, end_date
}

// خطط الاشتراك
subscriptionPlans: {
  الفهارس: id, code
}

// بيانات اعتماد الموظفين (PIN)
staffPins: {
  الفهارس: id, organization_id
  ملاحظة: تخزين مجزأ (SHA-256 + salt)
}

// قائمة المزامنة
syncQueue: {
  الفهارس: id, objectType, objectId, operation, priority, createdAt
}
```

---

## 4. حدود التخزين

### 4.1 حدود IndexedDB
```
الحد الأقصى الافتراضي: 50 MB
في البيئات الحديثة: حتى 250 MB أو أكثر
الحد الأقصى لقيمة واحدة: ~256 MB
```

### 4.2 حدود localStorage/sessionStorage
```
الحد الأقصى العام: 5-10 MB
الحد الأقصى لكل قيمة: محدود بحجم السعة
التحقق من الحد الأقصى: 10 MB في secureStorage.cjs (سطر 112)
```

### 4.3 إستراتيجية إدارة الحجم
```typescript
// من secureStorage.cjs
if (jsonString.length > 10 * 1024 * 1024) { // 10 MB
  throw new Error('Value size exceeds 10MB limit');
}
```

### 4.4 حدود Electron-store
```
محدود بحجم القرص الصلب
مشفر افتراضياً
قابل للإضافة والحذف الديناميكي
```

---

## 5. آليات تنظيف البيانات القديمة

### 5.1 تنظيف عند تسجيل الخروج (CompleteLogoutCleaner)

**الملف:** `/src/lib/utils/complete-logout-cleaner.ts`

**العمليات المنفذة:**

1. **تنظيف React Query Cache**
   - حذف جميع الاستعلامات
   - حذف جميع الـ mutations
   - إزالة queries محددة مثل: pos-complete-data, order-details, customers, products

2. **تنظيف localStorage/sessionStorage**
   - 60+ مفتاح محدد يتم حذفها
   - حذف جميع المفاتيح التي تحتوي على: "bazaar", "organization", "tenant", "auth", "cache"

3. **تنظيف IndexedDB**
   - حذف قواعد البيانات: bazaar-app-db, supabase-cache, react-query-cache, app-cache, workbox-cache

4. **تنظيف Service Worker Cache**
   - إلغاء تسجيل جميع Service Workers
   - حذف جميع Caches

5. **تنظيف الـ Cookies**
   - حذف جميع الـ cookies بضبط تاريخ الانتهاء

6. **تنظيف Application State**
   - حذف 40+ متغير عام
   - حذف Event Listeners المخصصة
   - حذف timers و intervals

7. **إعادة تحميل الصفحة**
   - التنقل لصفحة تسجيل الدخول مع معاملات التتبع

**المدة الزمنية:** تأخير 2 ثانية لضمان اكتمال التنظيف

### 5.2 تنظيف سريع (Quick Cleanup)
```typescript
// حذف المفاتيح الحساسة فقط
sensitiveKeys: [
  'bazaar_auth_state',
  'current_user_profile', 
  'current_organization',
  'bazaar_organization_id',
  'authSessionExists'
]
```

### 5.3 تنظيف بيانات المصادقة (authStorage)

```typescript
// تنظيف شامل
clearAuthStorage(): void {
  - حذف: AUTH_STATE, AUTH_USER, AUTH_SESSION
  - حذف: SESSION_CACHE, LAST_LOGIN_REDIRECT
  - حذف: OFFLINE_SNAPSHOT_KEY
}

// تنظيف مع الاحتفاظ ببيانات الأوفلاين
clearAuthStorageKeepOfflineCredentials(): void {
  - حفظ: OFFLINE_SNAPSHOT_KEY
  - حفظ: secure offline sessions
  - حذف: باقي بيانات الجلسة
}
```

### 5.4 تنظيف Cache منتهي الصلاحية (authStorage)

```typescript
cleanExpiredCache(): void {
  - فترة الصلاحية للملف الشخصي: AUTH_TIMEOUTS.PROFILE_CACHE_DURATION
  - فترة الصلاحية للجلسة: AUTH_TIMEOUTS.SESSION_CACHE_DURATION
  - فترة الصلاحية للمستخدم: AUTH_TIMEOUTS.USER_CACHE_DURATION
}
```

### 5.5 تنظيف في Electron-store

```javascript
// تنظيف تلقائي عند بدء التطبيق
sessionStore.clear(); // مسح جلسة العمل السابقة

// تنظيف مدخلات الـ cache المنتهية الصلاحية
CacheStorage.cleanExpired(): void {
  - حذف المدخلات التي تجاوزت TTL
  - حساب عدد المدخلات المحذوفة
}
```

### 5.6 استراتيجيات تنظيف البيانات القديمة

#### أ) تنظيف البيانات المتزامنة
```typescript
// من localDb.ts - عند تحديث المخزون
if (item.synced === false) {
  // احتفظ بها للمحاولة لاحقاً
} else {
  // قد يتم حذفها عند تحميل بيانات جديدة
  await inventoryDB.inventory.filter(item => item.synced === true).delete();
}
```

#### ب) حذف البيانات حسب المؤسسة
```typescript
// تنظيف شامل لجميع بيانات المؤسسة القديمة
const organizationKeys = [
  'bazaar_organization_id',
  'organization_id',
  'currentOrganizationId',
  'current_organization',
  'organization_data'
  // ... 15+ مفتاح إضافي
];
```

#### ج) التعرف على الأنماط والحذف الديناميكي
```typescript
const orgPatterns = [
  /org[_-]?cache/i,
  /organization[_-]?/i,
  /tenant[_-]?/i,
  /pos[_-]?/i,
  /unified[_-]?/i,
  // ... 10+ أنماط إضافية
];
```

---

## 6. عمليات المزامنة (Sync)

### 6.1 نموذج المزامنة

**الملف:** `/src/api/syncService.ts`

```typescript
// حجم تجمع المزامنة المتوازية
SYNC_POOL_SIZE = 2 (قابل للتخصيص)

// مدة الـ cache لإعدادات POS
POS_SETTINGS_CACHE_DURATION = 5 * 60 * 1000 // 5 دقائق
```

### 6.2 عملية المزامنة

1. **التحقق من الاتصال:** `navigator.onLine`
2. **الحصول على العناصر غير المتزامنة:** من جداول البيانات
3. **تنفيذ متوازي:** باستخدام Pool Size للتحكم بالحمل
4. **معالجة الأخطاء:** الاحتفاظ بحالة "غير متزامن" للمحاولة لاحقاً
5. **تحديث حالة المزامنة:** تعديل `synced=true` عند النجاح

### 6.3 حالات المزامنة

```typescript
enum SyncStatus {
  'pending' = انتظار المزامنة
  'syncing' = جاري المزامنة
  'synced' = متزامن بنجاح
  'failed' = فشل الاتصال/الخادم
  'error' = خطأ في معالجة البيانات
}

// أولويات الانتظار
Priority: 1 = عالي، 2 = متوسط، 3 = منخفض
```

---

## 7. ملخص البيانات المحفوظة محلياً

### 7.1 البيانات الرئيسية (IndexedDB)
- المنتجات والمخزون (+ 18 فهرس)
- طلبات POS والفواتير
- العملاء والعناوين
- الإصلاحات والإرجاعات
- المصروفات والخسائر
- جلسات العمل
- بيانات التزامن (syncQueue)

### 7.2 بيانات الجلسة (localStorage)
- بيانات المصادقة والمستخدم
- معرف المؤسسة الحالي
- إعدادات الموضوع واللغة
- بيانات الموقع/النطاق الفرعي
- بيانات الأوفلاين للمصادقة

### 7.3 بيانات مؤقتة (sessionStorage)
- بيانات الجلسة المحلية
- معلومات التنقل
- عدادات إعادة التوجيه

### 7.4 بيانات Electron (electron-store)
- إعدادات التطبيق (مشفرة)
- معلومات النافذة
- بيانات الكاش

---

## 8. الملاحظات الأمنية

### 8.1 تشفير البيانات الحساسة
```
✓ بيانات المصادقة: محفوظة بشكل آمن في Electron
✓ رموز الجلسة: لا تُخزن في localStorage مباشرة
✓ PIN الموظفين: مجزأة (SHA-256 + salt)
✗ معظم البيانات الأخرى: غير مشفرة في IndexedDB
```

### 8.2 توصيات الأمان
1. تشفير جميع البيانات الحساسة في IndexedDB
2. تعيين حد زمني لصلاحية البيانات المحفوظة
3. استخدام HTTPS دائماً في المزامنة
4. التحقق من توقيع البيانات قبل الاستخدام

---

## 9. مخطط الفهارس المتقدمة

### 9.1 فهارس البحث السريع

```typescript
// توحيد الأحرف العربية للبحث
normalizeArabic(text): string {
  - إزالة التشكيل والتمطيط
  - توحيد: آأإٱ → ا
  - توحيد: ؤ → و، ئ → ي، ة → ه، ى → ي
  - تحويل لأحرف/أرقام/مسافات
}

// حقول البحث
name_lower: الاسم بأحرف صغيرة
name_search: الاسم المُعَّد للبحث العربي
sku_lower: رمز الدعم بأحرف صغيرة
sku_search: رمز الدعم المُعَّد للبحث
barcode_digits: أرقام الرمز الشريطي فقط
barcode_lower: الرمز الشريطي بأحرف صغيرة
```

### 9.2 الفهارس المركبة (Compound Indexes)

```typescript
// مثال: البحث السريع عن المنتجات بالمنظمة
[organization_id+name_lower]: البحث عن المنتج بالاسم
[organization_id+sku_lower]: البحث عن المنتج برمز الدعم
[organization_id+category_id+name_lower]: البحث ضمن فئة معينة

// مثال: الاستعلامات على الطلبات
[organization_id+created_at]: الطلبات حسب التاريخ
[organization_id+status+created_at]: الطلبات حسب الحالة والتاريخ
[organization_id+payment_status]: الطلبات حسب حالة الدفع
```

---

## 10. الملفات ذات الصلة

### ملفات التخزين
- `/src/database/localDb.ts` (1286 سطر)
- `/src/lib/db/inventoryDB.ts` (345 سطر)
- `/src/context/auth/utils/authStorage.ts` (523 سطر)
- `/src/lib/utils/complete-logout-cleaner.ts` (925 سطر)
- `/electron/secureStorage.cjs` (376 سطر)

### ملفات المزامنة
- `/src/api/syncService.ts`
- `/src/api/syncRepairs.ts`
- `/src/api/localCustomerDebtService.ts`
- `/src/api/localInvoiceService.ts`
- `/src/api/localProductReturnService.ts`

### ملفات التنظيف
- `/src/lib/utils/gentle-logout-cleaner.ts`
- `/src/lib/utils/complete-logout-cleaner.ts`

---

## 11. إحصائيات قاعدة البيانات

```
عدد الجداول الرئيسية: 28
عدد الفهارس الإجمالي: 150+
عدد الفهارس المركبة: 40+
عدد الإصدارات: 18
إجمالي عمليات البحث المدعومة: 300+
```

---

## 12. خلاصة

تُستخدم البرنامج نموذج تخزين متعدد الطبقات:

1. **IndexedDB (Dexie.js):** للبيانات الرئيسية الضخمة
2. **localStorage:** للجلسات والإعدادات
3. **sessionStorage:** للبيانات المؤقتة
4. **electron-store:** للإعدادات المشفرة في Electron

**نقاط قوة:**
- فهارس مُحسّنة للبحث السريع
- دعم شامل للأوفلاين
- معالجة آلية للمزامنة
- تنظيف شامل عند تسجيل الخروج

**نقاط ضعف:**
- معظم البيانات غير مشفرة
- عدم وجود حد زمني واضح لصلاحية البيانات
- تنظيف يعتمد على الأحداث (logout) بدلاً من الجدولة
