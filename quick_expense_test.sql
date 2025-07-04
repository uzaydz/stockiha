-- اختبار سريع لوظائف المصاريف المحسنة
-- تشغيل هذا الملف لاختبار الميزات الأساسية

-- 1. التحقق من وجود الجداول
SELECT 'expense_categories table exists' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'expense_categories'
);

SELECT 'expenses table exists' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'expenses'
);

-- 2. التحقق من الأعمدة الجديدة
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
    AND column_name IN ('source', 'category_id', 'tags', 'metadata', 'is_deleted')
ORDER BY column_name;

-- 3. عد الفئات الموجودة
SELECT 
    organization_id,
    COUNT(*) as categories_count
FROM expense_categories 
GROUP BY organization_id
ORDER BY categories_count DESC;

-- 4. اختبار إدراج مصروف جديد (استبدل org_id بمعرف منظمتك)
-- INSERT INTO expenses (organization_id, title, amount, expense_date, source, description)
-- VALUES ('your-org-id-here', 'اختبار مصروف سريع', 100.00, CURRENT_DATE, 'pos', 'مصروف تجريبي من نقطة البيع');

-- 5. التحقق من وجود الدوال
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_default_expense_categories',
    'get_expense_stats_enhanced',
    'get_top_expense_categories',
    'search_expenses',
    'get_expense_dashboard_summary'
)
ORDER BY routine_name;

-- 6. اختبار دالة الإحصائيات (استبدل org_id بمعرف منظمتك)
-- SELECT * FROM get_expense_dashboard_summary('your-org-id-here');

SELECT 'Quick expense test completed successfully!' as final_result; 