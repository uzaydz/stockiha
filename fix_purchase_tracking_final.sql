-- =============================================================================
-- إصلاح نهائي لمشكلة تتبع المخزون عند الشراء
-- يحل مشكلة "قراءة المخزون الخطأ" عند إضافة مشتريات
-- =============================================================================

-- الخطوة 1: إصلاح المخزون الحالي لمنتجك
-- =======================================

-- تصحيح منتجك على وجه التحديد
UPDATE products 
SET stock_quantity = 18,  -- المخزون الصحيح: 20 أولي - 3 مبيعات + 1 شراء = 18
    updated_at = NOW()
WHERE id = '1cb97231-dce1-4018-8290-cb43b21e374d';

-- إضافة سجل توضيحي
INSERT INTO inventory_log (
    organization_id, product_id, type, quantity,
    previous_stock, new_stock, reference_type, notes, created_at
) VALUES (
    '989bf6d2-aba1-4edd-8d07-649120ac4323',
    '1cb97231-dce1-4018-8290-cb43b21e374d',
    'adjustment',
    13,  -- الفرق بين 5 و 18
    5,
    18,
    'purchase_fix',
    'تصحيح مخزون بعد مشكلة الشراء: المخزون الصحيح = 20 أولي - 3 مبيعات + 1 شراء = 18',
    NOW()
);

-- الخطوة 2: فحص وإصلاح دالة الشراء
-- ================================

-- فحص الدالة الحالية للشراء
SELECT 
    'فحص دوال الشراء الحالية' as step,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%purchase%' 
OR routine_name LIKE '%batch%'
OR routine_name LIKE '%buy%';

-- الخطوة 3: إنشاء دالة مراقبة للمشتريات
-- ========================================

CREATE OR REPLACE FUNCTION monitor_purchase_consistency()
RETURNS TABLE(
    product_name TEXT,
    organization_name TEXT,
    current_stock INT,
    calculated_stock INT,
    last_purchase_time TIMESTAMPTZ,
    purchase_discrepancy INT,
    needs_fix BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH purchase_analysis AS (
        SELECT 
            p.id,
            p.name as prod_name,
            o.name as org_name,
            p.stock_quantity as current_stock_val,
            -- حساب المخزون من جميع السجلات
            COALESCE(SUM(
                CASE 
                    WHEN il.type IN ('manual', 'purchase') THEN il.quantity
                    WHEN il.type = 'sale' THEN -il.quantity
                    WHEN il.type = 'adjustment' THEN il.quantity
                    WHEN il.type = 'return' THEN il.quantity
                    ELSE 0
                END
            ), 0) as calculated_stock_val,
            -- آخر عملية شراء
            MAX(il.created_at) FILTER (WHERE il.type = 'purchase') as last_purchase,
            -- فحص التضارب في المشتريات
            COUNT(*) FILTER (
                WHERE il.type = 'purchase' 
                AND il.previous_stock + il.quantity != il.new_stock
            ) as purchase_errors
        FROM products p
        JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN inventory_log il ON p.id = il.product_id
        WHERE EXISTS (
            SELECT 1 FROM inventory_log il2 
            WHERE il2.product_id = p.id AND il2.type = 'purchase'
        )
        GROUP BY p.id, p.name, o.name, p.stock_quantity
    )
    SELECT 
        prod_name,
        org_name,
        current_stock_val,
        calculated_stock_val,
        last_purchase,
        ABS(current_stock_val - calculated_stock_val),
        ABS(current_stock_val - calculated_stock_val) > 0
    FROM purchase_analysis
    WHERE ABS(current_stock_val - calculated_stock_val) > 0
    ORDER BY ABS(current_stock_val - calculated_stock_val) DESC;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 4: إنشاء trigger محسن للمشتريات
-- =======================================

-- إنشاء دالة trigger للمشتريات
CREATE OR REPLACE FUNCTION safe_purchase_inventory_log()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INT;
    org_id UUID;
BEGIN
    -- الحصول على المخزون الحالي الفعلي
    SELECT stock_quantity, organization_id 
    INTO current_stock, org_id
    FROM products 
    WHERE id = NEW.product_id;
    
    -- إنشاء سجل مخزون صحيح
    INSERT INTO inventory_log (
        organization_id,
        product_id,
        type,
        quantity,
        previous_stock,
        new_stock,
        reference_id,
        reference_type,
        notes,
        created_at
    ) VALUES (
        org_id,
        NEW.product_id,
        'purchase',
        NEW.quantity,
        current_stock,                    -- المخزون الحقيقي الحالي
        current_stock + NEW.quantity,     -- المخزون الجديد الصحيح
        NEW.id::text,
        'BATCH',
        FORMAT('شراء آمن: %s - كمية: %s - سعر: %s دج', 
               NEW.batch_number, NEW.quantity, NEW.cost_price),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة أي triggers قديمة للمشتريات
DROP TRIGGER IF EXISTS purchase_inventory_log_trigger ON product_batches;

-- إنشاء trigger جديد آمن
CREATE TRIGGER safe_purchase_inventory_trigger
    AFTER INSERT ON product_batches
    FOR EACH ROW
    EXECUTE FUNCTION safe_purchase_inventory_log();

-- الخطوة 5: فحص وإصلاح جميع المشتريات المشكوك فيها
-- ====================================================

CREATE OR REPLACE FUNCTION fix_all_purchase_inconsistencies()
RETURNS TABLE(
    product_name TEXT,
    organization_name TEXT,
    old_stock INT,
    corrected_stock INT,
    difference INT,
    action_taken TEXT
) AS $$
DECLARE
    product_rec RECORD;
    calculated_stock INT;
BEGIN
    -- إصلاح كل منتج بتضارب في المشتريات
    FOR product_rec IN 
        SELECT 
            p.id, p.name, p.stock_quantity, o.name as org_name, p.organization_id,
            COALESCE(SUM(
                CASE 
                    WHEN il.type IN ('manual', 'purchase') THEN il.quantity
                    WHEN il.type = 'sale' THEN -il.quantity
                    WHEN il.type = 'adjustment' THEN il.quantity
                    WHEN il.type = 'return' THEN il.quantity
                    ELSE 0
                END
            ), 0) as calc_stock
        FROM products p
        JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN inventory_log il ON p.id = il.product_id
        WHERE EXISTS (
            SELECT 1 FROM inventory_log il2 
            WHERE il2.product_id = p.id AND il2.type = 'purchase'
        )
        GROUP BY p.id, p.name, p.stock_quantity, o.name, p.organization_id
        HAVING ABS(p.stock_quantity - COALESCE(SUM(
            CASE 
                WHEN il.type IN ('manual', 'purchase') THEN il.quantity
                WHEN il.type = 'sale' THEN -il.quantity
                WHEN il.type = 'adjustment' THEN il.quantity
                WHEN il.type = 'return' THEN il.quantity
                ELSE 0
            END
        ), 0)) > 0
    LOOP
        calculated_stock := product_rec.calc_stock;
        
        -- تصحيح المخزون
        UPDATE products 
        SET stock_quantity = calculated_stock,
            updated_at = NOW()
        WHERE id = product_rec.id;
        
        -- توثيق التصحيح
        INSERT INTO inventory_log (
            organization_id, product_id, type, quantity,
            previous_stock, new_stock, reference_type, notes, created_at
        ) VALUES (
            product_rec.organization_id, product_rec.id, 'adjustment',
            calculated_stock - product_rec.stock_quantity,
            product_rec.stock_quantity, calculated_stock,
            'purchase_consistency_fix',
            FORMAT('تصحيح تضارب مشتريات: من %s إلى %s', 
                   product_rec.stock_quantity, calculated_stock),
            NOW()
        );
        
        -- إرجاع النتائج
        product_name := product_rec.name;
        organization_name := product_rec.org_name;
        old_stock := product_rec.stock_quantity;
        corrected_stock := calculated_stock;
        difference := calculated_stock - product_rec.stock_quantity;
        action_taken := 'تم تصحيح المخزون';
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- التنفيذ والتحقق
-- =============================================================================

-- 1. تشغيل مراقب المشتريات
SELECT 'فحص مشاكل المشتريات:' as step;
SELECT * FROM monitor_purchase_consistency();

-- 2. إصلاح جميع التضاربات
SELECT 'إصلاح تضاربات المشتريات:' as step;
SELECT * FROM fix_all_purchase_inconsistencies();

-- 3. التحقق النهائي
SELECT 'التحقق من منتجك:' as step;
SELECT 
    p.name,
    p.stock_quantity as current_stock,
    COALESCE(SUM(
        CASE 
            WHEN il.type IN ('manual', 'purchase') THEN il.quantity
            WHEN il.type = 'sale' THEN -il.quantity
            WHEN il.type = 'adjustment' THEN il.quantity
            ELSE 0
        END
    ), 0) as calculated_from_logs,
    CASE 
        WHEN p.stock_quantity = COALESCE(SUM(
            CASE 
                WHEN il.type IN ('manual', 'purchase') THEN il.quantity
                WHEN il.type = 'sale' THEN -il.quantity
                WHEN il.type = 'adjustment' THEN il.quantity
                ELSE 0
            END
        ), 0) THEN '✅ متطابق'
        ELSE '❌ يحتاج مراجعة'
    END as status
FROM products p
LEFT JOIN inventory_log il ON p.id = il.product_id
WHERE p.id = '1cb97231-dce1-4018-8290-cb43b21e374d'
GROUP BY p.id, p.name, p.stock_quantity;

-- =============================================================================
-- ملاحظات:
-- 
-- ✅ هذا الحل يعالج:
-- - مشكلة "قراءة المخزون الخطأ" عند الشراء
-- - جميع تضاربات المشتريات في النظام  
-- - إنشاء trigger آمن للمشتريات المستقبلية
-- - مراقب مستمر لضمان الاتساق
-- 
-- 🔧 الحماية المستقبلية:
-- - Trigger محسن يقرأ المخزون الصحيح
-- - دالة مراقبة للمشتريات
-- - توثيق شامل لكل عملية
-- ============================================================================= 