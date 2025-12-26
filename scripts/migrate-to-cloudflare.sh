#!/bin/bash

# 🚀 Script للتحويل الكامل إلى Cloudflare Pages
# يقوم بجميع الخطوات المطلوبة للتحويل

set -e  # إيقاف السكريبت عند حدوث خطأ

echo "🚀 بدء عملية التحويل إلى Cloudflare Pages..."
echo "================================================"

# 1. التحقق من وجود wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI غير مثبت. يرجى تثبيته أولاً:"
    echo "npm install -g wrangler"
    exit 1
fi

# 2. التحقق من تسجيل الدخول إلى Wrangler
echo "🔐 التحقق من تسجيل الدخول إلى Wrangler..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  يرجى تسجيل الدخول إلى Wrangler أولاً:"
    echo "wrangler login"
    exit 1
fi

# 3. إعداد متغيرات البيئة
echo "📝 إعداد متغيرات البيئة..."

# قراءة متغيرات Supabase
read -p "🌍 VITE_SUPABASE_URL: " VITE_SUPABASE_URL
read -p "🔓 VITE_SUPABASE_ANON_KEY: " VITE_SUPABASE_ANON_KEY
read -s -p "🔒 SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo ""

# قراءة متغيرات Cloudflare (اختيارية)
read -p "☁️  CLOUDFLARE_API_TOKEN (اختياري): " CLOUDFLARE_API_TOKEN
read -p "🌐 CLOUDFLARE_ZONE_ID (اختياري): " CLOUDFLARE_ZONE_ID

PROJECT_NAME="stockiha"

echo ""
echo "⚙️  إعداد متغيرات البيئة في Cloudflare Pages..."

# إعداد المتغيرات الأساسية
echo "$VITE_SUPABASE_URL" | wrangler pages secret put VITE_SUPABASE_URL --project-name $PROJECT_NAME
echo "$VITE_SUPABASE_ANON_KEY" | wrangler pages secret put VITE_SUPABASE_ANON_KEY --project-name $PROJECT_NAME
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name $PROJECT_NAME

# إعداد متغيرات Cloudflare إذا كانت متوفرة
if [ ! -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "$CLOUDFLARE_API_TOKEN" | wrangler pages secret put CLOUDFLARE_API_TOKEN --project-name $PROJECT_NAME
fi

if [ ! -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "$CLOUDFLARE_ZONE_ID" | wrangler pages secret put CLOUDFLARE_ZONE_ID --project-name $PROJECT_NAME
fi

# 4. بناء المشروع للإنتاج
echo ""
echo "🔨 بناء المشروع..."
VITE_DEPLOYMENT_PLATFORM=cloudflare \
VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
pnpm run build:ultra

# 5. نشر المشروع
echo ""
echo "🚀 نشر المشروع إلى Cloudflare Pages..."
wrangler pages deploy dist --project-name $PROJECT_NAME

# 6. عرض النتائج
echo ""
echo "✅ تم التحويل بنجاح!"
echo "================================================"
echo ""
echo "📊 معلومات النشر:"
echo "   - المشروع: $PROJECT_NAME"
echo "   - المنصة: Cloudflare Pages"
echo "   - Functions: تم تحويلها إلى Cloudflare Workers"
echo "   - المتغيرات: تم إعدادها"
echo ""
echo "🌐 الروابط:"
echo "   - Dashboard: https://dash.cloudflare.com/pages"
echo "   - المشروع: https://$PROJECT_NAME.pages.dev"
echo ""
echo "📋 الخطوات التالية:"
echo "   1. إعداد النطاق المخصص في Cloudflare Dashboard"
echo "   2. اختبار جميع الميزات"
echo "   3. تحديث DNS للنطاقات الفرعية"
echo ""
echo "📖 للمساعدة: راجع ملف cloudflare-env-setup.md"
echo ""
echo "🎉 مبروك! تطبيقك الآن يعمل على Cloudflare Pages"
