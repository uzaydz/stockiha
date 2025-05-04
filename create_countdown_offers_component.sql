-- هذا الملف يقوم بإنشاء وظائف وتحديثات لدعم مكون العروض المحدودة مع العد التنازلي

-- التحقق من وجود الجدول customer_offers
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'store_countdown_offers') THEN
        -- إنشاء جدول لتخزين العروض المحدودة
        CREATE TABLE store_countdown_offers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            component_id UUID NOT NULL REFERENCES store_settings(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            product_name TEXT NOT NULL,
            product_image TEXT NOT NULL,
            product_description TEXT,
            product_slug TEXT,
            original_price NUMERIC NOT NULL,
            discounted_price NUMERIC NOT NULL,
            discount_percentage INTEGER NOT NULL,
            end_date TIMESTAMPTZ NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- إنشاء مؤشرات للبحث السريع
        CREATE INDEX idx_store_countdown_offers_organization_id 
            ON store_countdown_offers(organization_id);
            
        CREATE INDEX idx_store_countdown_offers_component_id 
            ON store_countdown_offers(component_id);
            
        CREATE INDEX idx_store_countdown_offers_product_id 
            ON store_countdown_offers(product_id);
            
        CREATE INDEX idx_store_countdown_offers_end_date 
            ON store_countdown_offers(end_date);
            
        -- إنشاء محفز لتحديث وقت التعديل تلقائيًا
        CREATE TRIGGER update_store_countdown_offers_updated_at
        BEFORE UPDATE ON store_countdown_offers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        -- إنشاء سياسات أمان RLS
        ALTER TABLE store_countdown_offers ENABLE ROW LEVEL SECURITY;
        
        -- سياسة القراءة - يمكن للجميع قراءة العروض النشطة
        CREATE POLICY read_store_countdown_offers ON store_countdown_offers
            FOR SELECT USING (true);
            
        -- سياسة الإنشاء - للأعضاء المسجلين في المؤسسة فقط
        CREATE POLICY insert_store_countdown_offers ON store_countdown_offers
            FOR INSERT WITH CHECK (
                auth.uid() IN (
                    SELECT id FROM users WHERE organization_id = store_countdown_offers.organization_id
                )
            );
            
        -- سياسة التحديث - للأعضاء المسجلين في المؤسسة فقط
        CREATE POLICY update_store_countdown_offers ON store_countdown_offers
            FOR UPDATE USING (
                auth.uid() IN (
                    SELECT id FROM users WHERE organization_id = store_countdown_offers.organization_id
                )
            );
            
        -- سياسة الحذف - للأعضاء المسجلين في المؤسسة فقط
        CREATE POLICY delete_store_countdown_offers ON store_countdown_offers
            FOR DELETE USING (
                auth.uid() IN (
                    SELECT id FROM users WHERE organization_id = store_countdown_offers.organization_id
                )
            );
            
        RAISE NOTICE 'تم إنشاء جدول العروض المحدودة بنجاح';
    ELSE
        RAISE NOTICE 'جدول العروض المحدودة موجود بالفعل';
    END IF;
END $$;

-- إنشاء وظيفة لإضافة عرض محدود جديد
CREATE OR REPLACE FUNCTION add_countdown_offer(
    p_component_id UUID,
    p_product_id UUID,
    p_product_name TEXT,
    p_product_image TEXT,
    p_product_description TEXT,
    p_product_slug TEXT,
    p_original_price NUMERIC,
    p_discounted_price NUMERIC,
    p_discount_percentage INTEGER,
    p_end_date TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_offer_id UUID;
BEGIN
    -- التحقق من وجود المكون وجلب معرف المؤسسة
    SELECT organization_id INTO v_organization_id
    FROM store_settings
    WHERE id = p_component_id;
    
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'المكون غير موجود';
    END IF;
    
    -- التحقق من وجود المنتج
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;
    
    -- إدراج العرض الجديد
    INSERT INTO store_countdown_offers(
        organization_id,
        component_id,
        product_id,
        product_name,
        product_image,
        product_description,
        product_slug,
        original_price,
        discounted_price,
        discount_percentage,
        end_date
    ) VALUES (
        v_organization_id,
        p_component_id,
        p_product_id,
        p_product_name,
        p_product_image,
        p_product_description,
        p_product_slug,
        p_original_price,
        p_discounted_price,
        p_discount_percentage,
        p_end_date
    )
    RETURNING id INTO v_offer_id;
    
    RETURN v_offer_id;
END
$$;

-- إنشاء وظيفة لتحديث عرض محدود موجود
CREATE OR REPLACE FUNCTION update_countdown_offer(
    p_offer_id UUID,
    p_product_id UUID,
    p_product_name TEXT,
    p_product_image TEXT,
    p_product_description TEXT,
    p_product_slug TEXT,
    p_original_price NUMERIC,
    p_discounted_price NUMERIC,
    p_discount_percentage INTEGER,
    p_end_date TIMESTAMPTZ,
    p_is_active BOOLEAN
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
BEGIN
    -- التحقق من وجود العرض
    IF NOT EXISTS (SELECT 1 FROM store_countdown_offers WHERE id = p_offer_id) THEN
        RAISE EXCEPTION 'العرض غير موجود';
    END IF;
    
    -- التحقق من وجود المنتج
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;
    
    -- تحديث العرض
    UPDATE store_countdown_offers
    SET
        product_id = p_product_id,
        product_name = p_product_name,
        product_image = p_product_image,
        product_description = p_product_description,
        product_slug = p_product_slug,
        original_price = p_original_price,
        discounted_price = p_discounted_price,
        discount_percentage = p_discount_percentage,
        end_date = p_end_date,
        is_active = p_is_active,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN FOUND;
END
$$;

-- إنشاء وظيفة للحصول على كل العروض المحدودة النشطة لمكون معين
CREATE OR REPLACE FUNCTION get_active_countdown_offers(
    p_component_id UUID
) RETURNS SETOF store_countdown_offers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM store_countdown_offers
    WHERE component_id = p_component_id
    AND is_active = TRUE
    AND end_date > NOW()
    ORDER BY end_date ASC;
END
$$;

-- إنشاء وظيفة لإنشاء مكون عروض محدودة جديد
CREATE OR REPLACE FUNCTION create_countdown_offers_component(
    p_organization_id UUID,
    p_title TEXT DEFAULT 'عروض محدودة بوقت',
    p_subtitle TEXT DEFAULT 'تسوق الآن قبل انتهاء العروض الحصرية',
    p_currency TEXT DEFAULT 'دج',
    p_layout TEXT DEFAULT 'grid',
    p_max_items INTEGER DEFAULT 3,
    p_button_text TEXT DEFAULT 'تسوق الآن',
    p_theme TEXT DEFAULT 'light',
    p_show_view_all BOOLEAN DEFAULT FALSE,
    p_view_all_url TEXT DEFAULT '/offers'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_component_id UUID;
    v_order_index INT;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'المؤسسة غير موجودة';
    END IF;
    
    -- الحصول على أعلى ترتيب حالي
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_order_index
    FROM store_settings
    WHERE organization_id = p_organization_id;
    
    -- إدراج مكون العروض المحدودة الجديد
    INSERT INTO store_settings(
        organization_id,
        component_type,
        settings,
        is_active,
        order_index,
        created_at,
        updated_at
    )
    VALUES (
        p_organization_id,
        'countdownoffers',
        jsonb_build_object(
            'title', p_title,
            'subtitle', p_subtitle,
            'currency', p_currency,
            'layout', p_layout,
            'maxItems', p_max_items,
            'buttonText', p_button_text,
            'theme', p_theme,
            'showViewAll', p_show_view_all,
            'viewAllUrl', p_view_all_url,
            'offers', jsonb_build_array()
        ),
        TRUE,
        v_order_index,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_component_id;
    
    RETURN v_component_id;
END
$$;

-- إضافة مكون "العروض المحدودة" لجميع المؤسسات الموجودة
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN 
      -- نقوم بالتحقق من وجود مستخدمين للمؤسسة قبل إضافة المكون لتجنب الأخطاء
      SELECT o.id 
      FROM organizations o
      WHERE EXISTS (
        SELECT 1 FROM users u WHERE u.organization_id = o.id
      )
      AND NOT EXISTS (
        -- التحقق من عدم وجود مكون العروض المحدودة بالفعل
        SELECT 1 FROM store_settings 
        WHERE organization_id = o.id
        AND component_type = 'countdownoffers'
      )
  LOOP
    BEGIN
      PERFORM create_countdown_offers_component(org_record.id);
      RAISE NOTICE 'تمت إضافة مكون العروض المحدودة للمؤسسة %', org_record.id;
    EXCEPTION WHEN OTHERS THEN
      -- تسجيل الخطأ ومتابعة العملية
      RAISE NOTICE 'فشل إضافة مكون العروض المحدودة للمؤسسة %: %', org_record.id, SQLERRM;
    END;
  END LOOP;
END $$; 