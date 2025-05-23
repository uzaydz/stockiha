# حل مشكلة خطأ 403 في جدول subscription_plans

## وصف المشكلة

```
wrnssatuvmumsczyldth.supabase.co/rest/v1/subscription_plans?select=*:1 
Failed to load resource: the server responded with a status of 403 ()
Error creating subscription plan: Object
```

## سبب المشكلة

المشكلة تحدث لأن جدول `subscription_plans` لا يحتوي على سياسات **Row Level Security (RLS)** مما يؤدي إلى منع Supabase من السماح بالوصول إليه.

عندما يكون RLS مفعلاً على جدول ولكن لا توجد سياسات محددة، فإن Supabase يرفض جميع الطلبات بخطأ 403 Forbidden.

## الحل

### 1. تشغيل ملف الإصلاح الشامل

قم بتشغيل الملف التالي في Supabase SQL Editor:

```sql
-- تشغيل ملف fix_subscription_rls_complete.sql
```

### 2. الحل السريع (للتطوير)

إذا كنت تريد حلاً سريعاً للتطوير، قم بتشغيل هذا الكود في Supabase:

```sql
-- تفعيل RLS للجدول
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح بالقراءة للجميع
CREATE POLICY "public_read_subscription_plans"
ON subscription_plans
FOR SELECT
USING (true);

-- سياسة مؤقتة للتطوير - السماح بجميع العمليات
CREATE POLICY "dev_full_access_subscription_plans"
ON subscription_plans
FOR ALL
USING (true)
WITH CHECK (true);
```

### 3. الحل الآمن (للإنتاج)

للإنتاج، استخدم سياسات أكثر أماناً:

```sql
-- تفعيل RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- السماح بالقراءة للجميع (خطط الاشتراك عامة)
CREATE POLICY "public_read_subscription_plans"
ON subscription_plans
FOR SELECT
USING (true);

-- السماح بالتعديل للمصادق عليهم فقط
CREATE POLICY "authenticated_write_subscription_plans"
ON subscription_plans
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
```

## كيفية التحقق من نجاح الحل

### 1. التحقق من السياسات المطبقة

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'subscription_plans';
```

### 2. التحقق من حالة RLS

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'subscription_plans';
```

### 3. اختبار الوصول

```sql
-- يجب أن يعمل هذا الاستعلام بدون أخطاء
SELECT * FROM subscription_plans LIMIT 1;
```

## نصائح إضافية

### 1. للتطوير المحلي

إذا كنت تعمل على التطوير المحلي، يمكنك تعطيل RLS مؤقتاً:

```sql
-- تعطيل RLS مؤقتاً (للتطوير فقط)
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
```

### 2. لإعادة تفعيل RLS

```sql
-- إعادة تفعيل RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
```

### 3. حذف جميع السياسات

```sql
-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "public_read_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "dev_full_access_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "authenticated_write_subscription_plans" ON subscription_plans;
```

## الملفات المتعلقة

- `fix_subscription_plans_permissions.sql` - حل أساسي
- `fix_subscription_rls_complete.sql` - حل شامل لجميع جداول الاشتراكات
- `src/sql/subscriptions_schema.sql` - تعريف جداول الاشتراكات

## مراجع مفيدة

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policy Documentation](https://www.postgresql.org/docs/current/sql-createpolicy.html)

## ملاحظات مهمة

1. **أمان البيانات**: تأكد من أن السياسات تحمي البيانات الحساسة
2. **الأداء**: السياسات المعقدة قد تؤثر على الأداء
3. **الاختبار**: اختبر السياسات بأدوار مستخدمين مختلفة
4. **التوثيق**: وثق جميع السياسات المطبقة

---

تم إنشاء هذا التوثيق لحل مشكلة خطأ 403 في جدول subscription_plans. 