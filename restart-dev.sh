#!/bin/bash

echo "🧹 تنظيف شامل للـ cache..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf dist

echo "🔄 إعادة تشغيل خادم التطوير..."
npm run dev

echo "✅ تم إعادة تشغيل الخادم بنجاح!"
