# خطة توحيد Schema قاعدة البيانات المحلية مع Supabase

## تاريخ التحليل: 2025-12-01

---

## 1. ملخص المشكلة

قاعدة البيانات المحلية (SQLite) تستخدم أسماء جداول وأعمدة مختلفة عن Supabase، مما يسبب:
- أخطاء مزامنة متكررة
- الحاجة لـ COLUMN_MAP و LOCAL_ONLY_COLUMNS معقدة
- صعوبة الصيانة

---

## 2. تحليل الاختلافات

### 2.1 اختلافات أسماء الجداول

| المحلي (SQLite) | السيرفر (Supabase) | الإجراء |
|-----------------|-------------------|---------|
| `pos_orders` | `orders` | إعادة تسمية → `orders` |
| `pos_order_items` | `order_items` | إعادة تسمية → `order_items` |
| `work_sessions` | `pos_work_sessions` | إعادة تسمية → `pos_work_sessions` |
| `product_returns` | `returns` | إعادة تسمية → `returns` |
| `loss_declarations` | `losses` | إعادة تسمية → `losses` |

### 2.2 اختلافات أعمدة جدول Orders

| المحلي | السيرفر | الإجراء |
|--------|---------|---------|
| `total_amount` | `total` | إعادة تسمية |
| `paid_amount` | `amount_paid` | إعادة تسمية |
| `staff_id` | `employee_id` | إعادة تسمية |
| `order_number` | `slug` / `global_order_number` | إعادة تسمية |
| `work_session_id` | ❌ غير موجود | **إضافة للسيرفر** أو حذف |
| `customer_name` | ❌ غير موجود | حذف (استخدام `customer_id`) |
| `customer_phone` | ❌ غير موجود | حذف |
| `customer_address` | ❌ غير موجود | حذف |
| `customer_email` | ❌ غير موجود | حذف |
| `wilaya`, `commune` | ❌ غير موجود | حذف |
| `channel` | ❌ غير موجود | حذف أو إضافة للسيرفر |
| `receipt_printed` | ❌ غير موجود | حذف (محلي فقط) |
| `shipping_company` | ❌ غير موجود | حذف |
| ❌ غير موجود | `shipping_address_id` | إضافة محلياً |
| ❌ غير موجود | `shipping_method` | إضافة محلياً |
| ❌ غير موجود | `shipping_cost` | إضافة محلياً |
| ❌ غير موجود | `is_online` | إضافة محلياً |
| ❌ غير موجود | `customer_order_number` | إضافة محلياً |
| ❌ غير موجود | `consider_remaining_as_partial` | إضافة محلياً |
| ❌ غير موجود | `pos_order_type` | إضافة محلياً |
| ❌ غير موجود | `completed_at` | إضافة محلياً |
| ❌ غير موجود | `customer_notes` | إضافة محلياً |
| ❌ غير موجود | `admin_notes` | إضافة محلياً |
| ❌ غير موجود | `call_confirmation_status_id` | إضافة محلياً |
| ❌ غير موجود | `created_by_staff_id` | إضافة محلياً |
| ❌ غير موجود | `created_by_staff_name` | إضافة محلياً |

### 2.3 اختلافات أعمدة جدول Order Items

| المحلي | السيرفر | الإجراء |
|--------|---------|---------|
| `subtotal` | `total_price` | إعادة تسمية |
| `product_name` | `name` | إعادة تسمية |
| `discount` | ❌ غير موجود | حذف |
| `discount_amount` | ❌ غير موجود | حذف |
| `discount_type` | ❌ غير موجود | حذف |
| `barcode` | ❌ غير موجود | حذف |
| `cost` | ❌ غير موجود | حذف |
| `image_url` | ❌ غير موجود | حذف |
| ❌ غير موجود | `is_digital` | إضافة محلياً |
| ❌ غير موجود | `slug` | إضافة محلياً |
| ❌ غير موجود | `is_wholesale` | موجود ✓ |
| ❌ غير موجود | `original_price` | موجود ✓ |
| ❌ غير موجود | `variant_info` | إضافة محلياً |
| ❌ غير موجود | `variant_display_name` | إضافة محلياً |
| ❌ غير موجود | `sale_type` | إضافة محلياً |

### 2.4 أعمدة Sync المحلية فقط (تبقى محلية)

هذه الأعمدة ضرورية للمزامنة ولا تُرسل للسيرفر:
- `synced` / `syncStatus` / `sync_status`
- `pendingOperation` / `pending_operation`
- `lastSyncAttempt` / `last_sync_attempt`
- `error`
- `local_created_at` / `server_created_at`
- `created_at_ts` (timestamp رقمي)

---

## 3. خطة التنفيذ

### المرحلة 1: Migration للسيرفر (إذا لزم الأمر)

إضافة الأعمدة المفقودة في Supabase:

```sql
-- إضافة work_session_id للطلبات (اختياري)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS work_session_id UUID REFERENCES pos_work_sessions(id);

-- أو يمكن تجاهلها وإبقاؤها محلية فقط
```

### المرحلة 2: إعادة هيكلة الجداول المحلية

#### 2.1 إعادة تسمية الجداول

```typescript
// التغييرات المطلوبة في tauriSchema.ts

// قبل:
CREATE TABLE IF NOT EXISTS pos_orders (...)
CREATE TABLE IF NOT EXISTS pos_order_items (...)
CREATE TABLE IF NOT EXISTS work_sessions (...)

// بعد:
CREATE TABLE IF NOT EXISTS orders (...)
CREATE TABLE IF NOT EXISTS order_items (...)
CREATE TABLE IF NOT EXISTS pos_work_sessions (...)
```

#### 2.2 إعادة تسمية الأعمدة في جدول orders

```sql
-- Migration script للجدول المحلي
CREATE TABLE orders_new (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL DEFAULT 0,                    -- كان: total_amount
    status TEXT DEFAULT 'completed',
    payment_method TEXT,
    payment_status TEXT,
    shipping_address_id TEXT,
    shipping_method TEXT,
    shipping_cost REAL DEFAULT 0,
    notes TEXT,
    is_online INTEGER DEFAULT 0,
    employee_id TEXT,                        -- كان: staff_id
    created_at TEXT DEFAULT '',
    updated_at TEXT DEFAULT '',
    organization_id TEXT DEFAULT '',
    slug TEXT,
    customer_order_number INTEGER,
    amount_paid REAL DEFAULT 0,              -- كان: paid_amount
    remaining_amount REAL DEFAULT 0,
    consider_remaining_as_partial INTEGER DEFAULT 0,
    metadata TEXT,
    pos_order_type TEXT,
    completed_at TEXT,
    customer_notes TEXT,
    admin_notes TEXT,
    call_confirmation_status_id TEXT,
    global_order_number INTEGER,
    created_by_staff_id TEXT,
    created_by_staff_name TEXT,

    -- أعمدة Sync (محلية فقط)
    synced INTEGER DEFAULT 0,
    sync_status TEXT,
    pending_operation TEXT,
    last_sync_attempt TEXT,
    error TEXT,
    local_created_at TEXT,
    server_created_at TEXT,
    created_at_ts INTEGER
);

-- نقل البيانات
INSERT INTO orders_new SELECT
    id,
    customer_id,
    COALESCE(subtotal, total_amount, 0) as subtotal,
    COALESCE(tax, 0) as tax,
    COALESCE(discount, 0) as discount,
    COALESCE(total, total_amount, 0) as total,
    status,
    payment_method,
    payment_status,
    NULL as shipping_address_id,
    NULL as shipping_method,
    0 as shipping_cost,
    notes,
    0 as is_online,
    COALESCE(employee_id, staff_id) as employee_id,
    created_at,
    updated_at,
    organization_id,
    order_number as slug,
    NULL as customer_order_number,
    COALESCE(amount_paid, paid_amount, 0) as amount_paid,
    remaining_amount,
    consider_remaining_as_partial,
    NULL as metadata,
    NULL as pos_order_type,
    NULL as completed_at,
    NULL as customer_notes,
    NULL as admin_notes,
    NULL as call_confirmation_status_id,
    NULL as global_order_number,
    NULL as created_by_staff_id,
    NULL as created_by_staff_name,
    synced,
    sync_status,
    pending_operation,
    last_sync_attempt,
    error,
    local_created_at,
    server_created_at,
    created_at_ts
FROM pos_orders;

-- حذف الجدول القديم
DROP TABLE pos_orders;

-- إعادة تسمية
ALTER TABLE orders_new RENAME TO orders;
```

#### 2.3 إعادة تسمية الأعمدة في جدول order_items

```sql
CREATE TABLE order_items_new (
    id TEXT PRIMARY KEY,
    order_id TEXT DEFAULT '',
    product_id TEXT DEFAULT '',
    product_name TEXT,                       -- يبقى للتوافق
    name TEXT,                               -- الاسم الرسمي
    quantity INTEGER DEFAULT 1,
    unit_price REAL DEFAULT 0,
    total_price REAL DEFAULT 0,              -- كان: subtotal
    is_digital INTEGER DEFAULT 0,
    organization_id TEXT DEFAULT '',
    slug TEXT,
    is_wholesale INTEGER DEFAULT 0,
    original_price REAL,
    created_at TEXT DEFAULT '',
    variant_info TEXT,
    color_id TEXT,
    size_id TEXT,
    color_name TEXT,
    size_name TEXT,
    variant_display_name TEXT,
    sale_type TEXT,
    selling_unit_type TEXT DEFAULT 'piece',
    weight_sold REAL,
    weight_unit TEXT,
    price_per_weight_unit REAL,
    meters_sold REAL,
    price_per_meter REAL,
    boxes_sold INTEGER,
    units_per_box INTEGER,
    box_price REAL,
    batch_id TEXT,
    batch_number TEXT,
    expiry_date TEXT,
    serial_numbers TEXT,

    -- أعمدة Sync (محلية فقط)
    synced INTEGER DEFAULT 0,
    sync_status TEXT,
    pending_operation TEXT
);
```

### المرحلة 3: تحديث الكود

#### 3.1 تحديث الملفات التي تستخدم أسماء الجداول القديمة

```bash
# البحث عن كل الاستخدامات
grep -r "pos_orders" src/
grep -r "pos_order_items" src/
grep -r "work_sessions" src/
grep -r "total_amount" src/
grep -r "paid_amount" src/
grep -r "staff_id" src/
```

#### 3.2 حذف COLUMN_MAP و LOCAL_ONLY_COLUMNS المعقدة

بعد التوحيد، يمكن تبسيط `config.ts`:

```typescript
export const SYNC_CONFIG = {
    // لا حاجة لـ TABLE_MAP بعد التوحيد
    TABLE_MAP: {},

    // لا حاجة لـ COLUMN_MAP بعد التوحيد
    COLUMN_MAP: {},

    // فقط الأعمدة المحلية للـ Sync
    LOCAL_ONLY_COLUMNS: {
        '*': [  // لكل الجداول
            'synced', 'sync_status', 'pending_operation',
            'last_sync_attempt', 'error',
            'local_created_at', 'server_created_at', 'created_at_ts'
        ]
    }
};
```

### المرحلة 4: Migration للبيانات الموجودة

```typescript
async function migrateLocalDatabase(organizationId: string) {
    // 1. إنشاء الجداول الجديدة
    await createNewTables(organizationId);

    // 2. نقل البيانات مع تحويل الأسماء
    await migrateOrdersData(organizationId);
    await migrateOrderItemsData(organizationId);
    await migrateWorkSessionsData(organizationId);

    // 3. حذف الجداول القديمة
    await dropOldTables(organizationId);

    // 4. تحديث الفهارس
    await recreateIndexes(organizationId);
}
```

---

## 4. الملفات المتأثرة

### 4.1 ملفات Schema
- `src/lib/db/tauriSchema.ts` - تعريف الجداول
- `src/lib/sync/config.ts` - إعدادات المزامنة

### 4.2 ملفات الخدمات
- `src/api/posOrdersService.ts`
- `src/api/localPosOrderService.ts`
- `src/context/shop/posOrderService.ts`
- `src/services/DeltaWriteService.ts`

### 4.3 ملفات المزامنة
- `src/lib/sync/PushEngine.ts`
- `src/lib/sync/PullEngine.ts`
- `src/lib/sync/delta/OutboxManager.ts`
- `src/lib/sync/SyncManager.ts`

### 4.4 ملفات الـ Hooks والمكونات
- `src/hooks/useOptimizedOrders.ts`
- `src/hooks/usePOSAdvancedState.ts`
- `src/components/pos-orders/*.tsx`

---

## 5. ترتيب التنفيذ

1. ✅ **إنشاء backup كامل**
2. ⏳ **تحديث tauriSchema.ts** بالـ schema الجديد
3. ⏳ **كتابة migration script** لنقل البيانات
4. ⏳ **تحديث الخدمات** لاستخدام الأسماء الجديدة
5. ⏳ **تحديث config.ts** وحذف COLUMN_MAP
6. ⏳ **اختبار شامل** للمزامنة
7. ⏳ **تنظيف الكود** القديم

---

## 6. المخاطر والتحفظات

### 6.1 المخاطر
- ⚠️ فقدان بيانات أثناء Migration
- ⚠️ توقف المزامنة مؤقتاً
- ⚠️ عدم توافق مع الإصدارات القديمة

### 6.2 الحلول
- إنشاء backup قبل أي تغيير
- إضافة version check في التطبيق
- Migration تدريجي مع rollback

---

## 7. الجدول الزمني المقترح

| المرحلة | المدة المقدرة | الأولوية |
|---------|--------------|----------|
| تحديث Schema | 2-3 ساعات | عالية |
| Migration Script | 2-3 ساعات | عالية |
| تحديث الخدمات | 4-6 ساعات | عالية |
| تحديث المكونات | 2-3 ساعات | متوسطة |
| الاختبار | 2-3 ساعات | عالية |
| التنظيف | 1-2 ساعات | منخفضة |

**المجموع: ~15-20 ساعة عمل**

---

## 8. الخلاصة

التوحيد سيؤدي إلى:
- ✅ كود أبسط وأسهل صيانة
- ✅ مزامنة أسرع وأكثر موثوقية
- ✅ أخطاء أقل
- ✅ سهولة إضافة ميزات جديدة

هل تريد البدء بتنفيذ هذه الخطة؟
