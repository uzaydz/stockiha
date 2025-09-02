# 🌐 دليل ربط النطاق المخصص stockiha.com

## الطريقة اليدوية لربط النطاق:

### 1️⃣ **في Cloudflare Dashboard:**
1. اذهب إلى: https://dash.cloudflare.com/
2. اختر **Pages** من القائمة الجانبية
3. اختر مشروع **stockiha**
4. اذهب إلى تبويب **Custom domains**
5. اضغط **Set up a custom domain**
6. أدخل: `stockiha.com`
7. اتبع التعليمات لتحديث DNS

### 2️⃣ **تحديث DNS Records:**
إذا كان النطاق مسجل في Cloudflare:
- سيتم تحديث DNS تلقائياً

إذا كان النطاق مسجل في مكان آخر:
- أضف CNAME record: `stockiha.com` → `stockiha.pages.dev`

### 3️⃣ **التحقق من النطاق:**
بعد ربط النطاق، سيصبح متاحاً على:
- https://stockiha.com
- https://www.stockiha.com (إذا تم ربطه)

## ⚠️ **ملاحظات مهمة:**
- قد يستغرق ربط النطاق 24-48 ساعة
- تأكد من أن النطاق مسجل باسمك
- SSL Certificate سيتم إنشاؤه تلقائياً

## 🔧 **إذا واجهت مشاكل:**
1. تحقق من DNS records
2. تأكد من أن النطاق نشط
3. انتظر 24-48 ساعة للانتشار الكامل
