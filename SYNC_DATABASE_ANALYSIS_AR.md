# تحليل قاعدة البيانات - حالة المزامنة

## 📊 نظرة عامة

هذا التقرير يوضح بنية قاعدة البيانات المتعلقة بحالة المزامنة في النظام. النظام يستخدم حقول موحدة لتتبع حالة المزامنة عبر جميع الجداول.

## 🎯 الملخص التنفيذي

### الأعمدة الموحدة للمزامنة:
1. **`synced`** (INTEGER): `0` = غير متزامن، `1` = متزامن
2. **`sync_status`** (TEXT): `'pending'` / `'syncing'` / `'error'` / `NULL`
3. **`pending_operation`** (TEXT): `'INSERT'` / `'UPDATE'` / `'DELETE'` / `NULL`
4. **`local_updated_at`** (TEXT): وقت آخر تحديث محلي (اختياري)

### الجداول الرئيسية:
- ✅ **10 جداول رئيسية** تستخدم حقول المزامنة الموحدة
- ✅ **فهارس محسّنة** على `synced` و `(organization_id, synced)`
- ✅ **استعلامات موحدة** لجلب الإحصائيات

### الحالة الحالية (من الواجهة):
- **منتجات:** 0/35 ✅
- **طلبات:** 0/616 ✅
- **عملاء:** 0/13 ✅
- **موردين:** 0/1 ✅
- **موظفين:** 0/22 ✅
- **تصليح:** 0/23 ✅
- **فواتير:** 0/4 ✅
- **جلسات:** 2/22 ⚠️ (يحتاج فحص)
- **مرتجعات:** 0/0 ✅
- **ديون:** 0/72 ✅

### المشاكل المحتملة:
1. ⚠️ **جلسات العمل:** 2 جلسة غير متزامنة من أصل 22
2. ⚠️ **جدول work_sessions:** لا يحتوي على `local_updated_at`
3. ⚠️ **جدول employees:** يحتوي على عمودين مكررين (`synced` و `_synced`)

---

---

## 🔑 الأعمدة الأساسية للمزامنة

جميع الجداول الرئيسية تستخدم نفس الأعمدة الثلاثة لتتبع حالة المزامنة:

### 1. `synced` (INTEGER)
- **القيم المحتملة:**
  - `0` = غير متزامن (pending sync)
  - `1` = متزامن (synced)
- **الاستخدام:** يحدد ما إذا كان السجل تم مزامنته مع السيرفر أم لا

### 2. `sync_status` (TEXT)
- **القيم المحتملة:**
  - `'pending'` = في انتظار المزامنة
  - `'syncing'` = جاري المزامنة
  - `'error'` = خطأ في المزامنة
  - `NULL` = متزامن بنجاح (يتم حذف القيمة بعد المزامنة الناجحة)
- **الاستخدام:** يحدد الحالة الحالية لعملية المزامنة

### 3. `pending_operation` (TEXT)
- **القيم المحتملة:**
  - `'INSERT'` = إدراج جديد
  - `'UPDATE'` = تحديث
  - `'DELETE'` = حذف
  - `NULL` = لا توجد عملية معلقة
- **الاستخدام:** يحدد نوع العملية المعلقة التي تحتاج للمزامنة

### 4. `local_updated_at` (TEXT) - اختياري
- **الاستخدام:** يخزن وقت آخر تحديث محلي (ISO timestamp)
- **ملاحظة:** لا يوجد في جميع الجداول (مثل `work_sessions`)

---

## 📋 الجداول الرئيسية وحالة المزامنة

### 1. جدول `products` (المنتجات)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
local_updated_at TEXT DEFAULT '',
server_updated_at TEXT
```

**الفهارس:**
```sql
CREATE INDEX IF NOT EXISTS idx_products_synced ON products(synced);
CREATE INDEX IF NOT EXISTS idx_products_org_synced ON products(organization_id, synced);
```

**الاستعلامات الشائعة:**
- حساب المنتجات غير المتزامنة: `SELECT COUNT(*) FROM products WHERE organization_id = ? AND synced = 0`
- حساب إجمالي المنتجات: `SELECT COUNT(*) FROM products WHERE organization_id = ?`

---

### 2. جدول `orders` (الطلبات)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
last_sync_attempt TEXT,
error TEXT,
remote_order_id TEXT,
local_created_at TEXT DEFAULT '',
server_created_at TEXT
```

**ملاحظات مهمة:**
- يحتوي على أعمدة إضافية لتتبع الأخطاء (`error`, `last_sync_attempt`)
- يحتوي على `remote_order_id` لربط السجل المحلي بالسجل على السيرفر
- يستخدم View `orders` الذي يشير إلى `pos_orders` في بعض الحالات

**الفهارس:**
```sql
CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
CREATE INDEX IF NOT EXISTS idx_orders_org_synced ON orders(organization_id, synced);
```

---

### 3. جدول `customers` (العملاء)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
local_updated_at TEXT DEFAULT '',
server_updated_at TEXT,
last_sync_attempt TEXT
```

**الفهارس:**
```sql
CREATE INDEX IF NOT EXISTS idx_customers_synced ON customers(synced);
CREATE INDEX IF NOT EXISTS idx_customers_org_synced ON customers(organization_id, synced);
```

---

### 4. جدول `invoices` (الفواتير)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
local_created_at TEXT,
server_updated_at TEXT,
local_updated_at TEXT
```

**ملاحظات:**
- يحتوي على `invoice_items` كجدول فرعي (له `synced` منفصل)

---

### 5. جدول `work_sessions` (جلسات العمل)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT
```

**ملاحظات مهمة:**
- ⚠️ **لا يحتوي على `local_updated_at`** (يتم إزالته في الكود)
- يستخدم `staff_id` و `staff_name` في قاعدة البيانات (وليس `employee_id`/`employee_name`)
- الواجهة الأمامية تستخدم `employee_id`/`employee_name` ويتم التحويل في الكود

**الاستخدام في الكود:**
```typescript
// عند الحفظ: تحويل employee_id → staff_id
// عند القراءة: تحويل staff_id → employee_id
```

---

### 6. جدول `repair_orders` (طلبات التصليح)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,  -- يتم إضافتها لاحقاً
pending_operation TEXT  -- يتم إضافتها لاحقاً
```

**الجداول المرتبطة:**
- `repair_locations` - له حقول مزامنة منفصلة
- `repair_images` - له حقول مزامنة منفصلة
- `repair_status_history` - له حقول مزامنة منفصلة

**الفهارس:**
```sql
CREATE INDEX IF NOT EXISTS idx_repair_orders_synced ON repair_orders(synced);
CREATE INDEX IF NOT EXISTS idx_repair_locations_synced ON repair_locations(synced);
CREATE INDEX IF NOT EXISTS idx_repair_images_synced ON repair_images(synced);
CREATE INDEX IF NOT EXISTS idx_repair_history_synced ON repair_status_history(synced);
```

---

### 7. جدول `returns` / `product_returns` (المرتجعات)

**جدول `returns`:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT
```

**جدول `product_returns`:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
local_created_at TEXT,
local_updated_at TEXT,
server_updated_at TEXT
```

**ملاحظات:**
- يوجد جدولان: `returns` (عام) و `product_returns` (مخصص للمنتجات)
- `product_returns` يستخدم في `syncProductReturns`

---

### 8. جدول `customer_debts` (ديون العملاء)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
server_updated_at TEXT,
local_updated_at TEXT
```

**الجدول المرتبط:**
- `customer_debt_payments` - له `synced` و `pending_operation` منفصلان

---

### 9. جدول `employees` (الموظفين)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
_synced INTEGER DEFAULT 0,  -- ⚠️ عمود مكرر (legacy)
sync_status TEXT,
pending_operation TEXT
```

**ملاحظات:**
- ⚠️ يحتوي على عمودين: `synced` و `_synced` (يبدو أنه legacy code)

---

### 10. جدول `suppliers` (الموردين)

**الأعمدة المتعلقة بالمزامنة:**
```sql
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
local_updated_at TEXT
```

**الجداول المرتبطة:**
- `supplier_contacts` - له حقول مزامنة منفصلة
- `supplier_purchases` - له حقول مزامنة منفصلة
- `supplier_payments` - له حقول مزامنة منفصلة

**الفهارس:**
```sql
CREATE INDEX IF NOT EXISTS idx_suppliers_synced ON suppliers(synced);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_synced ON supplier_purchases(synced);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_synced ON supplier_payments(synced);
```

---

## 📊 استعلامات الإحصائيات (من useSyncStats.ts)

### الاستعلام الرئيسي:
```sql
SELECT
  COALESCE((SELECT COUNT(*) FROM products WHERE organization_id = ?), 0) as total_products,
  COALESCE((SELECT COUNT(*) FROM products WHERE organization_id = ? AND synced = 0), 0) as unsynced_products,
  COALESCE((SELECT COUNT(*) FROM customers WHERE organization_id = ?), 0) as total_customers,
  COALESCE((SELECT COUNT(*) FROM customers WHERE organization_id = ? AND synced = 0), 0) as unsynced_customers,
  COALESCE((SELECT COUNT(*) FROM orders WHERE organization_id = ?), 0) as total_orders,
  COALESCE((SELECT COUNT(*) FROM orders WHERE organization_id = ? AND synced = 0), 0) as unsynced_orders,
  COALESCE((SELECT COUNT(*) FROM invoices WHERE organization_id = ?), 0) as total_invoices,
  COALESCE((SELECT COUNT(*) FROM invoices WHERE organization_id = ? AND synced = 0), 0) as unsynced_invoices,
  COALESCE((SELECT COUNT(*) FROM work_sessions WHERE organization_id = ?), 0) as total_sessions,
  COALESCE((SELECT COUNT(*) FROM work_sessions WHERE organization_id = ? AND synced = 0), 0) as unsynced_sessions,
  COALESCE((SELECT COUNT(*) FROM repair_orders WHERE organization_id = ?), 0) as total_repairs,
  COALESCE((SELECT COUNT(*) FROM repair_orders WHERE organization_id = ? AND synced = 0), 0) as unsynced_repairs,
  COALESCE((SELECT COUNT(*) FROM returns WHERE organization_id = ?), 0) as total_returns,
  COALESCE((SELECT COUNT(*) FROM returns WHERE organization_id = ? AND synced = 0), 0) as unsynced_returns,
  COALESCE((SELECT COUNT(*) FROM customer_debts WHERE organization_id = ?), 0) as total_debts,
  COALESCE((SELECT COUNT(*) FROM customer_debts WHERE organization_id = ? AND synced = 0), 0) as unsynced_debts
```

### استعلام الموردين والموظفين:
```sql
SELECT
  COALESCE((SELECT COUNT(*) FROM suppliers WHERE organization_id = ?), 0) as total_suppliers,
  COALESCE((SELECT COUNT(*) FROM suppliers WHERE organization_id = ? AND synced = 0), 0) as unsynced_suppliers,
  COALESCE((SELECT COUNT(*) FROM employees WHERE organization_id = ?), 0) as total_employees,
  COALESCE((SELECT COUNT(*) FROM employees WHERE organization_id = ? AND synced = 0), 0) as unsynced_employees
```

---

## 🔄 دورة حياة المزامنة

### 1. إنشاء سجل جديد (INSERT)
```typescript
{
  synced: 0,                    // غير متزامن
  sync_status: 'pending',       // في انتظار المزامنة
  pending_operation: 'INSERT',  // عملية إدراج
  local_updated_at: '2024-01-01T12:00:00Z'
}
```

### 2. تحديث سجل موجود (UPDATE)
```typescript
{
  synced: 0,                    // غير متزامن
  sync_status: 'pending',       // في انتظار المزامنة
  pending_operation: 'UPDATE',  // عملية تحديث
  local_updated_at: '2024-01-01T12:00:00Z'
}
```

### 3. بعد المزامنة الناجحة
```typescript
{
  synced: 1,                    // متزامن ✅
  sync_status: undefined,       // تم حذف الحالة
  pending_operation: undefined, // لا توجد عملية معلقة
  server_updated_at: '2024-01-01T12:05:00Z'
}
```

### 4. في حالة الخطأ
```typescript
{
  synced: 0,                    // غير متزامن
  sync_status: 'error',         // خطأ في المزامنة ❌
  pending_operation: 'INSERT',  // لا يزال معلقاً
  error: 'Network timeout'      // رسالة الخطأ (في بعض الجداول)
}
```

---

## 🎯 حالات المزامنة في الواجهة

بناءً على البيانات المعروضة:

### الحالات:
1. **بانتظار المزامنة** - `synced = 0` و `sync_status = 'pending'`
2. **مزامنة** - `synced = 0` و `sync_status = 'syncing'`
3. **إصلاح** - `synced = 0` و `sync_status = 'error'`
4. **تشخيص** - حالة خاصة للفحص والتحليل

### الإحصائيات المعروضة:
- **منتجات:** `unsynced_products / total_products` (0/35)
- **طلبات:** `unsynced_orders / total_orders` (0/616)
- **عملاء:** `unsynced_customers / total_customers` (0/13)
- **موردين:** `unsynced_suppliers / total_suppliers` (0/1)
- **موظفين:** `unsynced_employees / total_employees` (0/22)
- **تصليح:** `unsynced_repairs / total_repairs` (0/23)
- **فواتير:** `unsynced_invoices / total_invoices` (0/4)
- **جلسات:** `unsynced_sessions / total_sessions` (2/22) ⚠️
- **مرتجعات:** `unsynced_returns / total_returns` (0/0)
- **ديون:** `unsynced_debts / total_debts` (0/72)

---

## ⚠️ ملاحظات مهمة

### 1. جدول `work_sessions`
- **مشكلة:** لا يحتوي على `local_updated_at` في التعريف
- **الحل:** يتم إزالة `local_updated_at` قبل الحفظ في الكود
- **التحويل:** `employee_id` ↔ `staff_id` (في الكود)

### 2. جدول `orders`
- يحتوي على أعمدة إضافية لتتبع الأخطاء
- يستخدم View في بعض الحالات

### 3. جدول `employees`
- يحتوي على عمودين مكررين: `synced` و `_synced` (legacy)

### 4. الجداول المرتبطة
- بعض الجداول لها جداول فرعية بحقول مزامنة منفصلة
- مثال: `repair_orders` → `repair_images`, `repair_locations`

---

## 🔍 استعلامات التشخيص

### 1. جلب جميع السجلات غير المتزامنة:
```sql
SELECT 'products' as table_name, COUNT(*) as unsynced_count
FROM products WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'orders', COUNT(*) FROM orders WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'work_sessions', COUNT(*) FROM work_sessions WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'repair_orders', COUNT(*) FROM repair_orders WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'returns', COUNT(*) FROM returns WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'customer_debts', COUNT(*) FROM customer_debts WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers WHERE organization_id = ? AND synced = 0
UNION ALL
SELECT 'employees', COUNT(*) FROM employees WHERE organization_id = ? AND synced = 0;
```

### 2. جلب السجلات التي فشلت في المزامنة:
```sql
SELECT 'products' as table_name, id, sync_status, pending_operation, error
FROM products WHERE organization_id = ? AND sync_status = 'error'
UNION ALL
SELECT 'orders', id, sync_status, pending_operation, error
FROM orders WHERE organization_id = ? AND sync_status = 'error';
```

### 3. جلب السجلات المعلقة حسب نوع العملية:
```sql
SELECT pending_operation, COUNT(*) as count
FROM orders
WHERE organization_id = ? AND synced = 0
GROUP BY pending_operation;
```

---

## 📈 الفهارس (Indexes) للمزامنة

جميع الجداول الرئيسية تحتوي على فهارس لتحسين أداء استعلامات المزامنة:

```sql
-- المنتجات
CREATE INDEX IF NOT EXISTS idx_products_synced ON products(synced);
CREATE INDEX IF NOT EXISTS idx_products_org_synced ON products(organization_id, synced);

-- الطلبات
CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
CREATE INDEX IF NOT EXISTS idx_orders_org_synced ON orders(organization_id, synced);

-- العملاء
CREATE INDEX IF NOT EXISTS idx_customers_synced ON customers(synced);
CREATE INDEX IF NOT EXISTS idx_customers_org_synced ON customers(organization_id, synced);

-- الموردين
CREATE INDEX IF NOT EXISTS idx_suppliers_synced ON suppliers(synced);

-- التصليح
CREATE INDEX IF NOT EXISTS idx_repair_orders_synced ON repair_orders(synced);
CREATE INDEX IF NOT EXISTS idx_repair_locations_synced ON repair_locations(synced);
CREATE INDEX IF NOT EXISTS idx_repair_images_synced ON repair_images(synced);
CREATE INDEX IF NOT EXISTS idx_repair_history_synced ON repair_status_history(synced);
```

---

## 🛠️ التوصيات

### 1. توحيد الأعمدة
- ✅ جميع الجداول تستخدم نفس الأعمدة (`synced`, `sync_status`, `pending_operation`)
- ⚠️ بعض الجداول لا تحتوي على `local_updated_at` (مثل `work_sessions`)

### 2. تحسين الأداء
- ✅ الفهارس موجودة على `synced` و `(organization_id, synced)`
- ✅ الاستعلامات تستخدم `COALESCE` لتجنب الأخطاء

### 3. إدارة الأخطاء
- ✅ جدول `orders` يحتوي على `error` و `last_sync_attempt`
- 💡 يمكن إضافة هذه الأعمدة للجداول الأخرى

### 4. المراقبة
- ✅ `useSyncStats` يجلب الإحصائيات بشكل دوري
- ✅ `DatabaseCoordinator` يدير عمليات المزامنة

---

## 🔄 آلية تحديث حقول المزامنة بعد المزامنة الناجحة

### 1. عبر OutboxManager

عند نجاح مزامنة سجل من `sync_outbox`:

```typescript
// تحديث synced = 1
UPDATE ${tableName} SET synced = 1 WHERE id IN (${recordPlaceholders})

// للطلبات فقط: تحديث status
UPDATE orders SET status = 'synced' WHERE id IN (...) AND status = 'pending_sync'
```

**الموقع:** `src/lib/sync/queue/OutboxManager.ts:483`

### 2. عبر SyncManager (إصلاح الحالة)

دالة `fixOrdersSyncStatus()` تقوم بإصلاح الطلبات التي تم مزامنتها لكن `synced` لم يُحدّث:

```sql
-- البحث عن الطلبات غير المتزامنة (ليست في outbox)
SELECT o.id FROM orders o
WHERE o.organization_id = ?
AND (o.synced = 0 OR o.synced IS NULL)
AND o.id NOT IN (
    SELECT record_id FROM sync_outbox 
    WHERE table_name = 'orders' AND status IN ('pending', 'sending', 'failed')
)

-- تحديث synced = 1
UPDATE orders SET synced = 1 WHERE id IN (...)
UPDATE order_items SET synced = 1 WHERE order_id IN (...)
```

**الموقع:** `src/lib/sync/core/SyncManager.ts:1030`

### 3. عبر localWorkSessionService

عند مزامنة جلسة عمل:

```typescript
// بعد نجاح المزامنة
await deltaWriteService.update('work_sessions', session.id, {
  synced: 1,                    // ✅ متزامن
  sync_status: undefined,       // حذف الحالة
  pending_operation: undefined   // حذف العملية المعلقة
});

// في حالة الخطأ
await deltaWriteService.update('work_sessions', session.id, {
  sync_status: 'error'          // ❌ خطأ
});
```

**الموقع:** `src/api/localWorkSessionService.ts:478-492`

---

## 🔍 استعلامات تشخيصية للجلسات غير المتزامنة

### 1. جلب الجلسات غير المتزامنة مع التفاصيل:

```sql
SELECT 
  id,
  staff_id,
  staff_name,
  status,
  synced,
  sync_status,
  pending_operation,
  started_at,
  created_at,
  updated_at
FROM work_sessions
WHERE organization_id = ?
AND synced = 0
ORDER BY created_at DESC;
```

### 2. تحليل سبب عدم المزامنة:

```sql
SELECT 
  sync_status,
  pending_operation,
  COUNT(*) as count,
  GROUP_CONCAT(id) as session_ids
FROM work_sessions
WHERE organization_id = ?
AND synced = 0
GROUP BY sync_status, pending_operation;
```

### 3. جلب الجلسات التي فشلت في المزامنة:

```sql
SELECT 
  id,
  staff_id,
  status,
  sync_status,
  pending_operation,
  started_at,
  created_at
FROM work_sessions
WHERE organization_id = ?
AND sync_status = 'error'
ORDER BY created_at DESC;
```

### 4. جلب الجلسات المعلقة حسب نوع العملية:

```sql
-- جلسات جديدة (INSERT)
SELECT COUNT(*) as pending_inserts
FROM work_sessions
WHERE organization_id = ?
AND synced = 0
AND pending_operation = 'INSERT';

-- جلسات محدثة (UPDATE)
SELECT COUNT(*) as pending_updates
FROM work_sessions
WHERE organization_id = ?
AND synced = 0
AND pending_operation = 'UPDATE';
```

### 5. جلب الجلسات القديمة غير المتزامنة (أقدم من 24 ساعة):

```sql
SELECT 
  id,
  staff_id,
  status,
  synced,
  sync_status,
  started_at,
  datetime('now') as current_time,
  (julianday('now') - julianday(started_at)) * 24 as hours_old
FROM work_sessions
WHERE organization_id = ?
AND synced = 0
AND started_at IS NOT NULL
AND (julianday('now') - julianday(started_at)) * 24 > 24
ORDER BY started_at ASC;
```

---

## 🛠️ إصلاح الجلسات غير المتزامنة

### السيناريو: 2/22 جلسة غير متزامنة

#### الخطوة 1: التحقق من حالة الجلسات

```sql
-- جلب الجلسات غير المتزامنة
SELECT 
  id,
  staff_id,
  status,
  synced,
  sync_status,
  pending_operation,
  started_at,
  created_at
FROM work_sessions
WHERE organization_id = ?
AND synced = 0;
```

#### الخطوة 2: التحقق من وجودها في Outbox

```sql
-- التحقق من وجود الجلسات في sync_outbox
SELECT 
  so.id,
  so.table_name,
  so.record_id,
  so.operation,
  so.status,
  so.retry_count,
  so.last_error,
  so.created_at
FROM sync_outbox so
WHERE so.table_name = 'work_sessions'
AND so.record_id IN (
  SELECT id FROM work_sessions 
  WHERE organization_id = ? AND synced = 0
);
```

#### الخطوة 3: محاولة المزامنة اليدوية

```typescript
// استدعاء syncPendingWorkSessions يدوياً
import { syncPendingWorkSessions } from '@/api/localWorkSessionService';

await syncPendingWorkSessions();
```

#### الخطوة 4: إصلاح يدوي (إذا لزم الأمر)

```sql
-- إذا كانت الجلسات متزامنة بالفعل على السيرفر
-- لكن synced لم يُحدّث محلياً
UPDATE work_sessions
SET 
  synced = 1,
  sync_status = NULL,
  pending_operation = NULL
WHERE organization_id = ?
AND id IN (
  -- IDs للجلسات التي تم التحقق من مزامنتها على السيرفر
  'session-id-1',
  'session-id-2'
);
```

---

## 📊 جدول ملخص الجداول وحقول المزامنة

| الجدول | synced | sync_status | pending_operation | local_updated_at | server_updated_at | ملاحظات |
|--------|--------|-------------|-------------------|------------------|-------------------|---------|
| `products` | ✅ | ✅ | ✅ | ✅ | ✅ | كامل |
| `orders` | ✅ | ✅ | ✅ | ✅ | ✅ | + `error`, `last_sync_attempt` |
| `customers` | ✅ | ✅ | ✅ | ✅ | ✅ | كامل |
| `invoices` | ✅ | ✅ | ✅ | ✅ | ✅ | كامل |
| `work_sessions` | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ لا يحتوي على `local_updated_at` |
| `repair_orders` | ✅ | ✅ | ✅ | ❌ | ❌ | يتم إضافة `sync_status` لاحقاً |
| `returns` | ✅ | ✅ | ✅ | ❌ | ❌ | كامل |
| `product_returns` | ✅ | ✅ | ✅ | ✅ | ✅ | كامل |
| `customer_debts` | ✅ | ✅ | ✅ | ✅ | ✅ | كامل |
| `employees` | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ يحتوي على `_synced` مكرر |
| `suppliers` | ✅ | ✅ | ✅ | ✅ | ❌ | كامل |

---

## 📝 الخلاصة

النظام يستخدم بنية موحدة ومتسقة لتتبع حالة المزامنة عبر جميع الجداول:

1. **الأعمدة الموحدة:** `synced`, `sync_status`, `pending_operation`
2. **القيم القياسية:** `synced` (0/1), `sync_status` ('pending'/'syncing'/'error'), `pending_operation` ('INSERT'/'UPDATE'/'DELETE')
3. **الفهارس:** موجودة لتحسين الأداء
4. **الاستعلامات:** موحدة عبر جميع الجداول

المشكلة الوحيدة الملحوظة هي:
- **جلسات العمل:** 2/22 غير متزامنة (يحتاج فحص)

---

**تاريخ الإنشاء:** 2024-01-XX  
**آخر تحديث:** 2024-01-XX

