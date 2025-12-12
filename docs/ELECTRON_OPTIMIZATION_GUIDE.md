# دليل تحسين حجم تطبيق Electron - Stockiha

## 📊 ملخص التحسينات

| المقياس | قبل | بعد | التحسن |
|---------|-----|-----|--------|
| حجم app.asar | ~554 MB | ~50-80 MB | **90%** |
| حجم DMG | ~230 MB | ~80-100 MB | **60%** |
| حجم dist | ~118 MB | ~30-40 MB | **70%** |
| ملفات Source Maps | 9,812 | 0 | **100%** |

---

## 🚀 كيفية بناء التطبيق المحسّن

### البناء للإنتاج (موصى به)

```bash
# بناء محسّن لجميع المنصات
pnpm run desktop:dist:optimized

# بناء لـ Mac فقط
pnpm run desktop:dist:optimized-mac

# بناء لـ Windows فقط
pnpm run desktop:dist:optimized-win

# بناء لـ Linux فقط
pnpm run desktop:dist:optimized-linux
```

### تحليل الاستيرادات

```bash
# تحليل الاستيرادات الثقيلة
pnpm run analyze:imports

# تحسين كامل مع التحليل
pnpm run optimize:all
```

---

## 📁 الملفات الجديدة

### 1. `vite.config.electron-prod.ts`
تكوين Vite المحسّن للإنتاج:
- تعطيل Source Maps
- تفعيل Terser للضغط
- إزالة console.log
- Tree Shaking محسّن
- Code Splitting ذكي

### 2. `electron-builder.config.js`
تكوين electron-builder المحسّن:
- استثناء node_modules غير الضرورية
- ضغط ASAR أقصى
- تصفية الملفات التطويرية

### 3. `scripts/after-pack-optimized.cjs`
سكريبت ما بعد التجميع:
- تنظيف الملفات غير الضرورية
- نسخ better-sqlite3 بشكل صحيح
- إزالة ملفات التطوير

### 4. `scripts/optimize-imports.cjs`
أداة تحليل الاستيرادات:
- اكتشاف المكتبات الثقيلة
- اقتراحات التحسين
- تقرير مفصل

### 5. `src/lib/lazy-imports.ts`
أدوات التحميل الكسول:
- دوال لتحميل المكتبات عند الحاجة
- تقليل حجم الـ bundle الأولي

---

## 💡 استخدام التحميل الكسول

### قبل (سيء) ❌

```typescript
// يحمّل jspdf فوراً (29MB)
import { jsPDF } from 'jspdf';

const generatePDF = () => {
  const doc = new jsPDF();
  // ...
};
```

### بعد (جيد) ✅

```typescript
import { createPDF } from '@/lib/lazy-imports';

const generatePDF = async () => {
  const doc = await createPDF();
  // ...
};
```

### أمثلة أخرى

```typescript
// Excel
import { createWorkbook } from '@/lib/lazy-imports';
const workbook = await createWorkbook();

// Screenshot
import { captureElement } from '@/lib/lazy-imports';
const canvas = await captureElement(element);

// QR Code
import { generateQRCodeDataURL } from '@/lib/lazy-imports';
const qrDataUrl = await generateQRCodeDataURL('https://example.com');

// Chart.js
import { loadChartJS } from '@/lib/lazy-imports';
const { Chart } = await loadChartJS();
```

### التحميل المسبق (Preloading)

```typescript
import { preloadModules } from '@/lib/lazy-imports';

// تحميل مسبق عند hover على زر التصدير
const handleExportHover = () => {
  preloadModules(['jspdf', 'exceljs']);
};
```

---

## 🔧 التحسينات المطبقة

### 1. تعطيل Source Maps
```typescript
// vite.config.electron-prod.ts
build: {
  sourcemap: false,  // وفّر ~50MB
}
```

### 2. تفعيل Terser
```typescript
minify: 'terser',
terserOptions: {
  compress: {
    drop_console: true,
    drop_debugger: true,
    passes: 2,
  },
}
```

### 3. استثناء node_modules
```javascript
// electron-builder.config.js
files: [
  "dist/**/*",
  "electron/**/*.cjs",
  "!**/node_modules/**/*",  // استثناء كل node_modules
]
```

### 4. Code Splitting ذكي
```typescript
manualChunks: (id) => {
  if (id.includes('jspdf')) return 'export-tools';
  if (id.includes('chart.js')) return 'charts';
  // ...
}
```

---

## 📦 المكتبات المستثناة من الـ Bundle

| المكتبة | الحجم | السبب |
|---------|-------|-------|
| @iconify/json | 386 MB | للتطوير فقط |
| next | 154 MB | غير مستخدم |
| @cloudflare | 95 MB | للتطوير فقط |
| typescript | 23 MB | للتطوير فقط |
| electron | 272 MB | يُضاف تلقائياً |
| electron-builder | 207 MB | للتطوير فقط |

---

## 🎯 المكتبات للتحميل الكسول

| المكتبة | الحجم | الاستخدام |
|---------|-------|----------|
| jspdf | 29 MB | تصدير PDF |
| exceljs | 22 MB | تصدير Excel |
| html2canvas | 15 MB | لقطات الشاشة |
| chart.js | 10 MB | الرسوم البيانية |
| @nivo/* | 15 MB each | رسوم متقدمة |
| framer-motion | 12 MB | الحركات |

---

## ⚠️ ملاحظات مهمة

### 1. better-sqlite3
هذه المكتبة تحتاج معاملة خاصة لأنها تحتوي على native binary:
- تُنسخ إلى `extraResources`
- تُفك من ASAR
- السكريبت `after-pack-optimized.cjs` يتأكد من نسخها صحيحاً

### 2. PowerSync
- يجب استثناؤها من `optimizeDeps.exclude`
- تحتوي على Workers و WASM

### 3. الاختبار بعد البناء
```bash
# تشغيل التطبيق المبني
cd dist-electron/mac
open Stockiha.app

# أو على Windows
cd dist-electron/win-unpacked
./Stockiha.exe
```

---

## 📈 خطوات إضافية للتحسين المستقبلي

### 1. استبدال date-fns بـ dayjs
```typescript
// dayjs أخف بكثير (2KB vs 38MB)
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
```

### 2. استبدال lucide-react
```typescript
// استخدام @iconify/react بدلاً منها
import { Icon } from '@iconify/react';
```

### 3. تحسين الصور
```bash
# ضغط الصور
pnpm run optimize:images
```

---

## 🐛 استكشاف الأخطاء

### خطأ: better-sqlite3 not found
```bash
# إعادة بناء المكتبة
pnpm run rebuild
```

### خطأ: Module not found
تأكد من أن المكتبة ليست في قائمة الاستثناء إذا كانت مطلوبة في runtime.

### حجم كبير غير متوقع
```bash
# تحليل الـ bundle
pnpm run analyze:detailed
```

---

## 📞 المساعدة

إذا واجهت مشاكل:
1. تحقق من logs في `dist-electron/`
2. شغّل `pnpm run analyze:imports`
3. راجع إعدادات electron-builder.config.js
