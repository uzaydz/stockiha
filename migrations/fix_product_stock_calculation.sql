-- دالة لإصلاح حساب المخزون في جميع المنتجات
-- Created: 2024-12-19

-- دالة لإصلاح حساب المخزون في منتج واحد
CREATE OR REPLACE FUNCTION public.fix_product_stock_calculation(
    p_product_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_calculated_stock INTEGER;
    v_current_stock INTEGER;
    v_colors_count INTEGER;
    v_sizes_count INTEGER;
BEGIN
    -- التحقق من وجود المنتج
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;
    
    -- حساب عدد الألوان والمقاسات
    SELECT 
        COUNT(DISTINCT pc.id) as colors_count,
        COUNT(ps.id) as sizes_count
    INTO v_colors_count, v_sizes_count
    FROM public.products p
    LEFT JOIN public.product_colors pc ON p.id = pc.product_id
    LEFT JOIN public.product_sizes ps ON pc.id = ps.color_id
    WHERE p.id = p_product_id
    GROUP BY p.id;
    
    -- إذا كان المنتج يستخدم المقاسات، احسب من المقاسات
    IF v_sizes_count > 0 THEN
        -- حساب المخزون من المقاسات
        SELECT COALESCE(SUM(ps.quantity), 0)
        INTO v_calculated_stock
        FROM public.products p
        LEFT JOIN public.product_colors pc ON p.id = pc.product_id
        LEFT JOIN public.product_sizes ps ON pc.id = ps.color_id
        WHERE p.id = p_product_id;
        
        -- تحديث كمية الألوان بناءً على المقاسات
        UPDATE public.product_colors 
        SET quantity = (
            SELECT COALESCE(SUM(ps.quantity), 0)
            FROM public.product_sizes ps
            WHERE ps.color_id = product_colors.id
        )
        WHERE product_id = p_product_id;
        
    ELSIF v_colors_count > 0 THEN
        -- حساب المخزون من الألوان مباشرة
        SELECT COALESCE(SUM(pc.quantity), 0)
        INTO v_calculated_stock
        FROM public.product_colors pc
        WHERE pc.product_id = p_product_id;
        
    ELSE
        -- المنتج لا يحتوي على ألوان أو مقاسات، لا تغير المخزون
        SELECT stock_quantity INTO v_calculated_stock
        FROM public.products
        WHERE id = p_product_id;
        
        RAISE NOTICE 'المنتج % لا يحتوي على ألوان أو مقاسات، لن يتم تغيير المخزون', p_product_id;
    END IF;
    
    -- الحصول على المخزون الحالي
    SELECT stock_quantity INTO v_current_stock
    FROM public.products
    WHERE id = p_product_id;
    
    -- تحديث المخزون إذا كان مختلفاً
    IF v_calculated_stock != v_current_stock THEN
        UPDATE public.products 
        SET 
            stock_quantity = v_calculated_stock,
            updated_at = NOW()
        WHERE id = p_product_id;
        
        RAISE NOTICE 'تم إصلاح المخزون للمنتج %: من % إلى %', p_product_id, v_current_stock, v_calculated_stock;
    ELSE
        RAISE NOTICE 'المخزون صحيح للمنتج %: %', p_product_id, v_current_stock;
    END IF;
    
    RETURN true;
END;
$$;

-- دالة لإصلاح حساب المخزون في جميع المنتجات
CREATE OR REPLACE FUNCTION public.fix_all_products_stock_calculation()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_fixed_count INTEGER := 0;
BEGIN
    FOR v_product IN 
        SELECT id FROM public.products 
        WHERE organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND is_org_admin = true
        )
    LOOP
        BEGIN
            PERFORM public.fix_product_stock_calculation(v_product.id);
            v_fixed_count := v_fixed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'خطأ في إصلاح المخزون للمنتج %: %', v_product.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'تم إصلاح المخزون في % منتج', v_fixed_count;
    RETURN v_fixed_count;
END;
$$;

-- دالة لفحص المخزون في منتج واحد
CREATE OR REPLACE FUNCTION public.check_product_stock_calculation(
    p_product_id UUID
) RETURNS TABLE(
    product_name TEXT,
    current_stock INTEGER,
    calculated_stock INTEGER,
    colors_count INTEGER,
    sizes_count INTEGER,
    needs_fix BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_calculated_stock INTEGER;
    v_current_stock INTEGER;
    v_colors_count INTEGER;
    v_sizes_count INTEGER;
    v_product_name TEXT;
BEGIN
    -- الحصول على معلومات المنتج
    SELECT 
        p.name,
        p.stock_quantity,
        COUNT(DISTINCT pc.id) as colors_count,
        COUNT(ps.id) as sizes_count
    INTO v_product_name, v_current_stock, v_colors_count, v_sizes_count
    FROM public.products p
    LEFT JOIN public.product_colors pc ON p.id = pc.product_id
    LEFT JOIN public.product_sizes ps ON pc.id = ps.color_id
    WHERE p.id = p_product_id
    GROUP BY p.id, p.name, p.stock_quantity;
    
    -- حساب المخزون الصحيح
    IF v_sizes_count > 0 THEN
        -- حساب من المقاسات
        SELECT COALESCE(SUM(ps.quantity), 0)
        INTO v_calculated_stock
        FROM public.products p
        LEFT JOIN public.product_colors pc ON p.id = pc.product_id
        LEFT JOIN public.product_sizes ps ON pc.id = ps.color_id
        WHERE p.id = p_product_id;
    ELSIF v_colors_count > 0 THEN
        -- حساب من الألوان
        SELECT COALESCE(SUM(pc.quantity), 0)
        INTO v_calculated_stock
        FROM public.product_colors pc
        WHERE pc.product_id = p_product_id;
    ELSE
        -- المنتج لا يحتوي على ألوان أو مقاسات، المخزون الحالي صحيح
        v_calculated_stock := v_current_stock;
    END IF;
    
    RETURN QUERY
    SELECT 
        v_product_name,
        v_current_stock,
        v_calculated_stock,
        v_colors_count,
        v_sizes_count,
        (v_current_stock != v_calculated_stock) as needs_fix;
END;
$$; 