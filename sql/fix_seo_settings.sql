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
BEGIN
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
            RAISE EXCEPTION 'فشل إدراج إعدادات SEO الجديدة';
        END IF;
    END IF;
    
    -- تنظيف ذاكرة التخزين المؤقت لـ SEO إذا كانت موجودة
    BEGIN
        DELETE FROM public.seo_cache 
        WHERE organization_id = _organization_id 
        AND cache_type LIKE 'seo_%';
    EXCEPTION WHEN undefined_table THEN
        -- تجاهل الخطأ إذا كان الجدول غير موجود
        NULL;
    END;
    
    -- تسجيل نجاح العملية
    RAISE NOTICE 'تم تحديث إعدادات SEO بنجاح للمؤسسة: %', _organization_id;
    
    RETURN updated_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        component_type = 'seo_settings' AND EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = ANY(ARRAY(
                SELECT user_id FROM public.organization_members
                WHERE organization_id = store_settings.organization_id
                AND role IN ('admin', 'editor')
            ))
        )
    );
END
$$; 