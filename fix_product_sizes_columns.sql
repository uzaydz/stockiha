-- إصلاح مشكلة حقول المقاسات في قاعدة بيانات Bazaar
-- تاريخ: 2024

-- 1. إضافة عمود use_sizes لجدول المنتجات إذا لم يكن موجوداً
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS use_sizes BOOLEAN DEFAULT false;

-- 2. إضافة عمود has_sizes لجدول ألوان المنتجات إذا لم يكن موجوداً
ALTER TABLE public.product_colors ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;

-- 3. تحديث وظيفة simple_update_product لتشمل الحقل الجديد
CREATE OR REPLACE FUNCTION public.simple_update_product(
  p_id UUID,
  p_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث المنتج
  UPDATE products
  SET
    name = COALESCE(p_data->>'name', name),
    description = COALESCE(p_data->>'description', description),
    price = COALESCE((p_data->>'price')::numeric, price),
    purchase_price = COALESCE((p_data->>'purchase_price')::numeric, purchase_price),
    compare_at_price = CASE WHEN p_data ? 'compare_at_price' AND p_data->>'compare_at_price' IS NULL THEN NULL
                            WHEN p_data ? 'compare_at_price' THEN (p_data->>'compare_at_price')::numeric
                            ELSE compare_at_price END,
    wholesale_price = CASE WHEN p_data ? 'wholesale_price' AND p_data->>'wholesale_price' IS NULL THEN NULL
                           WHEN p_data ? 'wholesale_price' THEN (p_data->>'wholesale_price')::numeric
                           ELSE wholesale_price END,
    partial_wholesale_price = CASE WHEN p_data ? 'partial_wholesale_price' AND p_data->>'partial_wholesale_price' IS NULL THEN NULL
                                   WHEN p_data ? 'partial_wholesale_price' THEN (p_data->>'partial_wholesale_price')::numeric
                                   ELSE partial_wholesale_price END,
    min_wholesale_quantity = CASE WHEN p_data ? 'min_wholesale_quantity' AND p_data->>'min_wholesale_quantity' IS NULL THEN NULL
                                  WHEN p_data ? 'min_wholesale_quantity' THEN (p_data->>'min_wholesale_quantity')::integer
                                  ELSE min_wholesale_quantity END,
    min_partial_wholesale_quantity = CASE WHEN p_data ? 'min_partial_wholesale_quantity' AND p_data->>'min_partial_wholesale_quantity' IS NULL THEN NULL
                                          WHEN p_data ? 'min_partial_wholesale_quantity' THEN (p_data->>'min_partial_wholesale_quantity')::integer
                                          ELSE min_partial_wholesale_quantity END,
    allow_retail = COALESCE((p_data->>'allow_retail')::boolean, allow_retail),
    allow_wholesale = COALESCE((p_data->>'allow_wholesale')::boolean, allow_wholesale),
    allow_partial_wholesale = COALESCE((p_data->>'allow_partial_wholesale')::boolean, allow_partial_wholesale),
    sku = COALESCE(p_data->>'sku', sku),
    barcode = COALESCE(p_data->>'barcode', barcode),
    category_id = CASE WHEN p_data ? 'category_id' AND p_data->>'category_id' IS NULL THEN NULL
                       WHEN p_data ? 'category_id' THEN (p_data->>'category_id')::uuid
                       ELSE category_id END,
    category = CASE WHEN p_data ? 'category_id' AND p_data->>'category_id' IS NULL THEN NULL
                    WHEN p_data ? 'category_id' THEN (p_data->>'category_id')::text
                    ELSE category END,
    subcategory_id = CASE WHEN p_data ? 'subcategory_id' AND (p_data->>'subcategory_id' IS NULL OR p_data->>'subcategory_id' = '') THEN NULL
                          WHEN p_data ? 'subcategory_id' THEN (p_data->>'subcategory_id')::uuid
                          ELSE subcategory_id END,
    stock_quantity = COALESCE((p_data->>'stock_quantity')::integer, stock_quantity),
    thumbnail_image = COALESCE(p_data->>'thumbnail_image', thumbnail_image),
    images = CASE 
             WHEN p_data ? 'images' THEN 
               (SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'images')))
             ELSE images 
           END,
    is_digital = COALESCE((p_data->>'is_digital')::boolean, is_digital),
    brand = COALESCE(p_data->>'brand', brand),
    is_new = COALESCE((p_data->>'is_new')::boolean, is_new),
    is_featured = COALESCE((p_data->>'is_featured')::boolean, is_featured),
    features = CASE 
               WHEN p_data ? 'features' THEN 
                 (SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'features')))
               ELSE features 
             END,
    specifications = CASE WHEN p_data ? 'specifications' THEN p_data->'specifications'
                          ELSE specifications END,
    has_variants = COALESCE((p_data->>'has_variants')::boolean, has_variants),
    use_sizes = COALESCE((p_data->>'use_sizes')::boolean, use_sizes), -- إضافة دعم حقل use_sizes
    show_price_on_landing = COALESCE((p_data->>'show_price_on_landing')::boolean, show_price_on_landing),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- 4. تحديث وظيفة updateProductColor لتشمل حقل has_sizes
CREATE OR REPLACE FUNCTION public.update_product_color(
    color_id UUID,
    name TEXT DEFAULT NULL,
    color_code TEXT DEFAULT NULL,
    quantity INTEGER DEFAULT NULL,
    price NUMERIC DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT NULL,
    has_sizes BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- الحصول على معرف المنتج من معرف اللون
    SELECT pc.product_id INTO product_id 
    FROM public.product_colors pc 
    WHERE pc.id = update_product_color.color_id;
    
    IF product_id IS NULL THEN
        RAISE EXCEPTION 'اللون غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية تعديل ألوان هذا المنتج';
    END IF;
    
    -- إذا كان هذا هو اللون الافتراضي، إلغاء تعيين أي لون افتراضي آخر لنفس المنتج
    IF is_default THEN
        UPDATE public.product_colors SET is_default = false WHERE product_id = product_id AND id != color_id;
    END IF;
    
    -- تحديث بيانات اللون
    UPDATE public.product_colors SET
        name = COALESCE(update_product_color.name, name),
        color_code = COALESCE(update_product_color.color_code, color_code),
        quantity = COALESCE(update_product_color.quantity, quantity),
        price = COALESCE(update_product_color.price, price),
        image_url = COALESCE(update_product_color.image_url, image_url),
        is_default = COALESCE(update_product_color.is_default, is_default),
        has_sizes = COALESCE(update_product_color.has_sizes, has_sizes)
    WHERE id = update_product_color.color_id;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = product_id
    )
    WHERE id = product_id;
    
    RETURN true;
END;
$$;

-- 5. تحديث قيم use_sizes في المنتجات التي لها مقاسات
UPDATE public.products p
SET use_sizes = true
WHERE EXISTS (
    SELECT 1 
    FROM public.product_colors pc
    JOIN public.product_sizes ps ON pc.id = ps.color_id
    WHERE pc.product_id = p.id
);

-- 6. تحديث قيم has_sizes في ألوان المنتجات التي لها مقاسات
UPDATE public.product_colors pc
SET has_sizes = true
WHERE EXISTS (
    SELECT 1 
    FROM public.product_sizes ps
    WHERE ps.color_id = pc.id
);

-- 7. تحديث المنتج المحدد
UPDATE public.products SET use_sizes = true WHERE id = 'cf214587-d86b-4948-87b3-ed0bed268c96';
UPDATE public.product_colors SET has_sizes = true WHERE id = 'd3107e81-ea54-4ad1-9ea4-8af634b396ce'; 