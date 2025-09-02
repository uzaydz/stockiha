# 🌐 دليل إعداد النطاق المخصص لـ Stockiha

## الخطوة 1: إضافة النطاق في Cloudflare

### عبر Dashboard:
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اختر **Pages** من القائمة الجانبية
3. اختر مشروع **stockiha**
4. اذهب إلى **Custom domains**
5. انقر **Set up a custom domain**
6. أدخل `stockiha.com`
7. انقر **Continue**

### عبر CLI:
```bash
wrangler pages domain add stockiha.com --project-name stockiha
```

## الخطوة 2: إعداد DNS Records

يجب إضافة السجلات التالية في مزود DNS الخاص بك:

### للنطاق الرئيسي (stockiha.com):
```
Type: CNAME
Name: stockiha.com (أو @)
Value: aaa75b28.stockiha.pages.dev
TTL: Auto (أو 300)
```

### للنطاق الفرعي www:
```
Type: CNAME
Name: www
Value: aaa75b28.stockiha.pages.dev
TTL: Auto (أو 300)
```

### للنطاقات الفرعية الأخرى (اختياري):
```
Type: CNAME
Name: api
Value: aaa75b28.stockiha.pages.dev

Type: CNAME
Name: admin
Value: aaa75b28.stockiha.pages.dev
```

## الخطوة 3: التحقق من الإعداد

### التحقق من DNS:
```bash
# تحقق من النطاق الرئيسي
dig stockiha.com

# تحقق من www
dig www.stockiha.com

# اختبار الاتصال
curl -I https://stockiha.com
```

### التحقق من SSL:
```bash
# فحص شهادة SSL
openssl s_client -connect stockiha.com:443 -servername stockiha.com
```

## الخطوة 4: إعداد إعادة التوجيه

### إعادة توجيه www إلى النطاق الرئيسي:
1. في Cloudflare Dashboard
2. اذهب إلى **Rules** > **Redirect Rules**
3. أنشئ قاعدة جديدة:
   - **Field**: Hostname
   - **Operator**: equals
   - **Value**: www.stockiha.com
   - **URL**: https://stockiha.com$1
   - **Status Code**: 301

### عبر Page Rules (البديل):
```
URL Pattern: www.stockiha.com/*
Setting: Forwarding URL
Status Code: 301 - Permanent Redirect
Destination URL: https://stockiha.com/$1
```

## الخطوة 5: تحسينات الأداء

### تفعيل Cloudflare Features:
```bash
# تفعيل Auto Minify
wrangler zone setting update auto-minify --zone-id YOUR_ZONE_ID --value '{"css":true,"html":true,"js":true}'

# تفعيل Brotli
wrangler zone setting update brotli --zone-id YOUR_ZONE_ID --value on

# تفعيل HTTP/3
wrangler zone setting update http3 --zone-id YOUR_ZONE_ID --value on
```

## الخطوة 6: إعدادات الأمان

### تفعيل Security Features:
1. **Always Use HTTPS**: ON
2. **HSTS**: Enabled
3. **Minimum TLS Version**: 1.2
4. **TLS 1.3**: Enabled
5. **Automatic HTTPS Rewrites**: ON

### إعداد WAF:
```bash
# تفعيل WAF
wrangler zone setting update waf --zone-id YOUR_ZONE_ID --value on

# إعداد Security Level
wrangler zone setting update security-level --zone-id YOUR_ZONE_ID --value medium
```

## الخطوة 7: اختبار النطاق

### اختبارات أساسية:
```bash
# اختبار الوصول
curl -I https://stockiha.com

# اختبار إعادة التوجيه
curl -I https://www.stockiha.com

# اختبار SSL
curl -I https://stockiha.com --http2

# اختبار API
curl -I https://stockiha.com/api/health
```

### اختبارات الأداء:
- [GTmetrix](https://gtmetrix.com/)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)

## مشاكل شائعة وحلولها

### المشكلة: DNS لا يعمل
```bash
# تحقق من إعدادات DNS
dig stockiha.com +trace

# تحقق من Cloudflare nameservers
dig NS stockiha.com
```

### المشكلة: SSL غير متاح
1. تأكد من أن النطاق مُضاف في Cloudflare
2. انتظر حتى 24 ساعة لانتشار DNS
3. تحقق من إعدادات SSL/TLS في Cloudflare

### المشكلة: 525 Error
- تأكد من أن Origin Server يدعم SSL
- تحقق من إعدادات SSL/TLS Mode

## معلومات إضافية

### معرفات مهمة:
- **Project Name**: stockiha
- **Current Deployment**: https://aaa75b28.stockiha.pages.dev
- **Zone ID**: سيتم الحصول عليه بعد إضافة النطاق

### روابط مفيدة:
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Custom Domains Guide](https://developers.cloudflare.com/pages/platform/custom-domains/)
- [DNS Management](https://developers.cloudflare.com/dns/)

---

💡 **نصيحة**: احتفظ بنسخة احتياطية من إعدادات DNS الحالية قبل التغيير!
