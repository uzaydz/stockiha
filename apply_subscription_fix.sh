#!/bin/bash

# Script to fix 403 error for subscription_plans table in Supabase
# This script applies the necessary RLS policies to resolve the issue

echo "🔧 بدء إصلاح مشكلة 403 في جدول subscription_plans..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI غير مثبت. يرجى تثبيته أولاً:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ ملف .env غير موجود"
    exit 1
fi

# Load environment variables
source .env

echo "📊 التحقق من حالة قاعدة البيانات..."

# Apply the migration
echo "🚀 تطبيق migration لإصلاح subscription_plans..."

if [ -f "supabase/migrations/20250120_fix_subscription_plans_403.sql" ]; then
    echo "✅ تم العثور على ملف migration"
    
    # You can use Supabase CLI to apply the migration
    # supabase db push
    
    echo "📝 يرجى تطبيق الملف التالي في Supabase SQL Editor:"
    echo "supabase/migrations/20250120_fix_subscription_plans_403.sql"
    
else
    echo "❌ ملف migration غير موجود"
    exit 1
fi

# Alternative: Apply the fix directly via SQL
echo ""
echo "🔄 أو يمكنك تطبيق الكود التالي مباشرة في Supabase SQL Editor:"
echo ""
cat << 'EOF'
-- إصلاح سريع لمشكلة 403
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_public_read" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_authenticated_write" ON subscription_plans;

CREATE POLICY "subscription_plans_public_read"
  ON subscription_plans
  FOR SELECT
  USING (true);

CREATE POLICY "subscription_plans_authenticated_write"
  ON subscription_plans
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
EOF

echo ""
echo "✅ تم إعداد الإصلاح. يرجى تطبيق الكود في Supabase SQL Editor"
echo ""
echo "🔍 للتحقق من نجاح الإصلاح، قم بتشغيل:"
echo "SELECT * FROM subscription_plans LIMIT 1;"
echo ""
echo "📚 للمزيد من المعلومات، راجع: README_SUBSCRIPTION_403_FIX.md" 