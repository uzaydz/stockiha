-- إصلاح مشكلة تحديث إعدادات تحسين محركات البحث (SEO)
-- هذا الملف يعالج المشكلة التي تظهر عند تحديث إعدادات SEO

-- 1. تحديث وظيفة update_store_seo_settings لتضمن عودة تحديثات صحيحة
CREATE OR REPLACE FUNCTION public.update_store_seo_settings(
    _organization_id UUID,
    _settings JSONB
)
RETURNS JSONB AS $$
DECLARE
    updated_settings JSONB;
    existing_id UUID;
    v_user_id UUID;
    v_user_org_id UUID;
    v_is_admin BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتحديث إعدادات SEO';
    END IF;

    -- التحقق من صلاحية المستخدم
    SELECT 
        u.organization_id,
        u.is_org_admin OR u.is_super_admin,
        COALESCE(u.permissions->>'manageOrganizationSettings' = 'true', false)
    INTO 
        v_user_org_id,
        v_is_admin,
        v_has_permission
    FROM 
        users u
    WHERE 
        u.id = v_user_id;
    
    IF v_user_org_id IS NULL OR (v_user_org_id != _organization_id AND NOT v_is_admin) THEN
        RAISE EXCEPTION 'غير مصرح لك بتعديل بيانات هذه المؤسسة';
    END IF;
    
    IF NOT (v_is_admin OR v_has_permission) THEN
        RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
    END IF;

    -- تحقق ما إذا كانت إعدادات SEO موجودة مسبقاً
    SELECT id INTO existing_id
    FROM public.store_settings
    WHERE organization_id = _organization_id
    AND component_type = 'seo_settings';
    
    -- تحديث إعدادات SEO إذا كانت موجودة
    IF existing_id IS NOT NULL THEN
        UPDATE public.store_settings
        SET 
            settings = _settings,
            updated_at = NOW()
        WHERE 
            id = existing_id
        RETURNING settings INTO updated_settings;
        
        -- التحقق من أن التحديث تم بنجاح
        IF updated_settings IS NULL THEN
            RAISE EXCEPTION 'فشل تحديث إعدادات SEO، لم يتم العثور على السجل بعد التحديث';
        END IF;
    -- إذا لم يتم العثور على إعدادات، إنشاء سجل جديد
    ELSE
        INSERT INTO public.store_settings (
            organization_id,
            component_type,
            settings,
            is_active,
            order_index
        ) VALUES (
            _organization_id,
            'seo_settings',
            _settings,
            true,
            (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.store_settings WHERE organization_id = _organization_id)
        )
        RETURNING settings INTO updated_settings;
        
        -- التحقق من أن الإدراج تم بنجاح
        IF updated_settings IS NULL THEN
            RAISE EXCEPTION 'فشل إنشاء إعدادات SEO جديدة';
        END IF;
    END IF;
    
    -- تنظيف ذاكرة التخزين المؤقت لـ SEO إذا كانت موجودة
    DELETE FROM public.seo_cache 
    WHERE organization_id = _organization_id 
    AND cache_type LIKE 'seo_%';
    
    -- إضافة سجل في سجل التغييرات
    INSERT INTO settings_audit_log (
        user_id,
        organization_id,
        setting_type,
        setting_key,
        new_value,
        action_type,
        table_name,
        record_id,
        created_at
    ) VALUES (
        v_user_id,
        _organization_id,
        'store',
        'seo_settings',
        _settings::TEXT,
        CASE WHEN existing_id IS NULL THEN 'INSERT' ELSE 'UPDATE' END,
        'store_settings',
        COALESCE(existing_id, (SELECT id FROM store_settings WHERE organization_id = _organization_id AND component_type = 'seo_settings')),
        NOW()
    );
    
    RETURN updated_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION public.update_store_seo_settings(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_seo_settings(UUID, JSONB) TO service_role;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION public.update_store_seo_settings IS 'تحديث إعدادات SEO مع التحقق من الصلاحيات وضمان الحفظ الصحيح';

-- 2. إضافة وظيفة مساعدة لفحص وضبط مشاكل إعدادات SEO
CREATE OR REPLACE FUNCTION public.fix_seo_settings()
RETURNS VOID AS $$
DECLARE
    org_record RECORD;
    custom_js_data JSONB;
    seo_settings JSONB;
    existing_id UUID;
BEGIN
    -- المرور على جميع المؤسسات التي لديها custom_js
    FOR org_record IN (
        SELECT id, custom_js FROM public.organization_settings 
        WHERE custom_js IS NOT NULL AND custom_js != 'null'
    ) LOOP
        BEGIN
            -- محاولة استخراج إعدادات SEO من custom_js
            custom_js_data := org_record.custom_js::JSONB;
            
            IF custom_js_data ? 'seoSettings' THEN
                seo_settings := custom_js_data->'seoSettings';
                
                -- التحقق من وجود إعدادات SEO في الجدول المخصص
                SELECT id INTO existing_id
                FROM public.store_settings
                WHERE organization_id = org_record.id
                AND component_type = 'seo_settings';
                
                -- إذا لم تكن موجودة، إضافتها
                IF existing_id IS NULL THEN
                    INSERT INTO public.store_settings (
                        organization_id,
                        component_type,
                        settings,
                        is_active,
                        order_index
                    ) VALUES (
                        org_record.id,
                        'seo_settings',
                        seo_settings,
                        true,
                        (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.store_settings WHERE organization_id = org_record.id)
                    );
                    
                    RAISE NOTICE 'تم إنشاء إعدادات SEO جديدة للمؤسسة: %', org_record.id;
                -- إذا كانت موجودة، تحديثها فقط إذا كانت قيمة settings فارغة
                ELSE
                    UPDATE public.store_settings
                    SET settings = seo_settings
                    WHERE id = existing_id
                    AND (settings IS NULL OR settings = '{}'::JSONB);
                    
                    RAISE NOTICE 'تم تحديث إعدادات SEO الموجودة للمؤسسة: %', org_record.id;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ أثناء معالجة إعدادات SEO للمؤسسة %: %', org_record.id, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تنفيذ وظيفة إصلاح إعدادات SEO لضمان تطابق البيانات
SELECT public.fix_seo_settings();

-- 4. إضافة سياسة تطبيق للتأكد من أن فقط المستخدمين المصرح لهم يمكنهم تعديل إعدادات SEO
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings' AND policyname = 'seo_settings_update_policy') THEN
        DROP POLICY seo_settings_update_policy ON public.store_settings;
    END IF;
    
    CREATE POLICY seo_settings_update_policy ON public.store_settings
    FOR UPDATE
    USING (
        component_type = 'seo_settings' AND 
        (
            -- المستخدم ينتمي للمؤسسة وهو مدير أو لديه صلاحيات
            auth.uid() IN (
                SELECT u.id FROM users u 
                WHERE u.organization_id = store_settings.organization_id
                AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
            )
            -- أو المستخدم هو المدير الأعلى
            OR auth.uid() IN (SELECT id FROM users WHERE is_super_admin = true)
        )
    );
END
$$; 