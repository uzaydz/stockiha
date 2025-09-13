# 🚀 دليل إعداد Cloudflare Worker - خطوة بخطوة

## ✅ الملفات المحضرة:
- `cloudflare-worker.js` - كود Worker كامل
- `src/utils/subdomainDetector.ts` - كاشف النطاقات الفرعية
- `src/utils/earlyPreload.ts` - محدث للعمل مع Worker

---

## 🔧 الخطوات المطلوبة منك:

### الخطوة 1: إنشاء Worker
```
1. اذهب إلى: https://dash.cloudflare.com
2. اختر حسابك
3. من القائمة الجانبية: "Workers & Pages"
4. انقر: "Create application"
5. اختر: "Create Worker"
6. اسم Worker: stockiha-subdomain-router
7. انقر: "Create"
```

### الخطوة 2: نسخ الكود
```
1. احذف الكود الافتراضي في المحرر
2. انسخ محتويات ملف: cloudflare-worker.js
3. الصق الكود في المحرر
4. انقر: "Save and Deploy"
```

### الخطوة 3: إضافة Custom Domains
```
1. في صفحة Worker، اذهب لـ "Settings"
2. انقر "Triggers"
3. في قسم "Custom Domains":
   - انقر "Add Custom Domain"
   - أدخل: stockiha.com
   - انقر "Add Custom Domain"
4. أضف نطاق آخر:
   - انقر "Add Custom Domain" مرة أخرى
   - أدخل: *.stockiha.com
   - انقر "Add Custom Domain"
```

### الخطوة 4: تعديل DNS Records
```
في Cloudflare DNS Management:

احذف هذه Records:
❌ * → stockiha.pages.dev (CNAME)
❌ stockiha.com → stockiha.pages.dev (CNAME)

أضف/عدل هذه Records:
✅ stockiha.com → stockiha.com (A أو AAAA - سيتم إنشاؤه تلقائياً)
✅ www → stockiha.com (CNAME, Proxied: ON)
✅ * → stockiha.com (CNAME, Proxied: ON)
```

### الخطوة 5: اختبار النظام
```bash
# اختبار النطاق الرئيسي
curl -I https://stockiha.com
curl -I https://www.stockiha.com

# اختبار النطاقات الفرعية
curl -I https://asraycollection.stockiha.com
curl -I https://test.stockiha.com

# فحص Headers للتأكد من عمل Worker
curl -I https://asraycollection.stockiha.com | grep X-
```

---

## 🎯 النتيجة المتوقعة:

بعد تطبيق هذه الخطوات:
- ✅ stockiha.com يعمل
- ✅ www.stockiha.com يعمل
- ✅ asraycollection.stockiha.com يعمل
- ✅ أي نطاق فرعي آخر يعمل
- ✅ لا مزيد من Error 522
- ✅ دعم لا نهائي للنطاقات الفرعية

---

## 📞 في حالة المشاكل:

إذا واجهت أي مشكلة:
1. تحقق من أن Worker تم نشره بنجاح
2. تأكد من أن Custom Domains مضافة بشكل صحيح
3. انتظر 5-10 دقائق لتحديث DNS
4. اختبر من متصفح خاص/مخفي

---

## 🔍 مراقبة الأداء:

```
1. في Cloudflare Dashboard → Workers & Pages
2. اختر worker "stockiha-subdomain-router"
3. اذهب لـ "Metrics" لمراقبة:
   - عدد الطلبات
   - زمن الاستجابة
   - معدل الأخطاء
```

---

**ملاحظة مهمة:** تأكد من إضافة `VITE_SUPABASE_URL` في Environment Variables كما ذكرنا سابقاً!
