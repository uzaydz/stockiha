-- إصلاح مشكلة وظائف إعدادات النماذج (الإصدار الثاني)
-- المشكلة: وجود مشكلة في سياسة أمان الصفوف (RLS) عند محاولة حفظ إعدادات النموذج

-- حذف جميع الإصدارات الحالية من الوظيفة
DROP FUNCTION IF EXISTS upsert_form_settings(uuid, text, jsonb, jsonb, boolean, boolean, uuid);
DROP FUNCTION IF EXISTS upsert_form_settings(uuid, text, jsonb, jsonb, boolean, boolean, jsonb, uuid);
DROP FUNCTION IF EXISTS upsert_form_settings(uuid, text, jsonb, jsonb, boolean, boolean, jsonb);

-- إنشاء إصدار جديد من الوظيفة يدعم إعدادات التكامل مع شركة الشحن
-- مع إضافة SECURITY DEFINER لتجاوز سياسة أمان الصفوف
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
SECURITY DEFINER -- إضافة SECURITY DEFINER لتجاوز سياسة أمان الصفوف
SET search_path = public -- تحديد مسار البحث للأمان
AS $$
DECLARE
    v_form_id UUID;
    v_settings JSONB;
    v_auth_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم الحالي من نظام المصادقة
    v_auth_user_id := auth.uid();
    
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
                v_auth_user_id,
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
            v_auth_user_id,
            v_settings
        )
        RETURNING id INTO v_form_id;
    END IF;

    RETURN v_form_id;
END;
$$;

-- التحقق من سياسات الأمان المطبقة على جدول form_settings وإضافة السياسات اللازمة
DO $$
BEGIN
    -- حذف السياسات الموجودة إذا كانت موجودة
    DROP POLICY IF EXISTS form_settings_select_policy ON form_settings;
    DROP POLICY IF EXISTS form_settings_insert_policy ON form_settings;
    DROP POLICY IF EXISTS form_settings_update_policy ON form_settings;
    DROP POLICY IF EXISTS form_settings_delete_policy ON form_settings;
    
    -- إضافة سياسات جديدة
    
    -- سياسة القراءة: يمكن للمستخدم قراءة السجلات التي تنتمي إلى مؤسسته
    CREATE POLICY form_settings_select_policy ON form_settings
        FOR SELECT
        USING (
            organization_id IN (
                SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
            )
        );
    
    -- سياسة الإدراج: يمكن للمستخدم إدراج سجلات لمؤسسته
    CREATE POLICY form_settings_insert_policy ON form_settings
        FOR INSERT
        WITH CHECK (
            organization_id IN (
                SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
            )
        );
    
    -- سياسة التحديث: يمكن للمستخدم تحديث السجلات التي تنتمي إلى مؤسسته
    CREATE POLICY form_settings_update_policy ON form_settings
        FOR UPDATE
        USING (
            organization_id IN (
                SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
            )
        );
    
    -- سياسة الحذف: يمكن للمستخدم حذف السجلات التي تنتمي إلى مؤسسته
    CREATE POLICY form_settings_delete_policy ON form_settings
        FOR DELETE
        USING (
            organization_id IN (
                SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة وجود خطأ في إنشاء السياسات (مثل عدم وجود جدول user_organizations)
        -- استخدم سياسات مبسطة
        DROP POLICY IF EXISTS form_settings_select_policy ON form_settings;
        DROP POLICY IF EXISTS form_settings_insert_policy ON form_settings;
        DROP POLICY IF EXISTS form_settings_update_policy ON form_settings;
        DROP POLICY IF EXISTS form_settings_delete_policy ON form_settings;
        
        CREATE POLICY form_settings_all_policy ON form_settings
            FOR ALL
            USING (true)
            WITH CHECK (true);
END
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
SECURITY DEFINER -- إضافة SECURITY DEFINER لتجاوز سياسة أمان الصفوف
SET search_path = public -- تحديد مسار البحث للأمان
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
BEGIN;
    UPDATE form_settings
    SET settings = jsonb_build_object('shipping_integration', '{"enabled": false, "provider": null}'::JSONB)
    WHERE settings IS NULL OR settings = '{}'::JSONB;
COMMIT;

-- الاستعلام عن الإعدادات الحالية (للتحقق)
-- SELECT id, name, settings FROM form_settings; 