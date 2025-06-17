# 🛠️ دليل استكشاف الأخطاء وإصلاحها

## 🚨 المشاكل الشائعة والحلول

### 1. **مشكلة Multiple GoTrueClient instances**

**الأعراض:**
```
Multiple GoTrueClient instances detected in the same browser context
```

**الحل:**
1. افتح Developer Console (F12)
2. شغل الأمر التالي:
```javascript
authDebug.cleanupAuthStorage()
```
3. أعد تحميل الصفحة

### 2. **مشكلة عدم التوجيه للنطاق الفرعي**

**الأعراض:**
- بعد التسجيل، يتم التوجيه إلى `/dashboard` بدلاً من النطاق الفرعي
- عدم اكتشاف النطاق الفرعي بشكل صحيح

**الحل:**
1. في Developer Console، شغل:
```javascript
authDebug.fixSubdomainDetection()
```
2. تحقق من النطاق الفرعي:
```javascript
authDebug.checkAuthState()
```

### 3. **خطأ 406 Not Acceptable**

**الأعراض:**
```
GET https://...supabase.co/rest/v1/users?select=... 406 (Not Acceptable)
```

**السبب:** مشاكل في صلاحيات قاعدة البيانات أو multiple auth instances

**الحل:**
1. تنظيف شامل:
```javascript
authDebug.reloadWithCleanup()
```

### 4. **مشكلة التسجيل**

**الأعراض:**
- عدم إنشاء الحساب بنجاح
- أخطاء في المصادقة

**الحل:**
1. تأكد من صحة البيانات:
   - البريد الإلكتروني صالح
   - كلمة المرور 6 أحرف على الأقل
   - كلمة المرور مطابقة للتأكيد

2. إذا استمرت المشكلة:
```javascript
authDebug.printDiagnostics()
```

## 🔧 أدوات التشخيص المتاحة

### في Developer Console:

```javascript
// فحص حالة المصادقة الحالية
authDebug.checkAuthState()

// تنظيف تخزين المصادقة المتضارب
authDebug.cleanupAuthStorage()

// إصلاح كشف النطاق الفرعي
authDebug.fixSubdomainDetection()

// إعادة تحميل مع تنظيف شامل
authDebug.reloadWithCleanup()

// تشخيص شامل
authDebug.printDiagnostics()
```

## 📋 خطوات الإصلاح المرتبة

### للمشاكل العامة:
1. افتح Developer Console (F12)
2. شغل: `authDebug.printDiagnostics()`
3. إذا وجدت multiple instances: `authDebug.cleanupAuthStorage()`
4. إذا كانت مشكلة النطاق الفرعي: `authDebug.fixSubdomainDetection()`
5. أعد تحميل الصفحة

### لمشاكل التسجيل تحديداً:
1. امسح تخزين المتصفح: `authDebug.cleanupAuthStorage()`
2. أعد تحميل الصفحة
3. جرب التسجيل مرة أخرى
4. إذا فشل، تحقق من console للأخطاء

### لمشاكل النطاقات الفرعية:
1. تأكد من أن العنوان صحيح (مثل: `subdomain.localhost:8080`)
2. شغل: `authDebug.fixSubdomainDetection()`
3. تحقق من النتيجة: `authDebug.checkAuthState()`

## 🎯 نصائح إضافية

### للمطورين:
- استخدم النطاقات الفرعية في بيئة التطوير: `subdomain.localhost:8080`
- تأكد من إعدادات DNS في حالة النطاقات المخصصة
- راقب console للأخطاء والتحذيرات

### للمستخدمين:
- امسح cache المتصفح إذا استمرت المشاكل
- تأكد من تمكين JavaScript
- جرب متصفح آخر إذا لزم الأمر

## 📞 طلب المساعدة

إذا لم تحل هذه الخطوات المشكلة:
1. افتح Developer Console
2. شغل: `authDebug.printDiagnostics()`
3. انسخ النتيجة وشاركها مع فريق الدعم 