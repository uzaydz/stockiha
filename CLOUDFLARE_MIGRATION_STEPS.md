# دليل الانتقال من Vercel إلى Cloudflare Pages

## 📋 الخطوات المطلوبة

### 1. إعداد Cloudflare Account
```bash
# تثبيت Wrangler CLI
npm install -g wrangler

# تسجيل الدخول إلى Cloudflare
wrangler login
```

### 2. تثبيت Dependencies
```bash
# تثبيت Wrangler محلياً
pnpm add -D wrangler

# أو استخدام npm
npm install -D wrangler
```

### 3. إعداد متغيرات البيئة
```bash
# إنشاء ملف .env.production
cp .env.example .env.production

# إضافة متغيرات Cloudflare
echo "CLOUDFLARE_ACCOUNT_ID=your_account_id" >> .env.production
echo "CLOUDFLARE_API_TOKEN=your_api_token" >> .env.production
```

### 4. تحويل API Functions
الملفات في مجلد `/api` تحتاج إلى تحويل إلى Cloudflare Functions:

#### مثال: تحويل yalidine-fees-proxy.js
```javascript
// functions/api/yalidine-fees-proxy.ts
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  
  // الكود الأصلي من api/yalidine-fees-proxy.js
  // مع تعديلات للتوافق مع Cloudflare Workers
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
```

### 5. اختبار محلي
```bash
# تشغيل المشروع محلياً مع Cloudflare
pnpm run preview:cloudflare

# أو
wrangler pages dev dist
```

### 6. النشر
```bash
# نشر إلى Cloudflare Pages
pnpm run build:cloudflare

# أو
wrangler pages deploy dist
```

### 7. إعداد النطاق
1. اذهب إلى Cloudflare Dashboard
2. اختر Pages > stockiha
3. Settings > Custom domains
4. أضف نطاقك المخصص

## 🔧 التعديلات المطلوبة

### ملفات تحتاج تعديل:
- [ ] `api/yalidine-fees-proxy.js` → `functions/api/yalidine-fees-proxy.ts`
- [ ] `api/facebook-conversion-api.js` → `functions/api/facebook-conversion-api.ts`
- [ ] `api/conversion-events.js` → `functions/api/conversion-events.ts`
- [ ] جميع ملفات API الأخرى

### متغيرات البيئة:
- [ ] إضافة `CLOUDFLARE_ACCOUNT_ID`
- [ ] إضافة `CLOUDFLARE_API_TOKEN`
- [ ] تحديث `VITE_API_URL` للإشارة إلى Cloudflare

## ⚠️ ملاحظات مهمة

1. **Node.js APIs**: بعض APIs قد تحتاج تعديل للعمل مع Cloudflare Workers
2. **File System**: لا يمكن استخدام `fs` في Cloudflare Workers
3. **Environment Variables**: يجب إضافة متغيرات البيئة في Cloudflare Dashboard
4. **Database Connections**: تأكد من أن Supabase يعمل مع Cloudflare

## 🚀 المزايا بعد الانتقال

- ✅ سرعة أكبر (Cloudflare Edge Network)
- ✅ تكلفة أقل
- ✅ دعم أفضل للـ Middle East
- ✅ ميزات أمان متقدمة
- ✅ CDN عالمي

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
2. تحقق من [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
3. راجع logs في Cloudflare Dashboard
