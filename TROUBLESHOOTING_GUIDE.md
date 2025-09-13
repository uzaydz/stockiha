# دليل حل المشاكل - Bazaar Console

## 🔧 المشاكل التي تم حلها

### 1. مشكلة Supabase URL والمفتاح المفقود ✅

**المشكلة:**
```
Uncaught Error: Supabase URL and anonymous key are required.
```

**الحل:**
- تم إنشاء ملف `.env.local` مع إعدادات Supabase الصحيحة
- تم إضافة المتغيرات المطلوبة:
  ```
  VITE_SUPABASE_URL=https://wrnssatuvmumsczyldth.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

### 2. مشكلة WebSocket Connection ✅

**المشكلة:**
```
[vite] failed to connect to websocket (Error: WebSocket closed without opened.)
```

**الحل:**
- تم تعديل إعدادات Vite في `vite.config.ts`
- تم تغيير منفذ HMR إلى `24678`
- تم تغيير host إلى `localhost` للـ HMR
- تم إنشاء ملف `vite.config.dev.ts` للتطوير المبسط

### 3. تحذيرات React ✅

**المشكلة:**
```
Warning: The tag <circle> is unrecognized in this browser
Warning: Received `true` for a non-boolean attribute `jsx`
```

**الحل:**
- تم إصلاح `jsx={true}` إلى `jsx` فقط في HeroSection
- تم تعطيل Million.js مؤقتاً لحل مشكلة SVG elements

## 🚀 كيفية تشغيل التطبيق

### الطريقة الأساسية:
```bash
npm run dev
```

### الطريقة المبسطة (للتطوير):
```bash
npm run dev:simple
```

### الطريقة السريعة:
```bash
npm run dev:fast
```

## 📋 متطلبات النظام

- Node.js 18+ 
- npm أو yarn
- متصفح حديث يدعم ES2020+

## 🔍 فحص الحالة

### التحقق من Supabase:
```javascript
// في Developer Tools Console
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### التحقق من WebSocket:
- يجب أن ترى `[vite] connected.` في Console
- إذا لم تظهر، استخدم `npm run dev:simple`

## ⚠️ مشاكل شائعة أخرى

### مشكلة CORS:
إذا ظهرت مشاكل CORS، تأكد من:
- تشغيل التطبيق على `localhost:8080`
- وجود إعدادات CORS في `vite.config.ts`

### مشكلة الخطوط:
إذا لم تظهر الخطوط العربية:
- تحقق من وجود ملفات الخطوط في `public/fonts/`
- تحقق من إعدادات CSS في `src/styles/`

### مشكلة التوجيه:
إذا لم يعمل التوجيه:
- تأكد من وجود ملف `_redirects` في `public/`
- تحقق من إعدادات React Router

## 🛠️ أدوات التشخيص

### تنظيف Cache:
```bash
# تنظيف cache Node.js
rm -rf node_modules/.cache
rm -rf dist

# إعادة تثبيت التبعيات
rm -rf node_modules
npm install
```

### تشغيل بوضع التطوير الآمن:
```bash
npm run dev:simple
```

## 📞 الدعم

إذا واجهت مشاكل أخرى:
1. تحقق من Console في Developer Tools
2. تحقق من Network tab للطلبات المفشلة  
3. تحقق من ملفات Log في Terminal
4. استخدم `npm run dev:simple` للتطوير المبسط

## 🔄 التحديثات الأخيرة

- ✅ إصلاح مشكلة Supabase configuration
- ✅ إصلاح مشكلة WebSocket connection  
- ✅ إصلاح تحذيرات React
- ✅ تحسين إعدادات Vite للتطوير
- ✅ إضافة ملف `.env.local` مع الإعدادات الصحيحة