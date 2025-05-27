# إعداد نظام الملف الشخصي

## نظرة عامة
تم تطوير نظام شامل لإدارة الملفات الشخصية للمستخدمين مع دعم رفع الصور الشخصية وتحديث المعلومات الشخصية.

## الملفات المطلوب تطبيقها

### 1. تحديثات قاعدة البيانات
```bash
# تطبيق تحديثات جدول المستخدمين
psql -h your-db-host -U your-username -d your-database -f add_avatar_field.sql

# إنشاء bucket للصور الشخصية
psql -h your-db-host -U your-username -d your-database -f create_avatar_storage.sql

# إنشاء API لتحديث حالة المستخدم
psql -h your-db-host -U your-username -d your-database -f create_user_status_api.sql
```

### 2. الملفات الجديدة المضافة
- `src/lib/api/profile.ts` - API لإدارة الملف الشخصي
- `src/components/settings/ProfileSettings.tsx` - مكون الملف الشخصي
- `src/hooks/useProfile.ts` - Hook لإدارة الملف الشخصي

## الميزات المتاحة

### 1. إدارة الملف الشخصي
- ✅ عرض وتعديل المعلومات الشخصية
- ✅ رفع وتحديث الصورة الشخصية
- ✅ إدارة معلومات الاتصال
- ✅ تحديث حالة المستخدم (متصل/غير متصل/مشغول/بعيد)

### 2. الأمان والخصوصية
- ✅ إخفاء/إظهار المعلومات الحساسة
- ✅ حماية البريد الإلكتروني من التعديل
- ✅ التحقق من صحة الملفات المرفوعة
- ✅ حد أقصى لحجم الصورة (5MB)

### 3. تجربة المستخدم
- ✅ واجهة تفاعلية مع أوضاع العرض والتعديل
- ✅ مؤشرات الحالة والتحميل
- ✅ رسائل تأكيد وأخطاء واضحة
- ✅ تحديث تلقائي للحالة

## كيفية الاستخدام

### 1. في مكون الإعدادات
```tsx
import ProfileSettings from '@/components/settings/ProfileSettings';

// في صفحة الإعدادات
<ProfileSettings />
```

### 2. استخدام Hook
```tsx
import { useProfile } from '@/hooks/useProfile';

const MyComponent = () => {
  const { 
    profile, 
    isLoading, 
    updateProfile, 
    uploadProfileAvatar 
  } = useProfile();

  // استخدام البيانات والوظائف
};
```

### 3. استخدام API مباشرة
```tsx
import { 
  getCurrentUserProfile, 
  updateUserProfile, 
  uploadAvatar 
} from '@/lib/api/profile';

// جلب الملف الشخصي
const profile = await getCurrentUserProfile();

// تحديث البيانات
const result = await updateUserProfile(data);

// رفع صورة
const uploadResult = await uploadAvatar(file);
```

## إعدادات Supabase المطلوبة

### 1. Storage Bucket
- اسم البucket: `user-avatars`
- عام: نعم
- الحد الأقصى للحجم: 5MB
- أنواع الملفات المسموحة: JPEG, PNG, WebP, GIF

### 2. Row Level Security (RLS)
- تم إعداد سياسات الأمان للسماح للمستخدمين برفع وإدارة صورهم الشخصية فقط
- السماح للجميع بعرض الصور الشخصية

### 3. Database Functions
- `update_user_status()` - دالة لتحديث حالة المستخدم

## الحقول الجديدة في جدول users

```sql
-- معلومات شخصية
first_name VARCHAR(100),
last_name VARCHAR(100),
avatar_url TEXT,
job_title VARCHAR(200),
bio TEXT,
birth_date DATE,
gender VARCHAR(10),

-- معلومات العنوان
address TEXT,
city VARCHAR(100),
country VARCHAR(100),

-- معلومات الحالة
status VARCHAR(20) DEFAULT 'offline',
last_activity_at TIMESTAMP WITH TIME ZONE,

-- معلومات WhatsApp
whatsapp_phone VARCHAR(20),
whatsapp_connected BOOLEAN DEFAULT false,
whatsapp_enabled BOOLEAN DEFAULT false
```

## التحقق من التطبيق

### 1. فحص قاعدة البيانات
```sql
-- التحقق من وجود الحقول الجديدة
\d users

-- التحقق من وجود bucket الصور
SELECT * FROM storage.buckets WHERE id = 'user-avatars';

-- التحقق من وجود الدالة
\df update_user_status
```

### 2. فحص الواجهة
- انتقل إلى صفحة الإعدادات
- اختر تبويب "الملف الشخصي"
- تأكد من ظهور جميع الحقول
- جرب رفع صورة شخصية
- جرب تحديث المعلومات

## استكشاف الأخطاء

### 1. مشاكل رفع الصور
- تأكد من إنشاء bucket `user-avatars`
- تحقق من سياسات RLS
- تأكد من صحة أنواع الملفات

### 2. مشاكل حفظ البيانات
- تحقق من وجود الحقول في جدول `users`
- تأكد من ربط `auth_user_id` بالمستخدم الحالي
- فحص أخطاء وحدة التحكم

### 3. مشاكل تحديث الحالة
- تأكد من وجود دالة `update_user_status`
- تحقق من صلاحيات الدالة
- فحص أخطاء الشبكة

## الخطوات التالية

1. **تطبيق ملفات SQL** في قاعدة البيانات
2. **إعداد Supabase Storage** للصور الشخصية
3. **اختبار الوظائف** في بيئة التطوير
4. **نشر التحديثات** في بيئة الإنتاج

## الدعم

في حالة وجود مشاكل:
1. تحقق من أخطاء وحدة التحكم
2. فحص أخطاء قاعدة البيانات
3. مراجعة إعدادات Supabase
4. التأكد من صحة متغيرات البيئة 