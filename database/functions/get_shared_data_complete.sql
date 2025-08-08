-- دالة محسنة لجلب جميع البيانات المشتركة في استدعاء واحد
-- تقلل الضغط على قاعدة البيانات من ~5 استدعاءات إلى استدعاء واحد
CREATE OR REPLACE FUNCTION get_shared_data_complete(
    p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB := '{}'::JSONB;
    v_performance JSONB := '{}'::JSONB;
    v_start_time TIMESTAMP := NOW();
    v_step_time TIMESTAMP;
    v_steps JSONB[] := ARRAY[]::JSONB[];
BEGIN
    -- تسجيل بداية العملية
    v_step_time := NOW();
    
    -- 1. جلب إعدادات المؤسسة
    v_performance := v_performance || jsonb_build_object(
        'step1_start', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    
    SELECT jsonb_build_object(
        'organizationSettings', 
        COALESCE(
            (SELECT to_jsonb(os.*) 
             FROM organization_settings os 
             WHERE os.organization_id = p_organization_id
             LIMIT 1), 
            NULL
        )
    ) INTO v_result;

    v_steps := v_steps || jsonb_build_object(
        'step', 'organization_settings',
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - v_step_time)) * 1000
    );
    v_step_time := NOW();

    -- 2. جلب الولايات
    v_performance := v_performance || jsonb_build_object(
        'step2_start', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    
    v_result := v_result || jsonb_build_object(
        'provinces',
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name
                )
                ORDER BY name
            )
            FROM yalidine_provinces_global),
            '[]'::jsonb
        )
    );

    v_steps := v_steps || jsonb_build_object(
        'step', 'provinces',
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - v_step_time)) * 1000
    );
    v_step_time := NOW();

    -- 3. جلب البلديات
    v_performance := v_performance || jsonb_build_object(
        'step3_start', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    
    v_result := v_result || jsonb_build_object(
        'municipalities',
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name,
                    'wilaya_id', wilaya_id,
                    'wilaya_name', wilaya_name,
                    'name_ar', name_ar,
                    'wilaya_name_ar', wilaya_name_ar
                )
                ORDER BY name
            )
            FROM yalidine_municipalities_global),
            '[]'::jsonb
        )
    );

    v_steps := v_steps || jsonb_build_object(
        'step', 'municipalities',
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - v_step_time)) * 1000
    );
    v_step_time := NOW();

    -- 4. جلب حالات تأكيد المكالمة
    v_performance := v_performance || jsonb_build_object(
        'step4_start', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    
    v_result := v_result || jsonb_build_object(
        'callConfirmationStatuses',
        COALESCE(
            (SELECT jsonb_agg(
                to_jsonb(ccs.*)
                ORDER BY ccs.is_default DESC, ccs.name ASC
            )
            FROM call_confirmation_statuses ccs
            WHERE ccs.organization_id = p_organization_id),
            '[]'::jsonb
        )
    );

    v_steps := v_steps || jsonb_build_object(
        'step', 'call_confirmation_statuses',
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - v_step_time)) * 1000
    );
    v_step_time := NOW();

    -- 5. جلب شركات الشحن المفعلة
    v_performance := v_performance || jsonb_build_object(
        'step5_start', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    
    v_result := v_result || jsonb_build_object(
        'shippingProviders',
        COALESCE(
            (SELECT jsonb_agg(to_jsonb(sdv.*))
             FROM shipping_data_view sdv
             WHERE sdv.is_enabled = true 
               AND sdv.provider_id IS NOT NULL
               AND sdv.organization_id = p_organization_id),
            '[]'::jsonb
        )
    );

    v_steps := v_steps || jsonb_build_object(
        'step', 'shipping_providers',
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - v_step_time)) * 1000
    );

    -- 6. إضافة معلومات الأداء
    v_performance := v_performance || jsonb_build_object(
        'total_duration_ms', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
        'steps', v_steps,
        'optimizationVersion', '1.0',
        'singleQuery', true,
        'timestamp', EXTRACT(EPOCH FROM NOW())
    );

    -- إضافة البيانات الافتراضية للمنتجات والفئات (سيتم تطويرها لاحقاً)
    v_result := v_result || jsonb_build_object(
        'products', '[]'::jsonb,
        'categories', '[]'::jsonb,
        'featuredProducts', '[]'::jsonb,
        'performance', v_performance
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- في حالة الخطأ، إرجاع بيانات افتراضية مع رسالة الخطأ
        RETURN jsonb_build_object(
            'organizationSettings', NULL,
            'products', '[]'::jsonb,
            'categories', '[]'::jsonb,
            'featuredProducts', '[]'::jsonb,
            'provinces', '[]'::jsonb,
            'municipalities', '[]'::jsonb,
            'callConfirmationStatuses', '[]'::jsonb,
            'shippingProviders', '[]'::jsonb,
            'error', SQLERRM,
            'performance', jsonb_build_object(
                'total_duration_ms', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
                'error', true,
                'errorMessage', SQLERRM
            )
        );
END;
$$; 