# دليل تشخيص Facebook Conversion API الشامل

## 🎯 التحسينات الجديدة المطبقة

### 1. **ترقية إلى Graph API v22.0**
- تم تحديث من v18.0 إلى v22.0 (أحدث إصدار)
- تحسين استقرار الـ API وأداءه

### 2. **Advanced Matching Parameters**
- إضافة Country: `dz` (الجزائر)
- إضافة Language: من browser
- إضافة Timezone: من browser
- تحسين Facebook Browser ID (fbp) detection
- تحسين Facebook Click ID (fbc) detection

### 3. **تحسين Server-side Hashing**
- نقل hashing من Client إلى Server
- استخدام SHA-256 وفقاً لمعايير Meta
- حماية أفضل للبيانات الحساسة

### 4. **Event Deduplication المحسن**
- إنشاء event_id فريد لكل حدث
- مشاركة نفس event_id بين Client-side و Server-side
- منع التكرار المزدوج للأحداث

### 5. **Error Handling المحسن**
- تسجيل مفصل للأخطاء
- معلومات تشخيص شاملة
- Fallback mechanisms

## 📋 قائمة التحقق السريع

### ✅ الأساسيات
- [ ] Pixel ID صحيح: `1235170204857849`
- [ ] Access Token صالح وله الصلاحيات المطلوبة
- [ ] Test Event Code: `TEST35620`
- [ ] وضع الاختبار مُفعل

### ✅ البيانات في قاعدة البيانات
```sql
SELECT 
    facebook_pixel_id,
    facebook_access_token,
    facebook_test_event_code,
    enable_facebook_conversion_api,
    test_mode
FROM product_marketing_settings 
WHERE product_id = '1bd177b5-f664-4203-bad0-68a045db7583';
```

### ✅ Network Requests
- [ ] Edge Function استجابة 200
- [ ] Facebook Conversion API استجابة 200
- [ ] Events تظهر في Test Events Tool

### ✅ Console Logs
```javascript
// يجب أن تظهر هذه الرسائل:
// 🔵 تحميل Facebook Pixel: 1235170204857849 (وضع الاختبار: TEST35620)
// ✅ Facebook Pixel محمل بنجاح: 1235170204857849 (TEST35620)
// 🔑 تم إنشاء Event ID فريد: [unique_id]
// ✅ تم إرسال الحدث إلى Facebook Pixel (Client-side)
// ✅ استجابة Facebook Conversion API: {success: true, events_received: 1}
```

## 🔍 خطوات التشخيص المتقدم

### 1. **فحص Client-side Pixel**
```javascript
// في Developer Console
console.log('fbq status:', typeof window.fbq);
console.log('fbq queue:', window.fbq.queue);

// إرسال حدث اختبار
window.fbq('track', 'ViewContent', {
    content_ids: ['test'],
    content_type: 'product',
    value: 100,
    currency: 'DZD'
}, {
    eventID: 'test_' + Date.now(),
    testEventCode: 'TEST35620'
});
```

### 2. **فحص Server-side API**
```bash
# اختبار API endpoint مباشرة
curl -X POST https://your-domain.vercel.app/api/facebook-conversion-api \
  -H "Content-Type: application/json" \
  -d '{
    "pixel_id": "1235170204857849",
    "access_token": "YOUR_ACCESS_TOKEN",
    "payload": {
      "data": [{
        "event_name": "Purchase",
        "event_time": 1748024400,
        "action_source": "website",
        "user_data": {
          "em": "test@example.com",
          "country": "dz"
        },
        "custom_data": {
          "currency": "DZD",
          "value": 100
        }
      }],
      "test_event_code": "TEST35620"
    }
  }'
```

### 3. **مراجعة Events Manager**
1. اذهب إلى [Events Manager](https://business.facebook.com/events_manager)
2. اختر Pixel ID: `1235170204857849`
3. اذهب إلى **Test Events**
4. استخدم Test Code: `TEST35620`
5. تحقق من وصول الأحداث

### 4. **فحص Advanced Matching**
```javascript
// تحقق من توفر البيانات المطلوبة
console.log('User Agent:', navigator.userAgent);
console.log('Language:', navigator.language);
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Country Code:', 'dz');

// تحقق من Facebook IDs
function checkFacebookIds() {
    const fbp = document.cookie.split(';')
        .find(cookie => cookie.trim().startsWith('_fbp='))
        ?.split('=')[1];
    
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    
    console.log('Facebook Browser ID (fbp):', fbp);
    console.log('Facebook Click ID (fbclid):', fbclid);
}
```

## 🚨 مشاكل شائعة وحلولها

### 1. **"Invalid Access Token"**
```bash
# تحقق من صحة الـ token
curl -G https://graph.facebook.com/v22.0/me \
  -d "access_token=YOUR_ACCESS_TOKEN"
```

### 2. **"Invalid Pixel ID"**
- تأكد من أن Pixel ID هو: `1235170204857849`
- تحقق من أن الـ token له صلاحية على هذا الـ pixel

### 3. **"Events not showing in Test Events"**
- تأكد من استخدام Test Event Code: `TEST35620`
- انتظر 1-2 دقيقة للظهور
- تحقق من Network tab للأخطاء

### 4. **"Deduplication issues"**
- تأكد من استخدام نفس `event_id` في Client و Server
- تحقق من أن `event_name` متطابق
- مراجعة console logs للـ event IDs

## 📊 مؤشرات الأداء المتوقعة

### Event Match Quality Score
- **Excellent (8.0+)**: مع البيانات المحسنة الجديدة
- **Good (6.0-7.9)**: حد أدنى مقبول
- **Needs Improvement (<6.0)**: يحتاج مراجعة

### Events Received vs Processed
- **Client-side**: يجب أن يكون 100%
- **Server-side**: يجب أن يكون 95%+
- **Deduplicated**: نسبة منطقية حسب التصميم

## 🔧 أدوات التشخيص

### 1. **Meta Pixel Helper**
- [تثبيت Extension](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
- فحص فوري للـ pixel و events

### 2. **Facebook Test Events Tool**
- [رابط مباشر](https://business.facebook.com/events_manager/pixel/1235170204857849/test_events)
- مراقبة real-time للأحداث

### 3. **Graph API Explorer**
- [استخدام للاختبار](https://developers.facebook.com/tools/explorer)
- تجربة API calls مباشرة

## 📞 خطوات الدعم

### المرحلة 1: تشخيص أولي (5 دقائق)
1. فحص Console logs
2. فحص Network requests
3. استخدام Meta Pixel Helper

### المرحلة 2: تشخيص متقدم (15 دقيقة)
1. اختبار API endpoint مباشرة
2. مراجعة Events Manager
3. فحص Advanced Matching data

### المرحلة 3: حل المشاكل (30 دقيقة)
1. مراجعة الكود
2. تحديث الإعدادات
3. إعادة اختبار النظام

## 🎯 النتائج المتوقعة بعد التحسينات

1. **Client-side Pixel**: يعمل بنجاح ✅
2. **Server-side Conversion API**: يعمل بنجاح ✅
3. **Event Deduplication**: يعمل بطريقة صحيحة ✅
4. **Advanced Matching**: محسن مع بيانات إضافية ✅
5. **Error Handling**: محسن مع تسجيل شامل ✅

---

*آخر تحديث: تم تطبيق جميع best practices حسب Meta Documentation الرسمي* 