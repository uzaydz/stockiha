# 🚀 إعداد متغيرات البيئة لـ Cloudflare Pages

## 📋 المتغيرات المطلوبة

### 1. متغيرات Supabase (إجبارية)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. متغيرات Cloudflare (اختيارية للنطاقات المخصصة)
```bash
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
```

### 3. متغيرات التطبيق
```bash
NODE_ENV=production
VITE_DEPLOYMENT_PLATFORM=cloudflare
VITE_DOMAIN_PROXY=connect.ktobi.online
VITE_API_URL=/api
```

## 🔧 كيفية إعداد المتغيرات في Cloudflare Dashboard

### الطريقة الأولى: عبر Dashboard
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اختر **Pages** من القائمة الجانبية
3. اختر مشروعك **stockiha**
4. اذهب إلى **Settings** > **Environment variables**
5. أضف المتغيرات أعلاه

### الطريقة الثانية: عبر Wrangler CLI
```bash
# إعداد متغيرات الإنتاج
wrangler pages secret put VITE_SUPABASE_URL --project-name stockiha
wrangler pages secret put VITE_SUPABASE_ANON_KEY --project-name stockiha
wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name stockiha

# إعداد متغيرات Cloudflare (اختيارية)
wrangler pages secret put CLOUDFLARE_API_TOKEN --project-name stockiha
wrangler pages secret put CLOUDFLARE_ZONE_ID --project-name stockiha
```

## 🧪 اختبار الإعدادات

### 1. اختبار محلي مع Wrangler
```bash
# تشغيل في بيئة التطوير
wrangler pages dev dist --project-name stockiha

# اختبار Functions محلياً
wrangler pages dev dist --local
```

### 2. اختبار النشر
```bash
# نشر تجريبي
pnpm run deploy:cloudflare:preview

# نشر الإنتاج
pnpm run deploy:cloudflare
```

## 🔍 التحقق من عمل المتغيرات

### اختبار API
```bash
# اختبار Yalidine API Proxy
curl "https://your-domain.pages.dev/api/yalidine-fees-proxy?from_wilaya_id=1&to_wilaya_id=2&api_id=test&api_token=test"

# اختبار Domain Verification
curl -X POST "https://your-domain.pages.dev/api/verify-domain" \
  -H "Content-Type: application/json" \
  -d '{"customDomain":"example.com","organizationId":"123","action":"verify"}'
```

## 🚨 ملاحظات مهمة

1. **الأمان**: لا تضع المتغيرات الحساسة في `wrangler.toml`
2. **التشفير**: جميع المتغيرات الحساسة مشفرة تلقائياً في Cloudflare
3. **البيئات**: يمكن إعداد متغيرات مختلفة للإنتاج والمعاينة
4. **التحديث**: إعادة النشر مطلوبة بعد تغيير المتغيرات

## 🔄 النشر التلقائي

### إعداد GitHub Actions (اختياري)
```yaml
# .github/workflows/cloudflare-pages.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm run build:cloudflare
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

**آخر تحديث:** 16 يناير 2025  
**الإصدار:** 2.0 (محدث لـ Cloudflare Pages)
