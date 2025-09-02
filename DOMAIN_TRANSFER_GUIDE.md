# 🔄 دليل نقل النطاق من Vercel إلى Cloudflare Pages

## 📋 الخطوات المطلوبة

### الخطوة 1: التأكد من حذف النطاق من Vercel ✅
- ✅ تم بالفعل - النطاق محذوف من Vercel

### الخطوة 2: إضافة النطاق في Cloudflare Pages

#### الطريقة الأولى: عبر Cloudflare Dashboard (الأسهل)

1. **اذهب إلى Cloudflare Dashboard**
   - https://dash.cloudflare.com
   - تسجيل الدخول بحسابك

2. **اذهب إلى Workers & Pages**
   - من القائمة الجانبية اختر **Workers & Pages**
   - ابحث عن مشروع **stockiha**
   - انقر عليه

3. **إضافة النطاق المخصص**
   - اذهب إلى تبويب **Custom domains**
   - انقر **Set up a custom domain**
   - أدخل: `stockiha.com`
   - انقر **Continue**

4. **إضافة www (اختياري)**
   - كرر العملية لـ `www.stockiha.com`
   - أو فعل خيار **Redirect www to apex**

#### الطريقة الثانية: عبر wrangler CLI

```bash
# إضافة النطاق الرئيسي
wrangler pages domain add stockiha.com --project-name stockiha

# إضافة www
wrangler pages domain add www.stockiha.com --project-name stockiha
```

### الخطوة 3: التحقق من إعدادات DNS في Cloudflare

1. **اذهب إلى DNS في Cloudflare**
   - https://dash.cloudflare.com
   - اختر النطاق **stockiha.com**
   - اذهب إلى **DNS** > **Records**

2. **تأكد من وجود السجلات التالية:**
```
A     stockiha.com    → 76.76.19.142      (Proxied 🧡)
A     stockiha.com    → 76.223.126.88     (Proxied 🧡)  
CNAME www             → stockiha.com      (Proxied 🧡)
CNAME *               → stockiha.pages.dev (Proxied 🧡)
```

### الخطوة 4: إعدادات SSL/TLS

1. **في Cloudflare Dashboard**
   - اذهب إلى **SSL/TLS** > **Overview**
   - اختر **Full (strict)** mode
   - تأكد من تفعيل **Always Use HTTPS**

2. **Edge Certificates**
   - اذهب إلى **SSL/TLS** > **Edge Certificates**
   - تأكد من تفعيل **Always Use HTTPS**
   - تفعيل **HTTP Strict Transport Security (HSTS)**

## 🧪 اختبار النقل

### اختبار فوري:
```bash
# اختبار النطاق
curl -I https://stockiha.com

# النتيجة المتوقعة:
# HTTP/2 200
# server: cloudflare
# (بدون x-vercel-id)
```

### اختبار شامل:
```bash
# اختبار النطاقات المختلفة
curl -I https://stockiha.com
curl -I https://www.stockiha.com
curl -I https://test.stockiha.com

# جميعها يجب أن تعرض: server: cloudflare
```

## ⏰ أوقات الانتشار المتوقعة

| الخطوة | الوقت المتوقع |
|--------|----------------|
| إضافة النطاق في Cloudflare Pages | فوري |
| إنشاء SSL Certificate | 2-5 دقائق |
| انتشار DNS المحلي | 5-15 دقيقة |
| انتشار DNS العالمي | 15-30 دقيقة |

## 🔍 استكشاف الأخطاء

### خطأ 404 (DEPLOYMENT_NOT_FOUND):
- ✅ **السبب**: النطاق غير مرتبط بـ Cloudflare Pages
- ✅ **الحل**: إضافة النطاق في Custom domains

### خطأ 522 (Connection Timeout):
- **السبب**: مشكلة في إعدادات DNS أو SSL
- **الحل**: التحقق من A Records وإعدادات SSL

### خطأ 525 (SSL Handshake Failed):
- **السبب**: مشكلة في SSL mode
- **الحل**: تغيير SSL mode إلى "Full (strict)"

## 🎯 النتيجة النهائية

بعد إكمال النقل بنجاح:

✅ **https://stockiha.com** → Cloudflare Pages  
✅ **https://www.stockiha.com** → Cloudflare Pages  
✅ **https://any-subdomain.stockiha.com** → Cloudflare Pages  
✅ **جميع التحديثات** التي عملتها ستظهر  
✅ **Cloudflare Functions** ستعمل  
✅ **أداء أسرع** مع Cloudflare CDN  

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
2. استخدم [DNS Checker](https://dnschecker.org/) للتحقق من انتشار DNS
3. تحقق من [SSL Checker](https://www.sslshopper.com/ssl-checker.html)

---

**الخطوة التالية: اذهب إلى Cloudflare Dashboard وأضف النطاق في Custom domains!** 🚀
