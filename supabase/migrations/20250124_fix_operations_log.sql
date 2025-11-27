-- ============================================
-- إصلاح وتحسين جدول operations_log
-- ============================================
-- هذا الملف يقوم بحذف وإعادة إنشاء الجدول والدوال
-- لضمان التوافق مع نظام Delta Sync المحسّن

-- ============================================
-- 1. حذف الكائنات القديمة
-- ============================================

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS process_sync_batch(JSONB) CASCADE;
DROP FUNCTION IF EXISTS process_sync_operation(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS apply_stock_delta(TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS compute_state_hash(UUID, TEXT[]) CASCADE;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can read own organization operations" ON operations_log;
DROP POLICY IF EXISTS "Users can insert own organization operations" ON operations_log;

-- إزالة من Realtime (تجاهل الخطأ إذا لم يكن موجوداً)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE operations_log;
EXCEPTION WHEN OTHERS THEN
    NULL; -- تجاهل الخطأ
END $$;

-- حذف الجدول
DROP TABLE IF EXISTS operations_log CASCADE;

-- ============================================
-- 2. إنشاء الجدول الجديد المحسّن
-- ============================================
CREATE TABLE operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE', 'DELTA')),
    record_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',

    -- تسلسل تلقائي فريد لكل عملية (للمزامنة)
    server_seq BIGSERIAL UNIQUE NOT NULL,

    -- تسلسل محلي من الجهاز
    local_seq INTEGER NOT NULL DEFAULT 0,

    -- timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- للتعامل مع DELTA بعد DELETE أو العمليات غير الصالحة
    is_valid BOOLEAN DEFAULT true NOT NULL,
    invalidated_reason TEXT,

    -- ⚡ حقول إضافية للتتبع
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

-- ============================================
-- 3. الفهارس للأداء
-- ============================================

-- فهرس للمزامنة: جلب العمليات بعد server_seq معين
CREATE INDEX idx_operations_log_org_seq
ON operations_log(organization_id, server_seq);

-- فهرس للبحث عن عمليات سجل معين
CREATE INDEX idx_operations_log_record
ON operations_log(record_id, table_name);

-- فهرس للتنظيف: حذف العمليات القديمة
CREATE INDEX idx_operations_log_created
ON operations_log(created_at);

-- فهرس للجهاز: تتبع عمليات جهاز معين
CREATE INDEX idx_operations_log_device
ON operations_log(device_id, organization_id, created_at);

-- فهرس للعمليات الصالحة فقط
CREATE INDEX idx_operations_log_valid
ON operations_log(organization_id, server_seq)
WHERE is_valid = true;

-- ============================================
-- 4. سياسات RLS
-- ============================================
ALTER TABLE operations_log ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "org_read_operations"
ON operations_log
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- سياسة الإدراج
CREATE POLICY "org_insert_operations"
ON operations_log
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- ============================================
-- 5. دالة تسجيل عملية واحدة (محسّنة)
-- ============================================
CREATE OR REPLACE FUNCTION log_sync_operation(
    p_org_id UUID,
    p_device_id TEXT,
    p_table_name TEXT,
    p_operation TEXT,
    p_record_id UUID,
    p_payload JSONB,
    p_local_seq INTEGER DEFAULT 0
)
RETURNS TABLE(
    success BOOLEAN,
    server_seq BIGINT,
    error TEXT
) AS $$
DECLARE
    v_server_seq BIGINT;
BEGIN
    -- إدراج العملية في السجل
    INSERT INTO operations_log (
        organization_id, device_id, table_name, operation,
        record_id, payload, local_seq, is_valid
    )
    VALUES (
        p_org_id, p_device_id, p_table_name, p_operation,
        p_record_id, p_payload, p_local_seq, true
    )
    RETURNING operations_log.server_seq INTO v_server_seq;

    RETURN QUERY SELECT true, v_server_seq, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::BIGINT, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. دالة جلب العمليات بعد server_seq معين
-- ============================================
CREATE OR REPLACE FUNCTION get_operations_after(
    p_org_id UUID,
    p_after_seq BIGINT DEFAULT 0,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    id UUID,
    device_id TEXT,
    table_name TEXT,
    operation TEXT,
    record_id UUID,
    payload JSONB,
    server_seq BIGINT,
    local_seq INTEGER,
    created_at TIMESTAMPTZ,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ol.id,
        ol.device_id,
        ol.table_name,
        ol.operation,
        ol.record_id,
        ol.payload,
        ol.server_seq,
        ol.local_seq,
        ol.created_at,
        ol.is_valid
    FROM operations_log ol
    WHERE ol.organization_id = p_org_id
      AND ol.server_seq > p_after_seq
    ORDER BY ol.server_seq ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. دالة تطبيق DELTA بشكل atomic (محسّنة)
-- ============================================
CREATE OR REPLACE FUNCTION apply_delta_atomic(
    p_table_name TEXT,
    p_record_id UUID,
    p_delta JSONB
)
RETURNS TABLE(
    success BOOLEAN,
    error TEXT
) AS $$
DECLARE
    v_field TEXT;
    v_value NUMERIC;
    v_update_parts TEXT[] := '{}';
    v_sql TEXT;
BEGIN
    -- بناء أجزاء UPDATE
    FOR v_field, v_value IN
        SELECT key, value::NUMERIC
        FROM jsonb_each_text(p_delta)
        WHERE value ~ '^-?[0-9]+\.?[0-9]*$'
    LOOP
        v_update_parts := array_append(
            v_update_parts,
            format('%I = COALESCE(%I, 0) + %s', v_field, v_field, v_value)
        );
    END LOOP;

    -- إذا لم يكن هناك حقول للتحديث
    IF array_length(v_update_parts, 1) IS NULL THEN
        RETURN QUERY SELECT true, NULL::TEXT;
        RETURN;
    END IF;

    -- تنفيذ UPDATE
    v_sql := format(
        'UPDATE %I SET %s, updated_at = NOW() WHERE id = %L',
        p_table_name,
        array_to_string(v_update_parts, ', '),
        p_record_id
    );

    EXECUTE v_sql;

    RETURN QUERY SELECT true, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. دالة معالجة عملية كاملة مع التطبيق
-- ============================================
CREATE OR REPLACE FUNCTION process_and_apply_operation(
    p_org_id UUID,
    p_device_id TEXT,
    p_table_name TEXT,
    p_operation TEXT,
    p_record_id UUID,
    p_payload JSONB,
    p_local_seq INTEGER DEFAULT 0
)
RETURNS TABLE(
    success BOOLEAN,
    server_seq BIGINT,
    applied BOOLEAN,
    error TEXT
) AS $$
DECLARE
    v_server_seq BIGINT;
    v_record_exists BOOLEAN;
    v_is_valid BOOLEAN := true;
    v_reason TEXT;
BEGIN
    -- التحقق من وجود السجل للعمليات UPDATE و DELTA
    IF p_operation IN ('UPDATE', 'DELTA') THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE id = $1)', p_table_name)
        INTO v_record_exists
        USING p_record_id;

        IF NOT v_record_exists THEN
            v_is_valid := false;
            v_reason := 'Record does not exist';
        END IF;
    END IF;

    -- تسجيل العملية
    INSERT INTO operations_log (
        organization_id, device_id, table_name, operation,
        record_id, payload, local_seq, is_valid, invalidated_reason
    )
    VALUES (
        p_org_id, p_device_id, p_table_name, p_operation,
        p_record_id, p_payload, p_local_seq, v_is_valid, v_reason
    )
    RETURNING operations_log.server_seq INTO v_server_seq;

    -- تطبيق العملية إذا كانت صالحة
    IF v_is_valid THEN
        CASE p_operation
            WHEN 'INSERT' THEN
                EXECUTE format(
                    'INSERT INTO %I (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
                    p_table_name
                ) USING p_record_id;
                -- تحديث باقي الحقول
                EXECUTE format(
                    'UPDATE %I SET %s WHERE id = $1',
                    p_table_name,
                    (SELECT string_agg(format('%I = %L', key, value), ', ')
                     FROM jsonb_each_text(p_payload) WHERE key != 'id')
                ) USING p_record_id;

            WHEN 'UPDATE' THEN
                EXECUTE format(
                    'UPDATE %I SET %s, updated_at = NOW() WHERE id = $1',
                    p_table_name,
                    (SELECT string_agg(format('%I = %L', key, value), ', ')
                     FROM jsonb_each_text(p_payload) WHERE key != 'id')
                ) USING p_record_id;

            WHEN 'DELETE' THEN
                EXECUTE format('DELETE FROM %I WHERE id = $1', p_table_name)
                USING p_record_id;

            WHEN 'DELTA' THEN
                PERFORM apply_delta_atomic(p_table_name, p_record_id, p_payload);
        END CASE;

        -- تحديث حالة المعالجة
        UPDATE operations_log
        SET processed_at = NOW()
        WHERE operations_log.server_seq = v_server_seq;
    END IF;

    RETURN QUERY SELECT v_is_valid, v_server_seq, v_is_valid, v_reason;

EXCEPTION WHEN OTHERS THEN
    -- تسجيل الخطأ
    UPDATE operations_log
    SET is_valid = false,
        error_message = SQLERRM,
        invalidated_reason = 'Execution error'
    WHERE operations_log.server_seq = v_server_seq;

    RETURN QUERY SELECT false, v_server_seq, false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. دالة معالجة دفعة من العمليات
-- ============================================
CREATE OR REPLACE FUNCTION process_operation_batch(
    p_operations JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_op JSONB;
    v_result RECORD;
    v_results JSONB := '[]'::JSONB;
BEGIN
    FOR v_op IN SELECT * FROM jsonb_array_elements(p_operations)
    LOOP
        SELECT * INTO v_result FROM process_and_apply_operation(
            (v_op->>'organization_id')::UUID,
            v_op->>'device_id',
            v_op->>'table_name',
            v_op->>'operation',
            (v_op->>'record_id')::UUID,
            v_op->'payload',
            COALESCE((v_op->>'local_seq')::INTEGER, 0)
        );

        v_results := v_results || jsonb_build_object(
            'success', v_result.success,
            'server_seq', v_result.server_seq,
            'applied', v_result.applied,
            'error', v_result.error
        );
    END LOOP;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. دالة حساب state hash للتحقق
-- ============================================
CREATE OR REPLACE FUNCTION get_state_hash(
    p_org_id UUID,
    p_tables TEXT[] DEFAULT ARRAY['products', 'product_colors', 'product_sizes', 'customers', 'orders']
)
RETURNS JSONB AS $$
DECLARE
    v_table TEXT;
    v_count BIGINT;
    v_hash TEXT;
    v_table_stats JSONB := '{}'::JSONB;
BEGIN
    FOREACH v_table IN ARRAY p_tables
    LOOP
        BEGIN
            -- عد السجلات وحساب hash
            EXECUTE format(
                'SELECT COUNT(*), COALESCE(md5(string_agg(id::text, '''' ORDER BY id)), ''empty'')
                 FROM %I WHERE organization_id = $1',
                v_table
            )
            INTO v_count, v_hash
            USING p_org_id;

            v_table_stats := v_table_stats || jsonb_build_object(
                v_table, jsonb_build_object('count', v_count, 'hash', v_hash)
            );
        EXCEPTION WHEN OTHERS THEN
            v_table_stats := v_table_stats || jsonb_build_object(
                v_table, jsonb_build_object('count', 0, 'hash', 'error', 'error', SQLERRM)
            );
        END;
    END LOOP;

    -- جلب آخر server_seq
    SELECT COALESCE(MAX(server_seq), 0) INTO v_count
    FROM operations_log
    WHERE organization_id = p_org_id;

    RETURN jsonb_build_object(
        'tables', v_table_stats,
        'lastServerSeq', v_count,
        'computedAt', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. دالة تنظيف العمليات القديمة
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_operations(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM operations_log
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
      AND processed_at IS NOT NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. منح الصلاحيات
-- ============================================
GRANT EXECUTE ON FUNCTION log_sync_operation(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_operations_after(UUID, BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_delta_atomic(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_and_apply_operation(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_operation_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_state_hash(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_operations(INTEGER) TO service_role;

-- ============================================
-- 13. تمكين Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE operations_log;

-- ============================================
-- 14. التعليقات والتوثيق
-- ============================================
COMMENT ON TABLE operations_log IS 'سجل العمليات لنظام Delta-Based Sync - يخزن جميع التغييرات للمزامنة';
COMMENT ON FUNCTION log_sync_operation IS 'تسجيل عملية مزامنة واحدة';
COMMENT ON FUNCTION get_operations_after IS 'جلب العمليات بعد server_seq معين';
COMMENT ON FUNCTION apply_delta_atomic IS 'تطبيق تغييرات DELTA بشكل atomic';
COMMENT ON FUNCTION process_and_apply_operation IS 'معالجة وتطبيق عملية كاملة';
COMMENT ON FUNCTION process_operation_batch IS 'معالجة دفعة من العمليات';
COMMENT ON FUNCTION get_state_hash IS 'حساب hash للتحقق من صحة البيانات';
COMMENT ON FUNCTION cleanup_old_operations IS 'تنظيف العمليات القديمة';
