# 📋 دليل صيانة قاعدة بيانات Bazaar

## 🎯 نظرة عامة
هذا المجلد يحتوي على ملفات SQL لتحسين وصيانة قاعدة بيانات نظام Bazaar.

## 📁 الملفات المتاحة

### 1. `bazaar_performance_optimization.sql`
**الغرض**: التحسينات الأساسية للأداء
**التشغيل**: مرة واحدة فقط
**الوقت**: في وقت الصيانة (يفضل ليلاً)

```sql
-- في Supabase SQL Editor
\i sql/bazaar_performance_optimization.sql
```

**المحتوى**:
- إنشاء فهارس محسنة
- إنشاء جدول cache
- إنشاء triggers ودوال محسنة
- ملء cache للمؤسسات النشطة

### 2. `bazaar_maintenance_jobs.sql`
**الغرض**: مهام الصيانة الدورية
**التشغيل**: دورياً (يومياً/أسبوعياً/شهرياً)
**الوقت**: يمكن تشغيله أثناء عمل النظام

```sql
-- في Supabase SQL Editor
\i sql/bazaar_maintenance_jobs.sql
```

**المحتوى**:
- تنظيف cache المنتهي الصلاحية
- تحديث الإحصائيات
- فحص صحة cache
- تحسين الجداول

### 3. `bazaar_concurrent_maintenance.sql`
**الغرض**: مهام الصيانة المتزامنة
**التشغيل**: أسبوعياً
**الوقت**: يجب تشغيله بدون transaction block

```sql
-- في Supabase SQL Editor (بدون transaction)
\i sql/bazaar_concurrent_maintenance.sql
```

**المحتوى**:
- إعادة بناء الفهارس باستخدام CONCURRENTLY
- إنشاء فهارس جديدة محسنة
- تحسين فهارس الجداول المرتبطة

## ⚠️ تحذيرات مهمة

### 1. ترتيب التشغيل
```bash
# الخطوة 1: التحسينات الأساسية (مرة واحدة)
\i sql/bazaar_performance_optimization.sql

# الخطوة 2: مهام الصيانة الدورية (يومياً)
\i sql/bazaar_maintenance_jobs.sql

# الخطوة 3: مهام الصيانة المتزامنة (أسبوعياً)
\i sql/bazaar_concurrent_maintenance.sql
```

### 2. متطلبات CONCURRENTLY
- `bazaar_concurrent_maintenance.sql` يجب تشغيله **بدون transaction block**
- استخدم Supabase SQL Editor مباشرة
- لا تستخدم `BEGIN; ... COMMIT;`

### 3. توقيت التشغيل
- **التحسينات الأساسية**: مرة واحدة فقط
- **الصيانة الدورية**: يومياً (أثناء عمل النظام)
- **الصيانة المتزامنة**: أسبوعياً (في وقت الصيانة)

## 🔧 جدولة المهام

### يومياً
```sql
-- تنظيف cache وتحديث الإحصائيات
\i sql/bazaar_maintenance_jobs.sql
```

### أسبوعياً
```sql
-- إعادة بناء الفهارس (بدون قفل الجداول)
\i sql/bazaar_concurrent_maintenance.sql
```

### شهرياً
```sql
-- تحسين شامل للجداول
VACUUM FULL organizations;  -- في وقت الصيانة فقط
```

## 📊 مراقبة الأداء

### فحص أداء Cache
```sql
-- تقرير أداء cache
SELECT 
    COUNT(*) as total_organizations,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as cached_orgs,
    ROUND((COUNT(CASE WHEN expires_at > NOW() THEN 1 END)::NUMERIC / COUNT(*)) * 100, 2) as cache_hit_rate
FROM organization_cache;
```

### فحص الفهارس
```sql
-- فحص الفهارس المحسنة
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'organizations' 
AND indexname LIKE '%optimized%';
```

## 🚨 استكشاف الأخطاء

### خطأ: "cannot run inside a transaction block"
**السبب**: محاولة تشغيل CONCURRENTLY داخل transaction
**الحل**: تشغيل الملف في Supabase SQL Editor مباشرة

### خطأ: "function does not exist"
**السبب**: عدم تشغيل ملف التحسينات الأساسية
**الحل**: تشغيل `bazaar_performance_optimization.sql` أولاً

### خطأ: "index already exists"
**السبب**: محاولة إنشاء فهرس موجود
**الحل**: تجاهل الخطأ أو استخدام `IF NOT EXISTS`

## 📞 الدعم
في حالة مواجهة أي مشاكل:
1. تحقق من ترتيب تشغيل الملفات
2. تأكد من عدم وجود transaction block
3. راجع logs في Supabase Dashboard
4. تأكد من صلاحيات المستخدم

## 🎯 النتائج المتوقعة
- **تقليل وقت التحميل**: من 3000ms إلى < 500ms
- **تحسين أداء الاستعلامات**: من 1032ms إلى < 50ms
- **تقليل الحمل على قاعدة البيانات**: بنسبة 60%
- **تحسين تجربة المستخدم**: للزوار الجدد والعائدين
