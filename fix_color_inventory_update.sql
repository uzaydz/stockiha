-- إصلاح مشكلة تحديث مخزون الألوان عند شراء منتج بمقاس
-- التاريخ: 2025-01-15
-- المشكلة: عند شراء منتج بمقاس معين، يتم خصم المخزون من المقاس ولكن لا يتم تحديث كمية اللون

-- 1. إنشاء دالة مساعدة لإعادة حساب كمية اللون بناءً على مجموع المقاسات
CREATE OR REPLACE FUNCTION recalculate_color_quantity(p_color_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_quantity INTEGER := 0;
BEGIN
    -- حساب مجموع كميات جميع المقاسات لهذا اللون
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_total_quantity
    FROM product_sizes 
    WHERE color_id = p_color_id;
    
    -- تحديث كمية اللون
    UPDATE product_colors 
    SET quantity = v_total_quantity,
        updated_at = NOW()
    WHERE id = p_color_id;
    
    RAISE NOTICE '🔄 [recalculate_color_quantity] تم إعادة حساب كمية اللون % - الكمية الجديدة: %', p_color_id, v_total_quantity;
END;
$$;

-- 2. إنشاء دالة مساعدة لإعادة حساب كمية المنتج بناءً على مجموع الألوان
CREATE OR REPLACE FUNCTION recalculate_product_quantity(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_quantity INTEGER := 0;
    v_has_variants BOOLEAN := FALSE;
BEGIN
    -- التحقق من وجود متغيرات للمنتج
    SELECT has_variants INTO v_has_variants
    FROM products 
    WHERE id = p_product_id;
    
    -- إذا كان المنتج له متغيرات، احسب من مجموع الألوان
    IF v_has_variants THEN
        SELECT COALESCE(SUM(quantity), 0)
        INTO v_total_quantity
        FROM product_colors 
        WHERE product_id = p_product_id;
        
        -- تحديث كمية المنتج
        UPDATE products 
        SET stock_quantity = v_total_quantity,
            updated_at = NOW(),
            last_inventory_update = NOW()
        WHERE id = p_product_id;
        
        RAISE NOTICE '🔄 [recalculate_product_quantity] تم إعادة حساب كمية المنتج % من الألوان - الكمية الجديدة: %', p_product_id, v_total_quantity;
    END IF;
END;
$$;

-- 3. تحديث دالة bypass_rls_update_product_size_quantity لتشمل إعادة حساب اللون والمنتج
CREATE OR REPLACE FUNCTION bypass_rls_update_product_size_quantity(p_size_id UUID, p_quantity_to_reduce INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_color_id UUID;
    v_product_id UUID;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
BEGIN
    -- الحصول على معرف اللون والمنتج من المقاس
    SELECT ps.color_id, pc.product_id, ps.quantity
    INTO v_color_id, v_product_id, v_current_quantity
    FROM product_sizes ps
    JOIN product_colors pc ON ps.color_id = pc.id
    WHERE ps.id = p_size_id;
    
    IF v_color_id IS NULL THEN
        RAISE EXCEPTION 'المقاس غير موجود أو لا ينتمي لأي لون';
        RETURN;
    END IF;
    
    -- حساب الكمية الجديدة
    v_new_quantity := GREATEST(0, v_current_quantity - p_quantity_to_reduce);
    
    -- تعطيل RLS مؤقتاً
    SET row_security = off;
    
    -- تحديث كمية المقاس
    UPDATE product_sizes 
    SET quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = p_size_id;
    
    RAISE NOTICE '📏 [bypass_rls_update_product_size_quantity] تم تحديث كمية المقاس % من % إلى %', p_size_id, v_current_quantity, v_new_quantity;
    
    -- إعادة حساب كمية اللون
    PERFORM recalculate_color_quantity(v_color_id);
    
    -- إعادة حساب كمية المنتج
    PERFORM recalculate_product_quantity(v_product_id);
    
    -- إعادة تفعيل RLS
    SET row_security = on;
    
EXCEPTION WHEN OTHERS THEN
    -- إعادة تفعيل RLS في حالة الخطأ
    SET row_security = on;
    RAISE;
END;
$$;

-- 4. إضافة trigger لإعادة حساب كميات الألوان تلقائياً عند تحديث المقاسات
CREATE OR REPLACE FUNCTION trigger_recalculate_color_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- إعادة حساب كمية اللون عند تحديث أو حذف مقاس
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        PERFORM recalculate_color_quantity(OLD.color_id);
        
        -- إعادة حساب كمية المنتج أيضاً
        DECLARE
            v_product_id UUID;
        BEGIN
            SELECT product_id INTO v_product_id FROM product_colors WHERE id = OLD.color_id;
            IF v_product_id IS NOT NULL THEN
                PERFORM recalculate_product_quantity(v_product_id);
            END IF;
        END;
    END IF;
    
    -- إعادة حساب كمية اللون عند إضافة أو تحديث مقاس
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_color_quantity(NEW.color_id);
        
        -- إعادة حساب كمية المنتج أيضاً
        DECLARE
            v_product_id UUID;
        BEGIN
            SELECT product_id INTO v_product_id FROM product_colors WHERE id = NEW.color_id;
            IF v_product_id IS NOT NULL THEN
                PERFORM recalculate_product_quantity(v_product_id);
            END IF;
        END;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. إنشاء trigger على جدول product_sizes
DROP TRIGGER IF EXISTS recalculate_color_quantity_trigger ON product_sizes;
CREATE TRIGGER recalculate_color_quantity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON product_sizes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_color_quantity();

-- 6. إضافة trigger لإعادة حساب كميات المنتجات تلقائياً عند تحديث الألوان
CREATE OR REPLACE FUNCTION trigger_recalculate_product_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- إعادة حساب كمية المنتج عند تحديث أو حذف لون
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        PERFORM recalculate_product_quantity(OLD.product_id);
    END IF;
    
    -- إعادة حساب كمية المنتج عند إضافة أو تحديث لون
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_product_quantity(NEW.product_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. إنشاء trigger على جدول product_colors
DROP TRIGGER IF EXISTS recalculate_product_quantity_trigger ON product_colors;
CREATE TRIGGER recalculate_product_quantity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON product_colors
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_product_quantity();

-- 8. منح الأذونات اللازمة
GRANT EXECUTE ON FUNCTION recalculate_color_quantity(UUID) TO anon;
GRANT EXECUTE ON FUNCTION recalculate_color_quantity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_color_quantity(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION recalculate_product_quantity(UUID) TO anon;
GRANT EXECUTE ON FUNCTION recalculate_product_quantity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_product_quantity(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION bypass_rls_update_product_size_quantity(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION bypass_rls_update_product_size_quantity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_rls_update_product_size_quantity(UUID, INTEGER) TO service_role;

-- تحديث cache Supabase
NOTIFY pgrst, 'reload schema';

-- تعليق توضيحي
COMMENT ON FUNCTION recalculate_color_quantity IS 'إعادة حساب كمية اللون بناءً على مجموع كميات المقاسات';
COMMENT ON FUNCTION recalculate_product_quantity IS 'إعادة حساب كمية المنتج بناءً على مجموع كميات الألوان';
COMMENT ON FUNCTION bypass_rls_update_product_size_quantity IS 'تحديث كمية المقاس مع إعادة حساب اللون والمنتج تلقائياً'; 