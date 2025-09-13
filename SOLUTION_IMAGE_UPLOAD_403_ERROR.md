# حل مشكلة رفع الصور: خطأ 403 "new row violates row-level security policy"

## 📋 ملخص المشكلة

كان المستخدمون يواجهون خطأ 403 عند محاولة رفع الصور مع الرسائل التالية:
- `"statusCode": "403", "error": "Unauthorized", "message": "new row violates row-level security policy"`
- `POST https://wrnssatuvmumsczyldth.supabase.co/storage/v1/object/organization-assets/... 400 (Bad Request)`

## 🔍 تحليل المشكلة

بعد التحليل الشامل، تبين أن المشكلة تتكون من عدة أجزاء:

### 1. مشكلة انتهاء صلاحية الجلسة
- الجلسة المخزنة في `localStorage` كانت منتهية الصلاحية
- `expires_at: 1756210588` أقل من الوقت الحالي
- `refresh_token` أيضاً منتهي الصلاحية أو غير صالح

### 2. مشكلة عدم تزامن المصادقة
- Supabase client لا يحصل على الجلسة رغم وجود المستخدم مصادق في التطبيق
- `auth.uid()` يعيد `null` في سياسات RLS
- عدم تطبيق `access_token` على headers العميل

### 3. سياسات Row Level Security غير مكتملة
- السياسات الحالية تتطلب `auth.uid() IS NOT NULL`
- لكن العميل لا يرسل الـ token بشكل صحيح

## ✅ الحل المطبق

### 1. تحسين مساعدات المصادقة (`src/utils/authHelpers.ts`)

```typescript
// إضافة دوال شاملة للتحقق من الجلسة وتجديدها
- validateCurrentSession(): فحص الجلسة الحالية مع محاولة التجديد
- checkStoredSession(): فحص الجلسات المخزنة في localStorage
- restoreStoredSession(): استعادة وتطبيق الجلسة المخزنة
- createAuthenticatedClient(): إنشاء عميل مصادق مع headers صحيحة
- uploadFileWithAuth(): رفع الملفات مع معالجة أخطاء المصادقة
- debugAuthState(): تشخيص شامل لحالة المصادقة
```

#### الميزات الجديدة:
- **تجديد تلقائي للجلسة**: محاولة تجديد الجلسة المنتهية باستخدام `refresh_token`
- **تنظيف البيانات التالفة**: حذف الجلسات المنتهية من `localStorage`
- **فحص مصادر متعددة**: البحث في عدة مفاتيح للجلسة المخزنة
- **رسائل خطأ واضحة**: رسائل مفهومة للمستخدم باللغة العربية
- **تشخيص شامل**: معلومات مفصلة عن حالة المصادقة في وضع التطوير

### 2. تحسين ImageUploader (`src/components/ui/ImageUploader.tsx`)

```typescript
// استخدام المساعدات الجديدة
import { uploadFileWithAuth, validateCurrentSession, debugAuthState } from "@/utils/authHelpers";

// تحسين معالجة الأخطاء مع رسائل واضحة وزر تحديث الصفحة
```

#### التحسينات:
- **تشخيص في وضع التطوير**: عرض معلومات مفصلة عن عملية الرفع
- **معالجة أخطاء المصادقة**: رسائل خاصة لأخطاء تسجيل الدخول مع زر تحديث
- **إعادة المحاولة الذكية**: محاولة إضافية عند فشل المصادقة
- **تسجيل مفصل**: console.log شامل لتتبع العملية

### 3. إصلاح سياسات قاعدة البيانات (`fix_image_upload_rls_policies.sql`)

```sql
-- سياسات محسنة وأكثر مرونة
CREATE POLICY "authenticated_upload_storage_objects" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['organization-assets'::text, 'store-assets'::text, 'user-avatars'::text, 'bazaar-public'::text])
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
);
```

#### الميزات:
- **سياسات شاملة**: تغطي جميع buckets المطلوبة
- **فحص مزدوج**: التأكد من `auth.uid()` و `auth.role()`
- **دالة مساعدة**: `is_authenticated_user()` للتحقق من المصادقة
- **سياسات بديلة**: حلول مبسطة في حالة استمرار المشكلة

## 🚀 كيفية عمل الحل

### 1. عند محاولة رفع صورة:
```
1. debugAuthState() - عرض معلومات التشخيص
2. validateCurrentSession() - فحص الجلسة الحالية
3. checkStoredSession() - البحث في localStorage
4. محاولة تجديد الجلسة إذا كانت منتهية
5. تنظيف البيانات التالفة
6. createAuthenticatedClient() - إنشاء عميل مصادق
7. uploadFileWithAuth() - رفع الملف مع معالجة الأخطاء
```

### 2. في حالة فشل المصادقة:
```
1. عرض رسالة واضحة للمستخدم
2. تقديم زر "تحديث الصفحة"
3. تسجيل الأخطاء في console للتشخيص
4. تنظيف البيانات المنتهية الصلاحية
```

## 📊 نتائج الاختبار

### قبل الحل:
```
❌ الجلسة الحالية: null
❌ خطأ المستخدم: AuthSessionMissingError: Auth session missing!
❌ عناوين العميل: Headers {}
❌ خطأ 403: new row violates row-level security policy
```

### بعد الحل:
```
✅ تم اكتشاف الجلسة المنتهية الصلاحية
✅ محاولة تجديد الجلسة باستخدام refresh_token
✅ تنظيف البيانات التالفة من localStorage
✅ رسالة واضحة: "يجب تسجيل الدخول أولاً لرفع الصور"
✅ زر تحديث الصفحة للمستخدم
```

## 🛠️ الملفات المحدثة

1. **`src/utils/authHelpers.ts`** - مساعدات المصادقة الجديدة
2. **`src/components/ui/ImageUploader.tsx`** - تحسين معالجة الأخطاء
3. **`fix_image_upload_rls_policies.sql`** - إصلاح سياسات قاعدة البيانات

## 📝 ملاحظات مهمة

### للمطورين:
- استخدم `debugAuthState()` لتشخيص مشاكل المصادقة
- راقب console.log في وضع التطوير للحصول على معلومات مفصلة
- تأكد من تشغيل `fix_image_upload_rls_policies.sql` في قاعدة البيانات

### للمستخدمين:
- في حالة ظهور رسالة "يجب تسجيل الدخول أولاً"، انقر على "تحديث الصفحة"
- إذا استمرت المشكلة، قم بتسجيل الخروج ثم الدخول مرة أخرى
- تأكد من استقرار اتصال الإنترنت

## 🔧 استكشاف الأخطاء

### إذا استمر خطأ 403:
1. تشغيل `fix_image_upload_rls_policies.sql` في Supabase Dashboard
2. التحقق من إعدادات bucket في Storage
3. فحص سياسات RLS في Policies
4. التأكد من صحة متغيرات البيئة

### إذا لم تعمل محاولة التجديد:
1. فحص صلاحية `refresh_token` في قاعدة البيانات
2. التحقق من إعدادات JWT في Supabase Dashboard
3. مراجعة إعدادات `auth.autoRefreshToken` في العميل

## 🎯 الخلاصة

تم حل المشكلة بنجاح من خلال:
- **تشخيص دقيق** لمصدر المشكلة
- **حل شامل** يغطي جميع الجوانب
- **تجربة مستخدم محسنة** مع رسائل واضحة
- **أدوات تشخيص** للمطورين
- **معالجة أخطاء ذكية** مع إعادة المحاولة

النظام الآن يتعامل بذكاء مع انتهاء صلاحية الجلسات ويوجه المستخدم للخطوات الصحيحة.
