# 🌐 دليل إعداد DNS للنطاقات مع Cloudflare Pages

## 🎯 حالة النطاقات الحالية

### ✅ يعمل بشكل صحيح
- **stockiha.com** - يعمل مع Cloudflare Pages ✅
- **458bcfa0.stockiha.pages.dev** - Cloudflare Pages URL ✅

### ⚠️ يحتاج تحديث
- **\*.stockiha.com** (النطاقات الفرعية) - ما زالت تشير إلى Vercel ❌

## 🔧 الحل: تحديث إعدادات DNS

### الخطوة 1: الدخول إلى Cloudflare Dashboard
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اختر النطاق **stockiha.com**
3. اذهب إلى **DNS** > **Records**

### الخطوة 2: تحديث سجل CNAME للنطاقات الفرعية
قم بتحديث أو إضافة السجل التالي:

```
Type: CNAME
Name: * (أو )
Content: stockiha.pages.dev
Proxy Status: Proxied (🧡 البرتقالي)
TTL: Auto
```

### الخطوة 3: التحقق من السجلات المطلوبة

يجب أن تكون لديك السجلات التالية:

```
A     stockiha.com        → 76.76.19.142 (Proxied 🧡)
A     stockiha.com        → 76.223.126.88 (Proxied 🧡)
CNAME www                 → stockiha.com (Proxied 🧡)
CNAME *                   → stockiha.pages.dev (Proxied 🧡)
```

### الخطوة 4: إضافة النطاقات الفرعية في Cloudflare Pages

```bash
# إضافة دعم للنطاقات الفرعية
wrangler pages domain add "*.stockiha.com" --project-name stockiha
```

## 🕐 أوقات الانتشار المتوقعة

- **التحديثات المحلية**: فورية
- **الانتشار العالمي**: 5-15 دقيقة
- **التحديثات الكاملة**: حتى 48 ساعة

## 🧪 اختبار النطاقات

### اختبار النطاق الرئيسي
```bash
curl -I https://stockiha.com
# يجب أن ترى: server: cloudflare
```

### اختبار النطاقات الفرعية
```bash
curl -I https://test.stockiha.com
curl -I https://demo.stockiha.com
# يجب أن ترى: server: cloudflare (وليس x-vercel-id)
```

## 🔍 استكشاف الأخطاء

### المشكلة: النطاقات الفرعية تشير لـ Vercel
**الحل:**
1. تحديث سجل CNAME للـ wildcard (`*`)
2. حذف السجلات القديمة من Vercel DNS
3. انتظار انتشار DNS (5-15 دقيقة)

### المشكلة: خطأ SSL/TLS
**الحل:**
1. تأكد من تفعيل Proxy (🧡) في Cloudflare
2. اذهب إلى SSL/TLS > Overview
3. اختر "Full (strict)" mode

### المشكلة: خطأ 522 Connection timed out
**الحل:**
1. تحقق من أن النطاق مُضاف في Cloudflare Pages
2. تأكد من صحة CNAME record
3. انتظر انتشار DNS

## 📋 قائمة التحقق النهائية

- [ ] النطاق الرئيسي يعمل مع Cloudflare
- [ ] سجل CNAME للـ wildcard مُضاف
- [ ] النطاقات الفرعية تشير لـ Cloudflare Pages
- [ ] SSL/TLS يعمل بشكل صحيح
- [ ] جميع الوظائف تعمل (API, Functions, etc.)

## 🎉 النتيجة المتوقعة

بعد إكمال هذه الخطوات، جميع النطاقات ستعمل مع Cloudflare Pages:

- ✅ https://stockiha.com
- ✅ https://www.stockiha.com  
- ✅ https://test.stockiha.com
- ✅ https://demo.stockiha.com
- ✅ https://أي-اسم.stockiha.com

---

## 📞 الدعم

إذا واجهت مشاكل، تحقق من:
1. [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
2. [DNS Troubleshooting Guide](https://developers.cloudflare.com/dns/troubleshooting/)
3. استخدم `wrangler pages --help` للمساعدة
