-- إصلاح البيانات الموجودة في inventory_log وتحديث check constraint
-- هذا السكريبت سيتعامل مع البيانات الموجودة قبل إضافة القيد الجديد

-- 1. أولاً، دعنا نرى ما هي القيم الموجودة في العمود type
DO $$
DECLARE
    type_values TEXT;
BEGIN
    -- جمع جميع القيم الفريدة في العمود type
    SELECT string_agg(DISTINCT type, ', ') INTO type_values
    FROM inventory_log;
    
    RAISE NOTICE 'القيم الموجودة حالياً في inventory_log.type: %', COALESCE(type_values, 'لا توجد بيانات');
END;
$$;

-- 2. حذف القيد القديم أولاً
ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;

-- 3. تنظيف البيانات الموجودة - تحديث القيم غير الصالحة
UPDATE inventory_log 
SET type = CASE 
    -- تحويل القيم الشائعة إلى القيم الصحيحة
    WHEN type = 'sold' THEN 'sale'
    WHEN type = 'purchased' THEN 'purchase'
    WHEN type = 'returned' THEN 'return'
    WHEN type = 'adjusted' THEN 'adjustment'
    WHEN type = 'lost' THEN 'loss'
    WHEN type = 'manual_update' THEN 'manual'
    WHEN type = 'pos' THEN 'pos_sale'
    WHEN type = 'online' THEN 'online_order'
    WHEN type = 'damaged_goods' THEN 'damaged'
    WHEN type = 'expired_goods' THEN 'expired'
    WHEN type = 'stock_transfer' THEN 'transfer'
    WHEN type = 'production_add' THEN 'production'
    WHEN type = 'inventory_adjustment' THEN 'adjustment'
    
    -- إذا كانت القيمة NULL أو فارغة، اجعلها 'manual'
    WHEN type IS NULL OR type = '' THEN 'manual'
    
    -- إذا كانت القيمة صحيحة بالفعل، اتركها كما هي
    WHEN type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'manual', 'transfer', 'production', 'damaged', 'expired', 'pos_sale') 
    THEN type
    
    -- إذا لم تتطابق مع أي شيء، اجعلها 'manual'
    ELSE 'manual'
END
WHERE type NOT IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'manual', 'transfer', 'production', 'damaged', 'expired', 'pos_sale')
   OR type IS NULL;

-- 4. التحقق من تنظيف البيانات
DO $$
DECLARE
    invalid_count INTEGER;
    type_values TEXT;
BEGIN
    -- عدد السجلات التي لا تزال تحتوي على قيم غير صالحة
    SELECT COUNT(*) INTO invalid_count
    FROM inventory_log 
    WHERE type NOT IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'manual', 'transfer', 'production', 'damaged', 'expired', 'pos_sale')
       OR type IS NULL;
    
    -- جمع القيم الفريدة بعد التنظيف
    SELECT string_agg(DISTINCT type, ', ') INTO type_values
    FROM inventory_log;
    
    RAISE NOTICE 'بعد التنظيف - عدد السجلات ذات القيم غير الصالحة: %', invalid_count;
    RAISE NOTICE 'القيم الموجودة بعد التنظيف: %', COALESCE(type_values, 'لا توجد بيانات');
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'تحذير: لا تزال هناك % سجلات بقيم غير صالحة', invalid_count;
    ELSE
        RAISE NOTICE 'تم تنظيف جميع البيانات بنجاح ✓';
    END IF;
END;
$$;

-- 5. الآن يمكننا إضافة القيد الجديد بأمان
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

-- 6. إصلاح دالة update_variant_inventory
DROP FUNCTION IF EXISTS update_variant_inventory(uuid, uuid, integer, uuid, uuid, varchar, text);

CREATE OR REPLACE FUNCTION update_variant_inventory(
    p_organization_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_updated_by UUID,
    p_variant_id UUID DEFAULT NULL,
    p_operation_type VARCHAR(50) DEFAULT 'manual',
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
    v_safe_operation_type VARCHAR(50);
BEGIN
    -- التأكد من أن operation_type صالح
    v_safe_operation_type := CASE 
        WHEN p_operation_type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'manual', 'transfer', 'production', 'damaged', 'expired', 'pos_sale') 
        THEN p_operation_type
        ELSE 'manual' -- قيمة افتراضية آمنة
    END;

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
    
    -- تسجيل العملية في سجل المخزون بأمان
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
            v_safe_operation_type, -- استخدام القيمة الآمنة
            v_reference_id,
            v_variant_type,
            COALESCE(p_notes, format('تحديث مخزون %s', v_variant_type)),
            p_updated_by,
            p_organization_id
        );
    EXCEPTION
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

-- 7. منح الصلاحيات
GRANT EXECUTE ON FUNCTION update_variant_inventory(UUID, UUID, INTEGER, UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- 8. التحقق النهائي
DO $$
DECLARE
    constraint_info TEXT;
    record_count INTEGER;
BEGIN
    -- التحقق من وجود القيد
    SELECT pg_get_constraintdef(oid) INTO constraint_info
    FROM pg_constraint 
    WHERE conname = 'inventory_log_type_check';
    
    -- عدد السجلات في الجدول
    SELECT COUNT(*) INTO record_count FROM inventory_log;
    
    IF constraint_info IS NOT NULL THEN
        RAISE NOTICE 'تم إنشاء قيد inventory_log_type_check بنجاح ✓';
        RAISE NOTICE 'عدد السجلات في inventory_log: %', record_count;
        RAISE NOTICE 'تعريف القيد: %', constraint_info;
    ELSE
        RAISE NOTICE 'خطأ: لم يتم إنشاء القيد ✗';
    END IF;
END;
$$;

-- 9. إضافة تعليق
COMMENT ON FUNCTION update_variant_inventory IS 'دالة محسنة لتحديث مخزون المتغيرات مع تنظيف البيانات وحماية من الأخطاء'; 