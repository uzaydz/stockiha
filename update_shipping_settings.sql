-- 1. تحديث إعدادات النماذج (form_settings)
-- تحديث جميع إعدادات النماذج التي تستخدم shipping_clone_id = "1" لتستخدم "default_provider" بدلاً من ذلك
UPDATE form_settings
SET settings = jsonb_set(
    settings, 
    '{shipping_clone_id}', 
    '"default_provider"'
  )
WHERE settings->>'shipping_clone_id' = '1';

-- 2. تحديث المنتجات التي تستخدم shipping_clone_id = 1
UPDATE products
SET shipping_clone_id = NULL
WHERE shipping_clone_id = '1' OR shipping_clone_id = 1;

-- 3. تحديث إعدادات صفحة الشراء في المنتجات (purchase_page_config)
UPDATE products
SET purchase_page_config = jsonb_set(
    purchase_page_config, 
    '{shipping_clone_id}', 
    'null'
  )
WHERE purchase_page_config->>'shipping_clone_id' = '1';

-- 4. تحديث الطلبات المستقبلية (orders) إذا كانت تحتوي على shipping_clone_id
UPDATE orders
SET metadata = jsonb_set(
    metadata, 
    '{shipping_clone_id}', 
    'null'
  )
WHERE metadata->>'shipping_clone_id' = '1';

-- 5. استعلامات للتحقق من التحديثات

-- التحقق من form_settings
SELECT id, settings->>'shipping_clone_id' as shipping_clone_id
FROM form_settings
WHERE settings->>'shipping_clone_id' = 'default_provider';

-- التحقق من المنتجات
SELECT id, shipping_clone_id
FROM products
WHERE shipping_clone_id IS NULL AND id IN (
    SELECT id FROM products WHERE shipping_clone_id = '1'
);

-- التحقق من إعدادات صفحة الشراء
SELECT id, purchase_page_config->>'shipping_clone_id' as purchase_page_config_shipping_id
FROM products
WHERE purchase_page_config->>'shipping_clone_id' IS NULL AND id IN (
    SELECT id FROM products WHERE purchase_page_config->>'shipping_clone_id' = '1'
);

-- استعلام يوضح العلاقة بين المنتجات ومزودي الشحن
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.shipping_clone_id as product_shipping_clone_id,
    p.purchase_page_config->>'shipping_clone_id' as purchase_page_shipping_id,
    p.organization_id,
    sps.provider_id as default_provider_id,
    sp.name as default_provider_name
FROM products p
LEFT JOIN shipping_provider_settings sps ON sps.organization_id = p.organization_id AND sps.is_enabled = true
LEFT JOIN shipping_providers sp ON sp.id = sps.provider_id
WHERE p.shipping_clone_id = '1' OR p.shipping_clone_id = 1 OR p.purchase_page_config->>'shipping_clone_id' = '1'
ORDER BY p.created_at DESC
LIMIT 20;

-- استعلام للتحقق من العلاقة بين النماذج والمنتجات
SELECT 
    fs.id as form_settings_id,
    fs.name as form_name,
    fs.settings->>'shipping_clone_id' as form_shipping_clone_id,
    jsonb_array_elements_text(fs.product_ids) as product_id
FROM form_settings fs
WHERE fs.settings->>'shipping_clone_id' = '1'
ORDER BY fs.created_at DESC
LIMIT 20;

-- استعلام للتحقق من عدد النماذج التي سيتم تحديثها
SELECT COUNT(*) as forms_to_update
FROM form_settings
WHERE settings->>'shipping_clone_id' = '1';

-- استعلام للتحقق من عدد المنتجات التي سيتم تحديثها
SELECT COUNT(*) as products_to_update
FROM products
WHERE shipping_clone_id = '1' OR shipping_clone_id = 1;

-- استعلام للتحقق من عدد المنتجات التي سيتم تحديث إعدادات صفحة الشراء فيها
SELECT COUNT(*) as products_purchase_config_to_update
FROM products
WHERE purchase_page_config->>'shipping_clone_id' = '1';

-- 2. إنشاء وظائف (Functions) وتريغرات (Triggers) لضمان استمرارية الحل المستقبلي

-- إنشاء وظيفة للتعامل مع النماذج الجديدة أو المحدثة
CREATE OR REPLACE FUNCTION fix_form_settings_shipping_clone_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.settings ? 'shipping_clone_id' AND (
        NEW.settings->>'shipping_clone_id' = '1' OR 
        NEW.settings->>'shipping_clone_id' = '1' OR
        NEW.settings->>'shipping_clone_id' = 'default' OR
        NEW.settings->>'shipping_clone_id' = '0'
    ) THEN
        -- تحديث القيمة إلى default_provider
        NEW.settings = jsonb_set(
            NEW.settings, 
            '{shipping_clone_id}', 
            '"default_provider"'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء تريغر للنماذج الجديدة
DROP TRIGGER IF EXISTS fix_shipping_clone_id_form_settings_trigger ON form_settings;
CREATE TRIGGER fix_shipping_clone_id_form_settings_trigger
BEFORE INSERT OR UPDATE ON form_settings
FOR EACH ROW
EXECUTE FUNCTION fix_form_settings_shipping_clone_id();

-- إنشاء وظيفة للتعامل مع المنتجات الجديدة أو المحدثة
CREATE OR REPLACE FUNCTION fix_product_shipping_clone_id()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث shipping_clone_id في المنتج نفسه
    IF NEW.shipping_clone_id = '1' OR NEW.shipping_clone_id = 1 OR 
       NEW.shipping_clone_id = '0' OR NEW.shipping_clone_id = 0 OR
       NEW.shipping_clone_id = 'default' OR NEW.shipping_clone_id = 'default_provider' THEN
        NEW.shipping_clone_id = NULL;
    END IF;
    
    -- تحديث shipping_clone_id في purchase_page_config
    IF NEW.purchase_page_config ? 'shipping_clone_id' AND (
        NEW.purchase_page_config->>'shipping_clone_id' = '1' OR
        NEW.purchase_page_config->>'shipping_clone_id' = '0' OR
        NEW.purchase_page_config->>'shipping_clone_id' = 'default' OR
        NEW.purchase_page_config->>'shipping_clone_id' = '1'
    ) THEN
        NEW.purchase_page_config = jsonb_set(
            NEW.purchase_page_config, 
            '{shipping_clone_id}', 
            'null'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء تريغر للمنتجات الجديدة
DROP TRIGGER IF EXISTS fix_shipping_clone_id_products_trigger ON products;
CREATE TRIGGER fix_shipping_clone_id_products_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION fix_product_shipping_clone_id();

-- إنشاء وظيفة للتعامل مع الطلبات الجديدة أو المحدثة
CREATE OR REPLACE FUNCTION fix_order_metadata_shipping_clone_id()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث shipping_clone_id في metadata للطلبات
    IF NEW.metadata ? 'shipping_clone_id' AND (
        NEW.metadata->>'shipping_clone_id' = '1' OR
        NEW.metadata->>'shipping_clone_id' = '0' OR
        NEW.metadata->>'shipping_clone_id' = 'default' OR
        NEW.metadata->>'shipping_clone_id' = '1'
    ) THEN
        NEW.metadata = jsonb_set(
            NEW.metadata, 
            '{shipping_clone_id}', 
            'null'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء تريغر للطلبات الجديدة
DROP TRIGGER IF EXISTS fix_shipping_clone_id_orders_trigger ON orders;
CREATE TRIGGER fix_shipping_clone_id_orders_trigger
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION fix_order_metadata_shipping_clone_id();


-- 3. إنشاء نص إرشادي للمطورين
COMMENT ON FUNCTION fix_form_settings_shipping_clone_id() IS 'وظيفة للتأكد من أن حقل shipping_clone_id في النماذج يستخدم "default_provider" بدلاً من "1" للإشارة إلى المزود الافتراضي للمتجر';
COMMENT ON FUNCTION fix_product_shipping_clone_id() IS 'وظيفة للتأكد من أن shipping_clone_id في المنتجات هو NULL عندما يكون المزود الافتراضي للمتجر هو المطلوب';
COMMENT ON FUNCTION fix_order_metadata_shipping_clone_id() IS 'وظيفة للتأكد من أن shipping_clone_id في بيانات الطلبات هو NULL عندما يكون المزود الافتراضي للمتجر هو المطلوب';

-- 4. إضافة فحص قاعدة البيانات ونتائج التحديث

-- التحقق من form_settings
SELECT 
    id, 
    name, 
    settings->>'shipping_clone_id' as shipping_clone_id
FROM form_settings
WHERE settings->>'shipping_clone_id' = 'default_provider'
ORDER BY updated_at DESC
LIMIT 10;

-- التحقق من المنتجات
SELECT 
    id, 
    name, 
    shipping_clone_id,
    purchase_page_config->>'shipping_clone_id' as purchase_page_shipping_id
FROM products
WHERE shipping_clone_id IS NULL OR purchase_page_config->>'shipping_clone_id' IS NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 5. إنشاء وظيفة مساعدة للتحويل السريع للإعدادات الافتراضية

CREATE OR REPLACE FUNCTION convert_to_default_provider(organization_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    form_count INTEGER := 0;
    product_count INTEGER := 0;
    order_count INTEGER := 0;
BEGIN
    -- تحديث إعدادات النماذج
    WITH updated_forms AS (
        UPDATE form_settings
        SET settings = jsonb_set(
            settings, 
            '{shipping_clone_id}', 
            '"default_provider"'
        )
        WHERE organization_id = organization_id_param
        AND settings->>'shipping_clone_id' = '1'
        RETURNING id
    )
    SELECT COUNT(*) INTO form_count FROM updated_forms;
    
    -- تحديث المنتجات
    WITH updated_products AS (
        UPDATE products
        SET shipping_clone_id = NULL
        WHERE organization_id = organization_id_param
        AND (shipping_clone_id = '1' OR shipping_clone_id = 1)
        RETURNING id
    )
    SELECT COUNT(*) INTO product_count FROM updated_products;
    
    -- تحديث الطلبات
    WITH updated_orders AS (
        UPDATE orders
        SET metadata = jsonb_set(
            metadata, 
            '{shipping_clone_id}', 
            'null'
        )
        WHERE organization_id = organization_id_param
        AND metadata->>'shipping_clone_id' = '1'
        RETURNING id
    )
    SELECT COUNT(*) INTO order_count FROM updated_orders;
    
    RETURN 'تم تحديث ' || form_count || ' نماذج و ' || product_count || ' منتجات و ' || order_count || ' طلبات لاستخدام المزود الافتراضي للمتجر';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION convert_to_default_provider(UUID) IS 'وظيفة لتحويل جميع النماذج والمنتجات والطلبات الخاصة بمؤسسة معينة لاستخدام مزود الشحن الافتراضي للمتجر';

-- مثال على استخدام الوظيفة
-- SELECT convert_to_default_provider('fed872f9-1ade-4351-b020-5598fda976fe');

-- 6. إضافة تعليمات للمطور
SELECT '
-- تعليمات استخدام الوظائف الجديدة --

1. لتحويل مؤسسة معينة لاستخدام المزود الافتراضي للمتجر:
   SELECT convert_to_default_provider(''معرف-المؤسسة'');

2. تريغرات ووظائف قاعدة البيانات:
   - تم إضافة تريغرات تلقائية للتأكد من أن أي نموذج أو منتج جديد يستخدم القيمة الصحيحة
   - سيتم تحويل القيمة "1" تلقائياً إلى "default_provider" أو NULL حسب الجدول

3. للتحقق من حالة النماذج والمنتجات:
   SELECT COUNT(*) FROM form_settings WHERE settings->>''shipping_clone_id'' = ''1'';
   SELECT COUNT(*) FROM products WHERE shipping_clone_id = ''1'' OR shipping_clone_id = 1;
' AS instructions; 