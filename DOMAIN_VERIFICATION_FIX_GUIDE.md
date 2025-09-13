# دليل إصلاح مشكلة domain_verifications

## المشكلة المُحددة

خطأ PGRST204: "Could not find the 'verification_data' column of 'domain_verifications' in the schema cache"

## تحليل المشكلة

1. **الخطأ**: الكود يحاول الوصول إلى العمود `verification_data` في جدول `domain_verifications`
2. **السبب**: العمود غير موجود في قاعدة البيانات
3. **الموقع**: 
   - `src/api/link-domain-cloudflare.js` (السطر 149 و 169)
   - `src/components/settings/CloudflareDomainSettings.tsx` (السطر 279)

## بنية الجدول الحالية

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'domain_verifications' 
ORDER BY ordinal_position;
```

**الأعمدة الموجودة:**
- `id` (uuid)
- `organization_id` (uuid) 
- `domain` (varchar)
- `status` (varchar)
- `verification_code` (varchar) - ✅ موجود
- `verified_at` (timestamp)
- `error_message` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**العمود المفقود:**
- `verification_data` (jsonb) - ❌ غير موجود

## الحل

### 1. إضافة العمود المفقود إلى قاعدة البيانات

```sql
-- إضافة العمود verification_data من نوع JSONB
ALTER TABLE domain_verifications 
ADD COLUMN IF NOT EXISTS verification_data JSONB;

-- إضافة تعليق للعمود الجديد  
COMMENT ON COLUMN domain_verifications.verification_data IS 'بيانات التحقق من النطاق (Cloudflare, DNS instructions, etc.)';

-- تحديث السجلات الموجودة بقيم افتراضية
UPDATE domain_verifications 
SET verification_data = '{}'::jsonb 
WHERE verification_data IS NULL;
```

### 2. تشغيل الإصلاح

```bash
# تشغيل ملف SQL الإصلاح
psql -h [SUPABASE_HOST] -U [USERNAME] -d [DATABASE] -f fix_domain_verifications_schema.sql
```

أو من خلال Supabase Dashboard:
1. اذهب إلى SQL Editor
2. انسخ والصق محتوى ملف `fix_domain_verifications_schema.sql`
3. اضغط Run

## التحقق من الإصلاح

بعد تشغيل الإصلاح، تحقق من:

1. **وجود العمود الجديد:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'domain_verifications' 
AND column_name = 'verification_data';
```

2. **اختبار الوظائف:**
- محاولة إضافة نطاق جديد
- التحقق من عدم ظهور خطأ PGRST204
- التأكد من حفظ بيانات التحقق بشكل صحيح

## الملفات المتأثرة

- `src/api/link-domain-cloudflare.js` - يكتب إلى `verification_data`
- `src/components/settings/CloudflareDomainSettings.tsx` - يقرأ من `verification_data`
- `src/types/domain-verification.d.ts` - يحدد نوع `verification_data`

## ملاحظات مهمة

1. **نوع البيانات**: `verification_data` من نوع JSONB لتخزين كائنات JSON معقدة
2. **البيانات المحفوظة**: يتضمن معلومات Cloudflare، تعليمات DNS، إلخ
3. **التوافق العكسي**: الإصلاح يحافظ على البيانات الموجودة

## اختبار الحل

بعد تطبيق الإصلاح:

1. اذهب إلى إعدادات النطاق في التطبيق
2. حاول إضافة نطاق جديد
3. تأكد من عدم ظهور أخطاء في وحدة التحكم
4. تحقق من حفظ البيانات في قاعدة البيانات

## في حالة استمرار المشكلة

إذا استمر الخطأ بعد إضافة العمود:

1. تأكد من إعادة تشغيل التطبيق
2. تحقق من cache قاعدة البيانات
3. تأكد من صحة أذونات الوصول للعمود الجديد
