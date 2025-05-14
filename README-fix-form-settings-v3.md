# إصلاح مشكلة حفظ إعدادات التكامل مع شركة الشحن في النماذج (الإصدار الثالث)

## المشكلة

بعد تطبيق الإصلاحات السابقة، ظهرت مشكلتان إضافيتان:

1. خطأ 404 (Not Found) عند محاولة استدعاء وظيفة `upsert_form_settings` عبر Supabase REST API:
   ```
   POST https://wrnssatuvmumsczyldth.supabase.co/rest/v1/rpc/upsert_form_settings 404 (Not Found)
   ```

2. خطأ في الوظيفة بسبب عدم وجود `uuid_nil()`:
   ```
   Error saving form settings: {code: '42883', details: null, hint: 'No function matches the given name and argument types. You might need to add explicit type casts.', message: 'function uuid_nil() does not exist'}
   ```

## الحل

تم إنشاء ملف SQL `fix_form_settings_function_v3.sql` يحتوي على الإصلاحات التالية:

1. إنشاء وظيفة `uuid_nil()` لتوفير UUID صفري (00000000-0000-0000-0000-000000000000)
2. إصلاح وظيفة `upsert_form_settings` مع المحافظة على التحسينات السابقة
3. إضافة منح صلاحيات التنفيذ (GRANT EXECUTE) لجعل الوظيفة متاحة عبر واجهة RPC في Supabase

## الوظائف المحسنة

1. **uuid_nil()**: وظيفة مساعدة توفر قيمة UUID صفرية.

2. **upsert_form_settings()**: الوظيفة الرئيسية لإنشاء أو تحديث إعدادات النموذج، مع دعم إعدادات تكامل الشحن.

3. **test_shipping_integration_settings()**: وظيفة اختبار للتحقق من حفظ إعدادات تكامل الشحن بشكل صحيح.

## كيفية تطبيق الإصلاح

1. قم بتنفيذ الملف SQL على قاعدة البيانات:
   ```bash
   psql -U [username] -d [database] -f fix_form_settings_function_v3.sql
   ```

   أو يمكنك نسخ محتوى الملف وتنفيذه في واجهة إدارة قاعدة البيانات مثل pgAdmin أو Supabase.

2. بعد تنفيذ الإصلاح، يمكنك التحقق من صحة الإصلاح باستخدام الاستعلام التالي:
   ```sql
   SELECT id, name, settings FROM form_settings;
   ```

3. اختبار وظيفة RPC من الواجهة الأمامية:
   ```js
   const { data, error } = await supabase.rpc('upsert_form_settings', {
     p_organization_id: '...',
     p_name: '...',
     p_fields: {},
     p_shipping_integration: { enabled: true, provider: 'yalidine' }
   });

   if (error) console.error('Error:', error);
   else console.log('Success:', data);
   ```

## التغييرات الرئيسية عن الإصدار السابق

1. إضافة وظيفة `uuid_nil()` المفقودة
2. إضافة منح صلاحيات التنفيذ (GRANT EXECUTE) لأدوار المستخدمين المختلفة
3. الحفاظ على جميع التحسينات السابقة المتعلقة بـ SECURITY DEFINER وسياسات RLS

## ملاحظات إضافية

- تأكد من أن المستخدم لديه الصلاحيات المناسبة للوصول إلى الوظيفة.
- إذا كنت تستخدم Supabase، قد تحتاج إلى إعادة تشغيل خدمة Postgres لتطبيق التغييرات. 