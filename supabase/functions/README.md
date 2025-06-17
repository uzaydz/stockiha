# Supabase Edge Functions

## نشر Edge Function لإنشاء الوكلاء

### المتطلبات
1. تثبيت Supabase CLI
2. تسجيل الدخول إلى Supabase

### خطوات النشر

1. **تثبيت Supabase CLI:**
```bash
npm install -g supabase
```

2. **تسجيل الدخول:**
```bash
supabase login
```

3. **ربط المشروع:**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. **نشر Edge Function:**
```bash
supabase functions deploy create-agent
```

### إعداد متغيرات البيئة

تأكد من أن المتغيرات التالية متوفرة في Supabase:
- `SUPABASE_URL`: رابط مشروع Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: مفتاح الخدمة (Service Role Key)

### الاستخدام

بعد النشر، ستكون Edge Function متاحة على:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-agent
```

### ملاحظات مهمة

1. **الصلاحيات**: Edge Function تستخدم Service Role Key لإنشاء المستخدمين
2. **الأمان**: يتم التحقق من JWT token للمستخدم المرسل للطلب
3. **التنظيف**: في حالة فشل أي خطوة، يتم حذف البيانات المنشأة تلقائياً

### الطريقة الاحتياطية

إذا لم تكن Edge Function متاحة، سيستخدم النظام الطريقة الاحتياطية التي:
1. تنشئ سجل المستخدم في قاعدة البيانات
2. تنشئ سجل الوكيل
3. تترك إنشاء حساب المصادقة للمستخدم نفسه لاحقاً 