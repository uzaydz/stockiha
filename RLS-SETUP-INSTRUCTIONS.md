# إرشادات إصلاح مشاكل Row Level Security (RLS)

## المشكلة
النظام لا يستطيع تفعيل التطبيقات الجديدة بسبب مشاكل في صلاحيات قاعدة البيانات (Row Level Security).

## الحل

### 1. تشغيل ملف SQL في Supabase

1. افتح Supabase Dashboard لمشروعك
2. انتقل إلى SQL Editor
3. انسخ والصق محتويات ملف `fix-organization-apps-rls.sql`
4. اضغط على "Run" لتنفيذ الكود

### 2. ما يقوم به الملف

#### إصلاح RLS Policies:
- إزالة أي policies قديمة متضاربة
- إنشاء policies جديدة للسماح للمستخدمين المصادقين بالوصول
- إنشاء policy للقراءة العامة (اختياري)

#### تحسين الأداء:
- إضافة indexes مناسبة
- إنشاء unique constraints لمنع التكرار

#### Functions آمنة:
- `enable_organization_app()` - لتفعيل التطبيقات بطريقة آمنة
- `disable_organization_app()` - لإلغاء تفعيل التطبيقات
- `get_organization_apps_debug()` - للتشخيص

#### Validation:
- Triggers للتأكد من صحة البيانات
- منع القيم الفارغة أو null

### 3. التحقق من نجاح التطبيق

بعد تشغيل الملف، ستحصل على نتائج التشخيص في نهاية الاستعلام:

```
check_type     | status
---------------|--------
RLS Status     | Enabled
Policies Count | 3
Table Exists   | Yes
```

### 4. اختبار النظام

1. قم بتحديث صفحة التطبيقات في النظام
2. جرب تفعيل تطبيق جديد
3. تحقق من Console logs للتأكد من عدم وجود أخطاء RLS

### 5. استكشاف الأخطاء

إذا استمرت المشاكل، استخدم function التشخيص:

```sql
SELECT * FROM get_organization_apps_debug('6c2ed605-0880-4e40-af50-78f80f7283bb');
```

### 6. ملاحظات مهمة

- **الأمان**: الملف يستخدم `SECURITY DEFINER` للـ functions مما يعني أنها تعمل بصلاحيات المالك
- **الأداء**: تم إضافة indexes لتحسين أداء الاستعلامات
- **التوافق**: الملف متوافق مع النظام الحالي ولن يؤثر على البيانات الموجودة

### 7. البيانات التجريبية

يحتوي الملف على قسم لإضافة بيانات تجريبية (معلق افتراضياً). يمكنك إلغاء التعليق إذا كنت تريد إضافة بيانات للاختبار.

### 8. في حالة الطوارئ

إذا تسبب الملف في مشاكل، يمكنك التراجع عنه:

```sql
-- إزالة الـ policies
DROP POLICY IF EXISTS "Allow authenticated users to access organization apps" ON organization_apps;
DROP POLICY IF EXISTS "Allow public read access to organization apps" ON organization_apps;
DROP POLICY IF EXISTS "Allow authenticated users to modify organization apps" ON organization_apps;

-- إلغاء تفعيل RLS مؤقتاً (غير آمن)
ALTER TABLE organization_apps DISABLE ROW LEVEL SECURITY;
```

## الخطوات التالية

بعد تطبيق الحل:

1. ✅ تم حل مشكلة RLS policies
2. ✅ تم تحسين الأداء
3. ✅ تم إضافة validation
4. ✅ تم إضافة functions آمنة
5. ✅ تم تحديث كود AppsContext لاستخدام الـ functions الجديدة

النظام الآن يجب أن يعمل بشكل طبيعي لتفعيل وإلغاء تفعيل التطبيقات.