# 🚀 الخطوات المطلوبة منك لإكمال الانتقال إلى Cloudflare

## 1️⃣ **إعداد متغيرات البيئة في Cloudflare Dashboard**

### الخطوة الأولى: الدخول إلى Cloudflare Dashboard
1. اذهب إلى: https://dash.cloudflare.com/
2. اختر حسابك
3. اذهب إلى **Pages** من القائمة الجانبية
4. اختر مشروع **stockiha**
5. اذهب إلى تبويب **Settings**
6. اضغط على **Environment variables**

### الخطوة الثانية: إضافة المتغيرات التالية

**للـ Production Environment:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
YALIDINE_API_KEY=your_yalidine_api_key
ENCRYPTION_KEY=generate_32_character_random_string
```

**للـ Preview Environment (اختياري):**
نفس المتغيرات أعلاه ولكن يمكن استخدام قيم تجريبية

### ⚠️ **مهم جداً:**
- **لا تضع** القيم الحقيقية هنا في الملف
- استخدم القيم من ملف `.env` الموجود في مشروعك
- تأكد من عدم مشاركة هذه القيم مع أي شخص

---

## 2️⃣ **ربط النطاق المخصص (اختياري)**

### إذا كنت تريد استخدام stockiha.com:

1. **في Cloudflare Dashboard:**
   - اذهب إلى **Pages** → **stockiha** → **Custom domains**
   - اضغط **Set up a custom domain**
   - أدخل: `stockiha.com`
   - اتبع التعليمات لتحديث DNS

2. **أو استخدم الأمر:**
```bash
wrangler pages domain add stockiha.com --project-name stockiha
```

---

## 3️⃣ **تشغيل سكريبت إعداد الأداء (اختياري متقدم)**

### إذا كنت تريد تحسينات متقدمة:

1. **احصل على Cloudflare Zone ID و API Token:**
   - Zone ID: من **Overview** في dashboard نطاقك
   - API Token: من **My Profile** → **API Tokens** → **Create Token**

2. **شغل السكريبت:**
```bash
CLOUDFLARE_ZONE_ID=your_zone_id CLOUDFLARE_API_TOKEN=your_token node cloudflare-performance-config.js
```

---

## 4️⃣ **اختبار المشروع**

### بعد إعداد متغيرات البيئة:

1. **انتظر إعادة البناء التلقائي** (2-3 دقائق)
2. **اذهب إلى الرابط:** https://aaa75b28.stockiha.pages.dev
3. **اختبر الوظائف:**
   - تسجيل الدخول
   - إضافة منتجات
   - استخدام API

---

## 5️⃣ **إزالة Vercel (بعد التأكد)**

### عندما تتأكد أن كل شيء يعمل:

1. **في Vercel Dashboard:**
   - اذهب إلى مشروعك
   - **Settings** → **Advanced** → **Delete Project**

2. **احذف ملف vercel.json من مشروعك:**
```bash
rm vercel.json
git add . && git commit -m "Remove Vercel config after migration"
```

---

## ✅ **قائمة التحقق النهائية**

- [ ] إعداد متغيرات البيئة في Cloudflare
- [ ] اختبار المشروع على الرابط الجديد
- [ ] التأكد من عمل جميع الوظائف
- [ ] ربط النطاق المخصص (اختياري)
- [ ] حذف مشروع Vercel (بعد التأكد)

---

## 🆘 **إذا واجهت مشاكل**

1. **تحقق من Console في المتصفح** للأخطاء
2. **تحقق من Cloudflare Functions logs** في Dashboard
3. **تأكد من صحة متغيرات البيئة**

---

## 📞 **المساعدة**

إذا احتجت مساعدة في أي خطوة، أخبرني وسأساعدك فوراً! 🚀
