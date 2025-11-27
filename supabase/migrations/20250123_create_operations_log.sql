-- Delta-Based Sync System: Operations Log Table
-- جدول سجل العمليات لنظام المزامنة

-- إنشاء جدول operations_log
CREATE TABLE IF NOT EXISTS operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE', 'DELTA')),
    record_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',

    -- تسلسل تلقائي فريد لكل عملية
    server_seq BIGSERIAL UNIQUE,

    -- تسلسل محلي من الجهاز
    local_seq INTEGER NOT NULL,

    -- timestamps
    created_at TIMESTAMPTZ DEFAULT now(),

    -- للتعامل مع DELTA بعد DELETE
    is_valid BOOLEAN DEFAULT true,
    invalidated_reason TEXT
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_operations_log_org_seq
ON operations_log(organization_id, server_seq);

CREATE INDEX IF NOT EXISTS idx_operations_log_record
ON operations_log(record_id, table_name);

CREATE INDEX IF NOT EXISTS idx_operations_log_created
ON operations_log(created_at);

CREATE INDEX IF NOT EXISTS idx_operations_log_device
ON operations_log(device_id, created_at);

-- RLS Policies
ALTER TABLE operations_log ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: يمكن للمستخدم قراءة عمليات منظمته فقط
-- ملاحظة: جدول users يستخدم auth_user_id للربط مع auth.users
CREATE POLICY "Users can read own organization operations"
ON operations_log
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- سياسة الإدراج: يمكن للمستخدم إدراج عمليات لمنظمته فقط
CREATE POLICY "Users can insert own organization operations"
ON operations_log
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- دالة لتطبيق DELTA على المخزون
CREATE OR REPLACE FUNCTION apply_stock_delta(
    p_table_name TEXT,
    p_record_id UUID,
    p_delta JSONB
)
RETURNS VOID AS $$
DECLARE
    v_field TEXT;
    v_value NUMERIC;
    v_sql TEXT;
BEGIN
    FOR v_field, v_value IN SELECT * FROM jsonb_each_text(p_delta)
    LOOP
        -- فقط الحقول الرقمية
        IF v_value ~ '^-?[0-9]+\.?[0-9]*$' THEN
            v_sql := format(
                'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
                p_table_name, v_field, v_field
            );
            EXECUTE v_sql USING v_value::NUMERIC, p_record_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لمعالجة عملية مزامنة واحدة
CREATE OR REPLACE FUNCTION process_sync_operation(
    p_org_id UUID,
    p_device_id TEXT,
    p_table_name TEXT,
    p_operation TEXT,
    p_record_id UUID,
    p_payload JSONB,
    p_local_seq INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_is_valid BOOLEAN := true;
    v_reason TEXT;
    v_record_exists BOOLEAN;
    v_server_seq BIGINT;
BEGIN
    -- التحقق من وجود السجل للعمليات DELTA و UPDATE
    IF p_operation IN ('DELTA', 'UPDATE') THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE id = $1)', p_table_name)
        INTO v_record_exists
        USING p_record_id;

        IF NOT v_record_exists THEN
            v_is_valid := false;
            v_reason := 'Record does not exist (possibly deleted)';
        END IF;
    END IF;

    -- إدراج في operations_log
    INSERT INTO operations_log (
        organization_id, device_id, table_name, operation,
        record_id, payload, local_seq, is_valid, invalidated_reason
    )
    VALUES (
        p_org_id, p_device_id, p_table_name, p_operation,
        p_record_id, p_payload, p_local_seq, v_is_valid, v_reason
    )
    RETURNING server_seq INTO v_server_seq;

    -- تطبيق العملية إذا كانت صالحة
    IF v_is_valid THEN
        CASE p_operation
            WHEN 'INSERT' THEN
                -- إدراج سجل جديد
                EXECUTE format(
                    'INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1)
                     ON CONFLICT (id) DO NOTHING',
                    p_table_name, p_table_name
                ) USING p_payload;

            WHEN 'UPDATE' THEN
                -- تحديث سجل موجود
                EXECUTE format(
                    'UPDATE %I SET %s WHERE id = $1',
                    p_table_name,
                    (
                        SELECT string_agg(format('%I = ($2->>%L)::%s', key, key,
                            CASE
                                WHEN pg_typeof(value) = 'jsonb'::regtype THEN 'jsonb'
                                WHEN value::text ~ '^[0-9]+$' THEN 'integer'
                                WHEN value::text ~ '^[0-9]+\.[0-9]+$' THEN 'numeric'
                                WHEN value::text IN ('true', 'false') THEN 'boolean'
                                ELSE 'text'
                            END
                        ), ', ')
                        FROM jsonb_each(p_payload)
                        WHERE key != 'id'
                    )
                ) USING p_record_id, p_payload;

            WHEN 'DELETE' THEN
                -- حذف السجل
                EXECUTE format('DELETE FROM %I WHERE id = $1', p_table_name)
                USING p_record_id;

            WHEN 'DELTA' THEN
                -- تطبيق Delta على المخزون
                PERFORM apply_stock_delta(p_table_name, p_record_id, p_payload);
        END CASE;
    END IF;

    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', v_is_valid,
        'server_seq', v_server_seq,
        'is_valid', v_is_valid,
        'reason', v_reason
    );

EXCEPTION WHEN OTHERS THEN
    -- تسجيل الخطأ وإرجاعه
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لمعالجة دفعة من العمليات
CREATE OR REPLACE FUNCTION process_sync_batch(
    operations JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_op JSONB;
    v_result JSONB;
    v_results JSONB := '[]'::JSONB;
BEGIN
    FOR v_op IN SELECT * FROM jsonb_array_elements(operations)
    LOOP
        v_result := process_sync_operation(
            (v_op->>'organization_id')::UUID,
            v_op->>'device_id',
            v_op->>'table_name',
            v_op->>'operation',
            (v_op->>'record_id')::UUID,
            v_op->'payload',
            (v_op->>'local_seq')::INTEGER
        );

        v_results := v_results || jsonb_build_array(v_result);
    END LOOP;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب state hash (للتحقق من صحة البيانات)
CREATE OR REPLACE FUNCTION compute_state_hash(
    org_id UUID,
    tables TEXT[] DEFAULT ARRAY['products', 'product_colors', 'product_sizes', 'orders', 'customers', 'product_categories']
)
RETURNS JSONB AS $$
DECLARE
    v_table TEXT;
    v_hash TEXT;
    v_table_hashes JSONB := '{}'::JSONB;
    v_full_hash TEXT := '';
BEGIN
    FOREACH v_table IN ARRAY tables
    LOOP
        -- حساب hash لكل جدول
        EXECUTE format(
            'SELECT md5(string_agg(t::text, '''' ORDER BY id))
             FROM %I t WHERE organization_id = $1',
            v_table
        )
        INTO v_hash
        USING org_id;

        v_hash := COALESCE(v_hash, 'empty');
        v_table_hashes := v_table_hashes || jsonb_build_object(v_table, v_hash);
        v_full_hash := v_full_hash || v_table || ':' || v_hash || '|';
    END LOOP;

    RETURN jsonb_build_object(
        'fullHash', md5(v_full_hash),
        'tableHashes', v_table_hashes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تمكين Realtime للجدول
ALTER PUBLICATION supabase_realtime ADD TABLE operations_log;

-- Comment للتوثيق
COMMENT ON TABLE operations_log IS 'سجل العمليات لنظام المزامنة Delta-Based - يخزن جميع التغييرات للمزامنة في الوقت الفعلي';
