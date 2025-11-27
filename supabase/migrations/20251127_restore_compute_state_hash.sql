-- ============================================
-- إعادة إنشاء دالة compute_state_hash
-- ============================================
-- هذه الدالة تحسب hash للتحقق من صحة البيانات بين الخادم والعميل

CREATE OR REPLACE FUNCTION compute_state_hash(
    org_id UUID,
    tables TEXT[] DEFAULT ARRAY['products', 'customers', 'orders', 'product_categories', 'staff_members', 'repair_orders', 'repair_locations', 'suppliers', 'supplier_purchases', 'supplier_payments']
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
        BEGIN
            -- حساب hash لكل جدول
            EXECUTE format(
                'SELECT md5(COALESCE(string_agg(t::text, '''' ORDER BY id), ''empty''))
                 FROM %I t WHERE organization_id = $1',
                v_table
            )
            INTO v_hash
            USING org_id;

            v_hash := COALESCE(v_hash, 'empty');
        EXCEPTION WHEN undefined_table THEN
            -- إذا لم يكن الجدول موجوداً، نستخدم 'not_exists'
            v_hash := 'not_exists';
        END;

        v_table_hashes := v_table_hashes || jsonb_build_object(v_table, v_hash);
        v_full_hash := v_full_hash || v_table || ':' || v_hash || '|';
    END LOOP;

    RETURN jsonb_build_object(
        'fullHash', md5(v_full_hash),
        'tableHashes', v_table_hashes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليق للتوثيق
COMMENT ON FUNCTION compute_state_hash(UUID, TEXT[]) IS 'حساب hash للتحقق من صحة البيانات بين الخادم والعميل - يستخدم للمزامنة';
