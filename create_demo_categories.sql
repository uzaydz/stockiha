-- دالة لإنشاء فئات تجريبية للمؤسسات التي لا تحتوي على فئات
CREATE OR REPLACE FUNCTION create_demo_categories_for_organizations()
RETURNS TABLE(
    organization_id UUID,
    organization_name TEXT,
    categories_created INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_record RECORD;
    categories_added INTEGER;
    demo_categories JSONB[];
BEGIN
    -- تحديد الفئات التجريبية
    demo_categories := ARRAY[
        '{"name": "الهواتف الذكية", "slug": "smartphones", "description": "أحدث الهواتف الذكية بأفضل الأسعار", "icon": "Smartphone", "color": "#3B82F6"}'::jsonb,
        '{"name": "أجهزة الكمبيوتر", "slug": "computers", "description": "أجهزة الكمبيوتر المحمولة والمكتبية", "icon": "Monitor", "color": "#10B981"}'::jsonb,
        '{"name": "الإلكترونيات", "slug": "electronics", "description": "الأجهزة الإلكترونية والمنزلية", "icon": "Zap", "color": "#F59E0B"}'::jsonb,
        '{"name": "الموضة والأزياء", "slug": "fashion", "description": "ملابس وإكسسوارات عصرية", "icon": "ShirtIcon", "color": "#EF4444"}'::jsonb,
        '{"name": "المنزل والحديقة", "slug": "home-garden", "description": "أدوات ومستلزمات المنزل والحديقة", "icon": "Home", "color": "#8B5CF6"}'::jsonb,
        '{"name": "الرياضة واللياقة", "slug": "sports-fitness", "description": "معدات رياضية ولياقة بدنية", "icon": "Activity", "color": "#06B6D4"}'::jsonb
    ];

    -- البحث عن المؤسسات التي لا تحتوي على فئات
    FOR org_record IN (
        SELECT o.id, o.name
        FROM organizations o
        WHERE NOT EXISTS (
            SELECT 1 FROM product_categories pc 
            WHERE pc.organization_id = o.id 
            AND pc.is_active = true
        )
        AND o.created_at > NOW() - INTERVAL '6 months' -- المؤسسات الحديثة فقط
        ORDER BY o.created_at DESC
    ) LOOP
        categories_added := 0;
        
        -- إضافة الفئات التجريبية
        FOR i IN 1..array_length(demo_categories, 1) LOOP
            INSERT INTO product_categories (
                organization_id,
                name,
                description,
                slug,
                icon,
                image_url,
                is_active,
                type,
                created_at,
                updated_at
            ) VALUES (
                org_record.id,
                demo_categories[i]->>'name',
                demo_categories[i]->>'description',
                demo_categories[i]->>'slug',
                demo_categories[i]->>'icon',
                CASE 
                    WHEN demo_categories[i]->>'slug' = 'smartphones' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'
                    WHEN demo_categories[i]->>'slug' = 'computers' THEN 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400'
                    WHEN demo_categories[i]->>'slug' = 'electronics' THEN 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'
                    WHEN demo_categories[i]->>'slug' = 'fashion' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'
                    WHEN demo_categories[i]->>'slug' = 'home-garden' THEN 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'
                    WHEN demo_categories[i]->>'slug' = 'sports-fitness' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
                    ELSE 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
                END,
                true,
                'demo',
                NOW(),
                NOW()
            );
            
            categories_added := categories_added + 1;
        END LOOP;
        
        -- إرجاع النتيجة
        organization_id := org_record.id;
        organization_name := org_record.name;
        categories_created := categories_added;
        message := 'تم إنشاء ' || categories_added || ' فئات تجريبية';
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$;

-- دالة لإضافة فئات تجريبية لمؤسسة محددة
CREATE OR REPLACE FUNCTION add_demo_categories_to_organization(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    categories_added INTEGER := 0;
    demo_categories JSONB[];
    category_data JSONB;
    result JSONB;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'المؤسسة غير موجودة'
        );
    END IF;

    -- التحقق من عدم وجود فئات مسبقاً
    IF EXISTS (
        SELECT 1 FROM product_categories 
        WHERE organization_id = p_organization_id 
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'المؤسسة تحتوي بالفعل على فئات'
        );
    END IF;

    -- تحديد الفئات التجريبية
    demo_categories := ARRAY[
        '{"name": "الهواتف الذكية", "slug": "smartphones", "description": "أحدث الهواتف الذكية بأفضل الأسعار", "icon": "Smartphone"}'::jsonb,
        '{"name": "أجهزة الكمبيوتر", "slug": "computers", "description": "أجهزة الكمبيوتر المحمولة والمكتبية", "icon": "Monitor"}'::jsonb,
        '{"name": "الإلكترونيات", "slug": "electronics", "description": "الأجهزة الإلكترونية والمنزلية", "icon": "Zap"}'::jsonb,
        '{"name": "الموضة والأزياء", "slug": "fashion", "description": "ملابس وإكسسوارات عصرية", "icon": "Shirt"}'::jsonb,
        '{"name": "المنزل والحديقة", "slug": "home-garden", "description": "أدوات ومستلزمات المنزل والحديقة", "icon": "Home"}'::jsonb,
        '{"name": "الرياضة واللياقة", "slug": "sports-fitness", "description": "معدات رياضية ولياقة بدنية", "icon": "Activity"}'::jsonb
    ];

    -- إضافة الفئات
    FOR i IN 1..array_length(demo_categories, 1) LOOP
        category_data := demo_categories[i];
        
        INSERT INTO product_categories (
            organization_id,
            name,
            description,
            slug,
            icon,
            image_url,
            is_active,
            type,
            created_at,
            updated_at
        ) VALUES (
            p_organization_id,
            category_data->>'name',
            category_data->>'description',
            category_data->>'slug',
            category_data->>'icon',
            CASE 
                WHEN category_data->>'slug' = 'smartphones' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop'
                WHEN category_data->>'slug' = 'computers' THEN 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop'
                WHEN category_data->>'slug' = 'electronics' THEN 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop'
                WHEN category_data->>'slug' = 'fashion' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
                WHEN category_data->>'slug' = 'home-garden' THEN 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop'
                WHEN category_data->>'slug' = 'sports-fitness' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
                ELSE 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'
            END,
            true,
            'demo',
            NOW(),
            NOW()
        );
        
        categories_added := categories_added + 1;
    END LOOP;

    -- إنشاء النتيجة
    result := jsonb_build_object(
        'success', true,
        'categories_added', categories_added,
        'message', 'تم إنشاء ' || categories_added || ' فئات تجريبية بنجاح',
        'organization_id', p_organization_id
    );

    RETURN result;
END;
$$;

-- دالة لحذف الفئات التجريبية
CREATE OR REPLACE FUNCTION remove_demo_categories_from_organization(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    categories_removed INTEGER := 0;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'المؤسسة غير موجودة'
        );
    END IF;

    -- حذف الفئات التجريبية
    DELETE FROM product_categories 
    WHERE organization_id = p_organization_id 
    AND type = 'demo';
    
    GET DIAGNOSTICS categories_removed = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'categories_removed', categories_removed,
        'message', 'تم حذف ' || categories_removed || ' فئة تجريبية',
        'organization_id', p_organization_id
    );
END;
$$; 