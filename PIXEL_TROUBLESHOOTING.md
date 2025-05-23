# إرشادات حل مشكلة عدم ظهور البيكسل في الموقع المنشور

## المشكلة
البيكسل محفوظ في قاعدة البيانات لكن لا يظهر في الموقع المنشور على Vercel رغم ظهور الرسالة "لم يتم اكتشاف بيكسل على موقع الويب هذا" في Meta Pixel Helper.

## الحل المطبق

### 1. إنشاء Supabase Edge Function
تم إنشاء Edge Function في Supabase لجلب إعدادات التحويل:
- **المسار**: `supabase/functions/conversion-settings/index.ts`
- **URL**: `https://wrnssatuvmumsczyldth.supabase.co/functions/v1/conversion-settings`

### 2. إنشاء Vercel API Route (بديل)
تم إنشاء API route لـ Vercel كبديل:
- **المسار**: `api/conversion-settings/[productId].js`

### 3. تحديث ProductTrackingWrapper
تم تحديث الكود ليستخدم Edge Function مع fallback للـ API route المحلي:
```typescript
const SUPABASE_URL = 'https://wrnssatuvmumsczyldth.supabase.co';
const CONVERSION_SETTINGS_URL = `${SUPABASE_URL}/functions/v1/conversion-settings`;
```

### 4. إصلاح PixelLoader
- إضافة `test_event_code` من قاعدة البيانات بدلاً من القيمة الثابتة
- تحسين logs للتشخيص
- التأكد من تمرير جميع المعاملات بشكل صحيح

## اختبار الحل

### 1. اختبار Edge Function مباشرة
```bash
curl -X GET "https://wrnssatuvmumsczyldth.supabase.co/functions/v1/conversion-settings?productId=1bd177b5-f664-4203-bad0-68a045db7583" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY"
```

**النتيجة المتوقعة**:
```json
{
  "settings": {
    "facebook": {
      "enabled": true,
      "pixel_id": "1235170204857849",
      "test_event_code": "TEST35620",
      "conversion_api_enabled": true
    },
    "test_mode": true
  },
  "success": true
}
```

### 2. إعدادات المنتج "testpixel"
- **معرف المنتج**: `1bd177b5-f664-4203-bad0-68a045db7583`
- **Facebook Pixel ID**: `1235170204857849`
- **Test Event Code**: `TEST35620`
- **وضع الاختبار**: مُفعل

## ما يجب أن يحدث الآن

### 1. في Developer Console
```javascript
// ✅ Facebook Pixel محمل بنجاح: 1235170204857849 (TEST35620)
// 🔍 جلب إعدادات البكسل من Edge Function للمنتج: 1bd177b5-f664-4203-bad0-68a045db7583
// ✅ تم جلب إعدادات التحويل من Edge Function
// 🎯 إعدادات البكسل المُعالجة
// 🚀 بدء تحميل البكسلات
// 🔵 تحميل Facebook Pixel
```

### 2. في Meta Pixel Helper
- يجب أن يظهر Facebook Pixel
- يجب أن يظهر PageView event
- يجب أن يظهر Test Event Code: TEST35620

### 3. في Network Tab
- طلب إلى Edge Function للحصول على إعدادات التحويل
- تحميل script Facebook Pixel
- إرسال PageView event

## خطوات التحقق

### 1. فتح Developer Console
```javascript
// تحقق من تحميل fbq
window.fbq

// تحقق من إعدادات البكسل
sessionStorage.getItem('pixel_settings_1bd177b5-f664-4203-bad0-68a045db7583')
```

### 2. فتح Network Tab
- تحقق من طلب Edge Function
- تحقق من تحميل Facebook Pixel script
- تحقق من إرسال PageView event

### 3. استخدام Meta Pixel Helper
- تثبيت Extension
- زيارة صفحة المنتج testpixel
- التحقق من ظهور البيكسل والأحداث

## متغيرات البيئة المطلوبة

في Vercel:
```env
VITE_SUPABASE_URL=https://wrnssatuvmumsczyldth.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## الخطوات التالية

1. **Deploy to Vercel**: تحديث المشروع على Vercel
2. **Test on Production**: اختبار الموقع المنشور
3. **Monitor Logs**: مراقبة console logs و network requests
4. **Validate Pixel**: التحقق من Meta Pixel Helper

## إذا استمرت المشكلة

### احتمالات أخرى:
1. **CSP Headers**: Content Security Policy قد تمنع تحميل البكسل
2. **Environment Variables**: متغيرات البيئة غير محددة في Vercel
3. **Build Process**: مشكلة في عملية البناء
4. **Caching**: مشكلة في التخزين المؤقت

### تشخيص إضافي:
```javascript
// في console المتصفح
console.log('Environment:', {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'موجود' : 'مفقود'
});

// تحقق من CSP headers
console.log('CSP:', document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
``` 