-- إصلاح التكامل بين مكون المنتجات المميزة في محرر المتجر وصفحة المتجر
-- هذا الملف يضيف وظائف جديدة ويصلح التكامل بين الواجهة الأمامية والخلفية

-- التحقق من أن حقل is_featured موجود في جدول المنتجات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_featured'
    ) THEN
        -- إضافة عمود للمنتجات المميزة إذا لم يكن موجوداً
        ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- إنشاء وظيفة لجلب المنتجات المميزة للمؤسسة
CREATE OR REPLACE FUNCTION get_featured_products(p_organization_id UUID)
RETURNS SETOF products AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM products
    WHERE organization_id = p_organization_id 
    AND is_active = TRUE
    AND is_featured = TRUE
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء وظيفة لضبط المنتجات المميزة حسب معرفات المنتجات
CREATE OR REPLACE FUNCTION set_featured_products(
    p_organization_id UUID,
    p_product_ids UUID[]
)
RETURNS BOOLEAN AS $$
BEGIN
    -- إلغاء تمييز جميع المنتجات أولاً
    UPDATE products
    SET is_featured = FALSE
    WHERE organization_id = p_organization_id;
    
    -- تمييز المنتجات المحددة
    UPDATE products
    SET is_featured = TRUE
    WHERE organization_id = p_organization_id
    AND id = ANY(p_product_ids);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة للحصول على محتوى إعدادات المنتجات المميزة من store_settings
-- وتطبيقها على المنتجات الفعلية
CREATE OR REPLACE FUNCTION sync_featured_products_from_settings(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_settings JSONB;
    v_selection_method TEXT;
    v_selection_criteria TEXT;
    v_selected_products UUID[] := '{}';
BEGIN
    -- الحصول على إعدادات المنتجات المميزة
    SELECT settings INTO v_settings
    FROM store_settings
    WHERE organization_id = p_organization_id
    AND component_type = 'featured_products'
    AND is_active = TRUE
    LIMIT 1;
    
    IF v_settings IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- تحديد طريقة الاختيار (يدوي أو آلي)
    v_selection_method := v_settings->>'selectionMethod';
    
    IF v_selection_method = 'manual' THEN
        -- استخراج معرفات المنتجات المحددة يدوياً
        SELECT array_agg(elem::UUID)
        INTO v_selected_products
        FROM jsonb_array_elements_text(v_settings->'selectedProducts') AS elem;
        
        -- تعيين المنتجات المميزة استناداً إلى القائمة المحددة
        PERFORM set_featured_products(p_organization_id, v_selected_products);
    ELSE
        -- استخراج معيار الاختيار
        v_selection_criteria := v_settings->>'selectionCriteria';
        
        -- التعامل مع معايير الاختيار المختلفة
        IF v_selection_criteria = 'featured' THEN
            -- لا داعي للقيام بأي شيء لأن is_featured مضبوط بالفعل
            NULL;
        ELSIF v_selection_criteria = 'newest' THEN
            -- جلب أحدث المنتجات
            SELECT array_agg(id)
            INTO v_selected_products
            FROM products
            WHERE organization_id = p_organization_id
            AND is_active = TRUE
            ORDER BY created_at DESC
            LIMIT COALESCE((v_settings->>'displayCount')::INTEGER, 4);
            
            PERFORM set_featured_products(p_organization_id, v_selected_products);
        ELSIF v_selection_criteria = 'discounted' THEN
            -- جلب المنتجات ذات الخصومات
            SELECT array_agg(id)
            INTO v_selected_products
            FROM products
            WHERE organization_id = p_organization_id
            AND is_active = TRUE
            AND compare_at_price IS NOT NULL
            AND compare_at_price > 0
            AND compare_at_price > price
            ORDER BY (compare_at_price - price) / compare_at_price DESC
            LIMIT COALESCE((v_settings->>'displayCount')::INTEGER, 4);
            
            PERFORM set_featured_products(p_organization_id, v_selected_products);
        ELSIF v_selection_criteria = 'best_selling' THEN
            -- هنا يمكن إضافة منطق لتحديد المنتجات الأكثر مبيعاً
            -- يعتمد على بيانات المبيعات المتوفرة في النظام
            -- في هذا المثال، نستخدم قائمة فارغة
            NULL;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة محفز لتحديث المنتجات المميزة عند تحديث إعدادات المتجر
CREATE OR REPLACE FUNCTION trigger_update_featured_products()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.component_type = 'featured_products' THEN
        -- تزامن المنتجات المميزة مع الإعدادات الجديدة
        PERFORM sync_featured_products_from_settings(NEW.organization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف المحفز إذا كان موجوداً
DROP TRIGGER IF EXISTS update_featured_products_trigger ON store_settings;

-- إنشاء المحفز
CREATE TRIGGER update_featured_products_trigger
AFTER INSERT OR UPDATE ON store_settings
FOR EACH ROW
WHEN (NEW.component_type = 'featured_products')
EXECUTE FUNCTION trigger_update_featured_products();

-- تعديل وظيفة upsert_store_component لتحديث المنتجات المميزة مباشرة
CREATE OR REPLACE FUNCTION upsert_store_component_and_sync(
    p_organization_id UUID,
    p_component_id UUID,
    p_component_type TEXT,
    p_settings JSONB,
    p_is_active BOOLEAN,
    p_order_index INTEGER
) RETURNS UUID AS $$
DECLARE
    v_result_id UUID;
BEGIN
    -- الاستفادة من دالة upsert_store_component الموجودة
    SELECT upsert_store_component(
        p_organization_id,
        p_component_id,
        p_component_type,
        p_settings,
        p_is_active,
        p_order_index
    ) INTO v_result_id;
    
    -- إذا كان المكون هو المنتجات المميزة، قم بتزامن المنتجات
    IF p_component_type = 'featured_products' THEN
        PERFORM sync_featured_products_from_settings(p_organization_id);
    END IF;
    
    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تزامن المنتجات المميزة لجميع المنظمات
-- يمكن تشغيله يدوياً لضمان تطابق الواجهة الأمامية والخلفية
DO $$
DECLARE
    org_id UUID;
BEGIN
    FOR org_id IN SELECT DISTINCT organization_id FROM store_settings WHERE component_type = 'featured_products' LOOP
        PERFORM sync_featured_products_from_settings(org_id);
    END LOOP;
END $$;

-- إضافة تعليقات للوظائف الجديدة
COMMENT ON FUNCTION get_featured_products IS 'جلب المنتجات المميزة للمؤسسة';
COMMENT ON FUNCTION set_featured_products IS 'ضبط المنتجات المميزة حسب قائمة معرفات';
COMMENT ON FUNCTION sync_featured_products_from_settings IS 'مزامنة المنتجات المميزة مع إعدادات المتجر';
COMMENT ON FUNCTION trigger_update_featured_products IS 'محفز تحديث المنتجات المميزة عند تحديث إعدادات المتجر';
COMMENT ON FUNCTION upsert_store_component_and_sync IS 'إضافة/تحديث مكون متجر ومزامنة المنتجات المميزة'; 