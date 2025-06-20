-- إصلاح check constraint لجدول inventory_log
-- إضافة القيم المفقودة مثل 'manual' و 'size' و 'color' و 'simple'

-- 1. حذف القيد القديم
ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;

-- 2. إضافة القيد الجديد مع جميع القيم المطلوبة
ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
CHECK (type IN (
    'purchase',     -- شراء
    'sale',         -- بيع
    'adjustment',   -- تعديل
    'return',       -- مرتجع
    'loss',         -- فقدان
    'online_order', -- طلب إلكتروني
    'manual',       -- تحديث يدوي
    'transfer',     -- تحويل
    'production',   -- إنتاج
    'damaged',      -- تلف
    'expired',      -- منتهي الصلاحية
    'pos_sale'      -- بيع نقطة البيع
));

-- 3. إصلاح دالة update_variant_inventory مع القيمة الصحيحة
DROP FUNCTION IF EXISTS update_variant_inventory(uuid, uuid, integer, uuid, uuid, varchar, text);

CREATE OR REPLACE FUNCTION update_variant_inventory(
    p_organization_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_updated_by UUID,
    p_variant_id UUID DEFAULT NULL,
    p_operation_type VARCHAR(50) DEFAULT 'manual', -- 'manual' الآن مسموحة
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_quantity INTEGER,
    new_quantity INTEGER,
    affected_levels JSONB
) 
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_old_quantity INTEGER := 0;
    v_old_color_quantity INTEGER := 0;
    v_old_product_quantity INTEGER := 0;
    v_affected_levels JSONB := '{}'::jsonb;
    v_variant_type VARCHAR(20);
    v_color_id UUID;
    v_size_id UUID;
    v_reference_id UUID;
BEGIN
    -- التحقق من صحة operation_type
    IF p_operation_type NOT IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'manual', 'transfer', 'production', 'damaged', 'expired', 'pos_sale') THEN
        RETURN QUERY SELECT false, format('نوع العملية غير صالح: %s', p_operation_type)::TEXT, 0, 0, '{}'::jsonb;
        RETURN;
    END IF;

    -- التحقق من وجود المنتج والصلاحيات
    SELECT p.*, p.stock_quantity as current_stock
    INTO v_product
    FROM products p
    WHERE p.id = p_product_id 
    AND p.organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'المنتج غير موجود أو ليس لديك صلاحية للوصول إليه'::TEXT, 0, 0, '{}'::jsonb;
        RETURN;
    END IF;
    
    v_old_product_quantity := v_product.current_stock;
    
    -- تحديد نوع المتغير ومعالجته
    IF p_variant_id IS NULL THEN
        -- منتج بسيط (بدون متغيرات)
        IF v_product.has_variants THEN
            RETURN QUERY SELECT false, 'هذا المنتج له متغيرات، يجب تحديد المتغير المطلوب'::TEXT, 0, 0, '{}'::jsonb;
            RETURN;
        END IF;
        
        v_variant_type := 'simple';
        v_old_quantity := v_product.current_stock;
        v_reference_id := p_product_id;
        
        -- تحديث المنتج الأساسي
        UPDATE products 
        SET 
            stock_quantity = p_new_quantity,
            last_inventory_update = NOW(),
            updated_by_user_id = p_updated_by
        WHERE id = p_product_id;
        
        v_affected_levels := jsonb_build_object(
            'product_level', jsonb_build_object(
                'old_quantity', v_old_quantity,
                'new_quantity', p_new_quantity
            )
        );
        
    ELSE
        -- منتج بمتغيرات - تحديد نوع المتغير
        IF EXISTS (SELECT 1 FROM product_sizes WHERE id = p_variant_id) THEN
            -- المتغير هو مقاس
            v_variant_type := 'size';
            
            SELECT ps.quantity, ps.color_id
            INTO v_old_quantity, v_color_id
            FROM product_sizes ps
            JOIN product_colors pc ON ps.color_id = pc.id
            WHERE ps.id = p_variant_id 
            AND pc.product_id = p_product_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, 'المقاس غير موجود أو لا ينتمي للمنتج المحدد'::TEXT, 0, 0, '{}'::jsonb;
                RETURN;
            END IF;
            
            SELECT quantity INTO v_old_color_quantity FROM product_colors WHERE id = v_color_id;
            v_size_id := p_variant_id;
            v_reference_id := p_variant_id;
            
            -- تحديث المقاس
            UPDATE product_sizes 
            SET quantity = p_new_quantity, updated_at = NOW()
            WHERE id = p_variant_id;
            
            -- إعادة حساب كمية اللون
            UPDATE product_colors 
            SET quantity = (
                SELECT COALESCE(SUM(ps.quantity), 0)
                FROM product_sizes ps 
                WHERE ps.color_id = v_color_id
            ),
            updated_at = NOW()
            WHERE id = v_color_id;
            
            v_affected_levels := jsonb_build_object(
                'size_level', jsonb_build_object(
                    'size_id', v_size_id,
                    'old_quantity', v_old_quantity,
                    'new_quantity', p_new_quantity
                ),
                'color_level', jsonb_build_object(
                    'color_id', v_color_id,
                    'old_quantity', v_old_color_quantity,
                    'new_quantity', (SELECT quantity FROM product_colors WHERE id = v_color_id)
                )
            );
            
        ELSIF EXISTS (SELECT 1 FROM product_colors WHERE id = p_variant_id) THEN
            -- المتغير هو لون
            v_variant_type := 'color';
            
            SELECT pc.quantity
            INTO v_old_quantity
            FROM product_colors pc
            WHERE pc.id = p_variant_id 
            AND pc.product_id = p_product_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, 'اللون غير موجود أو لا ينتمي للمنتج المحدد'::TEXT, 0, 0, '{}'::jsonb;
                RETURN;
            END IF;
            
            v_color_id := p_variant_id;
            v_reference_id := p_variant_id;
            
            -- تحديث اللون
            UPDATE product_colors 
            SET quantity = p_new_quantity, updated_at = NOW()
            WHERE id = p_variant_id;
            
            -- إذا كان اللون له مقاسات، تحديث كمياتها بالتوزيع المتناسب
            IF EXISTS (SELECT 1 FROM product_sizes WHERE color_id = p_variant_id) THEN
                UPDATE product_sizes 
                SET quantity = CASE 
                    WHEN v_old_quantity = 0 THEN p_new_quantity / (SELECT COUNT(*) FROM product_sizes WHERE color_id = p_variant_id)
                    ELSE ROUND((quantity::NUMERIC / v_old_quantity) * p_new_quantity)
                END,
                updated_at = NOW()
                WHERE color_id = p_variant_id;
            END IF;
            
            v_affected_levels := jsonb_build_object(
                'color_level', jsonb_build_object(
                    'color_id', v_color_id,
                    'old_quantity', v_old_quantity,
                    'new_quantity', p_new_quantity
                )
            );
            
        ELSE
            RETURN QUERY SELECT false, 'المتغير المحدد غير موجود'::TEXT, 0, 0, '{}'::jsonb;
            RETURN;
        END IF;
        
        -- إعادة حساب الكمية الإجمالية للمنتج
        UPDATE products 
        SET 
            stock_quantity = (
                SELECT COALESCE(SUM(pc.quantity), 0)
                FROM product_colors pc 
                WHERE pc.product_id = p_product_id
            ),
            last_inventory_update = NOW(),
            updated_by_user_id = p_updated_by
        WHERE id = p_product_id;
        
        v_affected_levels := v_affected_levels || jsonb_build_object(
            'product_level', jsonb_build_object(
                'old_quantity', v_old_product_quantity,
                'new_quantity', (SELECT stock_quantity FROM products WHERE id = p_product_id)
            )
        );
    END IF;
    
    -- تسجيل العملية في سجل المخزون مع التأكد من صحة القيم
    BEGIN
        INSERT INTO inventory_log (
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_id,
            reference_type,
            notes,
            created_by,
            organization_id
        ) VALUES (
            p_product_id,
            p_new_quantity - v_old_quantity,
            v_old_quantity,
            p_new_quantity,
            p_operation_type, -- الآن مضمون أن يكون صالحاً
            v_reference_id,
            v_variant_type,
            COALESCE(p_notes, format('تحديث مخزون %s', v_variant_type)),
            p_updated_by,
            p_organization_id
        );
    EXCEPTION
        WHEN check_violation THEN
            RETURN QUERY SELECT false, format('خطأ في تسجيل المخزون: نوع العملية غير صالح - %s', p_operation_type)::TEXT, 0, 0, '{}'::jsonb;
            RETURN;
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, format('خطأ في تسجيل المخزون: %s', SQLERRM)::TEXT, 0, 0, '{}'::jsonb;
            RETURN;
    END;
    
    RETURN QUERY SELECT 
        true as success,
        format('تم تحديث المخزون بنجاح من %s إلى %s', v_old_quantity, p_new_quantity)::TEXT as message,
        v_old_quantity,
        p_new_quantity,
        v_affected_levels;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, format('خطأ عام: %s', SQLERRM)::TEXT, 0, 0, '{}'::jsonb;
END;
$$;

-- 4. منح الصلاحيات
GRANT EXECUTE ON FUNCTION update_variant_inventory(UUID, UUID, INTEGER, UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- 5. التحقق من تطبيق التحديث
DO $$
DECLARE
    constraint_info TEXT;
BEGIN
    -- التحقق من وجود القيد الجديد
    SELECT pg_get_constraintdef(oid) INTO constraint_info
    FROM pg_constraint 
    WHERE conname = 'inventory_log_type_check';
    
    IF constraint_info IS NOT NULL THEN
        RAISE NOTICE 'تم تحديث قيد inventory_log_type_check بنجاح: %', constraint_info;
    ELSE
        RAISE NOTICE 'خطأ: لم يتم العثور على قيد inventory_log_type_check';
    END IF;
END;
$$;

-- 6. إضافة تعليق
COMMENT ON FUNCTION update_variant_inventory IS 'دالة مُصححة لتحديث مخزون المتغيرات مع check constraint محدث للـ inventory_log'; 