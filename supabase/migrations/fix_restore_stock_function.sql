-- إنشاء دالة محسنة لإعادة المخزون عند حذف الطلبيات
-- تاريخ الإنشاء: 2024-12-21
-- الغرض: إعادة الكميات إلى المخزون بشكل آمن عند حذف طلبيات نقطة البيع

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS restore_product_stock_safe(UUID, INTEGER);

-- إنشاء دالة جديدة لإعادة المخزون
CREATE OR REPLACE FUNCTION restore_product_stock_safe(
    p_product_id UUID,
    p_quantity_to_restore INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_organization_id UUID;
BEGIN
    -- التحقق من صحة المعاملات
    IF p_product_id IS NULL OR p_quantity_to_restore <= 0 THEN
        RAISE WARNING 'معاملات غير صحيحة: product_id=%, quantity=%', p_product_id, p_quantity_to_restore;
        RETURN FALSE;
    END IF;
    
    -- الحصول على المخزون الحالي ومعرف المؤسسة
    SELECT stock_quantity, organization_id 
    INTO v_current_stock, v_organization_id
    FROM products
    WHERE id = p_product_id;
    
    IF v_current_stock IS NULL THEN
        RAISE WARNING 'المنتج غير موجود: %', p_product_id;
        RETURN FALSE;
    END IF;
    
    -- حساب المخزون الجديد (إضافة الكمية المُعادة)
    v_new_stock := v_current_stock + p_quantity_to_restore;
    
    -- تحديث المخزون
    UPDATE products 
    SET stock_quantity = v_new_stock,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- إدراج سجل في inventory_log إذا كان الجدول موجود
    BEGIN
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
            p_quantity_to_restore,
            v_current_stock,
            v_new_stock,
            'return',
            'pos_order_deletion',
            'إعادة مخزون بعد حذف طلبية نقطة البيع',
            NOW()
        );
    EXCEPTION WHEN undefined_table THEN
        -- جدول inventory_log غير موجود، نتجاهل السجل
        RAISE NOTICE 'جدول inventory_log غير موجود، تم تخطي السجل';
    END;
    
    RAISE NOTICE 'تم إعادة % وحدة من المنتج % (من % إلى %)', 
                 p_quantity_to_restore, p_product_id, v_current_stock, v_new_stock;
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'خطأ في إعادة المخزون: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION restore_product_stock_safe(UUID, INTEGER) IS 
'دالة آمنة لإعادة الكميات إلى المخزون عند حذف طلبيات نقطة البيع';

-- إنشاء دالة محسنة لتحديث المخزون (خصم أو إضافة)
CREATE OR REPLACE FUNCTION update_product_stock_safe_v3(
    p_product_id UUID,
    p_quantity_change INTEGER -- موجب للخصم، سالب للإضافة
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_organization_id UUID;
    v_operation_type TEXT;
    v_reference_type TEXT;
    v_notes TEXT;
BEGIN
    -- التحقق من صحة المعاملات
    IF p_product_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- الحصول على المخزون الحالي ومعرف المؤسسة
    SELECT stock_quantity, organization_id 
    INTO v_current_stock, v_organization_id
    FROM products
    WHERE id = p_product_id;
    
    IF v_current_stock IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- حساب المخزون الجديد
    v_new_stock := GREATEST(0, v_current_stock - p_quantity_change);
    
    -- تحديد نوع العملية
    IF p_quantity_change > 0 THEN
        v_operation_type := 'sale';
        v_reference_type := 'pos_order';
        v_notes := 'بيع من خلال نقطة البيع';
    ELSE
        v_operation_type := 'return';
        v_reference_type := 'pos_order_deletion';
        v_notes := 'إعادة مخزون بعد حذف طلبية';
    END IF;
    
    -- تحديث المخزون
    UPDATE products 
    SET stock_quantity = v_new_stock,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- إدراج سجل في inventory_log إذا كان الجدول موجود
    BEGIN
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
            ABS(p_quantity_change),
            v_current_stock,
            v_new_stock,
            v_operation_type,
            v_reference_type,
            v_notes,
            NOW()
        );
    EXCEPTION WHEN undefined_table THEN
        -- جدول inventory_log غير موجود، نتجاهل السجل
        NULL;
    END;
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION update_product_stock_safe_v3(UUID, INTEGER) IS 
'دالة محسنة لتحديث المخزون - تدعم الخصم والإضافة بناءً على إشارة الكمية'; 