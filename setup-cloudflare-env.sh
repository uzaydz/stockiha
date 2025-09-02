#!/bin/bash

# 🔒 سكريبت إعداد متغيرات البيئة الآمنة في Cloudflare Pages
# تشغيل: chmod +x setup-cloudflare-env.sh && ./setup-cloudflare-env.sh

echo "🔒 إعداد متغيرات البيئة الآمنة لـ Stockiha في Cloudflare Pages"
echo "=================================================="

PROJECT_NAME="stockiha"

# التحقق من تسجيل الدخول
if ! wrangler whoami > /dev/null 2>&1; then
    echo "❌ يرجى تسجيل الدخول أولاً: wrangler login"
    exit 1
fi

echo "✅ تم تسجيل الدخول إلى Cloudflare"

# قراءة المتغيرات من المستخدم
echo ""
echo "📝 يرجى إدخال متغيرات البيئة التالية:"
echo ""

read -p "🔑 SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -p "🔐 ENCRYPTION_KEY (32 حرف): " ENCRYPTION_KEY
read -p "📊 CLOUDFLARE_ANALYTICS_TOKEN: " CLOUDFLARE_ANALYTICS_TOKEN
read -p "🌍 VITE_SUPABASE_URL: " VITE_SUPABASE_URL
read -p "🔓 VITE_SUPABASE_ANON_KEY: " VITE_SUPABASE_ANON_KEY

echo ""
echo "🚀 جاري إعداد متغيرات البيئة..."

# إعداد متغيرات الإنتاج
echo "⚙️ إعداد متغيرات الإنتاج..."
wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name $PROJECT_NAME <<< "$SUPABASE_SERVICE_ROLE_KEY"
wrangler pages secret put ENCRYPTION_KEY --project-name $PROJECT_NAME <<< "$ENCRYPTION_KEY"
wrangler pages secret put CLOUDFLARE_ANALYTICS_TOKEN --project-name $PROJECT_NAME <<< "$CLOUDFLARE_ANALYTICS_TOKEN"

# إعداد متغيرات العامة
echo "🌐 إعداد متغيرات البيئة العامة..."
wrangler pages project edit $PROJECT_NAME \
  --env-var VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --env-var VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --env-var NODE_ENV="production" \
  --env-var VITE_ENABLE_SECURITY_HEADERS="true" \
  --env-var VITE_ENABLE_CSP="true" \
  --env-var VITE_ENABLE_RATE_LIMITING="true"

echo ""
echo "✅ تم إعداد جميع متغيرات البيئة بنجاح!"
echo ""
echo "📋 المتغيرات المعدة:"
echo "   - SUPABASE_SERVICE_ROLE_KEY (مخفي)"
echo "   - ENCRYPTION_KEY (مخفي)"
echo "   - CLOUDFLARE_ANALYTICS_TOKEN (مخفي)"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - NODE_ENV=production"
echo "   - VITE_ENABLE_SECURITY_HEADERS=true"
echo "   - VITE_ENABLE_CSP=true"
echo "   - VITE_ENABLE_RATE_LIMITING=true"
echo ""
echo "🎉 يمكنك الآن إعادة نشر المشروع: wrangler pages deploy dist --project-name $PROJECT_NAME"
