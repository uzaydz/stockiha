# 🚀 دليل النشر السريع - Stockiha Updates

## خطوات النشر السريعة (5 دقائق)

### 1️⃣ إعداد GitHub Token (مرة واحدة فقط)

```bash
# احصل على Token من: https://github.com/settings/tokens
# الصلاحيات المطلوبة: repo, write:packages

# أضف الـ Token إلى البيئة
export GH_TOKEN="ghp_your_token_here"

# احفظه بشكل دائم
echo 'export GH_TOKEN="ghp_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

### 2️⃣ تحديث رقم الإصدار

```bash
# في package.json، غيّر:
"version": "1.0.0"  # إلى
"version": "1.0.1"  # (أو أي رقم أعلى)
```

### 3️⃣ البناء والنشر

```bash
# بناء التطبيق
npm run desktop:build

# نشر على GitHub Releases
npm run desktop:dist -- --publish always
```

**أو استخدم الأمر الكامل:**
```bash
npm run desktop:build && npm run desktop:dist -- --publish always
```

---

## 🎯 النشر التلقائي بـ Git Tags

```bash
# 1. حدّث الإصدار
npm version patch  # يزيد 1.0.0 → 1.0.1
# أو
npm version minor  # يزيد 1.0.0 → 1.1.0
# أو
npm version major  # يزيد 1.0.0 → 2.0.0

# 2. ادفع الـ tag
git push --follow-tags

# 3. GitHub Actions ستنشر تلقائياً!
```

---

## ✅ التحقق من نجاح النشر

1. اذهب إلى: `https://github.com/uzaydz/bazaar-console-connect/releases`
2. يجب أن ترى Release جديد
3. يجب أن تجد ملفات:
   - `Stockiha-1.0.1.dmg` (macOS)
   - `Stockiha-1.0.1.exe` (Windows)
   - `Stockiha-1.0.1.AppImage` (Linux)

---

## 🧪 اختبار التحديث

```bash
# 1. ثبّت النسخة القديمة (مثلاً 1.0.0)
# 2. انشر نسخة جديدة (1.0.1)
# 3. افتح التطبيق القديم
# 4. انتظر 3-5 ثوانٍ
# 5. يجب أن يظهر إشعار بالتحديث! ✨
```

---

## 🐛 حل المشاكل السريع

### خطأ: "GH_TOKEN not found"
```bash
# تأكد من وجود الـ Token
echo $GH_TOKEN

# إذا فارغ، أضفه:
export GH_TOKEN="your_token_here"
```

### خطأ: "Permission denied"
```bash
# تأكد من صلاحيات الـ Token في GitHub
# يجب أن يكون لديك: repo, write:packages
```

### خطأ: "Build failed"
```bash
# نظّف الـ cache وأعد البناء
rm -rf node_modules dist dist-electron
npm install
npm run desktop:build
```

---

## 📝 Release Notes Template

عند إنشاء Release، استخدم هذا القالب:

```markdown
## 🎉 الإصدار 1.0.1

### ✨ ميزات جديدة
- إضافة نظام التحديث التلقائي
- تحسين الأداء

### 🐛 إصلاحات
- إصلاح مشكلة في البيع
- تحسين الاستقرار

### 📦 التثبيت
قم بتنزيل الملف المناسب لنظامك:
- **macOS**: `Stockiha-1.0.1.dmg`
- **Windows**: `Stockiha-1.0.1.exe`
- **Linux**: `Stockiha-1.0.1.AppImage`

### 🔄 التحديث التلقائي
المستخدمون الحاليون سيحصلون على إشعار بالتحديث تلقائياً!
```

---

## 🎓 نصائح احترافية

### نظام الإصدارات (Semantic Versioning)
- **Patch** (1.0.0 → 1.0.1): إصلاحات صغيرة
- **Minor** (1.0.0 → 1.1.0): ميزات جديدة متوافقة
- **Major** (1.0.0 → 2.0.0): تغييرات كبيرة غير متوافقة

### جدول النشر الموصى به
- **Hotfix**: فوراً عند اكتشاف bug حرج
- **Minor**: كل 2-4 أسابيع
- **Major**: كل 3-6 أشهر

### قبل كل نشر
- ✅ اختبر التطبيق محلياً
- ✅ راجع التغييرات
- ✅ جهّز Release Notes
- ✅ أخبر الفريق

---

**🎯 هدفنا:** نشر سريع، آمن، وبدون مشاكل!
