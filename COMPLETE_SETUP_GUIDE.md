# 📘 دليل الإعداد الكامل لنظام طلبات الاشتراك

## 🎯 نظرة عامة

هذا الدليل يشرح خطوات الإعداد الكاملة لنظام إدارة طلبات الاشتراك.

---

## 📋 الخطوات المطلوبة

### 1️⃣ تطبيق Migrations في Supabase

افتح **Supabase Dashboard** → **SQL Editor** ونفذ الملفات التالية بالترتيب:

#### ✅ الخطوة 1: إصلاح Foreign Key Constraint
```sql
-- نفذ الملف:
supabase/migrations/current/20251102_fix_activation_codes_fk_constraint.sql
```
**أو** نفذ هذا الكود مباشرة:
```sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_codes_subscription_id_fkey'
        AND table_name = 'activation_codes'
    ) THEN
        ALTER TABLE activation_codes
        DROP CONSTRAINT activation_codes_subscription_id_fkey;
    END IF;
END $$;

ALTER TABLE activation_codes
ADD CONSTRAINT activation_codes_subscription_id_fkey
FOREIGN KEY (subscription_id)
REFERENCES organization_subscriptions(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
```

#### ✅ الخطوة 2: تحديث دالة admin_get_subscription_requests
```sql
-- نفذ الملف:
supabase/migrations/current/20251102_update_subscription_requests_function.sql
```
**أو** استخدم ملف التطبيق الشامل:
```sql
-- نفذ الملف:
APPLY_ALL_SUBSCRIPTION_FIXES.sql
```

#### ✅ الخطوة 3: إنشاء Storage Bucket
```sql
-- نفذ الملف:
supabase/migrations/current/20251102_create_subscriptions_storage_bucket.sql
```

**أو** قم بالإنشاء يدوياً من Supabase Dashboard:
1. اذهب إلى **Storage**
2. اضغط **Create Bucket**
3. اسم الـ Bucket: `subscriptions`
4. اجعله **Public**
5. حجم الملف الأقصى: `10 MB`
6. أنواع الملفات المسموحة:
   - `image/jpeg`
   - `image/png`
   - `image/jpg`
   - `image/gif`
   - `image/webp`
   - `application/pdf`

---

### 2️⃣ التحقق من الإعداد

#### تحقق من الـ Storage Bucket:
1. اذهب إلى **Supabase Dashboard** → **Storage**
2. تأكد من وجود bucket اسمه `subscriptions`
3. تأكد من أن الـ bucket **Public**

#### تحقق من الدوال:
قم بتنفيذ هذا الاستعلام للتحقق:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%subscription_request%';
```

يجب أن ترى:
- ✅ `create_subscription_request`
- ✅ `admin_get_subscription_requests`
- ✅ `admin_approve_subscription_request`
- ✅ `admin_reject_subscription_request`

---

## 🚀 اختبار النظام

### من جانب العميل:

1. سجل دخول كمؤسسة عادية
2. اذهب إلى صفحة الاشتراكات
3. اختر باقة
4. اختر طريقة دفع
5. املأ المعلومات المطلوبة
6. **ارفع إثبات الدفع** (صورة أو PDF)
7. اضغط "**إرسال طلب الاشتراك**"
8. يجب أن تظهر رسالة نجاح

### من جانب السوبر أدمين:

1. سجل دخول كسوبر أدمين
2. اذهب إلى **طلبات الاشتراك** من القائمة الجانبية
3. يجب أن ترى الطلب الجديد
4. اضغط على أيقونة **العين** 👁️ لعرض التفاصيل
5. **تحقق من إثبات الدفع**
6. اضغط **قبول وتفعيل** ✅ أو **رفض** ❌
7. عند القبول، يتم تفعيل الاشتراك تلقائياً

---

## 🔍 استكشاف الأخطاء

### ❌ خطأ "Bucket not found"
**الحل:**
- تأكد من إنشاء الـ Storage Bucket
- نفذ ملف: `20251102_create_subscriptions_storage_bucket.sql`
- أو أنشئ الـ bucket يدوياً من Dashboard

### ❌ خطأ "column o.email does not exist"
**الحل:**
- تأكد من تطبيق ملف: `20251102_update_subscription_requests_function.sql`
- أو نفذ ملف: `APPLY_ALL_SUBSCRIPTION_FIXES.sql`

### ❌ خطأ "function admin_get_subscription_requests does not exist"
**الحل:**
- نفذ ملف: `20251102_create_subscription_requests_table.sql`
- تأكد من وجود جدول `subscription_requests`

### ❌ الزر "إرسال طلب الاشتراك" معطل
**الحل:**
- تأكد من ملء جميع الحقول المطلوبة
- لا حاجة لرفع ملف لتفعيل الزر (رفع الملف اختياري)

---

## 📊 بنية البيانات

### جدول `subscription_requests`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | UUID | معرف فريد للطلب |
| organization_id | UUID | معرف المؤسسة |
| plan_id | UUID | معرف الباقة |
| billing_cycle | TEXT | شهري أو سنوي |
| amount | DECIMAL | المبلغ |
| currency | TEXT | العملة (DZD) |
| payment_method | TEXT | طريقة الدفع |
| payment_proof_url | TEXT | رابط إثبات الدفع |
| payment_reference | TEXT | رقم المرجع |
| status | TEXT | pending/approved/rejected |
| contact_name | TEXT | اسم جهة الاتصال |
| contact_email | TEXT | البريد الإلكتروني |
| contact_phone | TEXT | رقم الهاتف |
| customer_notes | TEXT | ملاحظات العميل |
| admin_notes | TEXT | ملاحظات الإدارة |
| rejection_reason | TEXT | سبب الرفض |
| reviewed_by | UUID | من راجع الطلب |
| reviewed_at | TIMESTAMPTZ | تاريخ المراجعة |

---

## 🎨 الملفات المعدلة

### Frontend:
- ✅ `src/components/subscription/SubscriptionDialog.tsx` - تعديل لإرسال طلب بدلاً من اشتراك مباشر
- ✅ `src/pages/super-admin/SubscriptionRequests.tsx` - صفحة إدارة الطلبات
- ✅ `src/lib/subscription-requests-service.ts` - خدمة إدارة الطلبات
- ✅ `src/app-components/LazyRoutes.optimized.tsx` - إضافة lazy loading
- ✅ `src/app-components/RouteComponents.tsx` - إضافة route
- ✅ `src/data/SuperAdminSidebarLinks.tsx` - إضافة رابط القائمة

### Backend:
- ✅ `supabase/migrations/current/20251102_create_subscription_requests_table.sql`
- ✅ `supabase/migrations/current/20251102_update_subscription_requests_function.sql`
- ✅ `supabase/migrations/current/20251102_fix_activation_codes_fk_constraint.sql`
- ✅ `supabase/migrations/current/20251102_create_subscriptions_storage_bucket.sql`

---

## ✅ قائمة التحقق النهائية

- [ ] تطبيق جميع الـ Migrations في Supabase
- [ ] إنشاء Storage Bucket اسمه `subscriptions`
- [ ] جعل الـ Bucket عاماً (Public)
- [ ] تعيين حد أقصى لحجم الملف 10MB
- [ ] إضافة أنواع الملفات المسموحة
- [ ] تحديث الصفحة في المتصفح
- [ ] اختبار إنشاء طلب اشتراك
- [ ] اختبار رفع إثبات الدفع
- [ ] اختبار عرض الطلبات من السوبر أدمين
- [ ] اختبار قبول طلب
- [ ] اختبار رفض طلب

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من **Console Log** في المتصفح
2. تحقق من **Supabase Logs**
3. تأكد من تطبيق جميع Migrations
4. تأكد من وجود Storage Bucket
5. تأكد من صلاحيات RLS

---

**تم الإنشاء:** 2025-11-02
**الحالة:** جاهز للإنتاج ✅
**الإصدار:** 2.0.0

