# 🚀 خطوات النشر السريعة

## ✅ تم إكمال الخطوات التالية:

- [x] تحديث package.json للاسم الجديد `stockiha-app`
- [x] إنشاء commit بجميع التغييرات
- [x] جاهز للنشر!

---

## 📝 الخطوات المتبقية (3 دقائق فقط):

### 1️⃣ إنشاء Repository على GitHub

**افتح هذا الرابط:**
👉 https://github.com/new

**املأ البيانات كالتالي:**
```
Repository name:     stockiha-app
Description:         تطبيق سطوكيها - نظام نقطة بيع متكامل
Visibility:          Public (أو Private)

❌ لا تختر أي من:
   - Initialize README
   - Add .gitignore
   - Choose a license
```

**اضغط "Create repository"**

---

### 2️⃣ إنشاء GitHub Token

**افتح هذا الرابط:**
👉 https://github.com/settings/tokens/new

**املأ البيانات:**
```
Note:               Stockiha App Auto Updates
Expiration:         No expiration (أو 1 year)

✅ اختر الصلاحيات التالية فقط:
   ✓ repo (كل الصلاحيات الفرعية)
   ✓ write:packages
```

**اضغط "Generate token"**

**⚠️ مهم جداً:**
- انسخ الـ Token فوراً (يظهر مرة واحدة فقط!)
- احفظه في مكان آمن

---

### 3️⃣ تشغيل الأوامر التالية

```bash
# 1. تغيير الـ remote للـ repository الجديد
git remote set-url origin https://github.com/uzaydz/stockiha-app.git

# 2. رفع الكود على GitHub
git push -u origin main

# 3. حفظ GitHub Token في البيئة
export GH_TOKEN="paste_your_token_here"

# 4. احفظه بشكل دائم
echo 'export GH_TOKEN="paste_your_token_here"' >> ~/.zshrc
source ~/.zshrc

# 5. تأكد من حفظ الـ Token
echo $GH_TOKEN
```

---

### 4️⃣ (اختياري) اختبار النشر

```bash
# بناء التطبيق
npm run desktop:build

# اختبار النشر بدون رفع
npm run desktop:dist -- --publish never

# إذا نجح، انشر فعلياً
npm run desktop:dist -- --publish always
```

---

## 🎯 بعد النشر الأول

### إصدار نسخة جديدة:

```bash
# 1. غيّر الإصدار في package.json من 1.0.0 إلى 1.0.1

# 2. انشر
npm run desktop:build && npm run desktop:dist -- --publish always
```

**أو استخدم Git Tags:**
```bash
npm version patch    # 1.0.0 → 1.0.1
git push --follow-tags
# GitHub Actions سينشر تلقائياً!
```

---

## 🔍 التحقق من النجاح

1. افتح: https://github.com/uzaydz/stockiha-app/releases
2. يجب أن ترى Release جديد
3. الملفات: `.dmg` (Mac), `.exe` (Windows), `.AppImage` (Linux)

---

## ⚡ نصائح سريعة

### إذا نسيت GH_TOKEN:
```bash
# تحقق
echo $GH_TOKEN

# إذا فارغ، أضفه مرة أخرى
export GH_TOKEN="your_token_here"
```

### إذا فشل النشر:
```bash
# نظّف وأعد البناء
rm -rf node_modules dist dist-electron
npm install
npm run desktop:build
npm run desktop:dist -- --publish always
```

---

## 📚 المزيد من المعلومات

- دليل شامل: `ELECTRON_AUTO_UPDATE_GUIDE.md`
- دليل سريع: `QUICK_RELEASE_GUIDE.md`

---

## ✅ Checklist

- [ ] أنشأت Repository على GitHub
- [ ] أنشأت GitHub Token
- [ ] غيّرت الـ remote
- [ ] رفعت الكود
- [ ] حفظت GH_TOKEN
- [ ] نشرت أول إصدار

---

**🎉 بعد إكمال هذه الخطوات، نظام التحديث التلقائي سيعمل بشكل كامل!**
