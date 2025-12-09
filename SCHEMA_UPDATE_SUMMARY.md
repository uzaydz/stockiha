# ملخص تحديث أسماء الجداول والحقول

## التاريخ
$(date +"%Y-%m-%d %H:%M:%S")

## التحديثات المنفذة

### 1. أسماء الجداول المحدثة
- `'pos_orders'` → `'orders'`
- `'pos_order_items'` → `'order_items'`
- `'product_returns'` → `'returns'`
- `'loss_declarations'` → `'losses'`
- `'work_sessions'` → `'staff_work_sessions'`

### 2. الحقول المحدثة
- `synced` → `_synced` (في جميع الاستعلامات SQL)
- `sync_status` → `_sync_status` (في جميع الاستعلامات SQL)

### 3. الملفات المحدثة

#### ✅ src/database/localDb.ts
- الملف كان محدثاً مسبقاً
- يحتوي على تعليقات توضيحية للتغييرات

#### ✅ src/lib/db/tauriSqlClient.ts
- تحديث التعليقات للإشارة إلى `order_items` فقط
- تحديث التحققات من أسماء الجداول في `applyTableDefaults()`

#### ✅ src/lib/sync/delta/OutboxManager.ts
- تحديث تعليق `childTables` لإزالة الإشارة القديمة
- الملف كان محدثاً بشكل عام

#### ✅ src/lib/sync/TauriSyncService.ts
تحديثات شاملة:
- استبدال `'pos_orders'` بـ `'orders'` في جميع الـ table maps
- استبدال `synced` بـ `_synced` في جميع استعلامات UPDATE و SELECT
- استبدال `sync_status` بـ `_sync_status` في عمليات الإدراج
- تحديث التعليقات من "جدول pos_orders" إلى "جدول orders"
- تحديث حقول الطلبات:
  - `staff_id` → `employee_id`
  - `order_number` → `global_order_number` (في بعض الأماكن)

#### ✅ src/lib/sync/SyncDiagnostics.ts
تحديثات شاملة:
- جميع استعلامات `pos_orders` → `orders`
- جميع استعلامات `pos_order_items` → `order_items`
- جميع مراجع `synced` → `_synced` في WHERE و SELECT
- تحديث الحقول:
  - `product_name` → `name` في `order_items`
  - `order_number` → `global_order_number` في بعض الأماكن
- تحديث جدول `staff_work_sessions` في إحصائيات المزامنة

#### ✅ src/services/DeltaWriteService.ts
تحديثات:
- استبدال `synced: 0` بـ `_synced: 0` في create و update
- استبدال `'product_returns'` بـ `'returns'` في createReturn
- استبدال `'loss_declarations'` بـ `'losses'` في createLoss
- تحديث معالجة حقل `synced` في `saveFromServer()` للتعامل مع كل من `_synced` و `synced`

## التحقق من النتائج

تم التحقق باستخدام grep:
- ✅ لا توجد مراجع متبقية للأسماء القديمة في الملفات المحدثة
- ✅ لا توجد استعلامات SQL تستخدم `synced =` بدون underscore
- ✅ جميع الجداول المحدثة تستخدم الأسماء الموحدة

## ملاحظات مهمة

1. **التوافق العكسي**: 
   - بعض الدوال تتحقق من كل من `synced` و `_synced` للتوافق مع البيانات القديمة
   - مثال: `if (localData._synced === 1 || localData.synced === 1)`

2. **التعليقات التوضيحية**:
   - تم الحفاظ على التعليقات التي تشير إلى الأسماء القديمة مثل "كان pos_orders"
   - هذه التعليقات مفيدة للمطورين لفهم التغييرات

3. **الحقول المحلية vs Supabase**:
   - الحقول التي تبدأ بـ `_` هي حقول محلية فقط (SQLite)
   - الحقول بدون `_` متزامنة مع Supabase

## الخطوات التالية

قد تحتاج إلى:
1. تحديث الملفات الأخرى في المشروع التي تستخدم هذه الجداول
2. تحديث وثائق API إذا كانت موجودة
3. اختبار المزامنة بعد التحديثات
4. مراجعة الملفات الأخرى في `src/api/` و `src/hooks/` للتأكد من التوافق

## إحصائيات التحديث

- عدد الملفات المحدثة: 6
- عدد أسماء الجداول المحدثة: 5
- عدد الحقول المحدثة: 2 (synced, sync_status)
- إجمالي التعديلات: ~50+ موقع
