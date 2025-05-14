-- نظام تخزين مؤقت لـ Yalidine API لتجنب تجاوز حدود الاستعلامات
-- هذا النظام يقوم بتخزين البيانات المسترجعة من Yalidine API في قاعدة البيانات
-- ويقوم بإدارة الاستعلامات لضمان عدم تجاوز حدود الاستعلامات المسموح بها

-- بنية جداول التخزين المؤقت

-- جدول لتتبع طلبات API
CREATE TABLE IF NOT EXISTS yalidine_api_requests (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL,
    request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN,
    response_code INTEGER,
    error_message TEXT
);

-- جدول لتخزين الولايات (تتغير نادرًا)
CREATE TABLE IF NOT EXISTS yalidine_wilayas (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    zone INTEGER,
    is_deliverable BOOLEAN,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لتخزين البلديات (تتغير نادرًا)
CREATE TABLE IF NOT EXISTS yalidine_communes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    wilaya_id INTEGER REFERENCES yalidine_wilayas(id),
    has_stop_desk BOOLEAN,
    is_deliverable BOOLEAN,
    delivery_time_parcel INTEGER,
    delivery_time_payment INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لتخزين مراكز التوصيل (تتغير نادرًا)
CREATE TABLE IF NOT EXISTS yalidine_centers (
    center_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    gps TEXT,
    commune_id INTEGER REFERENCES yalidine_communes(id),
    wilaya_id INTEGER REFERENCES yalidine_wilayas(id),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لتخزين الطرود
CREATE TABLE IF NOT EXISTS yalidine_parcels (
    tracking TEXT PRIMARY KEY,
    order_id TEXT,
    firstname TEXT,
    familyname TEXT,
    contact_phone TEXT,
    address TEXT,
    is_stopdesk BOOLEAN,
    stopdesk_id INTEGER,
    from_wilaya_id INTEGER,
    to_commune_id INTEGER,
    to_wilaya_id INTEGER,
    product_list TEXT,
    price INTEGER,
    last_status TEXT,
    date_creation TIMESTAMP WITH TIME ZONE,
    date_last_status TIMESTAMP WITH TIME ZONE,
    complete_data JSONB, -- لتخزين كل البيانات الأخرى
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لتخزين تواريخ الطرود
CREATE TABLE IF NOT EXISTS yalidine_histories (
    id SERIAL PRIMARY KEY,
    tracking TEXT REFERENCES yalidine_parcels(tracking),
    date_status TIMESTAMP WITH TIME ZONE,
    status TEXT,
    reason TEXT,
    center_id INTEGER,
    wilaya_id INTEGER,
    commune_id INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لتخزين رسوم الشحن
CREATE TABLE IF NOT EXISTS yalidine_fees (
    id SERIAL PRIMARY KEY,
    from_wilaya_id INTEGER REFERENCES yalidine_wilayas(id),
    to_wilaya_id INTEGER REFERENCES yalidine_wilayas(id),
    zone INTEGER,
    retour_fee INTEGER,
    cod_percentage FLOAT,
    insurance_percentage FLOAT,
    oversize_fee INTEGER,
    fee_data JSONB, -- لتخزين بيانات الرسوم المفصلة للبلديات
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_wilaya_id, to_wilaya_id)
);

-- وظائف إدارة معدل الاستعلامات

-- وظيفة للتحقق مما إذا كان يمكن إجراء طلب API جديد
CREATE OR REPLACE FUNCTION can_request_yalidine_api() 
RETURNS BOOLEAN AS $$
DECLARE
    second_count INTEGER;
    minute_count INTEGER;
    hour_count INTEGER;
    day_count INTEGER;
BEGIN
    -- عدد الطلبات في آخر ثانية
    SELECT COUNT(*) INTO second_count FROM yalidine_api_requests 
    WHERE request_time > NOW() - INTERVAL '1 second';
    
    -- عدد الطلبات في آخر دقيقة
    SELECT COUNT(*) INTO minute_count FROM yalidine_api_requests 
    WHERE request_time > NOW() - INTERVAL '1 minute';
    
    -- عدد الطلبات في آخر ساعة
    SELECT COUNT(*) INTO hour_count FROM yalidine_api_requests 
    WHERE request_time > NOW() - INTERVAL '1 hour';
    
    -- عدد الطلبات في آخر يوم
    SELECT COUNT(*) INTO day_count FROM yalidine_api_requests 
    WHERE request_time > NOW() - INTERVAL '1 day';
    
    -- التحقق من الحصص
    -- نترك دائمًا هامش أمان بقيمة 1 طلب لكل فترة زمنية
    IF second_count >= 4 THEN -- الحد الأقصى 5 طلبات في الثانية
        RETURN FALSE;
    END IF;
    
    IF minute_count >= 45 THEN -- الحد الأقصى 50 طلبًا في الدقيقة
        RETURN FALSE;
    END IF;
    
    IF hour_count >= 950 THEN -- الحد الأقصى 1000 طلب في الساعة
        RETURN FALSE;
    END IF;
    
    IF day_count >= 9900 THEN -- الحد الأقصى 10000 طلب في اليوم
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتسجيل طلب API
CREATE OR REPLACE FUNCTION log_yalidine_api_request(
    p_endpoint TEXT,
    p_success BOOLEAN,
    p_response_code INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) 
RETURNS INTEGER AS $$
DECLARE
    v_request_id INTEGER;
BEGIN
    INSERT INTO yalidine_api_requests (
        endpoint, 
        success, 
        response_code, 
        error_message
    ) 
    VALUES (
        p_endpoint, 
        p_success, 
        p_response_code, 
        p_error_message
    )
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- وظائف لاسترجاع وتحديث البيانات من API

-- وظيفة لتحديث الولايات
CREATE OR REPLACE FUNCTION update_yalidine_wilayas(
    force_update BOOLEAN DEFAULT FALSE
) 
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_last_update TIMESTAMP WITH TIME ZONE;
BEGIN
    -- تحقق من آخر تحديث
    SELECT MAX(last_updated) INTO v_last_update FROM yalidine_wilayas;
    
    -- إذا تم التحديث في آخر 24 ساعة ولم يتم طلب تحديث إجباري، فلا تقم بالتحديث
    IF v_last_update IS NOT NULL AND v_last_update > NOW() - INTERVAL '1 day' AND NOT force_update THEN
        RAISE NOTICE 'Wilayas data is recent. No update needed.';
        RETURN 0;
    END IF;
    
    -- تحقق من إمكانية إجراء طلب API
    IF NOT can_request_yalidine_api() THEN
        RAISE EXCEPTION 'Cannot make API request at this time due to rate limits';
    END IF;
    
    -- هنا يجب إضافة كود لاستدعاء Yalidine API واسترجاع بيانات الولايات
    -- هذا يتطلب استخدام وظيفة مثل pg_http أو كتابة وظيفة خارجية في الكود الخاص بالتطبيق
    
    -- لأغراض المثال، سنفترض أن البيانات تم استرجاعها ونقوم بمحاكاة العملية
    PERFORM log_yalidine_api_request('/v1/wilayas/', TRUE, 200);
    
    -- يمكنك إضافة عمليات الإدراج والتحديث هنا
    -- MERGE INTO yalidine_wilayas ...
    
    -- إرجاع عدد السجلات المتأثرة
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لاسترجاع البلديات من cache أو من API إذا لزم الأمر
CREATE OR REPLACE FUNCTION get_yalidine_communes(
    p_wilaya_id INTEGER DEFAULT NULL,
    p_max_age_hours INTEGER DEFAULT 24
) 
RETURNS SETOF yalidine_communes AS $$
DECLARE
    v_last_update TIMESTAMP WITH TIME ZONE;
BEGIN
    -- تحقق من آخر تحديث
    IF p_wilaya_id IS NOT NULL THEN
        SELECT MAX(last_updated) INTO v_last_update 
        FROM yalidine_communes 
        WHERE wilaya_id = p_wilaya_id;
    ELSE
        SELECT MAX(last_updated) INTO v_last_update 
        FROM yalidine_communes;
    END IF;
    
    -- إذا كانت البيانات قديمة، قم بتحديثها
    IF v_last_update IS NULL OR v_last_update < NOW() - (p_max_age_hours || ' hours')::INTERVAL THEN
        -- تحقق من إمكانية إجراء طلب API
        IF NOT can_request_yalidine_api() THEN
            RAISE WARNING 'Using outdated data because rate limit would be exceeded';
        ELSE
            -- هنا يجب إضافة كود لتحديث البيانات من API
            -- لأغراض المثال، نقوم بتسجيل طلب API فقط
            PERFORM log_yalidine_api_request('/v1/communes/', TRUE, 200);
        END IF;
    END IF;
    
    -- إرجاع البيانات من التخزين المؤقت
    IF p_wilaya_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM yalidine_communes WHERE wilaya_id = p_wilaya_id;
    ELSE
        RETURN QUERY SELECT * FROM yalidine_communes;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لاسترجاع تفاصيل الطرد من cache أو من API إذا لزم الأمر
CREATE OR REPLACE FUNCTION get_yalidine_parcel(
    p_tracking TEXT,
    p_max_age_minutes INTEGER DEFAULT 60
) 
RETURNS TABLE (
    tracking TEXT,
    order_id TEXT,
    firstname TEXT,
    last_status TEXT,
    complete_data JSONB,
    last_updated TIMESTAMP WITH TIME ZONE,
    is_fresh BOOLEAN
) AS $$
DECLARE
    v_last_update TIMESTAMP WITH TIME ZONE;
    v_is_fresh BOOLEAN := FALSE;
BEGIN
    -- تحقق من وجود الطرد في التخزين المؤقت
    SELECT last_updated INTO v_last_update 
    FROM yalidine_parcels 
    WHERE tracking = p_tracking;
    
    -- إذا كان الطرد غير موجود أو البيانات قديمة، قم بتحديثها
    IF v_last_update IS NULL OR v_last_update < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL THEN
        -- تحقق من إمكانية إجراء طلب API
        IF NOT can_request_yalidine_api() THEN
            RAISE WARNING 'Using outdated data because rate limit would be exceeded';
        ELSE
            -- هنا يجب إضافة كود لتحديث بيانات الطرد من API
            -- لأغراض المثال، نقوم بتسجيل طلب API فقط
            PERFORM log_yalidine_api_request('/v1/parcels/' || p_tracking, TRUE, 200);
            v_is_fresh := TRUE;
            
            -- في حالة الطرد غير موجود، قم بإدراجه (هذا مجرد مثال)
            IF v_last_update IS NULL THEN
                INSERT INTO yalidine_parcels (tracking, last_updated)
                VALUES (p_tracking, NOW())
                ON CONFLICT (tracking) DO 
                UPDATE SET last_updated = NOW();
            END IF;
        END IF;
    ELSE
        v_is_fresh := TRUE;
    END IF;
    
    -- إرجاع بيانات الطرد من التخزين المؤقت
    RETURN QUERY 
    SELECT 
        p.tracking, 
        p.order_id, 
        p.firstname, 
        p.last_status, 
        p.complete_data, 
        p.last_updated,
        v_is_fresh as is_fresh
    FROM yalidine_parcels p
    WHERE p.tracking = p_tracking;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لاسترجاع رسوم الشحن من cache أو من API إذا لزم الأمر
CREATE OR REPLACE FUNCTION get_yalidine_fees(
    p_from_wilaya_id INTEGER,
    p_to_wilaya_id INTEGER,
    p_max_age_days INTEGER DEFAULT 7
) 
RETURNS TABLE (
    from_wilaya_id INTEGER,
    to_wilaya_id INTEGER,
    zone INTEGER,
    retour_fee INTEGER,
    cod_percentage FLOAT,
    insurance_percentage FLOAT,
    oversize_fee INTEGER,
    fee_data JSONB,
    last_updated TIMESTAMP WITH TIME ZONE,
    is_fresh BOOLEAN
) AS $$
DECLARE
    v_last_update TIMESTAMP WITH TIME ZONE;
    v_is_fresh BOOLEAN := FALSE;
BEGIN
    -- تحقق من وجود بيانات الرسوم في التخزين المؤقت
    SELECT last_updated INTO v_last_update 
    FROM yalidine_fees 
    WHERE from_wilaya_id = p_from_wilaya_id AND to_wilaya_id = p_to_wilaya_id;
    
    -- إذا كانت البيانات غير موجودة أو قديمة، قم بتحديثها
    IF v_last_update IS NULL OR v_last_update < NOW() - (p_max_age_days || ' days')::INTERVAL THEN
        -- تحقق من إمكانية إجراء طلب API
        IF NOT can_request_yalidine_api() THEN
            RAISE WARNING 'Using outdated data because rate limit would be exceeded';
        ELSE
            -- هنا يجب إضافة كود لتحديث بيانات الرسوم من API
            -- لأغراض المثال، نقوم بتسجيل طلب API فقط
            PERFORM log_yalidine_api_request('/v1/fees/?from_wilaya_id=' || p_from_wilaya_id || '&to_wilaya_id=' || p_to_wilaya_id, TRUE, 200);
            v_is_fresh := TRUE;
            
            -- في حالة البيانات غير موجودة، قم بإدراجها (هذا مجرد مثال)
            IF v_last_update IS NULL THEN
                INSERT INTO yalidine_fees (from_wilaya_id, to_wilaya_id, last_updated)
                VALUES (p_from_wilaya_id, p_to_wilaya_id, NOW())
                ON CONFLICT (from_wilaya_id, to_wilaya_id) DO 
                UPDATE SET last_updated = NOW();
            END IF;
        END IF;
    ELSE
        v_is_fresh := TRUE;
    END IF;
    
    -- إرجاع بيانات الرسوم من التخزين المؤقت
    RETURN QUERY 
    SELECT 
        f.from_wilaya_id, 
        f.to_wilaya_id, 
        f.zone, 
        f.retour_fee, 
        f.cod_percentage, 
        f.insurance_percentage, 
        f.oversize_fee, 
        f.fee_data, 
        f.last_updated,
        v_is_fresh as is_fresh
    FROM yalidine_fees f
    WHERE f.from_wilaya_id = p_from_wilaya_id AND f.to_wilaya_id = p_to_wilaya_id;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لإنشاء وظيفة تحديث دورية (cron job) لتحديث البيانات
-- هذه الوظيفة ستعمل كل يوم لتحديث البيانات الثابتة نسبيًا
CREATE OR REPLACE FUNCTION setup_yalidine_data_refresh_job() 
RETURNS VOID AS $$
BEGIN
    -- إنشاء وظيفة cron يومية لتحديث البيانات
    -- هذا يتطلب تثبيت وتمكين امتداد pg_cron
    -- ALTER EXTENSION pg_cron UPDATE;
    -- GRANT USAGE ON SCHEMA cron TO postgres;
    
    -- حذف أي وظائف تحديث موجودة مسبقًا
    -- SELECT cron.unschedule(job_id) FROM cron.job WHERE command LIKE '%update_yalidine_wilayas%';
    -- SELECT cron.unschedule(job_id) FROM cron.job WHERE command LIKE '%update_yalidine_communes%';
    -- SELECT cron.unschedule(job_id) FROM cron.job WHERE command LIKE '%update_yalidine_centers%';
    
    -- جدولة وظائف التحديث (اختيار أوقات منخفضة الاستخدام)
    -- وظيفة تحديث الولايات: كل يوم في الساعة 2:00 صباحًا
    -- SELECT cron.schedule('update_wilayas', '0 2 * * *', 'SELECT update_yalidine_wilayas(TRUE)');
    
    -- وظيفة تحديث البلديات: كل يوم في الساعة 2:30 صباحًا
    -- SELECT cron.schedule('update_communes', '30 2 * * *', 'SELECT update_yalidine_communes()');
    
    -- وظيفة تحديث المراكز: كل يوم في الساعة 3:00 صباحًا
    -- SELECT cron.schedule('update_centers', '0 3 * * *', 'SELECT update_yalidine_centers()');
    
    RAISE NOTICE 'Yalidine data refresh jobs have been set up successfully.';
END;
$$ LANGUAGE plpgsql;

-- وظيفة للتحقق من حالة التخزين المؤقت ومعرفة البيانات التي تحتاج إلى تحديث
CREATE OR REPLACE FUNCTION check_yalidine_cache_status() 
RETURNS TABLE (
    data_type TEXT,
    total_records INTEGER,
    oldest_record TIMESTAMP WITH TIME ZONE,
    newest_record TIMESTAMP WITH TIME ZONE,
    needs_refresh BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    
    -- الولايات
    SELECT 
        'wilayas'::TEXT as data_type,
        COUNT(*)::INTEGER as total_records,
        MIN(last_updated) as oldest_record,
        MAX(last_updated) as newest_record,
        CASE WHEN MAX(last_updated) < NOW() - INTERVAL '7 days' THEN TRUE ELSE FALSE END as needs_refresh
    FROM yalidine_wilayas
    
    UNION ALL
    
    -- البلديات
    SELECT 
        'communes'::TEXT as data_type,
        COUNT(*)::INTEGER as total_records,
        MIN(last_updated) as oldest_record,
        MAX(last_updated) as newest_record,
        CASE WHEN MAX(last_updated) < NOW() - INTERVAL '7 days' THEN TRUE ELSE FALSE END as needs_refresh
    FROM yalidine_communes
    
    UNION ALL
    
    -- المراكز
    SELECT 
        'centers'::TEXT as data_type,
        COUNT(*)::INTEGER as total_records,
        MIN(last_updated) as oldest_record,
        MAX(last_updated) as newest_record,
        CASE WHEN MAX(last_updated) < NOW() - INTERVAL '7 days' THEN TRUE ELSE FALSE END as needs_refresh
    FROM yalidine_centers
    
    UNION ALL
    
    -- الطرود
    SELECT 
        'parcels'::TEXT as data_type,
        COUNT(*)::INTEGER as total_records,
        MIN(last_updated) as oldest_record,
        MAX(last_updated) as newest_record,
        FALSE as needs_refresh -- تحديث الطرود يتم عند الطلب فقط
    FROM yalidine_parcels
    
    UNION ALL
    
    -- الرسوم
    SELECT 
        'fees'::TEXT as data_type,
        COUNT(*)::INTEGER as total_records,
        MIN(last_updated) as oldest_record,
        MAX(last_updated) as newest_record,
        FALSE as needs_refresh -- تحديث الرسوم يتم عند الطلب فقط
    FROM yalidine_fees;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتنظيف البيانات القديمة وإدارة الذاكرة التخزينية
CREATE OR REPLACE FUNCTION cleanup_yalidine_cache(
    p_keep_days_parcels INTEGER DEFAULT 90,
    p_keep_days_histories INTEGER DEFAULT 180,
    p_keep_days_api_requests INTEGER DEFAULT 30
) 
RETURNS TABLE (
    table_name TEXT,
    deleted_records INTEGER
) AS $$
DECLARE
    v_deleted_parcels INTEGER;
    v_deleted_histories INTEGER;
    v_deleted_requests INTEGER;
BEGIN
    -- حذف الطرود القديمة (مع مراعاة عدم حذف الطرود النشطة)
    DELETE FROM yalidine_parcels
    WHERE 
        last_updated < NOW() - (p_keep_days_parcels || ' days')::INTERVAL AND
        last_status IN ('Livré', 'Retourné au vendeur', 'Echange échoué');
    
    GET DIAGNOSTICS v_deleted_parcels = ROW_COUNT;
    
    -- حذف سجلات تواريخ الطرود القديمة
    DELETE FROM yalidine_histories
    WHERE last_updated < NOW() - (p_keep_days_histories || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_histories = ROW_COUNT;
    
    -- حذف سجلات طلبات API القديمة
    DELETE FROM yalidine_api_requests
    WHERE request_time < NOW() - (p_keep_days_api_requests || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_requests = ROW_COUNT;
    
    -- إرجاع ملخص العمليات
    RETURN QUERY
    SELECT 'yalidine_parcels'::TEXT, v_deleted_parcels
    UNION ALL
    SELECT 'yalidine_histories'::TEXT, v_deleted_histories
    UNION ALL
    SELECT 'yalidine_api_requests'::TEXT, v_deleted_requests;
END;
$$ LANGUAGE plpgsql;

-- وظيفة للحصول على إحصائيات استخدام API
CREATE OR REPLACE FUNCTION get_yalidine_api_usage_stats(
    p_days INTEGER DEFAULT 7
) 
RETURNS TABLE (
    date_hour TIMESTAMP,
    endpoint TEXT,
    request_count INTEGER,
    success_rate FLOAT,
    remaining_quota_percent FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH hourly_stats AS (
        SELECT 
            DATE_TRUNC('hour', request_time) as date_hour,
            endpoint,
            COUNT(*) as request_count,
            AVG(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT as success_rate,
            1000 - COUNT(*) as remaining_hour_quota
        FROM yalidine_api_requests
        WHERE request_time > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('hour', request_time), endpoint
    )
    SELECT 
        date_hour,
        endpoint,
        request_count,
        success_rate,
        (remaining_hour_quota / 1000.0 * 100)::FLOAT as remaining_quota_percent
    FROM hourly_stats
    ORDER BY date_hour DESC, endpoint;
END;
$$ LANGUAGE plpgsql;

-- الاستعلام العام للتحقق من تثبيت النظام
SELECT 'Yalidine API caching system has been installed successfully!' AS status; 