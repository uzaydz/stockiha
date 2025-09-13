#!/bin/bash

# 🚀 سكريپت نشر سريع لحل مشكلة CSP و Cloudflare Insights

echo "🔧 إعداد البناء..."

# تنظيف الملفات القديمة
rm -rf dist
rm -rf node_modules/.vite

echo "📦 بناء المشروع..."

# بناء المشروع
npm run build

if [ $? -ne 0 ]; then
  echo "❌ فشل في البناء!"
  exit 1
fi

echo "🚀 نشر إلى Cloudflare Pages..."

# نشر إلى Cloudflare
npx wrangler pages deploy dist --project-name stockiha --compatibility-date 2024-11-21

if [ $? -eq 0 ]; then
  echo "✅ تم النشر بنجاح!"
  echo "🌐 تحقق من الموقع: https://stockiha.pages.dev"
  echo "🔍 افحص Console للتأكد من حل مشكلة CSP"
else
  echo "❌ فشل في النشر!"
  exit 1
fi

echo "📋 تم الانتهاء من العملية!"
