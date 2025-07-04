-- ===============================================
-- إصلاح مشكلة المخزون المفقود في inventory_logs
-- تاريخ: 3 يوليو 2025
-- الهدف: إضافة سجلات المخزون الأولية للمنتجات المفقودة
-- ===============================================

-- 1. إضافة سجل المخزون الأولي للمنتج الجديد
INSERT INTO inventory_logs (
    id,
    product_id,
    product_name,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    notes,
    created_by,
    created_by_name,
    created_at,
    organization_id
) VALUES (
    gen_random_uuid(),
    '1cb97231-dce1-4018-8290-cb43b21e374d', -- ID المنتج
    'منتج خاص للتجريب',
    20, -- الكمية الأولية
    0,  -- المخزون السابق
    20, -- المخزون الجديد
    'addition', -- نوع العملية
    NULL,
    'إضافة مخزون أولي عند إنشاء المنتج',
    '3f602507-15f4-4055-988e-de069e220c2a', -- ID المستخدم
    'gfgffgf',
    '2025-07-03T16:27:34.052Z', -- نفس تاريخ إنشاء المنتج
    '989bf6d2-aba1-4edd-8d07-649120ac4323' -- ID المنظمة
);

-- 2. إنشاء trigger لضمان إضافة سجل مخزون عند إنشاء منتج جديد
CREATE OR REPLACE FUNCTION create_initial_inventory_log()
RETURNS TRIGGER AS $$
BEGIN
    -- إضافة سجل في inventory_logs عند إنشاء منتج جديد
    INSERT INTO inventory_logs (
        id,
        product_id,
        product_name,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_id,
        notes,
        created_by,
        created_by_name,
        created_at,
        organization_id
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.name,
        NEW.stock_quantity,
        0,
        NEW.stock_quantity,
        'addition',
        NULL,
        'إضافة مخزون أولي عند إنشاء المنتج',
        NEW.created_by_user_id,
        'System',
        NEW.created_at,
        NEW.organization_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء trigger على جدول products للمنتجات الجديدة
DROP TRIGGER IF EXISTS trigger_create_initial_inventory_log ON products;
CREATE TRIGGER trigger_create_initial_inventory_log
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_inventory_log();

-- 4. تحديث دالة get_advanced_inventory_tracking لتتضمن المزيد من التفاصيل
-- (هذا سيحتاج إلى تحديث منفصل في الـ Supabase)

-- 5. إضافة فهرس لتحسين أداء الاستعلامات
CREATE INDEX IF NOT EXISTS idx_inventory_logs_org_created 
ON inventory_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_org 
ON inventory_logs(product_id, organization_id);

-- 6. التحقق من النتائج
SELECT 
    'إجمالي سجلات المخزون للمنظمة' as description,
    COUNT(*) as count
FROM inventory_logs 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'

UNION ALL

SELECT 
    'سجلات المنتج الجديد',
    COUNT(*)
FROM inventory_logs 
WHERE product_id = '1cb97231-dce1-4018-8290-cb43b21e374d'

UNION ALL

SELECT 
    'إجمالي المنتجات في المنظمة',
    COUNT(*)
FROM products 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323';

-- 7. رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة المخزون بنجاح!';
    RAISE NOTICE '📊 يمكنك الآن مراجعة صفحة التتبع المتقدم';
    RAISE NOTICE '🔄 تم إضافة trigger لضمان عدم تكرار المشكلة';
END $$; 