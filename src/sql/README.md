# ملفات تكامل خدمات الشحن

هذا المجلد يحتوي على ملفات SQL لتكامل خدمات الشحن المختلفة مع نظام البازار.

## تكامل ZR Express

لتنفيذ تكامل ZR Express، قم بتنفيذ الملفات التالية بالترتيب:

1. `zrexpress_integration.sql` - تحديث إعدادات ZR Express وإنشاء وظائف مساعدة
2. `zrexpress_form_integration.sql` - إنشاء نماذج افتراضية للمؤسسات التي تستخدم ZR Express

### كيفية التنفيذ

1. قم بتسجيل الدخول إلى قاعدة البيانات:

```bash
psql -U username -d bazaar_db
```

2. نفذ ملفات SQL:

```sql
\i /path/to/zrexpress_integration.sql
\i /path/to/zrexpress_form_integration.sql
```

### التكوين الإضافي

بعد تنفيذ الملفات SQL، تأكد من تكوين الإعدادات التالية في واجهة المستخدم:

1. انتقل إلى "الإعدادات" > "خدمات الشحن" في لوحة التحكم
2. قم بتفعيل ZR Express وإدخال مفاتيح API (token و key)
3. قم بالتأكد من أن النموذج الافتراضي قد تم إنشاؤه بنجاح

## استكشاف الأخطاء وإصلاحها

في حال واجهت مشاكل أثناء التكامل:

1. تأكد من تنفيذ ملفات SQL بنجاح دون أي أخطاء
2. تحقق من أن مفاتيح API لـ ZR Express صحيحة
3. تحقق من سجلات الخطأ للحصول على معلومات أكثر تفصيلاً
4. تأكد من أن عنوان URL الأساسي لـ ZR Express صحيح (`https://procolis.com/api_v1/`)

إذا استمرت المشاكل، يمكنك تجربة إعادة ضبط التكامل عن طريق:

```sql
-- حذف الإعدادات الحالية
DELETE FROM shipping_provider_settings 
WHERE provider_id IN (SELECT id FROM shipping_providers WHERE code = 'zrexpress');

-- إعادة تنفيذ ملفات التكامل
\i /path/to/zrexpress_integration.sql
\i /path/to/zrexpress_form_integration.sql
``` 