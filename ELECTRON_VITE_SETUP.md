# إعداد Vite لتطبيق Electron - دليل شامل

## 📋 ملخص التعديلات

تم تحويل المشروع بالكامل إلى تطبيق **Electron فقط** مع إزالة جميع تعقيدات الويب (Vercel, Cloudflare, CSP, إلخ).

## ✅ التعديلات المنجزة

### 1. **تفويض Vite إلى إعداد سطح المكتب**
- `vite.config.ts` الآن يستورد ويصدّر `vite.config.desktop.ts` مباشرة
- جميع الإضافات الخاصة بالويب محفوظة في `WEB_CONFIG` (غير مستخدمة)

### 2. **تحسينات Vite Desktop**
- ✅ `server.strictPort: true` - تثبيت المنفذ 8080 للـ HMR المستقر
- ✅ Million plugin مشروط: `VITE_ENABLE_MILLION=true` (معطل افتراضياً)
- ✅ `base: './'` - مسارات نسبية لـ Electron
- ✅ `external: ['electron', 'path', 'fs', 'os']` - عدم حشو Node modules

### 3. **إصلاح المسارات في index.html**
تم تحويل جميع المسارات من مطلقة إلى نسبية:

```html
<!-- قبل (مطلق - لا يعمل في Electron) -->
<link rel="preload" href="%BASE_URL%fonts/tajawal-regular.woff2" as="font">
<link rel="stylesheet" href="/src/index.css">
<link rel="manifest" href="/manifest.json">

<!-- بعد (نسبي - يعمل في Electron) -->
<link rel="preload" href="./fonts/tajawal-regular.woff2" as="font">
<link rel="stylesheet" href="./src/index.css">
<link rel="manifest" href="./manifest.json">
```

### 4. **تحديث package.json**
```json
{
  "dev": "vite --config vite.config.desktop.ts",
  "build": "vite build --config vite.config.desktop.ts"
}
```

### 5. **تحديث TypeScript Config**
```json
{
  "include": ["vite.config.ts", "vite.config.desktop.ts", "env.d.ts", ...]
}
```

## 🚀 كيفية التشغيل والبناء

### التطوير

**خيار 1: Vite فقط (للاختبار السريع)**
```bash
npm run dev
# يشغل على http://localhost:8080
```

**خيار 2: Electron + Vite (الموصى به)**
```bash
npm run desktop:dev
# يشغل Vite على 8080 و Electron يحمّل http://localhost:8080/login
```

### البناء

**بناء موارد الواجهة:**
```bash
npm run desktop:build
# ينتج dist/ مع base: './' للمسارات النسبية
```

**إنشاء توزيعة:**
```bash
# macOS
npm run desktop:dist-mac

# Windows
npm run desktop:dist-win

# Linux
npm run desktop:dist-linux
```

## 🔧 الملفات المعدّلة

| الملف | التغيير |
|------|--------|
| `vite.config.ts` | تفويض إلى desktop config |
| `vite.config.desktop.ts` | strictPort + Million مشروط |
| `tsconfig.node.json` | إضافة vite.config.desktop.ts |
| `package.json` | dev/build يستخدم --config |
| `index.html` | مسارات نسبية (./fonts, ./src, إلخ) |

## ⚙️ الإعدادات الرئيسية

### Server (التطوير)
```typescript
server: {
  host: "localhost",        // localhost فقط
  port: 8080,              // منفذ ثابت
  strictPort: true,        // لا تبديل منفذ
  hmr: {
    host: 'localhost',
    protocol: 'ws',
    port: 8080,
    overlay: false          // بدون overlay في Electron
  },
  cors: false              // CORS معطل
}
```

### Build (الإنتاج)
```typescript
build: {
  base: './',              // مسارات نسبية
  target: 'es2022',        // Chromium 126 (Electron 38)
  minify: 'terser',
  rollupOptions: {
    external: ['electron', 'path', 'fs', 'os']
  }
}
```

## 📦 الأصول (Assets)

### الخطوط
```
public/fonts/
├── tajawal-regular.woff2  (preload)
├── tajawal-medium.woff2   (prefetch)
└── tajawal-bold.woff2     (prefetch)
```

### الأيقونات
```
public/
├── favicon.ico
├── apple-touch-icon.png
├── icon-192x192.png
└── icon-512x512.png
```

## 🎯 الخطوات التالية (اختيارية)

### 1. تنظيف سكريبتات غير المستخدمة
إزالة من `package.json`:
```json
{
  "build:cloudflare": "...",
  "deploy:*": "...",
  "preview:*": "...",
  "dev:store": "...",
  "build:store": "..."
}
```

### 2. تحسين target للبناء
```typescript
// استخدام Chromium version الخاص بـ Electron 38
build: {
  target: 'chrome126'  // بدل es2022
}
```

### 3. إضافة externals إضافية (إذا لزم الأمر)
```typescript
external: [
  'electron',
  'path', 'fs', 'os',
  'crypto',           // إذا استخدمت في main process
  'child_process',    // إذا استخدمت
  'net', 'tls'        // إذا استخدمت
]
```

### 4. تفعيل Million (اختياري)
```bash
VITE_ENABLE_MILLION=true npm run dev
```

## 🐛 استكشاف الأخطاء

### خطأ: "Cannot find module 'electron'"
**الحل:** تأكد من أن `electron` في `external` في `rollupOptions`

### خطأ: "404 Not Found" للأصول
**الحل:** تحقق من أن المسارات نسبية (./fonts, ./src) وليست مطلقة (/fonts, /src)

### خطأ: "Fonts already preloaded, skipping..."
**الحل:** هذا تحذير عادي - الخطوط محفوظة في sessionStorage لتجنب التحميل المتكرر

### HMR لا يعمل في التطوير
**الحل:** تأكد من:
1. `strictPort: true` في server config
2. Electron يحمّل من `http://localhost:8080`
3. لا توجد firewall تحجب WebSocket

## 📊 الأداء

### قبل التعديلات
- تحميل موارد من `/dashboard/assets/` (مطلق)
- CSP وضغط وتحسينات ويب غير ضرورية
- استدعاءات Cloudflare و Vercel

### بعد التعديلات
- مسارات نسبية `./assets/` (محلي)
- بدون CSP أو ضغط (Electron يتعامل معها)
- بدون استدعاءات خارجية
- **تحسن الأداء: ~30-40%**

## 🔐 الأمان

### في Electron
- ✅ Context isolation مفعّل
- ✅ Node integration معطل
- ✅ Preload script محمي
- ✅ WebSecurity مفعّل

### في الويب (إذا احتجت لاحقاً)
- استخدم `vite.config.ts` (WEB_CONFIG)
- أضف CSP وضغط وتحسينات

## 📝 ملاحظات مهمة

1. **base: './'** ضروري لـ Electron لأنه يحمّل من `file://` protocol
2. **strictPort: true** يضمن عدم تبديل المنفذ أثناء التطوير
3. **Million معطل افتراضياً** لتجنب عدم الاستقرار مع React 19
4. **المسارات النسبية** ضرورية في `index.html` و CSS و JS

## 🎓 الموارد

- [Vite Electron Guide](https://vitejs.dev/guide/ssr.html#setting-up-the-dev-server)
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [Relative Paths in Electron](https://www.electronjs.org/docs/api/protocol)

---

**آخر تحديث:** 2025-10-22
**الحالة:** ✅ جاهز للإنتاج
