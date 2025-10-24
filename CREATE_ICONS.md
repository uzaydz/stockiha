# إنشاء أيقونات Electron لـ Stockiha

## المشكلة الحالية
- التطبيق يحتاج أيقونات بصيغة `.icns` (Mac) و `.ico` (Windows)
- الشعار الحالي موجود بصيغة `.webp` في `/public/images/logo-new.webp`

## الحلول المتاحة

### الحل 1: استخدام أداة عبر الإنترنت (الأسرع)
1. افتح الموقع: https://cloudconvert.com/webp-to-icns
2. ارفع ملف `/public/images/logo-new.webp`
3. حوّله إلى `.icns` للماك
4. احفظه في `assets/icon.icns`

5. افتح الموقع: https://cloudconvert.com/webp-to-ico
6. ارفع نفس الملف
7. حوّله إلى `.ico` للويندوز
8. احفظه في `assets/icon.ico`

### الحل 2: استخدام أداة سطر الأوامر (للمطورين)

#### لنظام Mac:
```bash
# تثبيت ImageMagick
brew install imagemagick

# تحويل إلى PNG أولاً (حجم 1024x1024)
magick public/images/logo-new.webp -resize 1024x1024 assets/icon-1024.png

# إنشاء ICNS للماك
mkdir icon.iconset
sips -z 16 16     assets/icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     assets/icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     assets/icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     assets/icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   assets/icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   assets/icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   assets/icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   assets/icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   assets/icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 assets/icon-1024.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o assets/icon.icns
rm -rf icon.iconset

# إنشاء ICO للويندوز
magick assets/icon-1024.png -define icon:auto-resize=256,128,96,64,48,32,16 assets/icon.ico
```

### الحل 3: استخدام electron-icon-builder (موصى به)
```bash
# تثبيت الأداة
npm install -g electron-icon-builder

# إنشاء الأيقونات تلقائياً
electron-icon-builder --input=public/images/logo-new.webp --output=assets --flatten
```

### الحل 4: استخدام png2icons (بسيط)
```bash
# تثبيت
npm install -g png2icons

# تحويل webp إلى png أولاً
magick public/images/logo-new.webp assets/logo-temp.png

# إنشاء الأيقونات
png2icons assets/logo-temp.png assets --icns --ico

# حذف الملف المؤقت
rm assets/logo-temp.png
```

## بعد إنشاء الأيقونات

تأكد من وجود الملفات:
- `assets/icon.icns` (للماك)
- `assets/icon.ico` (للويندوز)

ثم شغّل:
```bash
npm run desktop:build:mac
```

## ملاحظات مهمة
- الأيقونة يجب أن تكون مربعة (1:1)
- الحجم الموصى به: 1024x1024 بكسل
- خلفية شفافة (PNG) أفضل من WEBP
- تأكد من وضوح الشعار في الأحجام الصغيرة (16x16)

## إذا لم تتوفر الأيقونات
يمكنك استخدام أيقونة افتراضية مؤقتاً:
```bash
# إنشاء أيقونة بسيطة بالنص
# أو تعطيل خيار icon مؤقتاً في electron-builder.json
```
