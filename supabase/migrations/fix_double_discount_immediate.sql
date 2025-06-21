-- ===============================================
-- حل فوري لمشكلة الخصم المضاعف - إزالة جميع المحفزات المتضاربة
-- ===============================================

-- 1. حذف جميع المحفزات المتضاربة بقوة
DROP TRIGGER IF EXISTS log_stock_changes_trigger ON products CASCADE;
DROP TRIGGER IF EXISTS update_product_stock_trigger ON order_items CASCADE;
DROP TRIGGER IF EXISTS order_item_inventory_trigger ON order_items CASCADE;
DROP TRIGGER IF EXISTS update_inventory_trigger ON order_items CASCADE;
DROP TRIGGER IF EXISTS stock_update_trigger ON order_items CASCADE;

-- 2. حذف الدوال المتضاربة
DROP FUNCTION IF EXISTS log_stock_changes() CASCADE;
DROP FUNCTION IF EXISTS update_product_stock() CASCADE;
DROP FUNCTION IF EXISTS handle_order_item_inventory() CASCADE;

-- 3. تعطيل المحفز الذي يعيد إنشاء السجلات المكررة
DROP TRIGGER IF EXISTS log_inventory_change_trigger ON products CASCADE;
DROP FUNCTION IF EXISTS log_inventory_change() CASCADE;

-- 4. إنشاء دالة محسنة لتحديث المخزون (بدون محفزات تلقائية)
CREATE OR REPLACE FUNCTION update_product_stock_safe_v2(
    p_product_id UUID,
    p_quantity_sold INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_organization_id UUID;
BEGIN
    -- الحصول على المخزون الحالي ومعرف المؤسسة
    SELECT stock_quantity, organization_id 
    INTO v_current_stock, v_organization_id
    FROM products
    WHERE id = p_product_id;
    
    IF v_current_stock IS NULL THEN
        -- المنتج غير موجود
        RETURN FALSE;
    END IF;
    
    -- حساب المخزون الجديد
    v_new_stock := GREATEST(0, v_current_stock - p_quantity_sold);
    
    -- تحديث المخزون بدون تشغيل أي محفزات
    UPDATE products 
    SET stock_quantity = v_new_stock,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- إدراج سجل واحد فقط في inventory_log
    INSERT INTO inventory_log (
        id,
        product_id,
        organization_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_type,
        notes,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_product_id,
        v_organization_id,
        p_quantity_sold,
        v_current_stock,
        v_new_stock,
        'sale',
        'pos_order',
        'بيع من خلال نقطة البيع - تحديث آمن',
        NOW()
    );
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    -- في حالة الخطأ، لا تفشل العملية
    RAISE WARNING 'خطأ في تحديث المخزون الآمن: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- 5. إنشاء دالة لتنظيف السجلات المكررة
CREATE OR REPLACE FUNCTION cleanup_duplicate_inventory_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- حذف السجلات المكررة (الاحتفاظ بأحدث سجل لكل مجموعة)
    WITH duplicate_logs AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id, reference_id, created_at::date, type 
                ORDER BY created_at DESC
            ) as rn
        FROM inventory_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
        AND reference_type IN ('system', 'system_update')
    )
    DELETE FROM inventory_log 
    WHERE id IN (
        SELECT id FROM duplicate_logs WHERE rn > 1
    );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- 6. تشغيل تنظيف السجلات المكررة
SELECT cleanup_duplicate_inventory_logs() as deleted_duplicates;

-- 7. إنشاء دالة لإعادة حساب المخزون الصحيح
CREATE OR REPLACE FUNCTION recalculate_product_stock(
    p_product_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_calculated_stock INTEGER;
    v_current_stock INTEGER;
    v_organization_id UUID;
    v_base_stock INTEGER := 0;
BEGIN
    -- الحصول على المخزون الحالي
    SELECT stock_quantity, organization_id 
    INTO v_current_stock, v_organization_id
    FROM products 
    WHERE id = p_product_id;
    
    IF v_current_stock IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود'
        );
    END IF;
    
    -- البحث عن آخر سجل تعديل يدوي أو مشتريات
    SELECT COALESCE(new_stock, 0) INTO v_base_stock
    FROM inventory_log
    WHERE product_id = p_product_id
    AND type IN ('purchase', 'adjustment')
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- إذا لم يوجد سجل، استخدم المخزون الحالي كنقطة بداية
    IF v_base_stock = 0 THEN
        v_base_stock := v_current_stock;
    END IF;
    
    -- حساب إجمالي المبيعات منذ آخر تعديل
    SELECT v_base_stock - COALESCE(SUM(quantity), 0)
    INTO v_calculated_stock
    FROM inventory_log
    WHERE product_id = p_product_id
    AND type = 'sale'
    AND created_at > (
        SELECT COALESCE(MAX(created_at), '1900-01-01'::timestamp)
        FROM inventory_log
        WHERE product_id = p_product_id
        AND type IN ('purchase', 'adjustment')
    );
    
    v_calculated_stock := GREATEST(0, v_calculated_stock);
    
    -- إذا كان هناك فرق، قم بالتصحيح
    IF v_calculated_stock != v_current_stock THEN
        UPDATE products 
        SET stock_quantity = v_calculated_stock,
            updated_at = NOW(),
            last_inventory_update = NOW()
        WHERE id = p_product_id;
        
        -- إدراج سجل التصحيح
        INSERT INTO inventory_log (
            id,
            product_id,
            organization_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_type,
            notes,
            created_at
        ) VALUES (
            gen_random_uuid(),
            p_product_id,
            v_organization_id,
            ABS(v_calculated_stock - v_current_stock),
            v_current_stock,
            v_calculated_stock,
            'adjustment',
            'auto_correction',
            'تصحيح تلقائي للمخزون بعد إزالة التضارب',
            NOW()
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'previous_stock', v_current_stock,
        'calculated_stock', v_calculated_stock,
        'corrected', v_calculated_stock != v_current_stock
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في إعادة حساب المخزون: ' || SQLERRM
    );
END;
$$;

-- 8. تصحيح المنتج المتأثر
SELECT recalculate_product_stock('e0422086-9bbf-438c-9207-9ff37b7e1866') as correction_result;

-- 9. إنشاء دالة للتحقق من عدم وجود محفزات متضاربة (مصححة)
CREATE OR REPLACE FUNCTION check_inventory_triggers()
RETURNS TABLE(
    trigger_name TEXT,
    table_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_name::TEXT,
        t.event_object_table::TEXT,
        CASE 
            WHEN t.trigger_name LIKE '%stock%' OR t.trigger_name LIKE '%inventory%' 
            THEN '⚠️ محفز متعلق بالمخزون'
            ELSE '✅ محفز عادي'
        END::TEXT as status
    FROM information_schema.triggers t
    WHERE t.event_object_table IN ('products', 'order_items')
    ORDER BY t.event_object_table, t.trigger_name;
END;
$$;

-- 10. فحص الوضع الحالي
SELECT * FROM check_inventory_triggers();

-- 11. إضافة تعليقات
COMMENT ON FUNCTION update_product_stock_safe_v2 IS 'دالة محسنة لتحديث المخزون بدون تضارب - تستدعى من الفرونت أند فقط';
COMMENT ON FUNCTION cleanup_duplicate_inventory_logs IS 'تنظيف السجلات المكررة في inventory_log';
COMMENT ON FUNCTION recalculate_product_stock IS 'إعادة حساب المخزون الصحيح لمنتج معين';
COMMENT ON FUNCTION check_inventory_triggers IS 'فحص المحفزات المتعلقة بالمخزون للتأكد من عدم التضارب'; 