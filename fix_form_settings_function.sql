-- إصلاح مشكلة وظائف إعدادات النماذج
-- المشكلة: وجود عدة نسخ من وظيفة upsert_form_settings تسبب تضاربًا عند الاستدعاء،
-- وعدم حفظ إعدادات التكامل مع شركة الشحن بشكل صحيح.

-- حذف جميع الإصدارات الحالية من الوظيفة
DROP FUNCTION IF EXISTS upsert_form_settings(uuid, text, jsonb, jsonb, boolean, boolean, uuid);
DROP FUNCTION IF EXISTS upsert_form_settings(uuid, text, jsonb, jsonb, boolean, boolean, jsonb, uuid);
DROP FUNCTION IF EXISTS upsert_form_settings(uuid, text, jsonb, jsonb, boolean, boolean, jsonb);

-- إنشاء إصدار جديد من الوظيفة يدعم إعدادات التكامل مع شركة الشحن
CREATE OR REPLACE FUNCTION upsert_form_settings(
    p_organization_id UUID,
    p_name TEXT,
    p_fields JSONB,
    p_product_ids JSONB DEFAULT '[]'::JSONB,
    p_is_default BOOLEAN DEFAULT FALSE,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_shipping_integration JSONB DEFAULT '{"enabled": false, "provider": null}'::JSONB,
    p_form_id UUID DEFAULT NULL
) 
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_form_id UUID;
    v_settings JSONB;
BEGIN
    -- إنشاء كائن JSON للإعدادات مع معلومات تكامل الشحن
    v_settings := jsonb_build_object('shipping_integration', p_shipping_integration);

    -- إذا كانت الإعدادات الجديدة هي الافتراضية، نقوم بإلغاء تعيين الإعدادات الافتراضية السابقة
    IF p_is_default = true THEN
        UPDATE form_settings
        SET is_default = false
        WHERE organization_id = p_organization_id AND is_default = true AND id != COALESCE(p_form_id, uuid_nil());
    END IF;

    -- إذا كان هناك معرف للنموذج، نقوم بتحديثه
    IF p_form_id IS NOT NULL THEN
        UPDATE form_settings
        SET 
            name = p_name,
            fields = p_fields,
            product_ids = p_product_ids,
            is_default = p_is_default,
            is_active = p_is_active,
            settings = v_settings,
            updated_at = NOW()
        WHERE id = p_form_id AND organization_id = p_organization_id
        RETURNING id INTO v_form_id;
        
        -- إذا لم يتم العثور على النموذج (v_form_id IS NULL)، نقوم بإنشاء نموذج جديد
        IF v_form_id IS NULL THEN
            INSERT INTO form_settings (
                id,
                organization_id,
                name,
                fields,
                product_ids,
                is_default,
                is_active,
                created_by,
                settings
            )
            VALUES (
                COALESCE(p_form_id, uuid_generate_v4()),
                p_organization_id,
                p_name,
                p_fields,
                p_product_ids,
                p_is_default,
                p_is_active,
                auth.uid(),
                v_settings
            )
            RETURNING id INTO v_form_id;
        END IF;
    ELSE
        -- إنشاء نموذج جديد
        INSERT INTO form_settings (
            organization_id,
            name,
            fields,
            product_ids,
            is_default,
            is_active,
            created_by,
            settings
        )
        VALUES (
            p_organization_id,
            p_name,
            p_fields,
            p_product_ids,
            p_is_default,
            p_is_active,
            auth.uid(),
            v_settings
        )
        RETURNING id INTO v_form_id;
    END IF;

    -- التحقق من حفظ الإعدادات بشكل صحيح (يمكن إزالة هذا في الإنتاج)
    -- هذا للتأكد من أن الإعدادات تم حفظها بشكل صحيح
    RAISE NOTICE 'Form settings saved with ID: %, Settings: %', v_form_id, v_settings;

    RETURN v_form_id;
END;
$$;

-- إنشاء وظيفة لاختبار ما إذا كانت إعدادات تكامل الشحن تم حفظها بشكل صحيح
CREATE OR REPLACE FUNCTION test_shipping_integration_settings(p_form_id UUID)
RETURNS TABLE (
    form_id UUID,
    form_name TEXT, 
    shipping_enabled BOOLEAN,
    shipping_provider TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id AS form_id,
        name AS form_name,
        (settings->'shipping_integration'->>'enabled')::BOOLEAN AS shipping_enabled,
        settings->'shipping_integration'->>'provider' AS shipping_provider
    FROM form_settings
    WHERE id = p_form_id;
END;
$$;

-- تحديث حقل settings في السجلات الموجودة التي ليس لها إعدادات
UPDATE form_settings
SET settings = jsonb_build_object('shipping_integration', '{"enabled": false, "provider": null}'::JSONB)
WHERE settings IS NULL OR settings = '{}'::JSONB;

-- الاستعلام عن الإعدادات الحالية (للتحقق)
-- SELECT id, name, settings FROM form_settings; 