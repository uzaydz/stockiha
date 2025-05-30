-- إصلاح مشكلة الدخول من النطاق المحلي (localhost) وIP المحلي (127.0.0.1)

-- تعديل دالة get_public_domains لتشمل النطاقات المحلية
CREATE OR REPLACE FUNCTION get_public_domains()
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY[
        'ktobi.online', 
        'stockiha.com', 
        'bazaar.com', 
        'bazaar.dev',
        'localhost', 
        '127.0.0.1'
    ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- دالة معدلة للتحقق مما إذا كان النطاق عاماً
CREATE OR REPLACE FUNCTION is_public_domain(p_domain TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_public_domains TEXT[];
    v_domain TEXT;
    v_with_www TEXT[];
BEGIN
    -- تعامل خاص مع النطاقات المحلية بغض النظر عن المنفذ (port)
    IF p_domain IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- التحقق من النطاقات المحلية
    IF p_domain = 'localhost' OR 
       p_domain LIKE 'localhost:%' OR
       p_domain = '127.0.0.1' OR
       p_domain LIKE '127.0.0.1:%' THEN
        RETURN TRUE;
    END IF;
    
    -- جلب قائمة النطاقات العامة
    SELECT get_public_domains() INTO v_public_domains;
    
    -- إنشاء مصفوفة بالنطاقات مع إضافة www
    v_with_www := ARRAY[]::TEXT[];
    FOREACH v_domain IN ARRAY v_public_domains
    LOOP
        v_with_www := v_with_www || ('www.' || v_domain);
    END LOOP;
    
    -- التحقق مما إذا كان النطاق موجوداً في قائمة النطاقات العامة
    RETURN p_domain = ANY(v_public_domains) OR 
           ('www.' || p_domain) = ANY(v_public_domains) OR
           p_domain = ANY(v_with_www);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION get_public_domains() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_public_domain(TEXT) TO authenticated, anon; 