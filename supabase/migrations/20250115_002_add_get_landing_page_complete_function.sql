-- Migration: إضافة function لجلب صفحة الهبوط كاملة
-- التاريخ: 2025-01-15
-- الوصف: إنشاء RPC function لجلب صفحة الهبوط مع جميع مكوناتها في استدعاء واحد

-- إنشاء الـ function
CREATE OR REPLACE FUNCTION get_landing_page_complete(
    p_slug TEXT DEFAULT NULL,
    p_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_landing_page_id UUID;
    v_landing_page_data JSONB;
    v_components_data JSONB;
BEGIN
    -- تحديد معرف صفحة الهبوط
    IF p_id IS NOT NULL THEN
        v_landing_page_id := p_id;
    ELSIF p_slug IS NOT NULL THEN
        SELECT id INTO v_landing_page_id
        FROM landing_pages 
        WHERE slug = p_slug AND is_deleted = false;
    ELSE
        RAISE EXCEPTION 'يجب تحديد إما slug أو id';
    END IF;
    
    IF v_landing_page_id IS NULL THEN
        RAISE EXCEPTION 'صفحة الهبوط غير موجودة';
    END IF;
    
    -- 1. جلب بيانات صفحة الهبوط
    SELECT jsonb_build_object(
        'id', lp.id,
        'name', lp.name,
        'slug', lp.slug,
        'title', lp.title,
        'description', lp.description,
        'keywords', lp.keywords,
        'is_published', lp.is_published,
        'organization_id', lp.organization_id,
        'created_at', lp.created_at,
        'updated_at', lp.updated_at,
        'created_by', lp.created_by
    ) INTO v_landing_page_data
    FROM landing_pages lp
    WHERE lp.id = v_landing_page_id AND lp.is_deleted = false;
    
    IF v_landing_page_data IS NULL THEN
        RAISE EXCEPTION 'صفحة الهبوط غير موجودة';
    END IF;
    
    -- 2. جلب جميع المكونات النشطة مرتبة حسب الموضع
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', lpc.id,
            'type', lpc.type,
            'position', lpc.position,
            'is_active', lpc.is_active,
            'settings', lpc.settings,
            'created_at', lpc.created_at,
            'updated_at', lpc.updated_at
        ) ORDER BY lpc.position
    ) INTO v_components_data
    FROM landing_page_components lpc
    WHERE lpc.landing_page_id = v_landing_page_id 
    AND lpc.is_active = true;
    
    -- 3. تجميع النتيجة النهائية
    v_result := jsonb_build_object(
        'success', true,
        'landing_page', v_landing_page_data,
        'components', COALESCE(v_components_data, '[]'::jsonb),
        'total_components', COALESCE(jsonb_array_length(v_components_data), 0),
        'fetched_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- إرجاع خطأ منظم
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'fetched_at', NOW()
    );
END;
$$;

-- إضافة تعليقات للـ function
COMMENT ON FUNCTION get_landing_page_complete IS 'جلب صفحة الهبوط كاملة مع جميع مكوناتها في استدعاء واحد - يحسن الأداء ويقلل الاستدعاءات';

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug_active 
ON landing_pages(slug, is_deleted) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_landing_page_components_active_position 
ON landing_page_components(landing_page_id, is_active, position) WHERE is_active = true;

-- إضافة RLS policies إذا لزم الأمر
-- GRANT EXECUTE ON FUNCTION get_landing_page_complete TO authenticated;
