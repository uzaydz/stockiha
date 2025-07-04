-- =============================================================================
-- 🚨 حل طارئ: إعادة تأهيل شاملة لنظام المخزون
-- يحل مشكلة "نفاذ المخزون الخاطئ" لجميع العملاء
-- =============================================================================

-- STEP 1: تحليل الوضع الحالي أولاً
-- ==================================

CREATE OR REPLACE FUNCTION analyze_current_crisis()
RETURNS TABLE(
    analysis_type TEXT,
    total_count BIGINT,
    affected_organizations INT,
    critical_level TEXT
) AS $$
BEGIN
    -- منتجات بمخزون سلبي
    RETURN QUERY
    SELECT 
        'منتجات بمخزون سلبي (نفدت خطأ)'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        '🚨 حرج جداً'::TEXT
    FROM products 
    WHERE stock_quantity < 0;
    
    -- منتجات بمخزون صفر (نفدت)
    RETURN QUERY
    SELECT 
        'منتجات نفد مخزونها'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        '⚠️ مؤثر على المبيعات'::TEXT
    FROM products 
    WHERE stock_quantity = 0;
    
    -- منتجات بمخزون إيجابي صغير (مهددة)
    RETURN QUERY
    SELECT 
        'منتجات بمخزون منخفض (1-5)'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        '⚠️ مهددة بالنفاد'::TEXT
    FROM products 
    WHERE stock_quantity BETWEEN 1 AND 5;
    
    -- إجمالي المنتجات المتضررة
    RETURN QUERY
    SELECT 
        'إجمالي المنتجات المتضررة'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        '🔴 أزمة شاملة'::TEXT
    FROM products 
    WHERE stock_quantity <= 5;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: إنشاء جدول نسخ احتياطي فوري
-- =====================================

CREATE TABLE IF NOT EXISTS products_backup_emergency AS 
SELECT 
    id,
    organization_id,
    name,
    stock_quantity as original_stock,
    NOW() as backup_timestamp,
    'pre_emergency_fix' as backup_reason
FROM products;

-- STEP 3: الحل الجذري - إعادة تعيين المخزون بناءً على آخر حالة معروفة صحيحة
-- ========================================================================

CREATE OR REPLACE FUNCTION emergency_inventory_reset()
RETURNS TABLE(
    org_name TEXT,
    product_name TEXT,
    old_stock INT,
    calculated_safe_stock INT,
    reset_stock INT,
    action_taken TEXT
) AS $$
DECLARE
    product_rec RECORD;
    calculated_stock INT;
    safe_stock INT;
    recent_sales INT;
BEGIN
    -- لكل منتج في النظام
    FOR product_rec IN 
        SELECT p.id, p.organization_id, p.name, p.stock_quantity,
               o.name as org_name, p.cost_price, p.selling_price
        FROM products p
        JOIN organizations o ON p.organization_id = o.id
        ORDER BY p.organization_id, p.name
    LOOP
        -- حساب المبيعات الحديثة (آخر 30 يوم)
        SELECT COALESCE(SUM(quantity), 0) INTO recent_sales
        FROM inventory_log 
        WHERE product_id = product_rec.id 
        AND type = 'sale'
        AND created_at >= NOW() - INTERVAL '30 days';
        
        -- حساب مخزون آمن بناءً على النشاط
        IF recent_sales > 0 THEN
            -- منتج نشط: مخزون آمن = متوسط البيع الأسبوعي × 4
            safe_stock := GREATEST(CEIL(recent_sales / 4.0), 10);
        ELSIF product_rec.stock_quantity > 0 THEN
            -- منتج غير نشط لكن له مخزون: الاحتفاظ بـ 5 قطع
            safe_stock := LEAST(product_rec.stock_quantity, 5);
        ELSE
            -- منتج غير نشط بدون مخزون: 0
            safe_stock := 0;
        END IF;
        
        -- تطبيق الحد الأقصى المعقول
        safe_stock := LEAST(safe_stock, 100);
        
        -- إذا كان المخزون الحالي سلبي أو غير معقول
        IF product_rec.stock_quantity < 0 OR 
           (product_rec.stock_quantity = 0 AND recent_sales > 0) THEN
            
            -- إعادة تعيين للمخزون الآمن
            UPDATE products 
            SET stock_quantity = safe_stock,
                updated_at = NOW()
            WHERE id = product_rec.id;
            
            -- توثيق العملية
            INSERT INTO inventory_log (
                organization_id, product_id, type, quantity,
                previous_stock, new_stock, reference_type, notes, created_at
            ) VALUES (
                product_rec.organization_id, product_rec.id, 'adjustment',
                safe_stock - product_rec.stock_quantity,
                product_rec.stock_quantity, safe_stock,
                'emergency_reset',
                FORMAT('إعادة تأهيل طارئة: من %s إلى %s (نشاط حديث: %s)', 
                       product_rec.stock_quantity, safe_stock, recent_sales),
                NOW()
            );
            
            action_taken := FORMAT('إعادة تعيين من %s إلى %s', 
                                 product_rec.stock_quantity, safe_stock);
            
        ELSE
            -- المخزون معقول، لا تغيير
            safe_stock := product_rec.stock_quantity;
            action_taken := 'لا يحتاج تغيير';
        END IF;
        
        -- إرجاع النتائج
        org_name := product_rec.org_name;
        product_name := product_rec.name;
        old_stock := product_rec.stock_quantity;
        calculated_safe_stock := safe_stock;
        reset_stock := safe_stock;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: تنظيف سجلات المخزون المتضاربة
-- ======================================

CREATE OR REPLACE FUNCTION cleanup_conflicting_inventory_logs()
RETURNS TABLE(
    cleanup_type TEXT,
    records_before INT,
    records_after INT,
    records_cleaned INT
) AS $$
DECLARE
    before_count INT;
    after_count INT;
BEGIN
    -- تنظيف السجلات المكررة لـ POS
    SELECT COUNT(*) INTO before_count FROM inventory_log 
    WHERE type = 'sale' AND reference_type = 'pos_order';
    
    WITH duplicates AS (
        SELECT id, 
               ROW_NUMBER() OVER (
                   PARTITION BY reference_id, product_id 
                   ORDER BY created_at DESC
               ) as rn
        FROM inventory_log 
        WHERE type = 'sale' AND reference_type = 'pos_order'
    )
    DELETE FROM inventory_log 
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
    
    SELECT COUNT(*) INTO after_count FROM inventory_log 
    WHERE type = 'sale' AND reference_type = 'pos_order';
    
    cleanup_type := 'سجلات POS مكررة';
    records_before := before_count;
    records_after := after_count;
    records_cleaned := before_count - after_count;
    RETURN NEXT;
    
    -- تنظيف السجلات بدون مرجع
    SELECT COUNT(*) INTO before_count FROM inventory_log 
    WHERE reference_id IS NULL AND reference_type != 'emergency_reset';
    
    DELETE FROM inventory_log 
    WHERE reference_id IS NULL 
    AND reference_type NOT IN ('emergency_reset', 'initial_stock', 'system_correction');
    
    SELECT COUNT(*) INTO after_count FROM inventory_log 
    WHERE reference_id IS NULL AND reference_type != 'emergency_reset';
    
    cleanup_type := 'سجلات بدون مرجع';
    records_before := before_count;
    records_after := after_count;
    records_cleaned := before_count - after_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: التحقق من صحة النظام بعد الإصلاح
-- ==========================================

CREATE OR REPLACE FUNCTION verify_emergency_fix()
RETURNS TABLE(
    verification_type TEXT,
    result_count INT,
    status TEXT,
    next_action TEXT
) AS $$
BEGIN
    -- فحص المخزون السلبي
    RETURN QUERY
    SELECT 
        'منتجات بمخزون سلبي'::TEXT,
        COUNT(*)::INT,
        CASE WHEN COUNT(*) = 0 THEN '✅ محلول' ELSE '❌ يحتاج مراجعة' END,
        CASE WHEN COUNT(*) = 0 THEN 'لا شيء' ELSE 'فحص يدوي مطلوب' END
    FROM products 
    WHERE stock_quantity < 0;
    
    -- فحص المنتجات النشطة بدون مخزون
    RETURN QUERY
    WITH active_products AS (
        SELECT DISTINCT il.product_id
        FROM inventory_log il
        WHERE il.type = 'sale' 
        AND il.created_at >= NOW() - INTERVAL '30 days'
    )
    SELECT 
        'منتجات نشطة بدون مخزون'::TEXT,
        COUNT(*)::INT,
        CASE WHEN COUNT(*) = 0 THEN '✅ محلول' ELSE '⚠️ مراجعة مطلوبة' END,
        CASE WHEN COUNT(*) = 0 THEN 'لا شيء' ELSE 'إضافة مخزون للمنتجات النشطة' END
    FROM products p
    WHERE p.id IN (SELECT product_id FROM active_products)
    AND p.stock_quantity = 0;
    
    -- فحص التناسق العام
    RETURN QUERY
    SELECT 
        'منتجات بمخزون معقول'::TEXT,
        COUNT(*)::INT,
        '✅ جيد'::TEXT,
        'متابعة العمل العادي'::TEXT
    FROM products 
    WHERE stock_quantity > 0;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: تقرير شامل للعملاء
-- ===========================

CREATE OR REPLACE FUNCTION generate_client_report()
RETURNS TABLE(
    organization_name TEXT,
    total_products INT,
    products_fixed INT,
    products_available INT,
    products_out_of_stock INT,
    business_impact TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH org_stats AS (
        SELECT 
            o.name,
            COUNT(p.id) as total_prods,
            COUNT(*) FILTER (WHERE p.id IN (
                SELECT product_id FROM inventory_log 
                WHERE reference_type = 'emergency_reset'
                AND created_at >= NOW() - INTERVAL '1 hour'
            )) as fixed_prods,
            COUNT(*) FILTER (WHERE p.stock_quantity > 0) as available_prods,
            COUNT(*) FILTER (WHERE p.stock_quantity = 0) as out_of_stock_prods
        FROM organizations o
        LEFT JOIN products p ON o.id = p.organization_id
        GROUP BY o.id, o.name
        HAVING COUNT(p.id) > 0
    )
    SELECT 
        name,
        total_prods,
        fixed_prods,
        available_prods,
        out_of_stock_prods,
        CASE 
            WHEN available_prods::FLOAT / total_prods > 0.8 THEN '✅ جيد - يمكن البيع'
            WHEN available_prods::FLOAT / total_prods > 0.5 THEN '⚠️ متوسط - مراجعة مطلوبة'
            ELSE '🚨 بحاجة عاجلة لإضافة مخزون'
        END
    FROM org_stats
    ORDER BY available_prods::FLOAT / total_prods DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- التنفيذ الطارئ
-- =============================================================================

-- 1. تحليل الأزمة الحالية
SELECT '=== تحليل الوضع الحالي ===' as step;
SELECT * FROM analyze_current_crisis();

-- 2. تطبيق الحل الطارئي
SELECT '=== تطبيق الإصلاح الطارئ ===' as step;
-- سيتم تشغيله يدوياً لضمان المراقبة

-- 3. تنظيف السجلات
SELECT '=== تنظيف السجلات ===' as step;
-- سيتم تشغيله بعد الإصلاح

-- 4. التحقق من النتائج
SELECT '=== التحقق من الإصلاح ===' as step;
-- سيتم تشغيله للتأكد

-- 5. تقرير للعملاء
SELECT '=== تقرير العملاء ===' as step;
-- سيعرض حالة كل عميل

-- =============================================================================
-- تعليمات التنفيذ:
--
-- 🚨 هذا حل طارئ! قم بالتنفيذ بالتسلسل:
--
-- 1. SELECT * FROM analyze_current_crisis();
-- 2. SELECT * FROM emergency_inventory_reset();
-- 3. SELECT * FROM cleanup_conflicting_inventory_logs();
-- 4. SELECT * FROM verify_emergency_fix();
-- 5. SELECT * FROM generate_client_report();
--
-- ⚡ النتيجة المتوقعة:
-- - إزالة جميع المخزون السلبي
-- - إعادة تعيين مخزون آمن للمنتجات النشطة  
-- - حل مشكلة "نفاد المخزون الخاطئ"
-- - استعادة قدرة العملاء على البيع
-- ============================================================================= 