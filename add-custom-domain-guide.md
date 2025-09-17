# دليل إضافة النطاق المخصص إلى Cloudflare

## المشكلة:
```
Unable to preview your Worker on https://asrayclothing.com/. 
No matching Zone on your account found.
```

## السبب:
النطاق `asrayclothing.com` غير مضاف إلى حساب Cloudflare كـ Zone.

## 🔧 الحلول:

### الحل 1: إضافة النطاق إلى Cloudflare (الحل الأمثل)

#### الخطوة 1: إضافة النطاق
```bash
# استخدام Cloudflare API لإضافة النطاق
curl -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "asrayclothing.com",
    "type": "full"
  }'
```

#### الخطوة 2: تحديث DNS
```bash
# إضافة CNAME record يشير إلى Pages
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "asrayclothing.com",
    "content": "stockiha.pages.dev",
    "ttl": 1
  }'
```

### الحل 2: تحديث Cloudflare Pages Custom Domain

#### عبر Dashboard:
1. اذهب إلى Cloudflare Pages
2. اختر مشروع `stockiha`
3. اذهب إلى Custom domains
4. أضف `asrayclothing.com`
5. اتبع تعليمات DNS

#### عبر Wrangler:
```bash
# إضافة النطاق المخصص
wrangler pages domain add asrayclothing.com --project-name stockiha

# التحقق من حالة النطاق
wrangler pages domain list --project-name stockiha
```

### الحل 3: تحديث Worker Routes

#### تحديث wrangler.toml:
```toml
# إضافة route للنطاق المخصص
[[routes]]
pattern = "asrayclothing.com/*"
zone_name = "asrayclothing.com"

[[routes]]
pattern = "www.asrayclothing.com/*"
zone_name = "asrayclothing.com"
```

#### أو عبر CLI:
```bash
# إضافة route للنطاق
wrangler route put "asrayclothing.com/*" \
  --zone asrayclothing.com \
  --script stockiha-worker
```

## 🚀 الحل السريع (للاختبار):

### استخدام Subdomain بدلاً من Custom Domain:
```bash
# إنشاء subdomain للاختبار
https://asrayclothing.stockiha.com
```

### تحديث DNS مؤقت:
```
# إضافة CNAME في DNS provider
asrayclothing.com → stockiha.pages.dev
```

## 📋 خطوات التحقق:

### 1. التحقق من Zone:
```bash
# عرض جميع الـ zones
wrangler zone list

# أو عبر API
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_CF_API_TOKEN"
```

### 2. التحقق من Pages Domains:
```bash
# عرض النطاقات المضافة
wrangler pages domain list --project-name stockiha
```

### 3. التحقق من Worker Routes:
```bash
# عرض routes
wrangler route list
```

## ⚠️ ملاحظات مهمة:

1. **Zone ID مطلوب**: النطاق يجب أن يكون zone في Cloudflare
2. **DNS Propagation**: قد يستغرق 24-48 ساعة
3. **SSL Certificate**: سيتم إنشاؤه تلقائياً
4. **Worker Routes**: يجب ربطها بالـ zone الصحيح

## 🔑 الحل الموصى به:

```bash
# 1. إضافة النطاق إلى Cloudflare
wrangler zone create asrayclothing.com

# 2. إضافة النطاق إلى Pages
wrangler pages domain add asrayclothing.com --project-name stockiha

# 3. نشر Worker مع routes محدثة
wrangler deploy

# 4. التحقق من العمل
curl -I https://asrayclothing.com
```
