-- SQL لإضافة قواعد DO INSTEAD للسماح بعمليات تحديث المنتجات باستخدام RETURNING

-- حذف كل القواعد المرتبطة بجدول products
DROP RULE IF EXISTS products_update_returning ON products;
DROP RULE IF EXISTS prevent_direct_update_on_last_inventory_update ON products;

-- استبدال منطق منع تحديث عمود معين بـ TRIGGER آمن
CREATE OR REPLACE FUNCTION prevent_inventory_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.last_inventory_update IS DISTINCT FROM OLD.last_inventory_update THEN
    NEW.last_inventory_update := OLD.last_inventory_update;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء TRIGGER لمنع تحديث عمود last_inventory_update
DROP TRIGGER IF EXISTS prevent_inventory_update_trigger ON products;
CREATE TRIGGER prevent_inventory_update_trigger
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION prevent_inventory_update();

-- 2. تعديل السياسة لضمان عملها الصحيح
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- تحديث سياسة التحديث للسماح بعمليات التحديث للمستخدمين مع المنظمة المناسبة
DROP POLICY IF EXISTS "org_tenant_products_update" ON "public"."products";
CREATE POLICY "org_tenant_products_update" ON "public"."products"
AS PERMISSIVE FOR UPDATE
TO public
USING (organization_id = ( SELECT users.organization_id FROM users WHERE (users.id = auth.uid())))
WITH CHECK (organization_id = ( SELECT users.organization_id FROM users WHERE (users.id = auth.uid())));

-- 3. تحسين الوظيفة المخزنة بوضع تحقق من الصلاحيات وإصلاح مشكلة الغموض في الأعمدة
CREATE OR REPLACE FUNCTION update_product_safe(
    product_id UUID,
    product_data JSONB
) RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_organization_id UUID;
    product_organization_id UUID;
    user_is_super_admin BOOLEAN;
BEGIN
    -- التحقق من أن المستخدم مصادق عليه
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير مصادق عليه. يجب تسجيل الدخول أولاً.';
    END IF;
    
    -- التحقق من صلاحية المستخدم للوصول إلى المنتج
    SELECT organization_id INTO user_organization_id 
    FROM users 
    WHERE id = auth.uid();
    
    -- التحقق من أن المستخدم هو مدير النظام
    SELECT users.is_super_admin INTO user_is_super_admin
    FROM users 
    WHERE id = auth.uid();
    
    -- الحصول على معرف المؤسسة الخاصة بالمنتج
    SELECT organization_id INTO product_organization_id 
    FROM products 
    WHERE id = product_id;
    
    IF product_organization_id IS NULL THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;
    
    -- التحقق من صلاحية الوصول
    IF user_organization_id = product_organization_id OR user_is_super_admin = TRUE THEN
        -- إصدار التحديث مع معالجة أنواع البيانات الصحيحة
        RETURN QUERY
        UPDATE products 
        SET 
            name = COALESCE(product_data->>'name', name),
            description = COALESCE(product_data->>'description', description),
            price = COALESCE((product_data->>'price')::numeric, price),
            compare_at_price = (product_data->>'compare_at_price')::numeric,
            sku = COALESCE(product_data->>'sku', sku),
            barcode = (product_data->>'barcode'),
            brand = (product_data->>'brand'),
            images = CASE 
                WHEN product_data->'images' IS NOT NULL 
                THEN array(select jsonb_array_elements_text(product_data->'images'))
                ELSE images
                END,
            thumbnail_image = COALESCE(product_data->>'thumbnail_image', thumbnail_image),
            stock_quantity = COALESCE((product_data->>'stock_quantity')::integer, stock_quantity),
            is_digital = COALESCE((product_data->>'is_digital')::boolean, is_digital),
            is_new = COALESCE((product_data->>'is_new')::boolean, is_new),
            is_featured = COALESCE((product_data->>'is_featured')::boolean, is_featured),
            updated_at = COALESCE((product_data->>'updated_at')::timestamp with time zone, now()),
            purchase_price = (product_data->>'purchase_price')::numeric,
            category_id = (product_data->>'category_id')::uuid,
            subcategory_id = (product_data->>'subcategory_id')::uuid,
            has_variants = COALESCE((product_data->>'has_variants')::boolean, has_variants),
            show_price_on_landing = COALESCE((product_data->>'show_price_on_landing')::boolean, show_price_on_landing),
            wholesale_price = (product_data->>'wholesale_price')::numeric,
            partial_wholesale_price = (product_data->>'partial_wholesale_price')::numeric,
            min_wholesale_quantity = (product_data->>'min_wholesale_quantity')::integer,
            min_partial_wholesale_quantity = (product_data->>'min_partial_wholesale_quantity')::integer,
            allow_retail = COALESCE((product_data->>'allow_retail')::boolean, allow_retail),
            allow_wholesale = COALESCE((product_data->>'allow_wholesale')::boolean, allow_wholesale),
            allow_partial_wholesale = COALESCE((product_data->>'allow_partial_wholesale')::boolean, allow_partial_wholesale)
        WHERE id = product_id
        RETURNING *;
    ELSE
        RAISE EXCEPTION 'ليس لديك صلاحية تحديث هذا المنتج. المنتج ينتمي لمؤسسة مختلفة.';
    END IF;
END;
$$;

-- 4. إنشاء إجراء مخزن لجلب المنتج بأمان
CREATE OR REPLACE FUNCTION get_product_safe(
    product_id UUID
) RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_organization_id UUID;
    product_organization_id UUID;
    user_is_super_admin BOOLEAN;
BEGIN
    -- التحقق من أن المستخدم مصادق عليه
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير مصادق عليه. يجب تسجيل الدخول أولاً.';
    END IF;
    
    -- التحقق من صلاحية المستخدم للوصول إلى المنتج
    SELECT organization_id INTO user_organization_id 
    FROM users 
    WHERE id = auth.uid();
    
    -- التحقق من أن المستخدم هو مدير النظام
    SELECT users.is_super_admin INTO user_is_super_admin
    FROM users 
    WHERE id = auth.uid();
    
    -- الحصول على معرف المؤسسة الخاصة بالمنتج
    SELECT organization_id INTO product_organization_id 
    FROM products 
    WHERE id = product_id;
    
    IF product_organization_id IS NULL THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;
    
    -- التحقق من صلاحية الوصول
    IF user_organization_id = product_organization_id OR user_is_super_admin = TRUE THEN
        RETURN QUERY
        SELECT * FROM products WHERE id = product_id;
    ELSE
        RAISE EXCEPTION 'ليس لديك صلاحية الوصول إلى هذا المنتج. المنتج ينتمي لمؤسسة مختلفة.';
    END IF;
END;
$$;

-- 5. إنشاء وظيفة مخزنة لإنشاء المنتجات بطريقة آمنة
CREATE OR REPLACE FUNCTION create_product_safe(
    product_data JSONB
) RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_organization_id UUID;
    new_product_id UUID;
BEGIN
    -- التحقق من أن المستخدم مصادق عليه
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير مصادق عليه. يجب تسجيل الدخول أولاً.';
    END IF;
    
    -- الحصول على معرف المؤسسة للمستخدم الحالي
    SELECT organization_id INTO user_organization_id 
    FROM users 
    WHERE id = auth.uid();
    
    IF user_organization_id IS NULL THEN
        RAISE EXCEPTION 'لا يمكن تحديد مؤسستك. يرجى التحقق من حسابك.';
    END IF;
    
    -- إنشاء معرف جديد للمنتج إذا لم يتم توفيره
    IF product_data->>'id' IS NULL THEN
        SELECT gen_random_uuid() INTO new_product_id;
    ELSE
        new_product_id := (product_data->>'id')::UUID;
    END IF;
    
    -- إدراج المنتج الجديد مع ضمان استخدام معرف المؤسسة الصحيح
    RETURN QUERY
    INSERT INTO products (
        id,
        name,
        description,
        price,
        compare_at_price,
        sku,
        barcode,
        brand,
        images,
        thumbnail_image,
        stock_quantity,
        is_digital,
        is_new,
        is_featured,
        created_at,
        updated_at,
        purchase_price,
        category_id,
        subcategory_id,
        has_variants,
        show_price_on_landing,
        wholesale_price,
        partial_wholesale_price,
        min_wholesale_quantity,
        min_partial_wholesale_quantity,
        allow_retail,
        allow_wholesale,
        allow_partial_wholesale,
        organization_id
    ) VALUES (
        new_product_id,
        COALESCE(product_data->>'name', 'منتج جديد'),
        product_data->>'description',
        COALESCE((product_data->>'price')::numeric, 0),
        (product_data->>'compare_at_price')::numeric,
        product_data->>'sku',
        product_data->>'barcode',
        product_data->>'brand',
        CASE 
            WHEN product_data->'images' IS NOT NULL 
            THEN array(select jsonb_array_elements_text(product_data->'images'))
            ELSE '{}'::text[]
        END,
        product_data->>'thumbnail_image',
        COALESCE((product_data->>'stock_quantity')::integer, 0),
        COALESCE((product_data->>'is_digital')::boolean, false),
        COALESCE((product_data->>'is_new')::boolean, true),
        COALESCE((product_data->>'is_featured')::boolean, false),
        COALESCE((product_data->>'created_at')::timestamp with time zone, now()),
        COALESCE((product_data->>'updated_at')::timestamp with time zone, now()),
        (product_data->>'purchase_price')::numeric,
        (product_data->>'category_id')::uuid,
        (product_data->>'subcategory_id')::uuid,
        COALESCE((product_data->>'has_variants')::boolean, false),
        COALESCE((product_data->>'show_price_on_landing')::boolean, true),
        (product_data->>'wholesale_price')::numeric,
        (product_data->>'partial_wholesale_price')::numeric,
        (product_data->>'min_wholesale_quantity')::integer,
        (product_data->>'min_partial_wholesale_quantity')::integer,
        COALESCE((product_data->>'allow_retail')::boolean, true),
        COALESCE((product_data->>'allow_wholesale')::boolean, false),
        COALESCE((product_data->>'allow_partial_wholesale')::boolean, false),
        user_organization_id
    )
    RETURNING *;
END;
$$; 