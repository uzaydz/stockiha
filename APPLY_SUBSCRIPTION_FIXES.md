# تعليمات تطبيق إصلاحات الاشتراكات

## المشاكل التي تم إصلاحها

### 1. الأيام المتبقية تظهر رغم إلغاء الاشتراك
- **المشكلة**: عند إلغاء اشتراك، يظهر 29 يوم متبقي بدلاً من 0
- **الحل**: تحديث `end_date` إلى الآن عند الإلغاء، وحساب الأيام المتبقية = 0 للاشتراكات الملغاة

### 2. الفترة التجريبية تظهر بعد إلغاء الاشتراك
- **المشكلة**: بعد إلغاء الاشتراك، تظهر "6 أيام تجريبي"
- **الحل**: إلغاء الفترة التجريبية بتعيين `trial_end_date` إلى الأمس في جدول `organizations`

### 3. Tier يظهر للمؤسسات الملغى اشتراكها
- **المشكلة**: في قائمة المؤسسات، تظهر الباقة "متميز" رغم أن الحالة "منتهي"
- **الحل**: تعيين `subscription_tier = NULL` عند إلغاء الاشتراك

### 4. خطأ Unique Constraint عند إلغاء اشتراك مرتين
- **المشكلة**: `duplicate key value violates unique constraint "organization_subscriptions_organization_id_status_key"`
- **الحل**: حذف الاشتراكات الملغاة السابقة قبل إنشاء اشتراك ملغى جديد

## الملفات التي تم تحديثها

### 1. الدوال (Functions)
- `supabase/functions/admin_terminate_subscription.sql`
- `supabase/functions/admin_upsert_subscription.sql`
- `supabase/functions/admin_get_organizations_with_subscriptions.sql`
- `supabase/functions/get_unified_subscription_data.sql`

### 2. Migrations
- `supabase/migrations/current/20251102_fix_admin_get_organizations_types.sql`
- `supabase/migrations/current/20251102_fix_subscription_cancellation.sql`
- `supabase/migrations/current/20251102_fix_unified_subscription_data.sql`
- `supabase/migrations/current/20251102_fix_admin_upsert_subscription.sql`
- `supabase/migrations/current/20251102_fix_existing_canceled_subscriptions.sql`

## خطوات التطبيق

### الطريقة 1: تطبيق الدوال مباشرة (موصى بها)

في Supabase Dashboard -> SQL Editor، قم بتشغيل الملفات التالية بالترتيب:

```sql
-- 1. تطبيق إصلاح دالة admin_terminate_subscription
\i supabase/migrations/current/20251102_fix_subscription_cancellation.sql

-- 2. تطبيق إصلاح دالة admin_upsert_subscription
\i supabase/migrations/current/20251102_fix_admin_upsert_subscription.sql

-- 3. تطبيق إصلاح دالة admin_get_organizations_with_subscriptions
\i supabase/migrations/current/20251102_fix_admin_get_organizations_types.sql

-- 4. تطبيق إصلاح دالة get_unified_subscription_data
\i supabase/migrations/current/20251102_fix_unified_subscription_data.sql

-- 5. إصلاح الاشتراكات الملغاة الموجودة حالياً
\i supabase/migrations/current/20251102_fix_existing_canceled_subscriptions.sql
```

### الطريقة 2: نسخ ولصق مباشر

إذا لم تعمل الطريقة الأولى، قم بنسخ محتوى كل ملف ولصقه في SQL Editor:

#### الخطوة 1: إصلاح دالة admin_terminate_subscription
```sql
-- انسخ محتوى:
-- supabase/migrations/current/20251102_fix_subscription_cancellation.sql
```

#### الخطوة 2: إصلاح دالة admin_upsert_subscription
```sql
-- انسخ محتوى:
-- supabase/migrations/current/20251102_fix_admin_upsert_subscription.sql
```

#### الخطوة 3: إصلاح دالة admin_get_organizations_with_subscriptions
```sql
-- انسخ محتوى:
-- supabase/migrations/current/20251102_fix_admin_get_organizations_types.sql
```

#### الخطوة 4: إصلاح دالة get_unified_subscription_data
```sql
-- انسخ محتوى:
-- supabase/migrations/current/20251102_fix_unified_subscription_data.sql
```

#### الخطوة 5: إصلاح البيانات الموجودة
```sql
-- انسخ محتوى:
-- supabase/migrations/current/20251102_fix_existing_canceled_subscriptions.sql
```

## التحقق من التطبيق

بعد تطبيق الإصلاحات، قم بالتحقق:

### 1. التحقق من تحديث الدوال
```sql
-- التحقق من آخر تحديث لدالة admin_terminate_subscription
SELECT
  p.proname,
  pg_get_functiondef(p.oid) LIKE '%FIX%' as has_fixes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_terminate_subscription',
    'admin_upsert_subscription',
    'admin_get_organizations_with_subscriptions',
    'get_unified_subscription_data'
  );
```

### 2. اختبار إلغاء اشتراك
```sql
-- اختبر إلغاء اشتراك مؤسسة
SELECT admin_terminate_subscription(
  'organization-uuid-here'::UUID,
  false, -- don't keep courses access
  'testing_fix',
  'Testing subscription cancellation fix'
);
```

### 3. التحقق من النتائج
```sql
-- تحقق من حالة المؤسسة بعد الإلغاء
SELECT
  id,
  name,
  subscription_status,
  subscription_tier,
  settings->>'trial_end_date' as trial_end_date
FROM organizations
WHERE id = 'organization-uuid-here'::UUID;

-- تحقق من الاشتراكات
SELECT
  id,
  status,
  start_date,
  end_date,
  EXTRACT(DAY FROM (end_date - CURRENT_TIMESTAMP))::INTEGER as days_remaining
FROM organization_subscriptions
WHERE organization_id = 'organization-uuid-here'::UUID
ORDER BY created_at DESC;
```

## النتائج المتوقعة

بعد التطبيق الناجح:

✅ عند إلغاء اشتراك:
- `subscription_status` = `'canceled'`
- `subscription_tier` = `NULL`
- `end_date` = التاريخ والوقت الحالي
- الأيام المتبقية = `0`
- `trial_end_date` = تاريخ في الماضي (الأمس)

✅ في قائمة المؤسسات (Super Admin):
- الأيام المتبقية تظهر `0` للاشتراكات الملغاة
- لا تظهر الباقة (tier) للاشتراكات الملغاة
- الحالة تظهر "canceled" بوضوح

✅ في صفحة المؤسسة:
- لا تظهر رسالة "6 أيام تجريبي"
- تظهر رسالة واضحة أن الاشتراك ملغى
- الأيام المتبقية = `0`

✅ إعادة الاشتراك:
- يمكن إنشاء اشتراك جديد بدون أخطاء
- لا يحدث خطأ unique constraint

## استكشاف الأخطاء

### خطأ: "function already exists"
```sql
-- قم بإضافة DROP FUNCTION قبل CREATE
DROP FUNCTION IF EXISTS admin_terminate_subscription(UUID, BOOLEAN, TEXT, TEXT);
```

### خطأ: "permission denied"
تأكد أنك متصل كـ `postgres` user أو لديك صلاحيات `SECURITY DEFINER`

### الاشتراكات القديمة لا تزال تظهر أيام متبقية
```sql
-- قم بتشغيل script إصلاح البيانات الموجودة
\i supabase/migrations/current/20251102_fix_existing_canceled_subscriptions.sql
```

## ملاحظات مهمة

⚠️ **تنبيه**: هذه الإصلاحات تقوم بـ:
1. حذف الاشتراكات الملغاة/المنتهية السابقة عند إلغاء اشتراك جديد
2. تحديث `end_date` للاشتراكات الملغاة إلى التاريخ الحالي
3. إلغاء الفترة التجريبية تلقائياً عند إلغاء الاشتراك

💡 **نصيحة**: قم بعمل backup لقاعدة البيانات قبل التطبيق في production

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من logs في Supabase Dashboard
2. تأكد من تطبيق جميع الملفات بالترتيب
3. قم بإعادة تشغيل Supabase إذا لزم الأمر
