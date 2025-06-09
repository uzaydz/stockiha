-- =========================================
-- دالة محسنة لجلب المنتجات مع البحث والفلترة
-- للاستخدام في صفحة طباعة الباركود السريعة
-- =========================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_products_for_barcode_printing_enhanced(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER);

-- إنشاء الدالة المحسنة
CREATE OR REPLACE FUNCTION get_products_for_barcode_printing_enhanced(
    p_organization_id UUID DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'name',
    p_sort_order TEXT DEFAULT 'asc',
    p_stock_filter TEXT DEFAULT 'all',
    p_price_min NUMERIC DEFAULT NULL,
    p_price_max NUMERIC DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    product_price NUMERIC,
    product_sku TEXT,
    product_barcode TEXT,
    stock_quantity INTEGER,
    product_slug TEXT,
    organization_name TEXT,
    organization_domain TEXT,
    organization_subdomain TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_org_id UUID;
    search_condition TEXT := '';
    stock_condition TEXT := '';
    price_condition TEXT := '';
    order_clause TEXT;
    final_query TEXT;
BEGIN
    -- التحقق من هوية المستخدم والحصول على معرف المؤسسة
    IF p_organization_id IS NULL THEN
        SELECT organization_id INTO user_org_id 
        FROM users 
        WHERE id = auth.uid();
        
        IF user_org_id IS NULL THEN
            RAISE EXCEPTION 'لا يمكن تحديد المؤسسة للمستخدم الحالي';
        END IF;
        
        p_organization_id := user_org_id;
    END IF;
    
    -- بناء شرط البحث
    IF p_search_query IS NOT NULL AND trim(p_search_query) != '' THEN
        search_condition := format('
            AND (
                LOWER(p.name) LIKE LOWER(%L) OR 
                LOWER(p.sku) LIKE LOWER(%L) OR 
                LOWER(COALESCE(p.barcode, '''')) LIKE LOWER(%L)
            )', 
            '%' || trim(p_search_query) || '%',
            '%' || trim(p_search_query) || '%',
            '%' || trim(p_search_query) || '%'
        );
    END IF;
    
    -- بناء شرط فلتر المخزون
    CASE p_stock_filter
        WHEN 'in_stock' THEN
            stock_condition := ' AND p.stock_quantity > 5';
        WHEN 'low_stock' THEN
            stock_condition := ' AND p.stock_quantity > 0 AND p.stock_quantity <= 5';
        WHEN 'out_of_stock' THEN
            stock_condition := ' AND p.stock_quantity = 0';
        ELSE
            stock_condition := ''; -- 'all' - لا حاجة لشرط إضافي
    END CASE;
    
    -- بناء شرط نطاق السعر
    IF p_price_min IS NOT NULL AND p_price_min >= 0 THEN
        price_condition := price_condition || format(' AND p.price >= %s', p_price_min);
    END IF;
    
    IF p_price_max IS NOT NULL AND p_price_max >= 0 THEN
        price_condition := price_condition || format(' AND p.price <= %s', p_price_max);
    END IF;
    
    -- بناء شرط الترتيب
    CASE p_sort_by
        WHEN 'name' THEN
            order_clause := 'p.name';
        WHEN 'price' THEN
            order_clause := 'p.price';
        WHEN 'stock' THEN
            order_clause := 'p.stock_quantity';
        WHEN 'sku' THEN
            order_clause := 'p.sku';
        WHEN 'created_at' THEN
            order_clause := 'p.created_at';
        WHEN 'updated_at' THEN
            order_clause := 'p.updated_at';
        ELSE
            order_clause := 'p.name';
    END CASE;
    
    -- إضافة اتجاه الترتيب
    IF UPPER(p_sort_order) = 'DESC' THEN
        order_clause := order_clause || ' DESC';
    ELSE
        order_clause := order_clause || ' ASC';
    END IF;
    
    -- بناء الاستعلام النهائي
    final_query := format('
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.price as product_price,
            p.sku as product_sku,
            p.barcode as product_barcode,
            p.stock_quantity,
            p.slug as product_slug,
            o.name as organization_name,
            o.domain as organization_domain,
            o.subdomain as organization_subdomain,
            p.created_at,
            p.updated_at,
            COUNT(*) OVER() as total_count
        FROM products p 
        JOIN organizations o ON p.organization_id = o.id
        WHERE p.is_active = TRUE 
            AND p.organization_id = %L
            %s
            %s
            %s
        ORDER BY %s
        LIMIT %s OFFSET %s',
        p_organization_id,
        search_condition,
        stock_condition,
        price_condition,
        order_clause,
        p_limit,
        p_offset
    );
    
    -- تنفيذ الاستعلام وإرجاع النتائج
    RETURN QUERY EXECUTE final_query;
END;
$$;

-- =========================================
-- دالة مبسطة للاستخدام مع الدالة الحالية
-- (للحفاظ على التوافق مع الكود الموجود)
-- =========================================

CREATE OR REPLACE FUNCTION get_products_for_barcode_printing(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    product_price NUMERIC,
    product_sku TEXT,
    product_barcode TEXT,
    stock_quantity INTEGER,
    product_slug TEXT,
    organization_name TEXT,
    organization_domain TEXT,
    organization_subdomain TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- استخدام الدالة المحسنة مع القيم الافتراضية
    RETURN QUERY 
    SELECT 
        enh.product_id,
        enh.product_name,
        enh.product_price,
        enh.product_sku,
        enh.product_barcode,
        enh.stock_quantity,
        enh.product_slug,
        enh.organization_name,
        enh.organization_domain,
        enh.organization_subdomain
    FROM get_products_for_barcode_printing_enhanced(
        p_organization_id,
        NULL, -- لا يوجد بحث
        'name', -- ترتيب حسب الاسم
        'asc', -- ترتيب تصاعدي
        'all', -- جميع المنتجات
        NULL, -- لا يوجد حد أدنى للسعر
        NULL, -- لا يوجد حد أعلى للسعر
        1000, -- حد أقصى 1000 منتج
        0 -- بداية من 0
    ) enh;
END;
$$;

-- =========================================
-- إنشاء فهارس لتحسين الأداء
-- =========================================

-- فهرس للبحث في اسم المنتج
CREATE INDEX IF NOT EXISTS idx_products_name_search 
ON products USING gin(to_tsvector('arabic', name));

-- فهرس للبحث في SKU
CREATE INDEX IF NOT EXISTS idx_products_sku_search 
ON products USING gin(to_tsvector('simple', sku));

-- فهرس للبحث في الباركود
CREATE INDEX IF NOT EXISTS idx_products_barcode_search 
ON products USING gin(to_tsvector('simple', COALESCE(barcode, '')));

-- فهرس مركب للمؤسسة والحالة النشطة
CREATE INDEX IF NOT EXISTS idx_products_org_active 
ON products (organization_id, is_active);

-- فهرس للسعر والمخزون (للفلترة السريعة)
CREATE INDEX IF NOT EXISTS idx_products_price_stock 
ON products (price, stock_quantity) 
WHERE is_active = true;

-- فهرس للتواريخ (للترتيب)
CREATE INDEX IF NOT EXISTS idx_products_dates 
ON products (created_at DESC, updated_at DESC) 
WHERE is_active = true;

-- =========================================
-- إعطاء الصلاحيات المناسبة
-- =========================================

-- السماح للمستخدمين المسجلين بتنفيذ الدوال
GRANT EXECUTE ON FUNCTION get_products_for_barcode_printing_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_for_barcode_printing TO authenticated;

-- =========================================
-- تعليقات على الدوال للتوثيق
-- =========================================

COMMENT ON FUNCTION get_products_for_barcode_printing_enhanced IS 
'دالة محسنة لجلب المنتجات مع إمكانيات البحث والفلترة والترتيب للاستخدام في طباعة الباركود';

COMMENT ON FUNCTION get_products_for_barcode_printing IS 
'دالة مبسطة للحفاظ على التوافق مع الكود الموجود - تستخدم الدالة المحسنة داخلياً'; 