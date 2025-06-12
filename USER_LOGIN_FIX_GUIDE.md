# دليل إصلاح مشاكل تسجيل الدخول

## وصف المشكلة

المشكلة الرئيسية تتعلق بـ **RLS (Row Level Security)** في Supabase. عندما يتم إنشاء مستخدم جديد، أحياناً لا يتم تعيين `auth_user_id` بشكل صحيح، مما يسبب:

1. **خطأ HTTP 406 (Not Acceptable)** - عند محاولة جلب بيانات المستخدم
2. **خطأ HTTP 409 (Conflict)** - عند محاولة إنشاء مستخدم موجود بالفعل

## الأسباب

1. **مشكلة في RLS**: سياسات الأمان تعتمد على `auth_user_id` للتحقق من هوية المستخدم
2. **بيانات ناقصة**: بعض المستخدمين لديهم `auth_user_id = null` 
3. **تعارض في إنشاء المستخدمين**: النظام يحاول إنشاء مستخدم موجود بالفعل

## الحلول المطبقة

### 1. إصلاح دالة `fixMissingUser`

- إضافة فحص لحقل `auth_user_id`
- استخدام `maybeSingle()` بدلاً من `single()` لتجنب الأخطاء
- معالجة خطأ 409 (Conflict) بشكل صحيح

### 2. تحسين دوال المستخدمين

- إصلاح `getUserById()` و `getUserByEmail()`
- إضافة دالة `createUserSafely()` للتعامل مع المستخدمين المكررين
- تحديث `getCurrentUserProfile()` لاستخدام الدوال الآمنة

### 3. إصلاح Supabase Headers

```typescript
global: {
  headers: {
    'X-Client-Info': 'bazaar-console-connect',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}
```

### 4. إضافة مراقبة الجلسة المحسنة

- فحص تلقائي لحالة المستخدم عند تسجيل الدخول
- إصلاح تلقائي للمستخدمين الذين لديهم مشاكل
- إعادة تحميل الصفحة بعد الإصلاح

## إصلاح المشاكل الموجودة

### 1. إصلاح قاعدة البيانات

```sql
-- تشغيل ملف fix_user_auth_ids.sql
UPDATE users 
SET auth_user_id = id,
    updated_at = NOW()
WHERE auth_user_id IS NULL 
  AND id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = users.email
  );
```

### 2. إنشاء دوال قاعدة البيانات

```sql
-- تشغيل ملف create_fix_user_function.sql
-- ينشئ دوال لإصلاح المستخدمين تلقائياً
```

### 3. استخدام دالة الإصلاح في التطبيق

```typescript
import { fixUserWithDatabaseFunction } from '@/lib/api/fix-missing-user';

const result = await fixUserWithDatabaseFunction(userEmail);
if (result.success) {
  console.log('تم إصلاح المستخدم:', result.action);
}
```

## كيفية منع المشكلة مستقبلاً

### 1. التأكد من `auth_user_id` عند إنشاء المستخدمين

```typescript
const newUser: InsertUser = {
  id: authUser.id,
  auth_user_id: authUser.id, // ضروري للـ RLS
  email: authUser.email,
  name: userName,
  role: userRole,
  is_active: true
};
```

### 2. استخدام دوال آمنة

```typescript
// بدلاً من createUser()
const user = await createUserSafely(newUser);

// بدلاً من single()
const user = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .maybeSingle(); // تجنب خطأ عدم وجود نتائج
```

### 3. معالجة الأخطاء بشكل صحيح

```typescript
if (error) {
  // إذا كان الخطأ بسبب التكرار
  if (error.code === '23505') {
    // إصلاح المستخدم الموجود
    return await fixExistingUser(email);
  }
  console.error('خطأ في إنشاء المستخدم:', error);
  return null;
}
```

## الاختبار

1. **إنشاء مستخدم جديد**: تسجيل حساب جديد والتأكد من عدم وجود أخطاء
2. **تسجيل الدخول**: التأكد من تحميل البيانات بشكل صحيح
3. **مراقبة وحدة التحكم**: عدم وجود أخطاء HTTP 406 أو 409

## ملاحظات مهمة

- جميع الدوال الجديدة تتعامل مع الأخطاء بشكل هادئ
- النظام يحاول الإصلاح التلقائي قبل إظهار رسائل الخطأ
- إعادة تحميل الصفحة مطلوبة بعد إصلاح المستخدم لتحديث الجلسة

## ملفات معدلة

- `src/lib/api/fix-missing-user.ts`
- `src/lib/api/users.ts`
- `src/lib/supabase.ts`
- `src/components/SessionMonitor.tsx`

## ملفات SQL جديدة

- `fix_user_auth_ids.sql` - إصلاح فوري للمستخدمين الموجودين
- `create_fix_user_function.sql` - دوال قاعدة البيانات للإصلاح التلقائي 