#!/bin/bash

# سكريبت تنفيذ إصلاح ديون العملاء
# استخدم هذا السكريبت لتطبيق الإصلاحات المطلوبة لعرض ديون العملاء بشكل صحيح

echo "=== بدء تنفيذ إصلاح ديون العملاء ==="

# تأكد من وجود ملف الإصلاح
if [ ! -f "fix_customer_debts_v2.sql" ]; then
    echo "خطأ: ملف fix_customer_debts_v2.sql غير موجود!"
    exit 1
fi

# تنفيذ ملف SQL لإصلاح الديون
# قم بتعديل متغيرات الاتصال بقاعدة البيانات حسب بيئتك

# Supabase Environment Variables
# قم بتعيين متغيرات البيئة الخاصة بـ Supabase
DB_HOST=${SUPABASE_DB_HOST:-"db.yourproject.supabase.co"}
DB_PORT=${SUPABASE_DB_PORT:-5432}
DB_NAME=${SUPABASE_DB_NAME:-"postgres"}
DB_USER=${SUPABASE_DB_USER:-"postgres"}
DB_PASSWORD=${SUPABASE_DB_PASSWORD:-"your_password"}

echo "جاري تنفيذ إصلاحات قاعدة البيانات..."
echo "استخدام قاعدة البيانات: $DB_NAME على $DB_HOST"

# تنفيذ استعلامات SQL على قاعدة البيانات
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f fix_customer_debts_v2.sql

# التحقق من نجاح تنفيذ الأمر
if [ $? -eq 0 ]; then
    echo "✓ تم تنفيذ إصلاحات قاعدة البيانات بنجاح!"
else
    echo "✗ حدث خطأ أثناء تنفيذ إصلاحات قاعدة البيانات."
    exit 1
fi

echo "=== اكتمل تنفيذ إصلاح ديون العملاء ==="
echo ""
echo "ملاحظات هامة:"
echo "1. يجب إعادة تشغيل التطبيق لتطبيق التغييرات."
echo "2. تحقق من أن ديون العملاء تظهر الآن بشكل صحيح في واجهة المستخدم."
echo "3. إذا كنت تستخدم عملاء الضيوف، فقد تحتاج إلى تعديل ملف SQL لتعيين عميل حقيقي."

exit 0 