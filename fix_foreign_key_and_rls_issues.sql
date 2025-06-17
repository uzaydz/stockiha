-- ملف إصلاح مشاكل قاعدة البيانات - إصدار جديد
-- تاريخ الإنشاء: 2024-12-19
-- الهدف: حل مشاكل Foreign Key Constraints وسياسات الأمان RLS
-- المشاكل المستهدفة:
-- 1. خطأ حذف الألوان المرتبطة بالطلبات (Foreign Key Constraint)
-- 2. مشكلة الوصول لجدول product_advanced_settings (406 Not Acceptable)

-- =====================================================
-- 1. إصلاح Foreign Key Constraints للألوان والمقاسات
-- =====================================================

-- إصلاح جدول order_items - الألوان
-- تغيير من NO ACTION إلى SET NULL لتجنب مشاكل الحذف
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_color_id_fkey;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_color_id_fkey 
FOREIGN KEY (color_id) 
REFERENCES product_colors(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- إصلاح جدول order_items - المقاسات
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_size_id_fkey;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_size_id_fkey 
FOREIGN KEY (size_id) 
REFERENCES product_sizes(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- التأكد من إصلاح online_order_items - الألوان
ALTER TABLE online_order_items 
DROP CONSTRAINT IF EXISTS fk_color_id;

ALTER TABLE online_order_items 
ADD CONSTRAINT fk_color_id 
FOREIGN KEY (color_id) 
REFERENCES product_colors(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- التأكد من إصلاح online_order_items - المقاسات
ALTER TABLE online_order_items 
DROP CONSTRAINT IF EXISTS fk_size_id;

ALTER TABLE online_order_items 
ADD CONSTRAINT fk_size_id 
FOREIGN KEY (size_id) 
REFERENCES product_sizes(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- =====================================================
-- 2. إصلاح سياسات الأمان لجدول product_advanced_settings
-- =====================================================

-- تفعيل Row Level Security
ALTER TABLE product_advanced_settings ENABLE ROW LEVEL SECURITY;

-- حذف جميع السياسات الموجودة للتنظيف
DROP POLICY IF EXISTS "Allow organization members to manage advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Allow public read access to advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Enable all access for organization members" ON product_advanced_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_advanced_settings;
DROP POLICY IF EXISTS "product_advanced_settings_org_access" ON product_advanced_settings;
DROP POLICY IF EXISTS "product_advanced_settings_public_read" ON product_advanced_settings;
DROP POLICY IF EXISTS "product_advanced_settings_org_members" ON product_advanced_settings;
DROP POLICY IF EXISTS "product_advanced_settings_public_select" ON product_advanced_settings;

-- إنشاء سياسة للمصرح لهم (أعضاء المؤسسة المسؤولين)
CREATE POLICY "advanced_settings_org_admin_access" 
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

-- إنشاء سياسة للقراءة العامة (للعرض في الموقع)
CREATE POLICY "advanced_settings_public_read" 
ON product_advanced_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 3. إضافة فهارس محسنة للأداء
-- =====================================================

-- فهارس لجدول product_advanced_settings
CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_product_id 
ON product_advanced_settings(product_id);

-- فهارس لجداول الطلبات مع شروط
CREATE INDEX IF NOT EXISTS idx_order_items_color_id_not_null 
ON order_items(color_id) WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_size_id_not_null 
ON order_items(size_id) WHERE size_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_order_items_color_id_not_null 
ON online_order_items(color_id) WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_order_items_size_id_not_null 
ON online_order_items(size_id) WHERE size_id IS NOT NULL;

-- فهارس مركبة لتحسين الاستعلامات
CREATE INDEX IF NOT EXISTS idx_order_items_product_color 
ON order_items(product_id, color_id) WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_order_items_product_color 
ON online_order_items(product_id, color_id) WHERE color_id IS NOT NULL;

-- =====================================================
-- 4. إنشاء دالة محسنة لحذف الألوان بأمان
-- =====================================================

CREATE OR REPLACE FUNCTION safe_delete_product_color_v2(
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
    orders_count INTEGER := 0;
    online_orders_count INTEGER := 0;
    color_name_var TEXT;
BEGIN
    -- الحصول على معلومات اللون
    SELECT pc.product_id, pc.is_default, pc.name 
    INTO product_id_var, is_default_color, color_name_var
    FROM public.product_colors pc 
    WHERE pc.id = color_id_param;
    
    IF product_id_var IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'اللون غير موجود'
        );
    END IF;
    
    -- التحقق من الصلاحيات
    SELECT organization_id INTO product_org_id 
    FROM public.products WHERE id = product_id_var;
    
    SELECT organization_id INTO user_org_id 
    FROM public.users 
    WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ليس لديك صلاحية حذف ألوان هذا المنتج'
        );
    END IF;
    
    -- فحص الطلبات المرتبطة
    SELECT COUNT(*) INTO orders_count 
    FROM order_items oi 
    WHERE oi.color_id = color_id_param;
    
    SELECT COUNT(*) INTO online_orders_count 
    FROM online_order_items ooi 
    WHERE ooi.color_id = color_id_param;
    
    -- تحديث الطلبات المرتبطة قبل الحذف
    IF orders_count > 0 THEN
        UPDATE order_items 
        SET color_id = NULL, 
            color_name = COALESCE(color_name, color_name_var, 'لون محذوف')
        WHERE color_id = color_id_param;
    END IF;
    
    IF online_orders_count > 0 THEN
        UPDATE online_order_items 
        SET color_id = NULL,
            color_name = COALESCE(color_name, color_name_var, 'لون محذوف')
        WHERE color_id = color_id_param;
    END IF;
    
    -- حذف المقاسات المرتبطة أولاً
    DELETE FROM public.product_sizes WHERE color_id = color_id_param;
    
    -- حذف اللون
    DELETE FROM public.product_colors WHERE id = color_id_param;
    
    -- إدارة اللون الافتراضي
    IF is_default_color THEN
        UPDATE public.product_colors 
        SET is_default = true 
        WHERE product_id = product_id_var 
        AND id = (
            SELECT id FROM public.product_colors 
            WHERE product_id = product_id_var 
            ORDER BY created_at ASC
            LIMIT 1
        );
    END IF;
    
    -- تحديث حالة المنتج
    SELECT COUNT(*) INTO colors_count 
    FROM public.product_colors 
    WHERE product_id = product_id_var;
    
    IF colors_count = 0 THEN
        UPDATE public.products 
        SET has_variants = false 
        WHERE id = product_id_var;
    END IF;
    
    -- تحديث كمية المنتج
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
        'color_name', color_name_var,
        'orders_updated', orders_count,
        'online_orders_updated', online_orders_count,
        'remaining_colors', colors_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'hint', 'تأكد من وجود الصلاحيات المناسبة'
    );
END;
$$;

-- =====================================================
-- 5. إنشاء دالة لتنظيف البيانات المعطلة والمراجع المكسورة
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_broken_references()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_orders INTEGER := 0;
    cleaned_online_orders INTEGER := 0;
    cleaned_sizes INTEGER := 0;
    cleaned_order_sizes INTEGER := 0;
    cleaned_online_order_sizes INTEGER := 0;
BEGIN
    -- تنظيف order_items التي تشير لألوان محذوفة
    UPDATE order_items 
    SET color_id = NULL, 
        color_name = COALESCE(color_name, 'لون محذوف')
    WHERE color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = order_items.color_id
    );
    
    GET DIAGNOSTICS cleaned_orders = ROW_COUNT;
    
    -- تنظيف online_order_items التي تشير لألوان محذوفة
    UPDATE online_order_items 
    SET color_id = NULL, 
        color_name = COALESCE(color_name, 'لون محذوف')
    WHERE color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = online_order_items.color_id
    );
    
    GET DIAGNOSTICS cleaned_online_orders = ROW_COUNT;
    
    -- تنظيف order_items التي تشير لمقاسات محذوفة
    UPDATE order_items 
    SET size_id = NULL, 
        size_name = COALESCE(size_name, 'مقاس محذوف')
    WHERE size_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_sizes ps WHERE ps.id = order_items.size_id
    );
    
    GET DIAGNOSTICS cleaned_order_sizes = ROW_COUNT;
    
    -- تنظيف online_order_items التي تشير لمقاسات محذوفة
    UPDATE online_order_items 
    SET size_id = NULL, 
        size_name = COALESCE(size_name, 'مقاس محذوف')
    WHERE size_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_sizes ps WHERE ps.id = online_order_items.size_id
    );
    
    GET DIAGNOSTICS cleaned_online_order_sizes = ROW_COUNT;
    
    -- حذف المقاسات التي تشير لألوان محذوفة
    DELETE FROM product_sizes 
    WHERE color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = product_sizes.color_id
    );
    
    GET DIAGNOSTICS cleaned_sizes = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_orders_colors', cleaned_orders,
        'cleaned_online_orders_colors', cleaned_online_orders,
        'cleaned_orders_sizes', cleaned_order_sizes,
        'cleaned_online_orders_sizes', cleaned_online_order_sizes,
        'cleaned_orphaned_sizes', cleaned_sizes,
        'message', 'تم تنظيف جميع البيانات المعطلة بنجاح'
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
-- 6. إنشاء دالة للتحقق من سلامة البيانات
-- =====================================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    broken_color_refs INTEGER := 0;
    broken_size_refs INTEGER := 0;
    broken_online_color_refs INTEGER := 0;
    broken_online_size_refs INTEGER := 0;
    orphaned_sizes INTEGER := 0;
BEGIN
    -- فحص المراجع المكسورة في order_items
    SELECT COUNT(*) INTO broken_color_refs
    FROM order_items oi
    WHERE oi.color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = oi.color_id
    );
    
    SELECT COUNT(*) INTO broken_size_refs
    FROM order_items oi
    WHERE oi.size_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_sizes ps WHERE ps.id = oi.size_id
    );
    
    -- فحص المراجع المكسورة في online_order_items
    SELECT COUNT(*) INTO broken_online_color_refs
    FROM online_order_items ooi
    WHERE ooi.color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = ooi.color_id
    );
    
    SELECT COUNT(*) INTO broken_online_size_refs
    FROM online_order_items ooi
    WHERE ooi.size_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_sizes ps WHERE ps.id = ooi.size_id
    );
    
    -- فحص المقاسات المعطلة
    SELECT COUNT(*) INTO orphaned_sizes
    FROM product_sizes ps
    WHERE ps.color_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM product_colors pc WHERE pc.id = ps.color_id
    );
    
    RETURN jsonb_build_object(
        'broken_order_color_refs', broken_color_refs,
        'broken_order_size_refs', broken_size_refs,
        'broken_online_order_color_refs', broken_online_color_refs,
        'broken_online_order_size_refs', broken_online_size_refs,
        'orphaned_sizes', orphaned_sizes,
        'total_issues', broken_color_refs + broken_size_refs + broken_online_color_refs + broken_online_size_refs + orphaned_sizes,
        'status', CASE 
            WHEN (broken_color_refs + broken_size_refs + broken_online_color_refs + broken_online_size_refs + orphaned_sizes) = 0 
            THEN 'سليم ✅' 
            ELSE 'يحتاج تنظيف ⚠️' 
        END
    );
END;
$$;

-- =====================================================
-- 7. تشغيل عمليات التنظيف والتحقق
-- =====================================================

-- تشغيل فحص سلامة البيانات قبل التنظيف
SELECT 'فحص سلامة البيانات قبل التنظيف:' AS step, check_data_integrity() AS result;

-- تشغيل دالة التنظيف
SELECT 'نتائج التنظيف:' AS step, cleanup_broken_references() AS result;

-- تشغيل فحص سلامة البيانات بعد التنظيف
SELECT 'فحص سلامة البيانات بعد التنظيف:' AS step, check_data_integrity() AS result;

-- =====================================================
-- 8. إضافة تعليقات توثيقية
-- =====================================================

COMMENT ON FUNCTION safe_delete_product_color_v2(UUID) IS 'دالة محسنة لحذف ألوان المنتجات بأمان مع التعامل مع الطلبات المرتبطة';
COMMENT ON FUNCTION cleanup_broken_references() IS 'دالة شاملة لتنظيف جميع المراجع المكسورة في قاعدة البيانات';
COMMENT ON FUNCTION check_data_integrity() IS 'دالة للتحقق من سلامة البيانات وكشف المراجع المكسورة';

-- =====================================================
-- 9. إنشاء منظر لمراقبة سلامة البيانات
-- =====================================================

CREATE OR REPLACE VIEW data_integrity_monitor AS
SELECT 
    'order_items_broken_colors' AS issue_type,
    COUNT(*) AS count,
    'order_items تشير لألوان محذوفة' AS description
FROM order_items oi
WHERE oi.color_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM product_colors pc WHERE pc.id = oi.color_id)

UNION ALL

SELECT 
    'order_items_broken_sizes' AS issue_type,
    COUNT(*) AS count,
    'order_items تشير لمقاسات محذوفة' AS description
FROM order_items oi
WHERE oi.size_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM product_sizes ps WHERE ps.id = oi.size_id)

UNION ALL

SELECT 
    'online_order_items_broken_colors' AS issue_type,
    COUNT(*) AS count,
    'online_order_items تشير لألوان محذوفة' AS description
FROM online_order_items ooi
WHERE ooi.color_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM product_colors pc WHERE pc.id = ooi.color_id)

UNION ALL

SELECT 
    'online_order_items_broken_sizes' AS issue_type,
    COUNT(*) AS count,
    'online_order_items تشير لمقاسات محذوفة' AS description
FROM online_order_items ooi
WHERE ooi.size_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM product_sizes ps WHERE ps.id = ooi.size_id)

UNION ALL

SELECT 
    'orphaned_sizes' AS issue_type,
    COUNT(*) AS count,
    'مقاسات تشير لألوان محذوفة' AS description
FROM product_sizes ps
WHERE ps.color_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM product_colors pc WHERE pc.id = ps.color_id);

-- =====================================================
-- انتهاء ملف الإصلاحات
-- =====================================================

-- رسالة تأكيد نهائية
SELECT 
    '🎉 تم تطبيق جميع الإصلاحات بنجاح!' AS status,
    'يمكنك الآن حذف الألوان بأمان دون مشاكل Foreign Key' AS message,
    'استخدم SELECT * FROM data_integrity_monitor; لمراقبة سلامة البيانات' AS tip; 