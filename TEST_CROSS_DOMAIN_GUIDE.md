# 🧪 دليل اختبار نظام Cross-Domain Authentication

## 🔧 التحسينات المطبقة

### 1. نظام مزدوج لنقل الجلسة:
- **localStorage**: للنطاقات من نفس المجال  
- **URL Parameters**: للنطاقات المختلفة (مع تشفير آمن)

### 2. آلية fallback محسنة:
- إذا فشل URL token، المحاولة مع localStorage
- إذا فشل كلاهما، توجيه تلقائي لصفحة تسجيل الدخول

## 🔍 كيفية مراقبة النظام

### رسائل console المتوقعة عند النجاح:

#### في النطاق الرئيسي (عند التوجيه):
```
🔄 [LoginForm] تحضير التوجيه للنطاق الفرعي...
🔑 [LoginForm] تمرير الجلسة: { hasSession: true, userId: "..." }
🚀 [CrossDomain] بدء redirectWithSession: { targetUrl: "...", hasSessionParam: true }
💾 [CrossDomain] تم العثور على جلسة، جارٍ التحضير للنقل...
💾 [CrossDomain] بدء حفظ الجلسة للنقل: { userId: "...", userEmail: "..." }
✅ [CrossDomain] تم حفظ الجلسة في localStorage
🔐 [CrossDomain] تم إضافة auth_token إلى URL
✅ [CrossDomain] تم تحضير الجلسة للنقل
🌐 [CrossDomain] التوجيه إلى: http://subdomain.localhost:8080/dashboard?transfer_session=true&timestamp=...&auth_token=...
```

#### في النطاق الفرعي (عند الاستقبال):
```
🔍 [CrossDomain] فحص URL للجلسة المنقولة: { hasTransferSession: true, hasAuthToken: true, authTokenLength: 500 }
✅ [CrossDomain] تم العثور على معامل transfer_session، جارٍ المعالجة...
🔐 [CrossDomain] محاولة استخدام auth_token من URL...
🔐 [CrossDomain] فك تشفير auth_token من URL...
🔍 [CrossDomain] بيانات token المفككة: { hasAccessToken: true, hasRefreshToken: true, userId: "..." }
✅ [CrossDomain] تم تطبيق token بنجاح
✅ [CrossDomain] تم تطبيق الجلسة من URL token بنجاح
🧹 [CrossDomain] تم تنظيف URL: /dashboard
🎉 [CrossDomain] تم تطبيق الجلسة المنقولة بنجاح!
✅ تم التحقق من صحة الجلسة المنقولة
```

## 🚨 رسائل الخطأ المحتملة:

### إذا لم تكن هناك جلسة:
```
⚠️ [CrossDomain] لم يتم العثور على جلسة للنقل
❌ [CrossDomain] لم يتم العثور على بيانات الجلسة في localStorage
❌ [CrossDomain] فشل في تطبيق الجلسة المنقولة بجميع الطرق
```

### إذا انتهت صلاحية الـ token:
```
⏰ [CrossDomain] token قديم جداً (أكثر من 5 دقائق)
```

## 🧪 خطوات الاختبار:

### 1. اختبار localhost → subdomain.localhost:
1. انتقل إلى `http://localhost:8080/login`
2. سجل الدخول كمسؤول (tenant user)
3. راقب الـ console للرسائل
4. يجب أن يتم التوجيه إلى `http://subdomain.localhost:8080/dashboard`
5. يجب أن تكون مسجل دخول مباشرة بدون إعادة تسجيل

### 2. اختبار production domains:
1. من `stockiha.com/login`
2. سجل الدخول
3. يجب التوجيه إلى `subdomain.stockiha.com/dashboard`
4. مسجل دخول مباشرة

## 🔧 إذا واجهت مشاكل:

### تحقق من:
1. **Network tab** في DevTools لمعرفة الطلبات
2. **Console logs** للرسائل المفصلة
3. **localStorage** في DevTools:
   - ابحث عن `cross_domain_session`
   - تحقق من قيم المفاتيح
4. **URL parameters** عند التحويل:
   - `transfer_session=true`
   - `auth_token=...`

### Debug script سريع (في console):
```javascript
// فحص localStorage
console.log('localStorage keys:', Object.keys(localStorage));
console.log('cross_domain_session:', localStorage.getItem('cross_domain_session'));

// فحص URL الحالي
console.log('Current URL:', window.location.href);
console.log('URL params:', Object.fromEntries(new URLSearchParams(window.location.search)));

// فحص الجلسة الحالية
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Current session:', { hasSession: !!data.session, user: data.session?.user?.email });
});
```

## 🎯 النتائج المتوقعة:

✅ **النجاح**: دخول مباشر للنطاق الفرعي بدون طلب تسجيل دخول إضافي

❌ **الفشل**: ظهور صفحة "لم يتم العثور على بيانات تسجيل دخول صالحة" متبوعة بتوجيه لصفحة تسجيل الدخول

---

**ملاحظة**: النظام الجديد يدعم طريقتين للنقل، مما يضمن عمله في جميع الحالات! 