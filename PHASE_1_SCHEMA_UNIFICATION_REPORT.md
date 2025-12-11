# المرحلة 1: توحيد مخطط SQLite في Tauri مع نظام المزامنة

## ✅ ما تم إنجازه

### 1.1 مراجعة tauriSchema.ts
- ✅ تم تحديث إصدار الـ schema إلى v58
- ✅ تم التحقق من وجود الجداول الأساسية بأسماء موحدة:
  - `orders` ✅ (كان pos_orders)
  - `order_items` ✅ (كان pos_order_items)
  - `returns` ✅ (موجود)
  - `losses` ✅ (موجود)
  - `staff_work_sessions` ✅ (تم إنشاؤه)

### 1.2 مطابقة أسماء الأعمدة المهمة
- ✅ تم توحيد أعمدة المزامنة في `work_sessions` و `staff_work_sessions`:
  - `synced` ✅
  - `sync_status` ✅ (كان syncStatus)
  - `pending_operation` ✅ (كان pendingOperation)
  - `local_updated_at` ✅
  - `local_created_at` ✅
  - `server_created_at` ✅
  - `created_at` ✅
  - `updated_at` ✅
  - `organization_id` ✅

### 1.3 إزالة الازدواج التاريخي
- ✅ تم إنشاء جدول `staff_work_sessions` بنفس بنية `work_sessions`
- ✅ تم إضافة منطق ترحيل البيانات من `work_sessions` إلى `staff_work_sessions`
- ✅ تم تحديث View `pos_work_sessions` للإشارة إلى `staff_work_sessions`
- ⚠️ `product_returns` و `loss_declarations` لا تزال موجودة (للتوافق العكسي)
  - يجب مراجعة الكود الذي يستخدمها وترحيله إلى `returns` و `losses`

## 📋 الجداول المطلوبة (من sync/config.ts)

### الجداول المستقلة (INDEPENDENT_TABLES)
- ✅ `products`
- ✅ `product_categories`
- ✅ `product_subcategories`
- ✅ `customers`
- ✅ `suppliers`
- ✅ `expense_categories`
- ✅ `pos_settings`
- ✅ `organization_settings`

### الجداول المعتمدة (DEPENDENT_TABLES)
- ✅ `product_colors`
- ✅ `product_sizes`
- ✅ `product_images`
- ✅ `product_advanced_settings`
- ✅ `product_marketing_settings`
- ✅ `product_wholesale_tiers`
- ✅ `orders`
- ✅ `order_items`
- ✅ `invoices`
- ✅ `invoice_items`
- ✅ `returns`
- ✅ `return_items`
- ✅ `losses`
- ✅ `loss_items`
- ✅ `expenses`
- ✅ `recurring_expenses`
- ✅ `supplier_contacts`
- ✅ `supplier_purchases`
- ✅ `supplier_purchase_items`
- ✅ `supplier_payments`
- ✅ `staff_work_sessions` (تم إنشاؤه)
- ✅ `repair_orders`

## 🔍 أعمدة المزامنة المطلوبة

### أعمدة أساسية (موجودة في جميع الجداول المتزامنة)
- ✅ `id` (PRIMARY KEY)
- ✅ `organization_id` (إلا في NO_ORG_ID_TABLES)
- ✅ `created_at`
- ✅ `updated_at` (أو `created_at` في TIMESTAMP_OVERRIDES)

### أعمدة المزامنة المحلية (EXTRA_LOCAL_COLUMNS)
- ✅ `synced` (INTEGER DEFAULT 0)
- ✅ `sync_status` (TEXT)
- ✅ `pending_operation` (TEXT)
- ✅ `local_updated_at` (TEXT)
- ✅ `local_created_at` (TEXT)
- ✅ `server_created_at` (TEXT)
- ✅ `last_sync_attempt` (TEXT)
- ✅ `error` (TEXT)

## ⚠️ ملاحظات مهمة

### 1. الجداول القديمة (للتوافق العكسي)
- `product_returns` - لا تزال موجودة ولكن يجب استخدام `returns` بدلاً منها
- `loss_declarations` - لا تزال موجودة ولكن يجب استخدام `losses` بدلاً منها
- `work_sessions` - لا تزال موجودة ولكن يجب استخدام `staff_work_sessions` بدلاً منها

### 2. أعمدة camelCase القديمة
- بعض الجداول تحتوي على أعمدة camelCase (مثل `syncStatus`, `pendingOperation`)
- تم إضافة أعمدة snake_case الموحدة
- يجب تحديث الكود لاستخدام snake_case فقط

### 3. Views للتوافق العكسي
- `pos_work_sessions` → يشير إلى `staff_work_sessions`
- يجب إزالة هذه الـ Views في المستقبل بعد تحديث جميع الكود

## 📝 الخطوات التالية

### المرحلة 1.4 (مطلوبة)
- [ ] التحقق من تطابق أعمدة `organization_id` مع `NO_ORG_ID_TABLES`
- [ ] التحقق من تطابق `created_at`/`updated_at` مع `TIMESTAMP_OVERRIDES`
- [ ] إضافة أي أعمدة مفقودة من `EXTRA_LOCAL_COLUMNS`

### المرحلة 1.5 (مستقبلية)
- [ ] تحديث جميع الكود لاستخدام `staff_work_sessions` بدلاً من `work_sessions`
- [ ] تحديث جميع الكود لاستخدام `returns` بدلاً من `product_returns`
- [ ] تحديث جميع الكود لاستخدام `losses` بدلاً من `loss_declarations`
- [ ] إزالة الجداول القديمة بعد التأكد من عدم استخدامها
- [ ] إزالة Views التوافق العكسي

## 🔧 التغييرات المطبقة

### في tauriSchema.ts
1. ✅ تحديث SCHEMA_VERSION إلى 58
2. ✅ إضافة منطق ترحيل البيانات من `work_sessions` إلى `staff_work_sessions`
3. ✅ إنشاء جدول `staff_work_sessions` بنفس بنية `work_sessions`
4. ✅ توحيد أسماء أعمدة المزامنة (snake_case بدلاً من camelCase)
5. ✅ تحديث View `pos_work_sessions` للإشارة إلى `staff_work_sessions`

## 📊 حالة الجداول

| الجدول | الحالة | ملاحظات |
|--------|--------|---------|
| `orders` | ✅ موحد | كان `pos_orders` |
| `order_items` | ✅ موحد | كان `pos_order_items` |
| `returns` | ✅ موحد | موجود |
| `losses` | ✅ موحد | موجود |
| `staff_work_sessions` | ✅ موحد | تم إنشاؤه، كان `work_sessions` |
| `product_returns` | ⚠️ قديم | يجب استخدام `returns` |
| `loss_declarations` | ⚠️ قديم | يجب استخدام `losses` |
| `work_sessions` | ⚠️ قديم | يجب استخدام `staff_work_sessions` |

## ✅ الخلاصة

تم إنجاز الجزء الأساسي من المرحلة 1:
- ✅ توحيد أسماء الجداول الرئيسية
- ✅ توحيد أسماء أعمدة المزامنة
- ✅ إنشاء جدول `staff_work_sessions` وترحيل البيانات
- ⚠️ الجداول القديمة لا تزال موجودة للتوافق العكسي (يجب إزالتها لاحقاً)

الخطوة التالية: التحقق من تطابق جميع الأعمدة مع `sync/config.ts` وإضافة أي أعمدة مفقودة.

























