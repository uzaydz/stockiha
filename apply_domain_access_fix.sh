#!/bin/bash

# سكريبت تطبيق إصلاح التحكم في الوصول للنطاقات
# Script to apply domain access control fix

echo "======================================"
echo "تطبيق إصلاح التحكم في الوصول للنطاقات"
echo "Domain Access Control Fix Application"
echo "======================================"

# التحقق من وجود ملف SQL
if [ ! -f "fix_domain_access_control.sql" ]; then
    echo "❌ خطأ: لا يمكن العثور على fix_domain_access_control.sql"
    exit 1
fi

# قراءة معلومات الاتصال بقاعدة البيانات
echo ""
echo "📋 يرجى إدخال معلومات Supabase:"
read -p "Supabase Project URL (مثل: https://xxxx.supabase.co): " SUPABASE_URL
read -p "Supabase Database Password: " -s DB_PASSWORD
echo ""

# استخراج معلومات الاتصال
DB_HOST=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*||').supabase.co
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="5432"

# محاولة الاتصال وتطبيق SQL
echo ""
echo "🔄 جاري تطبيق التحديثات على قاعدة البيانات..."

PGPASSWORD=$DB_PASSWORD psql \
    -h db.$DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -f fix_domain_access_control.sql \
    -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم تطبيق تحديثات قاعدة البيانات بنجاح!"
    
    echo ""
    echo "🔨 جاري بناء التطبيق..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ تم بناء التطبيق بنجاح!"
        echo ""
        echo "======================================"
        echo "✨ تم تطبيق الإصلاح بنجاح!"
        echo ""
        echo "📝 الخطوات التالية:"
        echo "1. نشر التطبيق المحدث"
        echo "2. اختبار الحماية من نطاقات مختلفة"
        echo "3. مراقبة سجلات محاولات الوصول"
        echo "======================================"
    else
        echo ""
        echo "❌ فشل بناء التطبيق"
        exit 1
    fi
else
    echo ""
    echo "❌ فشل تطبيق تحديثات قاعدة البيانات"
    echo "تأكد من:"
    echo "- صحة معلومات الاتصال"
    echo "- وجود صلاحيات كافية"
    echo "- عدم وجود أخطاء في SQL"
    exit 1
fi