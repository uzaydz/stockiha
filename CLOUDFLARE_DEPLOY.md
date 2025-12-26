# نشر المشروع على Cloudflare Pages

## المتطلبات
- Node.js + `pnpm`
- Cloudflare Wrangler: `npm i -g wrangler`

## نشر سريع (من جهازك)
1) تسجيل الدخول:
- `wrangler login`

2) بناء نسخة الويب:
- `pnpm install`
- `pnpm run build:ultra`

3) النشر:
- `wrangler pages deploy dist --project-name stockiha`

## SPA Routing + Headers
- تم وضع ملفات Pages داخل `public/_redirects` و `public/_headers` ليتم نسخها تلقائياً إلى `dist/` مع Vite.

## إعداد متغيرات البيئة (للـ Pages Functions فقط)
- لا تضع أسرار داخل `wrangler.toml`.
- لإضافة أسرار:
  - `wrangler pages secret put CF_API_TOKEN --project-name stockiha`
- لإضافة متغيرات غير سرّية عبر الـ Dashboard:
  - Pages → مشروعك → Settings → Environment variables

## سكريبت مساعد
- تشغيل: `chmod +x scripts/migrate-to-cloudflare.sh && ./scripts/migrate-to-cloudflare.sh`
