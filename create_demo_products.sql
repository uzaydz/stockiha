-- دالة لإنشاء منتجات تجريبية للمؤسسات
CREATE OR REPLACE FUNCTION add_demo_products_to_organization(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    products_added INTEGER := 0;
    demo_products JSONB[];
    product_data JSONB;
    result JSONB;
    category_record RECORD;
    categories_exist BOOLEAN := false;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'المؤسسة غير موجودة'
        );
    END IF;

    -- التحقق من وجود فئات
    SELECT EXISTS (
        SELECT 1 FROM product_categories 
        WHERE organization_id = p_organization_id 
        AND is_active = true
    ) INTO categories_exist;

    IF NOT categories_exist THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'يجب إضافة فئات أولاً قبل إضافة المنتجات'
        );
    END IF;

    -- تحديد المنتجات التجريبية
    demo_products := ARRAY[
        '{"name": "آيفون 15 برو", "price": 150000, "compare_at_price": 170000, "sku": "DEMO-IP15P", "description": "آيفون 15 برو بشاشة 6.1 بوصة وكاميرا ثلاثية", "category_slug": "smartphones", "featured": true}'::jsonb,
        '{"name": "سامسونج جالاكسي S24", "price": 130000, "compare_at_price": 145000, "sku": "DEMO-SGS24", "description": "سامسونج جالاكسي S24 بمعالج قوي وكاميرا متطورة", "category_slug": "smartphones", "featured": true}'::jsonb,
        '{"name": "لابتوب ديل XPS 13", "price": 95000, "compare_at_price": 110000, "sku": "DEMO-DXPS13", "description": "لابتوب خفيف الوزن للعمل والدراسة", "category_slug": "computers", "featured": true}'::jsonb,
        '{"name": "ماك بوك آير M2", "price": 120000, "compare_at_price": 135000, "sku": "DEMO-MBA-M2", "description": "ماك بوك آير بمعالج M2 الجديد", "category_slug": "computers", "featured": true}'::jsonb,
        '{"name": "سماعات سوني WH-1000XM5", "price": 35000, "compare_at_price": 42000, "sku": "DEMO-SWXM5", "description": "سماعات لاسلكية بتقنية إلغاء الضوضاء", "category_slug": "electronics", "featured": false}'::jsonb,
        '{"name": "ساعة ذكية أبل واتش", "price": 45000, "compare_at_price": 52000, "sku": "DEMO-AW9", "description": "ساعة ذكية بمميزات صحية متقدمة", "category_slug": "electronics", "featured": false}'::jsonb
    ];

    -- إضافة المنتجات
    FOR i IN 1..array_length(demo_products, 1) LOOP
        product_data := demo_products[i];
        
        -- البحث عن الفئة المناسبة
        SELECT id INTO category_record.id 
        FROM product_categories 
        WHERE organization_id = p_organization_id 
        AND slug = product_data->>'category_slug'
        AND is_active = true
        LIMIT 1;
        
        -- إذا لم توجد الفئة، استخدم أول فئة متاحة
        IF category_record.id IS NULL THEN
            SELECT id INTO category_record.id 
            FROM product_categories 
            WHERE organization_id = p_organization_id 
            AND is_active = true
            LIMIT 1;
        END IF;
        
        -- إضافة المنتج إذا وُجدت فئة
        IF category_record.id IS NOT NULL THEN
            INSERT INTO products (
                organization_id,
                category_id,
                name,
                description,
                price,
                compare_at_price,
                sku,
                stock_quantity,
                is_active,
                is_featured,
                thumbnail_image,
                type,
                created_at,
                updated_at
            ) VALUES (
                p_organization_id,
                category_record.id,
                product_data->>'name',
                product_data->>'description',
                (product_data->>'price')::DECIMAL,
                (product_data->>'compare_at_price')::DECIMAL,
                product_data->>'sku',
                FLOOR(RANDOM() * 50 + 10)::INTEGER, -- كمية عشوائية بين 10 و 60
                true,
                (product_data->>'featured')::BOOLEAN,
                CASE 
                    WHEN product_data->>'category_slug' = 'smartphones' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop'
                    WHEN product_data->>'category_slug' = 'computers' THEN 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=300&fit=crop'
                    WHEN product_data->>'category_slug' = 'electronics' THEN 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=300&fit=crop'
                    ELSE 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'
                END,
                'demo',
                NOW(),
                NOW()
            );
            
            products_added := products_added + 1;
        END IF;
    END LOOP;

    -- إنشاء النتيجة
    result := jsonb_build_object(
        'success', true,
        'products_added', products_added,
        'message', 'تم إنشاء ' || products_added || ' منتجات تجريبية بنجاح',
        'organization_id', p_organization_id
    );

    RETURN result;
END;
$$;

-- دالة لحذف المنتجات التجريبية
CREATE OR REPLACE FUNCTION remove_demo_products_from_organization(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    products_removed INTEGER := 0;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'المؤسسة غير موجودة'
        );
    END IF;

    -- حذف المنتجات التجريبية
    DELETE FROM products 
    WHERE organization_id = p_organization_id 
    AND type = 'demo';
    
    GET DIAGNOSTICS products_removed = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'products_removed', products_removed,
        'message', 'تم حذف ' || products_removed || ' منتج تجريبي',
        'organization_id', p_organization_id
    );
END;
$$;

-- دالة شاملة لإنشاء بيانات تجريبية كاملة (فئات + منتجات)
CREATE OR REPLACE FUNCTION setup_complete_demo_data(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    categories_result JSONB;
    products_result JSONB;
    final_result JSONB;
BEGIN
    -- إضافة الفئات التجريبية
    SELECT add_demo_categories_to_organization(p_organization_id) INTO categories_result;
    
    -- إذا فشل إنشاء الفئات، توقف
    IF (categories_result->>'success')::BOOLEAN = false THEN
        RETURN categories_result;
    END IF;
    
    -- إضافة المنتجات التجريبية
    SELECT add_demo_products_to_organization(p_organization_id) INTO products_result;
    
    -- دمج النتائج
    final_result := jsonb_build_object(
        'success', true,
        'message', 'تم إنشاء البيانات التجريبية الكاملة بنجاح',
        'organization_id', p_organization_id,
        'categories_added', categories_result->'categories_added',
        'products_added', products_result->'products_added',
        'details', jsonb_build_object(
            'categories', categories_result,
            'products', products_result
        )
    );
    
    RETURN final_result;
END;
$$; 