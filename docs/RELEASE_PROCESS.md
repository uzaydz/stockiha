# دليل نشر التحديثات على GitHub

هذا الدليل يشرح خطوات نشر إصدار جديد من تطبيق Stockiha على GitHub.

---

## الخطوات الرئيسية

### 1. تحديث رقم الإصدار

قم بتعديل رقم الإصدار في ملف `package.json`:

```json
{
  "version": "1.0.XX"
}
```

**مثال:**
```bash
# تعديل الإصدار من 1.0.19 إلى 1.0.20
sed -i '' 's/"version": "1.0.19"/"version": "1.0.20"/' package.json
```

---

### 2. بناء التطبيق

#### الخطوة الأولى: بناء ملفات Vite
```bash
npm run build
```

#### الخطوة الثانية: بناء حزمة Electron لـ macOS
```bash
# لبناء arm64 و x64 معاً
npx electron-builder --mac --arm64 --x64

# أو لبناء arm64 فقط (Apple Silicon)
npx electron-builder --mac --arm64

# أو لبناء x64 فقط (Intel)
npx electron-builder --mac --x64
```

**الملفات الناتجة في مجلد `dist-electron/`:**
- `Stockiha-X.X.X-arm64-mac.zip` - ملف ZIP لـ Apple Silicon
- `Stockiha-X.X.X-arm64.dmg` - ملف DMG لـ Apple Silicon
- `Stockiha-X.X.X-mac.zip` - ملف ZIP لـ Intel
- `Stockiha-X.X.X.dmg` - ملف DMG لـ Intel
- `latest-mac.yml` - ملف التحديث التلقائي

---

### 3. إنشاء Release على GitHub

#### باستخدام GitHub CLI (gh)

```bash
gh release create vX.X.X \
  --title "vX.X.X - وصف التحديث" \
  --notes "## التغييرات
- تغيير 1
- تغيير 2

## التحميل
- **macOS (Apple Silicon)**: Stockiha-X.X.X-arm64.dmg
- **macOS (Intel)**: Stockiha-X.X.X.dmg" \
  dist-electron/Stockiha-X.X.X-arm64-mac.zip \
  dist-electron/Stockiha-X.X.X-arm64.dmg \
  dist-electron/Stockiha-X.X.X-mac.zip \
  dist-electron/Stockiha-X.X.X.dmg \
  dist-electron/latest-mac.yml
```

**مثال حقيقي:**
```bash
gh release create v1.0.20 \
  --title "v1.0.20 - Fix login screen display" \
  --notes "## Changes
- Fixed PowerSyncProvider to show login page when user is not authenticated
- Fixed app getting stuck on loading screen

## Download
- **macOS (Apple Silicon)**: Stockiha-1.0.20-arm64.dmg
- **macOS (Intel)**: Stockiha-1.0.20.dmg" \
  dist-electron/Stockiha-1.0.20-arm64-mac.zip \
  dist-electron/Stockiha-1.0.20-arm64.dmg \
  dist-electron/Stockiha-1.0.20-mac.zip \
  dist-electron/Stockiha-1.0.20.dmg \
  dist-electron/latest-mac.yml
```

---

### 4. التحقق من Release

```bash
# عرض تفاصيل Release
gh release view vX.X.X

# عرض قائمة جميع Releases
gh release list
```

---

## سكربت آلي للنشر

يمكنك إنشاء سكربت `release.sh` لأتمتة العملية:

```bash
#!/bin/bash

# release.sh - سكربت نشر إصدار جديد
# الاستخدام: ./release.sh 1.0.20 "Fix login screen"

VERSION=$1
DESCRIPTION=$2

if [ -z "$VERSION" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: ./release.sh <version> <description>"
  echo "Example: ./release.sh 1.0.20 'Fix login screen'"
  exit 1
fi

echo "=== تحديث الإصدار إلى $VERSION ==="
sed -i '' "s/\"version\": \"[0-9.]*\"/\"version\": \"$VERSION\"/" package.json

echo "=== بناء التطبيق ==="
npm run build

echo "=== بناء حزمة Electron ==="
npx electron-builder --mac --arm64 --x64

echo "=== إنشاء Release على GitHub ==="
gh release create "v$VERSION" \
  --title "v$VERSION - $DESCRIPTION" \
  --notes "## Changes
- $DESCRIPTION

## Download
- **macOS (Apple Silicon)**: Stockiha-$VERSION-arm64.dmg
- **macOS (Intel)**: Stockiha-$VERSION.dmg" \
  "dist-electron/Stockiha-$VERSION-arm64-mac.zip" \
  "dist-electron/Stockiha-$VERSION-arm64.dmg" \
  "dist-electron/Stockiha-$VERSION-mac.zip" \
  "dist-electron/Stockiha-$VERSION.dmg" \
  "dist-electron/latest-mac.yml"

echo "=== تم النشر بنجاح ==="
echo "الرابط: https://github.com/uzaydz/stockiha/releases/tag/v$VERSION"
```

**تشغيل السكربت:**
```bash
chmod +x release.sh
./release.sh 1.0.21 "New feature description"
```

---

## ملاحظات مهمة

### التحديث التلقائي (Auto-Update)

- ملف `latest-mac.yml` ضروري لعمل التحديث التلقائي
- يجب أن يحتوي على SHA512 hash صحيح لملفات ZIP
- التطبيق يتحقق من هذا الملف عند البدء

### توقيع الكود (Code Signing)

- بدون توقيع Apple Developer، التحديث التلقائي لن يعمل تلقائياً
- المستخدمون يحتاجون تحميل التحديث يدوياً
- للتوقيع، تحتاج:
  - حساب Apple Developer ($99/سنة)
  - شهادة "Developer ID Application"
  - إعداد `CSC_NAME` في متغيرات البيئة

### رفع ملفات إضافية إلى Release موجود

```bash
gh release upload vX.X.X file1.zip file2.dmg
```

### حذف Release

```bash
gh release delete vX.X.X --yes
```

### إنشاء Draft Release (مسودة)

```bash
gh release create vX.X.X --draft --title "..." --notes "..."
```

### نشر Draft Release

```bash
gh release edit vX.X.X --draft=false
```

---

## هيكل الملفات المطلوبة

```
dist-electron/
├── Stockiha-X.X.X-arm64-mac.zip      # ZIP لـ Apple Silicon
├── Stockiha-X.X.X-arm64-mac.zip.blockmap
├── Stockiha-X.X.X-arm64.dmg          # DMG لـ Apple Silicon
├── Stockiha-X.X.X-arm64.dmg.blockmap
├── Stockiha-X.X.X-mac.zip            # ZIP لـ Intel
├── Stockiha-X.X.X-mac.zip.blockmap
├── Stockiha-X.X.X.dmg                # DMG لـ Intel
├── Stockiha-X.X.X.dmg.blockmap
├── latest-mac.yml                    # ملف التحديث التلقائي
├── mac/                              # مجلد التطبيق Intel
│   └── Stockiha.app/
└── mac-arm64/                        # مجلد التطبيق Apple Silicon
    └── Stockiha.app/
```

---

## استكشاف الأخطاء

### خطأ: "release already exists"
```bash
# حذف Release القديم
gh release delete vX.X.X --yes
# إعادة الإنشاء
gh release create vX.X.X ...
```

### خطأ: "file not found"
تأكد من وجود الملفات في `dist-electron/` وأن أسماؤها صحيحة.

### خطأ في التحديث التلقائي
1. تحقق من محتوى `latest-mac.yml`
2. تأكد من صحة SHA512 hash
3. تأكد من أن الملفات ZIP مرفوعة بشكل صحيح

---

## الأوامر السريعة

```bash
# بناء ونشر سريع
npm run build && npx electron-builder --mac --arm64 --x64

# عرض الإصدار الحالي
grep '"version"' package.json

# عرض آخر release
gh release list --limit 1
```
