# 🚨 حل مشكلة النطاق العاجل

## المشكلة الحالية
النطاق `stockiha.com` ما زال يعرض مشروع Vercel القديم بدلاً من Cloudflare Pages الجديد.

## ✅ ما يعمل:
- Cloudflare Pages: https://stockiha.pages.dev ✅
- Cloudflare Functions: تعمل ✅
- إعدادات DNS في Cloudflare: صحيحة ✅

## ❌ ما لا يعمل:
- النطاق المخصص: https://stockiha.com → يشير لـ Vercel

## 🛠️ الحل الفوري (خطوات محددة)

### الخطوة 1: حذف النطاق من Vercel
1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اختر المشروع القديم
3. اذهب إلى **Settings** > **Domains**
4. احذف `stockiha.com` من Vercel

### الخطوة 2: التأكد من إعدادات Cloudflare DNS
تأكد من أن السجلات كالتالي:
```
A     stockiha.com    → 76.76.19.142      (Proxied 🧡)
A     stockiha.com    → 76.223.126.88     (Proxied 🧡)  
CNAME www             → stockiha.com      (Proxied 🧡)
CNAME *               → stockiha.pages.dev (Proxied 🧡)
```

### الخطوة 3: إجبار تحديث DNS
```bash
# تنظيف cache DNS المحلي
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# أو على Linux
sudo systemctl flush-dns
```

### الخطوة 4: اختبار التحديث
```bash
# اختبر النطاق كل دقيقتين
curl -I https://stockiha.com
# ابحث عن: server: cloudflare (بدون x-vercel-id)
```

## 🔍 استكشاف الأخطاء

### إذا ما زال يشير لـ Vercel:
1. **تحقق من Vercel**: تأكد من حذف النطاق تماماً
2. **انتظر الانتشار**: قد يحتاج 15-30 دقيقة
3. **اختبر من مواقع مختلفة**: https://www.whatsmydns.net/

### إذا ظهر خطأ 522:
1. **انتظر 5 دقائق** لاستقرار DNS
2. **تحقق من إعدادات SSL** في Cloudflare
3. **تأكد من Proxy Status = Proxied**

## 🎯 النتيجة المتوقعة

بعد هذه الخطوات، ستحصل على:
```bash
curl -I https://stockiha.com
# Output:
HTTP/2 200
server: cloudflare
# بدون x-vercel-id
```

## ⚡ البديل السريع

إذا لم تنجح الطرق أعلاه، يمكنك:
1. **استخدام نطاق فرعي مؤقت**: https://app.stockiha.com
2. **أو استخدام رابط Cloudflare Pages**: https://stockiha.pages.dev

---

**المشكلة الأساسية: تضارب بين Vercel و Cloudflare على نفس النطاق**
**الحل: حذف النطاق من Vercel أولاً**
