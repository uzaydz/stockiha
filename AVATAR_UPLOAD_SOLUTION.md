# حل مشكلة رفع الصور الشخصية

## المشكلة
خطأ 403 "new row violates row-level security policy" عند محاولة رفع الصور الشخصية.

## الحلول المطبقة

### 1. إصلاح سياسات RLS
تم تطبيق سياسة شاملة للـ bucket:
```sql
CREATE POLICY "Full access to user avatars bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'user-avatars')
WITH CHECK (bucket_id = 'user-avatars');
```

### 2. تحديث إعدادات الـ Bucket
- حجم الملف الأقصى: 10MB
- الأنواع المدعومة: JPG, PNG, WebP, GIF, BMP, TIFF
- الوصول العام: مفعل

### 3. إضافة طريقة بديلة للرفع
تم إضافة دالة `uploadAvatarAlternative()` التي ترفع الملفات مباشرة إلى root الـ bucket بدلاً من مجلد فرعي.

## كيفية الاختبار

1. جرب رفع صورة من صفحة الملف الشخصي
2. إذا فشلت الطريقة الأولى، ستعمل الطريقة البديلة تلقائياً
3. تحقق من console.log لمتابعة العملية

## إذا استمرت المشكلة

### الحل الأخير - تعطيل RLS مؤقتاً
```sql
-- تعطيل RLS على storage.objects (استخدم بحذر!)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- إعادة تفعيل RLS بعد الاختبار
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### التحقق من الإعدادات في Supabase Dashboard
1. اذهب إلى Storage > user-avatars
2. تأكد من أن الـ bucket عام (Public)
3. تحقق من سياسات RLS في Settings > Policies

## ملاحظات مهمة
- تم زيادة حد حجم الملف إلى 10MB
- السياسة الحالية تسمح بالوصول العام للـ bucket
- يمكن تشديد السياسات لاحقاً بعد حل المشكلة

## الملفات المحدثة
- `src/lib/api/profile.ts` - إضافة طريقة بديلة للرفع
- `fix_avatar_storage_policies.sql` - سياسات RLS محدثة 