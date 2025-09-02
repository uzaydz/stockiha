# 🚨 إصلاح خطأ 522 - دليل سريع

## المشكلة الحالية
خطأ 522 Connection Timed Out يحدث بسبب إعدادات DNS خاطئة.

## 🛠️ الحل الفوري (خطوات محددة)

### الخطوة 1: حذف CNAME الخطأ ❌
في Cloudflare Dashboard، احذف هذا السجل:
```
CNAME stockiha.com → stockiha.pages.dev
```

### الخطوة 2: إضافة A Records الصحيحة ✅
أضف هذين السجلين بدلاً منه:

```
Type: A
Name: stockiha.com (أو @)
Content: 76.76.19.142
Proxy Status: Proxied (🧡)
TTL: Auto
```

```
Type: A  
Name: stockiha.com (أو @)
Content: 76.223.126.88
Proxy Status: Proxied (🧡)
TTL: Auto
```

### الخطوة 3: إضافة CNAME للنطاقات الفرعية ✅
أضف هذا السجل:
```
Type: CNAME
Name: *
Content: stockiha.pages.dev
Proxy Status: Proxied (🧡)
TTL: Auto
```

## 📋 الإعدادات النهائية الصحيحة

يجب أن تكون إعدادات DNS كالتالي:

```
A     stockiha.com        → 76.76.19.142     (Proxied 🧡)
A     stockiha.com        → 76.223.126.88    (Proxied 🧡)
CNAME www                 → stockiha.com     (Proxied 🧡)
CNAME *                   → stockiha.pages.dev (Proxied 🧡)
CAA   stockiha.com        → 0 issue letsencrypt.org (DNS Only)
```

## ⏰ بعد التغيير

- **انتظر 2-5 دقائق** لانتشار DNS
- **اختبر النطاق**: https://stockiha.com
- **اختبر النطاقات الفرعية**: https://test.stockiha.com

## 🧪 التحقق من الإصلاح

```bash
# اختبار النطاق الرئيسي
curl -I https://stockiha.com

# اختبار النطاق الفرعي  
curl -I https://www.stockiha.com

# يجب أن ترى: HTTP/2 200 و server: cloudflare
```

---

**هذا الحل سيصلح المشكلة فوراً!** 🎯
