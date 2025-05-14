-- إصلاح كامل لمشكلة جداول أسعار ياليدين - النسخة المحسنة 2.0
-- تاريخ التحديث: 2025-05-10

-- 0. بدء المعاملة لضمان تنفيذ جميع العمليات بشكل آمن
BEGIN;

-- 1. التحقق من وجود المحفز وتعطيله إذا كان موجوداً
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'yalidine_fees_redirect_trigger') THEN
        RAISE NOTICE 'تعطيل المحفز yalidine_fees_redirect_trigger';
        EXECUTE 'ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger';
    ELSE
        RAISE NOTICE 'المحفز yalidine_fees_redirect_trigger غير موجود';
    END IF;
    
    -- التحقق من أي محفزات أخرى على الجدول
    FOR r IN (SELECT tgname FROM pg_trigger WHERE tgrelid = 'yalidine_fees'::regclass)
    LOOP
        RAISE NOTICE 'وجد محفز آخر على الجدول: %', r.tgname;
    END LOOP;
END $$;

-- 2. حذف الوظائف القديمة بشكل آمن
DO $$ 
BEGIN
    RAISE NOTICE 'بدء إزالة الوظائف القديمة';
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_simple_insert_yalidine_fees') THEN
        RAISE NOTICE 'حذف وظيفة rpc_simple_insert_yalidine_fees';
        DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(text);
        DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(jsonb);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'yalidine_map_fees_fields') THEN
        RAISE NOTICE 'حذف وظيفة yalidine_map_fees_fields';
        DROP FUNCTION IF EXISTS yalidine_map_fees_fields(jsonb);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'test_yalidine_fees_insert') THEN
        RAISE NOTICE 'حذف وظيفة test_yalidine_fees_insert';
        DROP FUNCTION IF EXISTS test_yalidine_fees_insert(uuid, integer, integer);
        DROP FUNCTION IF EXISTS test_yalidine_fees_insert();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fix_yalidine_tables') THEN
        RAISE NOTICE 'حذف وظيفة fix_yalidine_tables';
        DROP FUNCTION IF EXISTS fix_yalidine_tables();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'diagnose_yalidine_fees') THEN
        RAISE NOTICE 'حذف وظيفة diagnose_yalidine_fees';
        DROP FUNCTION IF EXISTS diagnose_yalidine_fees();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_duplicate_yalidine_fees') THEN
        RAISE NOTICE 'حذف وظيفة cleanup_duplicate_yalidine_fees';
        DROP FUNCTION IF EXISTS cleanup_duplicate_yalidine_fees();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'simple_insert_yalidine_fees') THEN
        RAISE NOTICE 'حذف وظيفة simple_insert_yalidine_fees القديمة';
        DROP FUNCTION IF EXISTS simple_insert_yalidine_fees(jsonb, uuid);
        DROP FUNCTION IF EXISTS simple_insert_yalidine_fees(text, uuid);
    END IF;
    
    RAISE NOTICE 'تم الانتهاء من إزالة الوظائف القديمة';
END $$;

-- 3. التحقق من وجود الجداول وصلاحية التركيب
DO $$
BEGIN
    RAISE NOTICE 'التحقق من وجود الجداول وصلاحية التركيب';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yalidine_fees') THEN
        RAISE NOTICE 'جدول yalidine_fees موجود';
        
        -- التحقق من المفتاح الأساسي
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'yalidine_fees' AND constraint_type = 'PRIMARY KEY'
        ) THEN
            RAISE WARNING 'جدول yalidine_fees لا يحتوي على مفتاح أساسي!';
        END IF;
    ELSE
        RAISE WARNING 'جدول yalidine_fees غير موجود!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yalidine_fees_new') THEN
        RAISE NOTICE 'جدول yalidine_fees_new موجود';
    ELSE
        RAISE NOTICE 'جدول yalidine_fees_new غير موجود';
    END IF;
END $$;

-- 4. تفريغ البيانات من الجداول
TRUNCATE TABLE yalidine_fees;

-- التفريغ الاختياري لجدول yalidine_fees_new
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yalidine_fees_new') THEN
        EXECUTE 'TRUNCATE TABLE yalidine_fees_new';
        RAISE NOTICE 'تم تفريغ جدول yalidine_fees_new';
    END IF;
END $$;

-- 5. إنشاء الوظيفة المحسنة لإدراج بيانات الأسعار
CREATE OR REPLACE FUNCTION simple_insert_yalidine_fees(
    p_data jsonb,
    p_organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_record jsonb;
    v_error_count INTEGER := 0;
    v_debug BOOLEAN := TRUE; -- تمكين السجلات التفصيلية
BEGIN
    -- التحقق من صحة المدخلات
    IF p_data IS NULL THEN
        RAISE EXCEPTION 'البيانات فارغة (NULL)';
    END IF;
    
    IF jsonb_typeof(p_data) != 'array' THEN
        RAISE EXCEPTION 'يجب أن تكون البيانات مصفوفة JSON';
    END IF;
    
    IF p_organization_id IS NULL THEN
        RAISE EXCEPTION 'معرف المنظمة فارغ (NULL)';
    END IF;
    
    IF v_debug THEN
        RAISE NOTICE 'بدء معالجة % سجل', jsonb_array_length(p_data);
    END IF;
    
    -- معالجة كل سجل
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
    LOOP
        BEGIN
            IF v_debug AND v_count < 3 THEN
                RAISE NOTICE 'سجل %: %', v_count + 1, v_record::text;
            END IF;
            
            -- إدراج السجل مع معالجة كاملة لأسماء الحقول المختلفة
            INSERT INTO yalidine_fees (
                organization_id,
                from_wilaya_id,
                to_wilaya_id,
                commune_id,
                from_wilaya_name,
                to_wilaya_name,
                commune_name,
                express_home,
                express_desk,
                economic_home,
                economic_desk,
                is_home_available,
                is_stop_desk_available,
                home_fee,
                stop_desk_fee,
                zone,
                retour_fee,
                cod_percentage,
                insurance_percentage,
                oversize_fee,
                last_updated_at
            ) VALUES (
                p_organization_id,
                -- معالجة حقول المعرفات
                CASE
                    WHEN v_record ? 'from_wilaya_id' THEN (v_record->>'from_wilaya_id')::INTEGER
                    WHEN v_record ? 'wilaya_id' THEN (v_record->>'wilaya_id')::INTEGER
                    ELSE 0
                END,
                CASE
                    WHEN v_record ? 'to_wilaya_id' THEN (v_record->>'to_wilaya_id')::INTEGER
                    WHEN v_record ? 'wilaya_id' THEN (v_record->>'wilaya_id')::INTEGER
                    ELSE 0
                END,
                COALESCE((v_record->>'commune_id')::INTEGER, 0),
                -- معالجة أسماء الولايات والبلديات
                COALESCE(
                    v_record->>'from_wilaya_name',
                    v_record->>'wilaya_name',
                    'غير معروف'
                ),
                COALESCE(
                    v_record->>'to_wilaya_name',
                    v_record->>'wilaya_name',
                    'غير معروف'
                ),
                COALESCE(v_record->>'commune_name', ''),
                -- معالجة رسوم التوصيل مع تحويل من سلاسل نصية إلى أرقام
                COALESCE(
                    (v_record->>'home_fee')::INTEGER, 
                    (v_record->>'express_home')::INTEGER, 
                    0
                ),
                COALESCE(
                    (v_record->>'stop_desk_fee')::INTEGER, 
                    (v_record->>'express_desk')::INTEGER, 
                    0
                ),
                COALESCE((v_record->>'economic_home')::INTEGER, 0),
                COALESCE((v_record->>'economic_desk')::INTEGER, 0),
                -- توفر خيارات التوصيل
                COALESCE((v_record->>'is_home_available')::BOOLEAN, TRUE),
                COALESCE((v_record->>'is_stop_desk_available')::BOOLEAN, TRUE),
                -- نسخ قيم الرسوم للتوافق مع الأعمدة المزدوجة
                COALESCE(
                    (v_record->>'home_fee')::INTEGER, 
                    (v_record->>'express_home')::INTEGER, 
                    0
                ),
                COALESCE(
                    (v_record->>'stop_desk_fee')::INTEGER, 
                    (v_record->>'express_desk')::INTEGER, 
                    0
                ),
                -- قيم إضافية
                COALESCE((v_record->>'zone')::INTEGER, 0),
                COALESCE((v_record->>'retour_fee')::INTEGER, 0),
                COALESCE((v_record->>'cod_percentage')::NUMERIC, 0),
                COALESCE((v_record->>'insurance_percentage')::NUMERIC, 0),
                COALESCE((v_record->>'oversize_fee')::INTEGER, 0),
                -- تاريخ التحديث
                COALESCE(
                    (v_record->>'last_updated_at')::TIMESTAMP WITH TIME ZONE,
                    CURRENT_TIMESTAMP
                )
            )
            ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id) 
            DO UPDATE SET
                from_wilaya_name = EXCLUDED.from_wilaya_name,
                to_wilaya_name = EXCLUDED.to_wilaya_name,
                commune_name = EXCLUDED.commune_name,
                express_home = EXCLUDED.express_home,
                express_desk = EXCLUDED.express_desk,
                economic_home = EXCLUDED.economic_home,
                economic_desk = EXCLUDED.economic_desk,
                is_home_available = EXCLUDED.is_home_available,
                is_stop_desk_available = EXCLUDED.is_stop_desk_available,
                zone = EXCLUDED.zone,
                retour_fee = EXCLUDED.retour_fee,
                cod_percentage = EXCLUDED.cod_percentage,
                insurance_percentage = EXCLUDED.insurance_percentage,
                oversize_fee = EXCLUDED.oversize_fee,
                home_fee = EXCLUDED.home_fee,
                stop_desk_fee = EXCLUDED.stop_desk_fee,
                last_updated_at = EXCLUDED.last_updated_at;
            
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING 'فشل إدخال السجل %: %', v_count + v_error_count, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'تم إدخال % سجل بنجاح، فشل في إدخال % سجل', v_count, v_error_count;
    RETURN v_count;
END;
$$;

-- 6. إنشاء نسخة متوافقة تقبل النص JSON
CREATE OR REPLACE FUNCTION simple_insert_yalidine_fees(
    p_data text,
    p_organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_result INTEGER;
BEGIN
    -- التحقق من صحة المدخلات
    IF p_data IS NULL OR p_data = '' THEN
        RAISE EXCEPTION 'البيانات فارغة';
    END IF;
    
    BEGIN
        -- محاولة تحويل النص إلى JSON
        v_result := simple_insert_yalidine_fees(p_data::jsonb, p_organization_id);
        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في تحليل JSON: %', SQLERRM;
    END;
END;
$$;

-- 7. إنشاء وظيفة لحذف بيانات منظمة معينة
CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(
    p_organization_id uuid,
    p_from_wilaya_id integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_from_wilaya_id IS NOT NULL THEN
        -- حذف البيانات لولاية مصدر محددة
        DELETE FROM yalidine_fees 
        WHERE organization_id = p_organization_id 
        AND from_wilaya_id = p_from_wilaya_id;
    ELSE
        -- حذف كل بيانات المنظمة
        DELETE FROM yalidine_fees 
        WHERE organization_id = p_organization_id;
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 8. إنشاء وظيفة لفحص حالة الجدول
CREATE OR REPLACE FUNCTION check_yalidine_fees_status(p_organization_id uuid)
RETURNS TABLE (
    table_name text,
    record_count integer,
    status text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'yalidine_fees'::text as table_name,
        COUNT(*)::integer as record_count,
        'نشط'::text as status
    FROM yalidine_fees
    WHERE organization_id = p_organization_id;
    
    RETURN;
END;
$$;

-- 9. التحقق من نجاح جميع العمليات
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'simple_insert_yalidine_fees'
        AND pronargs = 2
    ) THEN
        RAISE NOTICE 'تم إنشاء وظيفة simple_insert_yalidine_fees بنجاح';
    ELSE
        RAISE WARNING 'فشل في إنشاء وظيفة simple_insert_yalidine_fees';
    END IF;
    
    RAISE NOTICE '--------------------------------------';
    RAISE NOTICE 'تم إكمال إجراءات إصلاح جداول ياليدين بنجاح';
    RAISE NOTICE '--------------------------------------';
    RAISE NOTICE 'ملخص الإجراءات:';
    RAISE NOTICE '1. تم تعطيل المحفز "yalidine_fees_redirect_trigger" (إن وجد)';
    RAISE NOTICE '2. تم حذف الوظائف المعقدة المتعلقة بإدخال البيانات';
    RAISE NOTICE '3. تم تنظيف جدول "yalidine_fees"';
    RAISE NOTICE '4. تم إنشاء وظيفة بسيطة محسنة "simple_insert_yalidine_fees"';
    RAISE NOTICE '5. تم إنشاء وظيفة "check_yalidine_fees_status" لفحص حالة الجدول';
    RAISE NOTICE '--------------------------------------';
    RAISE NOTICE 'يجب الآن إجراء مزامنة جديدة للبيانات من ياليدين.';
    RAISE NOTICE '--------------------------------------';
END $$;

-- 10. تنفيذ المعاملة
COMMIT; 