# دليل إصلاح خطأ HTTP 406 (Not Acceptable) في Supabase

## المشكلة
عند محاولة الوصول إلى جدول `organizations` من نطاق مخصص (مثل fredstore40.stockiha.com)، يظهر خطأ:
```
GET https://wrnssatuvmumsczyldth.supabase.co/rest/v1/organizations?select=id%2Cdomain%2Csubdomain&domain=eq.fredstore40.stockiha.com 406 (Not Acceptable)
```

## سبب المشكلة
1. **RLS (Row Level Security)**: سياسات الأمان على جدول organizations قد تمنع الوصول
2. **Headers غير متوافقة**: Supabase قد يرفض الطلب بسبب headers غير مقبولة
3. **صلاحيات القراءة**: عدم وجود صلاحيات قراءة عامة للجدول

## الحلول

### 1. تطبيق إصلاح قاعدة البيانات
قم بتنفيذ الملف SQL التالي في Supabase:
```bash
# عبر Supabase Dashboard > SQL Editor
fix_406_organizations_issue.sql
```

### 2. تفعيل معالج أخطاء HTTP 406
تأكد من أن معالج أخطاء 406 مفعّل في `src/main.tsx`:
```typescript
// تهيئة معالج أخطاء 406 فوراً
if (typeof window !== 'undefined') {
  initializeHttp406Handler(); // يجب أن يكون مفعّل
  console.log('🚀 تم تهيئة معالج أخطاء HTTP 406 المحسن');
}
```

### 3. التحديثات في الكود
تم تحديث `src/context/shop/utils.ts` لمعالجة الأخطاء بشكل أفضل:
- استخدام `maybeSingle()` بدلاً من `single()` لتجنب أخطاء "لا توجد نتائج"
- إضافة معالجة أفضل للأخطاء مع رسائل واضحة في console

## التحقق من الإصلاح

### 1. في وحدة تحكم المتصفح
```javascript
// عرض إحصائيات أخطاء 406
get406Stats();

// إعادة محاولة الطلبات الفاشلة
retryFailed406Requests();

// مسح الإحصائيات
reset406Stats();
```

### 2. في Supabase SQL Editor
```sql
-- التحقق من سياسات RLS
SELECT * FROM pg_policies 
WHERE tablename = 'organizations' 
AND schemaname = 'public';

-- التحقق من الصلاحيات
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='organizations';
```

## نصائح إضافية

1. **مسح ذاكرة التخزين المؤقت**: امسح localStorage وcookies للمتصفح
2. **التحقق من الشبكة**: استخدم أدوات المطور لمراقبة الطلبات
3. **تسجيل الأخطاء**: راقب console للحصول على معلومات تفصيلية

## الوقاية المستقبلية

1. **استخدام maybeSingle()**: دائماً استخدم maybeSingle بدلاً من single عند البحث عن سجل قد لا يكون موجوداً
2. **معالجة الأخطاء**: أضف معالجة شاملة للأخطاء في جميع استعلامات Supabase
3. **سياسات RLS**: تأكد من وجود سياسات قراءة عامة للجداول التي تحتاج للوصول العام

## المراجع
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [HTTP 406 Error Explanation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/406)
- ملف الإصلاح الأصلي: `HTTP_406_ERROR_SOLUTION.md`