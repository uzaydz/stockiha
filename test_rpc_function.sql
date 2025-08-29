-- =====================================================
-- اختبار دالة RPC
-- =====================================================

-- اختبار 1: استدعاء الدالة مع معرف مستخدم محدد
SELECT 'اختبار 1: استدعاء الدالة مع معرف مستخدم محدد' as test_name;
SELECT * FROM get_user_with_permissions_unified('f2ffd6dd-dfe9-4340-8c67-d52376fa0291');

-- اختبار 2: استدعاء الدالة بدون معرف مستخدم (يجب أن تفشل)
SELECT 'اختبار 2: استدعاء الدالة بدون معرف مستخدم' as test_name;
SELECT * FROM get_user_with_permissions_unified();

-- اختبار 3: اختبار الدالة السريعة
SELECT 'اختبار 3: اختبار الدالة السريعة' as test_name;
SELECT check_user_permission_fast('viewInventory', 'f2ffd6dd-dfe9-4340-8c67-d52376fa0291');

-- اختبار 4: اختبار الدالة الأساسية
SELECT 'اختبار 4: اختبار الدالة الأساسية' as test_name;
SELECT * FROM get_user_basic_info('f2ffd6dd-dfe9-4340-8c67-d52376fa0291');
