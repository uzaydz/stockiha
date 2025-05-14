# الحل النهائي لمشكلة مزامنة رسوم ياليدين

## تشخيص المشكلة

وجدنا أن المشكلة الرئيسية هي:

1. يتم جلب بيانات رسوم الشحن من API ياليدين بنجاح
2. يتم إدخال البيانات في جدول `yalidine_fees` في قاعدة البيانات
3. يتم حذف البيانات تلقائياً بسبب:
   - قيد CASCADE على حقل `organization_id`
   - خطأ في دالة الحذف `delete_yalidine_fees_for_organization` عندما تحاول استخدام وظيفة تجميعية في عبارة RETURNING
4. المشاكل الإضافية:
   - عدم وجود تزامن بين الحقول المتشابهة (`express_home`/`home_fee` و `express_desk`/`stop_desk_fee`)
   - عدم وجود قيد فرادة مناسب يمنع تكرار نفس البيانات
   - عدم وجود دوال آمنة للإدراج والتحديث في قاعدة البيانات

## الحلول المقدمة

قمنا بإنشاء عدة ملفات SQL تعالج هذه المشاكل:

### 1. fix_yalidine_delete_function.sql
إصلاح دالة الحذف للتعامل مع خطأ "aggregate functions are not allowed in RETURNING"

### 2. fix_yalidine_insert_upsert.sql
إضافة دوال جديدة للإدراج والتحديث (upsert) في جدول yalidine_fees باستخدام وظائف قاعدة البيانات

### 3. yalidine_fees_fix_cascade.sql
إصلاح سريع لقيد المفتاح الأجنبي organization_id من CASCADE إلى RESTRICT

### 4. yalidine_final_solution.sql
حل شامل يجمع جميع الإصلاحات في ملف واحد متكامل، ويشمل:
- إصلاح قيود المفاتيح الأجنبية
- دالة حذف البيانات القديمة
- دوال الإدراج والتحديث
- دالة للتحقق من صحة البيانات
- ترغر لمزامنة الحقول

## كيفية تطبيق الحل

### 1. التطبيق السريع

إذا كنت تريد حلاً سريعاً، قم بتنفيذ:
```sql
-- تنفيذ الإصلاح السريع
\i migrations/yalidine_fees_fix_cascade.sql
```

### 2. التطبيق الشامل

للحصول على حل كامل ونهائي، قم بتنفيذ:
```sql
-- تنفيذ الحل النهائي
\i migrations/yalidine_final_solution.sql
```

### 3. التحقق من نجاح الإصلاح

بعد تطبيق الحل، قم بالتحقق من صحة البيانات:
```sql
-- التحقق من صحة البيانات (جميع المؤسسات)
SELECT * FROM check_yalidine_fees_health();

-- التحقق من صحة البيانات (مؤسسة محددة)
SELECT * FROM check_yalidine_fees_health('معرف_المؤسسة'::UUID);
```

## مشكلة الخطأ "aggregate functions are not allowed in RETURNING"

هذا الخطأ ظهر في سجلات التطبيق:
```
[FEES] خطأ في حذف بيانات الأسعار القديمة: aggregate functions are not allowed in RETURNING
```

تم حل هذه المشكلة في دالة `delete_yalidine_fees_for_organization` باستخدام نهج WITH لتنفيذ عملية الحذف ثم العد بشكل منفصل.

## ملاحظات هامة

1. عندما تقوم بالمزامنة، سترى تنفيذ دالة الحذف بنجاح باستخدام الطريقة البديلة الآن
2. يجب أن تكون البيانات محفوظة في قاعدة البيانات بعد المزامنة، ولا يتم حذفها تلقائياً
3. إذا كنت ترغب في استخدام دوال الإدراج الجديدة (بدلاً من upsert المباشر) في التطبيق، ستحتاج إلى تحديث ملف fees-sync.ts

## تعديلات أخرى

يمكنك أيضاً تعديل ملف fees-sync.ts لاستخدام دالة `batch_upsert_yalidine_fees` الجديدة عن طريق:

```typescript
// استخدام دالة batch_upsert_yalidine_fees بدلاً من upsert المباشر
const batchData = JSON.stringify(batch);
const { data, error } = await supabase.rpc('batch_upsert_yalidine_fees', {
  p_data: batchData
});
```

## للمساعدة

إذا واجهتك أي مشاكل أخرى، لا تتردد في التواصل. 