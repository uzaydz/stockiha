# متجر إلكتروني مستقل - Store Entry Point

## نظرة عامة

تم إنشاء نقطة دخول مستقلة للمتجر (`src/store-main.tsx`) لتحسين الأداء والتوسع. هذا يسمح بتشغيل المتجر كتطبيق مستقل بدون تحميل الميزات الإدارية الثقيلة.

## هيكل الملفات

```
src/
├── store/
│   ├── main.tsx          # نقطة الدخول الرئيسية للمتجر
│   ├── StoreApp.tsx      # تعريف المسارات
│   ├── reexports.ts      # تجميع المكونات للاستيراد المنظم
│   └── README.md         # هذا الملف
├── store-main.tsx       # الإدخال الخفيف للمتجر
├── StoreApp.tsx         # التطبيق الرئيسي للمتجر
├── main.tsx             # الإدخال الكامل للتطبيق
├── App.tsx              # التطبيق الكامل
└── store.html           # HTML للمتجر المستقل
```

## المسارات المدعومة في المتجر المستقل

| المسار | المكون | الوصف |
|--------|--------|-------|
| `/` | `StoreRouter` → `StorePage` | الصفحة الرئيسية للمتجر |
| `/products` | `StoreProducts` | صفحة عرض جميع المنتجات |
| `/product/:id` | `ProductPurchasePageV3Container` | صفحة شراء منتج |
| `/cart` | `CartPage` | صفحة السلة |
| `/cart/checkout` | `CartCheckoutPage` | صفحة إتمام الشراء |
| `/*` | `StoreRouter` | توجيه إلى المتجر للمسارات الأخرى |

## المزودات المضمنة

المتجر المستقل يشمل المزودات الأساسية فقط:

- `HelmetProvider` - إدارة عنوان الصفحة
- `QueryClientProvider` - إدارة البيانات
- `TooltipProvider` - تلميحات الأدوات
- `LoadingControllerProvider` - التحميل المتقدم
- `GlobalLoadingProvider` - التحميل العام
- `ThemeProvider` - إدارة الثيم
- `SafeTranslationProvider` - الترجمة الآمنة
- `AuthProvider` - المصادقة
- `UserProvider` - بيانات المستخدم
- `TenantProvider` - إدارة المنظمة

## البناء والتشغيل

### التطوير

```bash
# تشغيل المتجر المستقل
npm run dev

# ثم انتقل إلى
http://localhost:8080/store.html
```

### الإنتاج

```bash
# بناء كلا التطبيقين
npm run build

# سيتم إنشاء:
# - dist/index.html (التطبيق الكامل)
# - dist/store.html (المتجر المستقل)
```

## استخدام المتجر المستقل

### 1. في النطاقات/الساب دومينات

```javascript
// في Cloudflare Worker أو Nginx
if (hostname === 'store.example.com') {
  // خدم store.html
  serve('/store.html');
} else {
  // خدم index.html للنظام الكامل
  serve('/index.html');
}
```

### 2. في Vite Dev Server

```javascript
// في vite.config.ts (مُعد مسبقاً)
rollupOptions: {
  input: {
    main: path.resolve(__dirname, 'index.html'),
    store: path.resolve(__dirname, 'store.html'),
  }
}
```

### 3. في Vercel/Netlify

```json
// vercel.json أو _redirects في Netlify
[
  {
    "source": "/store.html",
    "destination": "/store.html"
  },
  {
    "source": "/store/*",
    "destination": "/store.html"
  }
]
```

## المزايا

### ⚡ أداء محسّن
- حزمة أصغر (بدون المكونات الإدارية)
- تحميل أسرع للمستخدمين النهائيين
- تقليل استهلاك الذاكرة

### 🛠️ سهولة الصيانة
- فصل واضح بين المتجر والنظام الإداري
- إمكانية نشر المتجر بشكل مستقل
- سهولة إضافة ميزات جديدة للمتجر

### 🔄 قابلية التوسع
- إمكانية إضافة نطاقات متعددة
- دعم subdomain و custom domains
- سهولة التخصيص حسب المنظمة

## استيراد المكونات

استخدم `src/store/reexports.ts` للاستيراد المنظم:

```typescript
import {
  StoreRouter,
  StorePage,
  ProductPurchasePageV3Container,
  CartPage,
  CartCheckoutPage
} from '@/store/reexports';
```

## الاختبار

### اختبار محلي

1. شغّل الخادم:
```bash
npm run dev
```

2. افتح المتجر:
```
http://localhost:8080/store.html
```

3. اختبر المسارات:
- `/` - الصفحة الرئيسية
- `/products` - المنتجات
- `/product/123` - صفحة منتج (إذا كان موجوداً)

### اختبار الإنتاج

1. بناء التطبيق:
```bash
npm run build
```

2. خدم الملفات من `dist/`:
```bash
npx serve dist
```

3. اختبر `http://localhost:3000/store.html`

## ملاحظات مهمة

### 🔒 الأمان
- المتجر المستقل يشمل جميع إجراءات الأمان
- نفس مستوى الحماية مثل التطبيق الكامل
- دعم CSP و Headers الأمنية

### 🎨 التصميم
- نفس الثيم والتصميم
- دعم الوضع المظلم
- متجاوب مع جميع الأجهزة

### 🌐 اللغات
- دعم اللغات المتعددة
- RTL للعربية
- ترجمة ديناميكية

### 📊 التتبع والتحليل
- Google Analytics
- Facebook Pixel
- TikTok Analytics
- تتبع التحويلات

## استكشاف الأخطاء

### مشكلة شائعة: خطأ في التحميل

إذا حدث خطأ في تحميل المتجر:

1. تأكد من وجود `store.html` في المجلد الجذر
2. تأكد من أن `src/store-main.tsx` موجود
3. تحقق من الـ console للأخطاء
4. تأكد من أن البناء تم بنجاح

### مشكلة شائعة: مسارات غير تعمل

إذا كانت المسارات لا تعمل بشكل صحيح:

1. تأكد من أن `StoreApp.tsx` يحتوي على المسارات الصحيحة
2. تحقق من أن `StoreRouter` يعمل بشكل صحيح
3. تأكد من أن التوجيه في الخادم صحيح

## المساهمة

عند إضافة مكونات جديدة للمتجر:

1. أضف المكون في `src/store/reexports.ts`
2. تأكد من أنه يعمل في البيئة المستقلة
3. اختبر في كلا البيئتين (الكاملة والمستقلة)
4. حدث هذا الملف إذا لزم الأمر

## الدعم

للمساعدة أو الاستفسارات حول المتجر المستقل، راجع:

- الوثائق الرئيسية
- ملفات الـ issues
- فريق التطوير
