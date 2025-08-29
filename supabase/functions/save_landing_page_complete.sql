-- Function لحفظ صفحة الهبوط كاملة مع جميع مكوناتها في عملية واحدة
-- هذا يحل مشكلة الاستدعاءات المتعددة ويحسن الأداء بشكل كبير

CREATE OR REPLACE FUNCTION save_landing_page_complete(
    p_landing_page_id UUID,
    p_landing_page_data JSONB,
    p_components_data JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_component JSONB;
    v_component_id UUID;
    v_position INTEGER;
    v_updated_components INTEGER := 0;
    v_created_components INTEGER := 0;
    v_deleted_components INTEGER := 0;
    v_existing_component_ids UUID[];
    v_new_component_ids UUID[];
    v_errors TEXT[] := '{}';
BEGIN
    -- بدء المعاملة
    BEGIN
        -- 1. تحديث صفحة الهبوط الرئيسية
        UPDATE landing_pages 
        SET 
            name = COALESCE(p_landing_page_data->>'name', name),
            title = COALESCE(p_landing_page_data->>'title', title),
            description = COALESCE(p_landing_page_data->>'description', description),
            keywords = COALESCE(p_landing_page_data->>'keywords', keywords),
            is_published = COALESCE((p_landing_page_data->>'is_published')::boolean, is_published),
            updated_at = NOW()
        WHERE id = p_landing_page_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Landing page not found: %', p_landing_page_id;
        END IF;
        
        -- 2. الحصول على المكونات الموجودة حالياً
        SELECT ARRAY_AGG(id) INTO v_existing_component_ids
        FROM landing_page_components 
        WHERE landing_page_id = p_landing_page_id;
        
        -- 3. معالجة المكونات الجديدة والمحدثة
        v_position := 1;
        FOREACH v_component IN ARRAY p_components_data
        LOOP
            BEGIN
                -- إذا كان المكون موجود (له id)
                IF v_component->>'id' IS NOT NULL THEN
                    -- تحديث المكون الموجود
                    UPDATE landing_page_components 
                    SET 
                        type = v_component->>'type',
                        settings = v_component->'settings',
                        is_active = COALESCE((v_component->>'is_active')::boolean, true),
                        position = v_position,
                        updated_at = NOW()
                    WHERE id = (v_component->>'id')::UUID 
                    AND landing_page_id = p_landing_page_id;
                    
                    IF FOUND THEN
                        v_updated_components := v_updated_components + 1;
                        v_new_component_ids := array_append(v_new_component_ids, (v_component->>'id')::UUID);
                    END IF;
                ELSE
                    -- إنشاء مكون جديد
                    INSERT INTO landing_page_components (
                        landing_page_id,
                        type,
                        settings,
                        is_active,
                        position,
                        created_at,
                        updated_at
                    ) VALUES (
                        p_landing_page_id,
                        v_component->>'type',
                        v_component->'settings',
                        COALESCE((v_component->>'is_active')::boolean, true),
                        v_position,
                        NOW(),
                        NOW()
                    ) RETURNING id INTO v_component_id;
                    
                    v_created_components := v_created_components + 1;
                    v_new_component_ids := array_append(v_new_component_ids, v_component_id);
                END IF;
                
                v_position := v_position + 1;
                
            EXCEPTION WHEN OTHERS THEN
                -- تسجيل الخطأ والاستمرار
                v_errors := array_append(v_errors, 
                    format('Component %s: %s', v_position, SQLERRM));
            END;
        END LOOP;
        
        -- 4. حذف المكونات التي لم تعد موجودة
        IF v_existing_component_ids IS NOT NULL AND v_new_component_ids IS NOT NULL THEN
            DELETE FROM landing_page_components 
            WHERE landing_page_id = p_landing_page_id 
            AND id = ANY(v_existing_component_ids)
            AND id != ALL(v_new_component_ids);
            
            GET DIAGNOSTICS v_deleted_components = ROW_COUNT;
        END IF;
        
        -- 5. إعادة ترتيب المكونات المتبقية (للأمان)
        UPDATE landing_page_components 
        SET position = sub.position
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position) as position
            FROM landing_page_components 
            WHERE landing_page_id = p_landing_page_id
            ORDER BY position
        ) sub
        WHERE landing_page_components.id = sub.id;
        
        -- 6. إرجاع النتيجة
        v_result := jsonb_build_object(
            'success', true,
            'landing_page_id', p_landing_page_id,
            'updated_at', NOW(),
            'components_updated', v_updated_components,
            'components_created', v_created_components,
            'components_deleted', v_deleted_components,
            'total_components', v_position - 1,
            'errors', v_errors
        );
        
        -- تأكيد المعاملة
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        -- التراجع عن المعاملة في حالة حدوث خطأ
        RAISE;
    END;
END;
$$;

-- إضافة تعليقات للـ function
COMMENT ON FUNCTION save_landing_page_complete IS 'حفظ صفحة الهبوط كاملة مع جميع مكوناتها في عملية واحدة - يحسن الأداء ويقلل الاستدعاءات';

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_landing_page_components_landing_page_position 
ON landing_page_components(landing_page_id, position);

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_landing_page_components_landing_page_type 
ON landing_page_components(landing_page_id, type);
