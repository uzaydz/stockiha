# دليل حل مشكلة إنشاء المنظمات في Bazaar Console

## المشكلة
تحدث أخطاء متكررة عند محاولة إنشاء منظمة جديدة مع رسالة الخطأ:
> there is no unique or exclusion constraint matching the ON CONFLICT specification

هذا يعني أن وظائف SQL تستخدم عبارة `ON CONFLICT` دون تحديد القيد الفريد أو عمود محدد للتعامل مع حالات التكرار.

## الحل المقترح

### 1. تطبيق تعديلات قاعدة البيانات

1. قم بتنفيذ ملف SQL `fix_organization_function.sql` في قاعدة بيانات Supabase:
   ```
   cat fix_organization_function.sql | supabase db sql
   ```
   أو انسخه مباشرة في لوحة تحكم Supabase في علامة تبويب SQL.

2. تحقق من تطبيق التعديلات:
   ```sql
   SELECT routine_name, routine_definition
   FROM information_schema.routines
   WHERE routine_name IN ('insert_organization_simple', 'create_organization_safe')
   ```

### 2. استبدال ملفات التطبيق

1. انسخ ملف `organization-creation-fixed.ts` إلى المجلد `src/lib/api/`
2. انسخ ملف `tenant-registration-fixed.ts` إلى المجلد `src/lib/api/`

### 3. تعديل الاستيرادات في التطبيق

1. افتح ملف `TenantRegistrationForm.tsx` وقم بتعديل الاستيراد:

   ```typescript
   // استبدل هذا الاستيراد
   import { registerTenant } from '@/lib/api/tenant-registration';
   
   // بهذا الاستيراد
   import { registerTenant } from '@/lib/api/tenant-registration-fixed';
   ```

## التغييرات الرئيسية

1. إصلاح وظيفة `insert_organization_simple` لتتجنب استخدام `ON CONFLICT` غير المحدد
2. إنشاء وظيفة `create_organization_safe` جديدة في قاعدة البيانات
3. إنشاء وظيفة `createOrganizationSafe` محسنة في التطبيق تعتمد على التحقق المسبق من وجود النطاق الفرعي
4. استخدام `upsert` بدلاً من `insert` مع تحديد `onConflict: 'id'` لمنع أخطاء الإدراج المتكرر
5. معالجة محسنة للأخطاء والحالات الاستثنائية

## التوجيهات الإضافية

1. هذا الحل يحافظ على التوافق مع الكود الموجود، ويمكن اعتماد الوظائف المحسنة تدريجياً
2. ملفات الكود الأصلية لم يتم تعديلها، بل تم إنشاء ملفات جديدة لمنع أي تعارض مع العمل الحالي
3. الحل الأمثل على المدى الطويل هو دمج هذه التغييرات في الكود الأساسي واختبارها بشكل شامل

## إجراءات ما بعد التطبيق

1. اختبار إنشاء منظمات جديدة
2. مراقبة سجلات الأخطاء
3. النظر في ترقية الوظائف الأخرى بنفس المنهجية إذا لزم الأمر

تم تصميم هذا الحل للتعامل مع مشكلة `ON CONFLICT` والحد من آثارها الجانبية، مع الحفاظ على وظائف النظام الأساسية. 