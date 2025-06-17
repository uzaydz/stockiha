-- ملف إصلاح مشاكل قاعدة البيانات
-- تاريخ الإنشاء: 2024
-- الهدف: حل مشاكل Foreign Key Constraints وسياسات الأمان

-- =====================================================
-- 1. إصلاح Foreign Key Constraints للألوان
-- =====================================================

-- إصلاح جدول order_items
-- تغيير من NO ACTION إلى SET NULL لتجنب مشاكل الحذف
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_color_id_fkey;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_color_id_fkey 
FOREIGN KEY (color_id) 
REFERENCES product_colors(id) 
ON DELETE SET NULL;

-- إصلاح جدول order_items للمقاسات أيضاً
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_size_id_fkey;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_size_id_fkey 
FOREIGN KEY (size_id) 
REFERENCES product_sizes(id) 
ON DELETE SET NULL;

-- التأكد من أن online_order_items يستخدم SET NULL (يجب أن يكون صحيح بالفعل)
ALTER TABLE online_order_items 
DROP CONSTRAINT IF EXISTS fk_color_id;

ALTER TABLE online_order_items 
ADD CONSTRAINT fk_color_id 
FOREIGN KEY (color_id) 
REFERENCES product_colors(id) 
ON DELETE SET NULL;

ALTER TABLE online_order_items 
DROP CONSTRAINT IF EXISTS fk_size_id;

ALTER TABLE online_order_items 
ADD CONSTRAINT fk_size_id 
FOREIGN KEY (size_id) 
REFERENCES product_sizes(id) 
ON DELETE SET NULL;

-- =====================================================
-- 2. إصلاح سياسات الأمان لجدول product_advanced_settings
-- =====================================================

-- تفعيل Row Level Security
ALTER TABLE product_advanced_settings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة للتنظيف
DROP POLICY IF EXISTS "Allow organization members to manage advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Allow public read access to advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Enable all access for organization members" ON product_advanced_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_advanced_settings;
DROP POLICY IF EXISTS "product_advanced_settings_org_access" ON product_advanced_settings;
DROP POLICY IF EXISTS "product_advanced_settings_public_read" ON product_advanced_settings;

-- إنشاء سياسات جديدة وواضحة
-- سياسة للمصرح لهم (أعضاء المؤسسة)
CREATE POLICY "product_advanced_settings_org_members" 
ON product_advanced_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    INNER JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_advanced_settings.product_id 
    AND u.id = auth.uid()
    AND u.is_org_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    INNER JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_advanced_settings.product_id 
    AND u.id = auth.uid()
    AND u.is_org_admin = true
  )
);

-- سياسة للقراءة العامة (للعرض في الموقع)
CREATE POLICY "product_advanced_settings_public_select" 
ON product_advanced_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 3. إضافة فهارس للأداء
-- =====================================================

-- فهارس لجدول product_advanced_settings
CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_product_id 
ON product_advanced_settings(product_id);

-- فهارس لجداول الطلبات
CREATE INDEX IF NOT EXISTS idx_order_items_color_id 
ON order_items(color_id) WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_size_id 
ON order_items(size_id) WHERE size_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_order_items_color_id 
ON online_order_items(color_id) WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_order_items_size_id 
ON online_order_items(size_id) WHERE size_id IS NOT NULL;

-- =====================================================
-- 4. إنشاء دالة محسنة لحذف الألوان بأمان
-- =====================================================

CREATE OR REPLACE FUNCTION safe_delete_product_color(
    color_id_param UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_id_var UUID;
    product_org_id UUID;
    user_org_id UUID;
    colors_count INTEGER;
    is_default_color BOOLEAN;
    orders_count INTEGER;
BEGIN
    -- الحصول على معرف المنتج وحالة اللون الافتراضي
    SELECT pc.product_id, pc.is_default INTO product_id_var, is_default_color 
    FROM public.product_colors pc 
    WHERE pc.id = color_id_param;
    
    IF product_id_var IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'اللون غير موجود'
        );
    END IF;
    
    -- التحقق من الصلاحيات
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id_var;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ليس لديك صلاحية حذف ألوان هذا المنتج'
        );
    END IF;
    
    -- فحص إذا كان اللون مرتبط بطلبات
    SELECT COUNT(*) INTO orders_count 
    FROM order_items oi 
    WHERE oi.color_id = color_id_param
    
    UNION ALL
    
    SELECT COUNT(*) 
    FROM online_order_items ooi 
    WHERE ooi.color_id = color_id_param;
    
    -- إذا كان مرتبط بطلبات، نقوم بتحديث الطلبات بدلاً من الحذف
    IF orders_count > 0 THEN
        -- تحديث order_items لإزالة مرجع اللون
        UPDATE order_items 
        SET color_id = NULL, 
            color_name = COALESCE(color_name, 'لون محذوف')
        WHERE color_id = color_id_param;
        
        -- تحديث online_order_items لإزالة مرجع اللون
        UPDATE online_order_items 
        SET color_id = NULL,
            color_name = COALESCE(color_name, 'لون محذوف')
        WHERE color_id = color_id_param;
    END IF;
    
    -- حذف جميع المقاسات المرتبطة باللون أولاً
    DELETE FROM public.product_sizes WHERE color_id = color_id_param;
    
    -- حذف اللون
    DELETE FROM public.product_colors WHERE id = color_id_param;
    
    -- إذا كان اللون المحذوف هو الافتراضي، تعيين لون آخر كافتراضي
    IF is_default_color THEN
        UPDATE public.product_colors 
        SET is_default = true 
        WHERE product_id = product_id_var 
        AND id = (
            SELECT id FROM public.product_colors 
            WHERE product_id = product_id_var 
            LIMIT 1
        );
    END IF;
    
    -- التحقق من عدد الألوان المتبقية وتحديث حالة has_variants للمنتج
    SELECT COUNT(*) INTO colors_count FROM public.product_colors WHERE product_id = product_id_var;
    
    IF colors_count = 0 THEN
        UPDATE public.products SET has_variants = false WHERE id = product_id_var;
    END IF;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = product_id_var
    )
    WHERE id = product_id_var;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم حذف اللون بنجاح',
        'orders_updated', orders_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- =====================================================
-- 5. إنشاء دالة لتنظيف البيانات المعطلة
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_orders INTEGER := 0;
    cleaned_online_orders INTEGER := 0;
BEGIN
    -- تنظيف order_items التي تشير لألوان محذوفة
    UPDATE order_items 
    SET color_id = NULL, color_name = 'لون محذوف'
    WHERE color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = order_items.color_id
    );
    
    GET DIAGNOSTICS cleaned_orders = ROW_COUNT;
    
    -- تنظيف online_order_items التي تشير لألوان محذوفة
    UPDATE online_order_items 
    SET color_id = NULL, color_name = 'لون محذوف'
    WHERE color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = online_order_items.color_id
    );
    
    GET DIAGNOSTICS cleaned_online_orders = ROW_COUNT;
    
    -- تنظيف المقاسات التي تشير لألوان محذوفة
    DELETE FROM product_sizes 
    WHERE color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = product_sizes.color_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_orders', cleaned_orders,
        'cleaned_online_orders', cleaned_online_orders,
        'message', 'تم تنظيف البيانات المعطلة بنجاح'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 6. تشغيل تنظيف البيانات المعطلة
-- =====================================================

-- تشغيل دالة التنظيف
SELECT cleanup_orphaned_data();

-- =====================================================
-- 7. إضافة تعليقات توثيقية
-- =====================================================

COMMENT ON FUNCTION safe_delete_product_color(UUID) IS 'دالة آمنة لحذف ألوان المنتجات مع التعامل مع الطلبات المرتبطة';
COMMENT ON FUNCTION cleanup_orphaned_data() IS 'دالة لتنظيف البيانات المعطلة والمراجع المكسورة';

-- =====================================================
-- انتهاء ملف الإصلاحات
-- =====================================================

-- رسالة تأكيد
SELECT 'تم تطبيق جميع الإصلاحات بنجاح! ✅' AS status; 