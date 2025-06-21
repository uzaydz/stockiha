-- ===============================================
-- حل شامل لمشكلة الخصم المضاعف في نقطة البيع
-- ===============================================

-- 1. إنشاء دالة مركزية محسنة لإدارة المخزون
CREATE OR REPLACE FUNCTION update_inventory_centralized(
    p_product_id UUID,
    p_quantity INTEGER,
    p_operation_type VARCHAR(20), -- 'sale', 'purchase', 'adjustment', 'return'
    p_reference_type VARCHAR(50), -- 'order', 'purchase', 'manual', 'system'
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_product_org_id UUID;
    v_log_id UUID;
    v_result JSONB;
BEGIN
    -- التحقق من صحة المعاملات
    IF p_product_id IS NULL OR p_quantity IS NULL OR p_operation_type IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معاملات مطلوبة مفقودة',
            'error_code', 'MISSING_PARAMS'
        );
    END IF;

    -- الحصول على المخزون الحالي ومعرف المؤسسة
    SELECT stock_quantity, organization_id 
    INTO v_current_stock, v_product_org_id
    FROM products
    WHERE id = p_product_id;

    -- التحقق من وجود المنتج
    IF v_current_stock IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود',
            'error_code', 'PRODUCT_NOT_FOUND'
        );
    END IF;

    -- استخدام organization_id من المنتج إذا لم يتم تمريره
    IF p_organization_id IS NULL THEN
        p_organization_id := v_product_org_id;
    END IF;

    -- حساب المخزون الجديد حسب نوع العملية
    CASE p_operation_type
        WHEN 'sale' THEN
            v_new_stock := GREATEST(0, v_current_stock - ABS(p_quantity));
        WHEN 'purchase', 'return' THEN
            v_new_stock := v_current_stock + ABS(p_quantity);
        WHEN 'adjustment' THEN
            v_new_stock := GREATEST(0, p_quantity);
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'نوع عملية غير صالح',
                'error_code', 'INVALID_OPERATION'
            );
    END CASE;

    -- تحديث المخزون في جدول المنتجات
    UPDATE products 
    SET 
        stock_quantity = v_new_stock,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;

    -- إدراج سجل في inventory_log
    INSERT INTO inventory_log (
        id,
        product_id,
        organization_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_type,
        reference_id,
        notes,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_product_id,
        p_organization_id,
        CASE 
            WHEN p_operation_type = 'sale' THEN ABS(p_quantity)
            WHEN p_operation_type IN ('purchase', 'return') THEN ABS(p_quantity)
            WHEN p_operation_type = 'adjustment' THEN ABS(p_quantity - v_current_stock)
            ELSE ABS(p_quantity)
        END,
        v_current_stock,
        v_new_stock,
        p_operation_type,
        p_reference_type,
        p_reference_id,
        COALESCE(p_notes, 'تحديث مخزون من النظام المركزي'),
        NOW()
    ) RETURNING id INTO v_log_id;

    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'quantity_changed', ABS(v_new_stock - v_current_stock),
        'log_id', v_log_id,
        'operation_type', p_operation_type
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في تحديث المخزون: ' || SQLERRM,
        'error_code', 'DATABASE_ERROR'
    );
END;
$$;

-- 2. إنشاء دالة محسنة لمعالجة طلبات نقطة البيع
CREATE OR REPLACE FUNCTION process_pos_order_inventory(
    p_order_id UUID,
    p_organization_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_result JSONB;
    v_inventory_results JSONB := '[]'::jsonb;
    v_total_items INTEGER := 0;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_errors JSONB := '[]'::jsonb;
BEGIN
    -- معالجة كل عنصر في الطلب
    FOR v_item IN 
        SELECT 
            oi.product_id,
            oi.quantity,
            oi.product_name,
            p.stock_quantity as current_stock
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = p_order_id
        AND oi.organization_id = p_organization_id
    LOOP
        v_total_items := v_total_items + 1;

        -- استدعاء الدالة المركزية لتحديث المخزون
        SELECT update_inventory_centralized(
            v_item.product_id,
            v_item.quantity,
            'sale',
            'order',
            p_order_id,
            'بيع من خلال طلب نقطة البيع رقم ' || p_order_id::text,
            p_organization_id
        ) INTO v_result;

        -- إضافة النتيجة إلى المصفوفة
        v_inventory_results := v_inventory_results || jsonb_build_object(
            'product_id', v_item.product_id,
            'product_name', v_item.product_name,
            'quantity', v_item.quantity,
            'result', v_result
        );

        -- عد النجاحات والأخطاء
        IF (v_result->>'success')::boolean THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'product_id', v_item.product_id,
                'product_name', v_item.product_name,
                'error', v_result->>'error'
            );
        END IF;
    END LOOP;

    -- إرجاع تقرير شامل
    RETURN jsonb_build_object(
        'success', v_error_count = 0,
        'order_id', p_order_id,
        'total_items', v_total_items,
        'success_count', v_success_count,
        'error_count', v_error_count,
        'inventory_updates', v_inventory_results,
        'errors', v_errors,
        'processed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في معالجة طلب نقطة البيع: ' || SQLERRM,
        'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- 3. حذف المحفزات المتضاربة
DROP TRIGGER IF EXISTS log_stock_changes_trigger ON products;
DROP TRIGGER IF EXISTS update_product_stock_trigger ON order_items;

-- 4. إنشاء محفز محسن لمعالجة order_items
CREATE OR REPLACE FUNCTION handle_order_item_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- فقط للعمليات INSERT (إنشاء طلب جديد)
    IF TG_OP = 'INSERT' THEN
        -- التحقق من أن المنتج ليس افتراضي
        IF NEW.product_id NOT IN (
            '7b973625-5c3d-484f-a7e0-bf9e01f00ed2', 
            '00000000-0000-0000-0000-000000000001'
        ) THEN
            -- استدعاء الدالة المركزية
            SELECT update_inventory_centralized(
                NEW.product_id,
                NEW.quantity,
                'sale',
                'order',
                NEW.order_id,
                'بيع من خلال طلب رقم ' || NEW.order_id::text,
                NEW.organization_id
            ) INTO v_result;

            -- تسجيل الأخطاء إن وجدت
            IF NOT (v_result->>'success')::boolean THEN
                RAISE WARNING 'فشل في تحديث مخزون المنتج %: %', 
                    NEW.product_id, v_result->>'error';
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. إنشاء المحفز الجديد
CREATE TRIGGER order_item_inventory_trigger
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_item_inventory();

-- 6. إنشاء دالة لتصحيح المخزون المتضرر
CREATE OR REPLACE FUNCTION fix_inventory_discrepancies(
    p_organization_id UUID DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_calculated_stock INTEGER;
    v_current_stock INTEGER;
    v_difference INTEGER;
    v_corrections JSONB := '[]'::jsonb;
    v_total_corrections INTEGER := 0;
    v_result JSONB;
BEGIN
    -- مراجعة كل منتج
    FOR v_product IN 
        SELECT 
            p.id,
            p.name,
            p.stock_quantity,
            p.organization_id
        FROM products p
        WHERE (p_organization_id = p.organization_id OR p_organization_id IS NULL)
        AND p.id NOT IN (
            '7b973625-5c3d-484f-a7e0-bf9e01f00ed2',
            '00000000-0000-0000-0000-000000000001'
        )
    LOOP
        -- حساب المخزون الصحيح من سجلات inventory_log
        SELECT 
            COALESCE(
                SUM(CASE 
                    WHEN il.type IN ('purchase', 'return', 'adjustment') AND il.new_stock > il.previous_stock 
                    THEN il.quantity
                    WHEN il.type IN ('sale', 'loss') AND il.new_stock < il.previous_stock 
                    THEN -il.quantity
                    ELSE 0
                END), 
                v_product.stock_quantity
            )
        INTO v_calculated_stock
        FROM inventory_log il
        WHERE il.product_id = v_product.id
        AND il.created_at >= (
            SELECT COALESCE(MIN(created_at), NOW() - INTERVAL '30 days')
            FROM inventory_log 
            WHERE product_id = v_product.id
        );

        v_current_stock := v_product.stock_quantity;
        v_difference := v_calculated_stock - v_current_stock;

        -- إذا كان هناك اختلاف
        IF ABS(v_difference) > 0 THEN
            v_total_corrections := v_total_corrections + 1;
            
            v_corrections := v_corrections || jsonb_build_object(
                'product_id', v_product.id,
                'product_name', v_product.name,
                'current_stock', v_current_stock,
                'calculated_stock', v_calculated_stock,
                'difference', v_difference,
                'action_needed', CASE 
                    WHEN v_difference > 0 THEN 'زيادة المخزون'
                    ELSE 'تقليل المخزون'
                END
            );

            -- تطبيق التصحيح إذا لم يكن dry run
            IF NOT p_dry_run THEN
                SELECT update_inventory_centralized(
                    v_product.id,
                    v_calculated_stock,
                    'adjustment',
                    'system_correction',
                    NULL,
                    'تصحيح تلقائي للمخزون - الفرق: ' || v_difference::text,
                    v_product.organization_id
                ) INTO v_result;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'dry_run', p_dry_run,
        'total_products_checked', (
            SELECT COUNT(*) FROM products 
            WHERE (organization_id = p_organization_id OR p_organization_id IS NULL)
        ),
        'corrections_needed', v_total_corrections,
        'corrections', v_corrections,
        'processed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في تصحيح المخزون: ' || SQLERRM
    );
END;
$$;

-- 7. إنشاء دالة للمراقبة والتحقق من صحة المخزون
CREATE OR REPLACE FUNCTION monitor_inventory_health(
    p_organization_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
    v_recent_duplicates INTEGER;
    v_negative_stocks INTEGER;
    v_missing_logs INTEGER;
BEGIN
    -- إحصائيات عامة
    SELECT jsonb_build_object(
        'total_products', COUNT(*),
        'products_with_stock', COUNT(*) FILTER (WHERE stock_quantity > 0),
        'products_out_of_stock', COUNT(*) FILTER (WHERE stock_quantity = 0),
        'products_with_negative_stock', COUNT(*) FILTER (WHERE stock_quantity < 0),
        'avg_stock_level', ROUND(AVG(stock_quantity), 2),
        'total_inventory_value', ROUND(SUM(stock_quantity * COALESCE(purchase_price, price)), 2)
    ) INTO v_stats
    FROM products
    WHERE (organization_id = p_organization_id OR p_organization_id IS NULL);

    -- البحث عن السجلات المكررة في آخر 24 ساعة
    SELECT COUNT(*)
    INTO v_recent_duplicates
    FROM (
        SELECT product_id, reference_id, COUNT(*)
        FROM inventory_log
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND (organization_id = p_organization_id OR p_organization_id IS NULL)
        GROUP BY product_id, reference_id, created_at
        HAVING COUNT(*) > 1
    ) duplicates;

    -- منتجات بمخزون سالب
    SELECT COUNT(*)
    INTO v_negative_stocks
    FROM products
    WHERE stock_quantity < 0
    AND (organization_id = p_organization_id OR p_organization_id IS NULL);

    -- منتجات بدون سجلات مخزون
    SELECT COUNT(*)
    INTO v_missing_logs
    FROM products p
    LEFT JOIN inventory_log il ON p.id = il.product_id
    WHERE il.product_id IS NULL
    AND (p.organization_id = p_organization_id OR p_organization_id IS NULL);

    RETURN v_stats || jsonb_build_object(
        'health_indicators', jsonb_build_object(
            'recent_duplicates', v_recent_duplicates,
            'negative_stocks', v_negative_stocks,
            'missing_logs', v_missing_logs,
            'health_score', CASE
                WHEN v_recent_duplicates = 0 AND v_negative_stocks = 0 AND v_missing_logs = 0 THEN 'ممتاز'
                WHEN v_recent_duplicates <= 5 AND v_negative_stocks <= 2 AND v_missing_logs <= 10 THEN 'جيد'
                WHEN v_recent_duplicates <= 15 AND v_negative_stocks <= 5 AND v_missing_logs <= 25 THEN 'متوسط'
                ELSE 'يحتاج تدخل'
            END
        ),
        'checked_at', NOW()
    );
END;
$$;

-- 8. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_inventory_log_product_created 
ON inventory_log(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_log_reference 
ON inventory_log(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_products_stock_org 
ON products(organization_id, stock_quantity);

-- 9. إضافة تعليقات للتوثيق
COMMENT ON FUNCTION update_inventory_centralized IS 'دالة مركزية محسنة لإدارة المخزون تمنع الخصم المضاعف';
COMMENT ON FUNCTION process_pos_order_inventory IS 'معالجة طلبات نقطة البيع بشكل آمن ومركزي';
COMMENT ON FUNCTION fix_inventory_discrepancies IS 'تصحيح اختلافات المخزون الناتجة عن المشاكل السابقة';
COMMENT ON FUNCTION monitor_inventory_health IS 'مراقبة صحة نظام إدارة المخزون';

-- 10. إنشاء جدول لتتبع العمليات المهمة
CREATE TABLE IF NOT EXISTS inventory_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL,
    operation_data JSONB,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id)
);

CREATE INDEX idx_inventory_operations_log_type_date 
ON inventory_operations_log(operation_type, created_at DESC);

COMMENT ON TABLE inventory_operations_log IS 'سجل العمليات المهمة على نظام إدارة المخزون'; 