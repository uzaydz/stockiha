-- ===============================================
-- سياسة الاحتفاظ الآمنة بسجلات المخزون
-- ===============================================

-- 1. جدول النسخ الاحتياطي للسجلات المحذوفة
CREATE TABLE IF NOT EXISTS inventory_log_archive (
    id UUID PRIMARY KEY,
    original_log_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    product_id UUID,
    quantity INTEGER,
    previous_stock INTEGER,
    new_stock INTEGER,
    type VARCHAR(20),
    reference_id UUID,
    reference_type VARCHAR(20),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    
    -- معلومات الأرشفة
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by UUID,
    archive_reason TEXT,
    retention_policy_version INTEGER,
    
    -- نسخة من بيانات المنتج عند الأرشفة
    product_snapshot JSONB,
    user_snapshot JSONB
);

-- 2. جدول تدقيق عمليات الحذف
CREATE TABLE IF NOT EXISTS inventory_retention_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- 'cleanup', 'manual_delete', 'archive'
    executed_by UUID,
    execution_method VARCHAR(20), -- 'automatic', 'manual', 'api'
    
    -- إحصائيات العملية
    logs_processed INTEGER DEFAULT 0,
    logs_archived INTEGER DEFAULT 0,
    logs_deleted INTEGER DEFAULT 0,
    
    -- معاملات العملية
    dry_run BOOLEAN DEFAULT true,
    policy_version INTEGER,
    cutoff_dates JSONB,
    
    -- النتائج والأخطاء
    success BOOLEAN,
    error_message TEXT,
    execution_details JSONB,
    
    -- التوقيت
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER
);

-- 3. جدول سياسات الاحتفاظ المحسن
CREATE TABLE IF NOT EXISTS inventory_retention_policies_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    
    -- إعدادات الاحتفاظ الأساسية
    retention_start_date TIMESTAMPTZ NOT NULL,
    normal_retention_days INTEGER DEFAULT 180,
    important_retention_days INTEGER DEFAULT 365,
    critical_retention_days INTEGER DEFAULT 1095, -- 3 سنوات للحرجة
    
    -- تصنيف السجلات المحسن
    critical_operation_types TEXT[] DEFAULT ARRAY[
        'purchase', 'return', 'major_adjustment', 'theft', 'loss', 'damage'
    ],
    important_operation_types TEXT[] DEFAULT ARRAY[
        'sale', 'minor_adjustment', 'transfer', 'reservation'
    ],
    
    -- عتبات الكمية
    critical_quantity_threshold INTEGER DEFAULT 100,
    important_quantity_threshold INTEGER DEFAULT 25,
    high_value_threshold DECIMAL DEFAULT 1000.00,
    
    -- إعدادات الأمان
    require_backup_before_delete BOOLEAN DEFAULT true,
    allow_permanent_delete BOOLEAN DEFAULT false,
    max_deletion_batch_size INTEGER DEFAULT 1000,
    deletion_approval_required BOOLEAN DEFAULT true,
    
    -- إعدادات التشغيل
    auto_cleanup_enabled BOOLEAN DEFAULT true,
    last_cleanup_at TIMESTAMPTZ,
    next_cleanup_at TIMESTAMPTZ,
    
    -- التدقيق
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(organization_id, version)
);

-- 4. فانكشن محسن لتصنيف السجلات
CREATE OR REPLACE FUNCTION classify_inventory_log_importance(
    p_log_type TEXT,
    p_quantity INTEGER,
    p_transaction_value DECIMAL DEFAULT 0,
    p_reference_type TEXT DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
    -- السجلات الحرجة (لا تحذف لفترة طويلة)
    IF p_log_type IN ('purchase', 'return', 'theft', 'loss', 'damage') 
       OR ABS(p_quantity) >= 100 
       OR p_transaction_value >= 1000 
       OR p_reference_type = 'audit' THEN
        RETURN 'critical';
    END IF;
    
    -- السجلات المهمة
    IF p_log_type IN ('sale', 'minor_adjustment', 'transfer', 'reservation') 
       OR ABS(p_quantity) >= 25 
       OR p_transaction_value >= 100 THEN
        RETURN 'important';
    END IF;
    
    -- السجلات العادية
    RETURN 'normal';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. فانكشن النسخ الاحتياطي الآمن
CREATE OR REPLACE FUNCTION backup_inventory_logs_before_delete(
    p_organization_id UUID,
    p_cutoff_date TIMESTAMPTZ,
    p_classification TEXT,
    p_executed_by UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER := 0;
    v_log_record RECORD;
BEGIN
    -- نسخ السجلات إلى الأرشيف مع بيانات المنتج والمستخدم
    FOR v_log_record IN
        SELECT 
            il.*,
            -- بيانات المنتج
            json_build_object(
                'name', p.name,
                'sku', p.sku,
                'category', p.category,
                'price', p.price,
                'purchase_price', p.purchase_price
            ) as product_snapshot,
            -- بيانات المستخدم
            json_build_object(
                'name', u.name,
                'email', u.email,
                'role', u.role
            ) as user_snapshot
        FROM inventory_log il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN users u ON il.created_by = u.id
        WHERE il.organization_id = p_organization_id
        AND il.created_at < p_cutoff_date
        AND classify_inventory_log_importance(
            il.type, 
            il.quantity, 
            COALESCE(p.price * il.quantity, 0),
            il.reference_type
        ) = p_classification
    LOOP
        -- إدراج في الأرشيف
        INSERT INTO inventory_log_archive (
            id, original_log_id, organization_id, product_id,
            quantity, previous_stock, new_stock, type,
            reference_id, reference_type, notes, created_by, created_at,
            archived_by, archive_reason, product_snapshot, user_snapshot
        ) VALUES (
            gen_random_uuid(), v_log_record.id, v_log_record.organization_id, 
            v_log_record.product_id, v_log_record.quantity, v_log_record.previous_stock,
            v_log_record.new_stock, v_log_record.type, v_log_record.reference_id,
            v_log_record.reference_type, v_log_record.notes, v_log_record.created_by,
            v_log_record.created_at, p_executed_by, 
            'Automatic retention policy cleanup - ' || p_classification,
            v_log_record.product_snapshot, v_log_record.user_snapshot
        );
        
        v_archived_count := v_archived_count + 1;
    END LOOP;
    
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- 6. فانكشن التنظيف الآمن المحسن
CREATE OR REPLACE FUNCTION secure_cleanup_inventory_logs(
    p_organization_id UUID DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT true,
    p_executed_by UUID DEFAULT NULL,
    p_max_batch_size INTEGER DEFAULT 1000
) RETURNS JSON AS $$
DECLARE
    v_policy RECORD;
    v_audit_id UUID;
    v_total_processed INTEGER := 0;
    v_total_archived INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_results JSON := '[]'::JSON;
    v_org_result JSON;
    v_start_time TIMESTAMP := clock_timestamp();
    v_normal_cutoff TIMESTAMPTZ;
    v_important_cutoff TIMESTAMPTZ;
    v_critical_cutoff TIMESTAMPTZ;
    v_error_occurred BOOLEAN := false;
    v_error_message TEXT;
BEGIN
    -- إنشاء سجل تدقيق
    INSERT INTO inventory_retention_audit (
        organization_id, operation_type, executed_by, execution_method,
        dry_run, started_at
    ) VALUES (
        COALESCE(p_organization_id, '00000000-0000-0000-0000-000000000000'::UUID),
        'cleanup',
        p_executed_by,
        CASE WHEN p_executed_by IS NULL THEN 'automatic' ELSE 'manual' END,
        p_dry_run
    ) RETURNING id INTO v_audit_id;
    
    -- المرور على السياسات
    FOR v_policy IN 
        SELECT * FROM inventory_retention_policies_v2 
        WHERE auto_cleanup_enabled = true
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
        AND (next_cleanup_at IS NULL OR next_cleanup_at <= NOW())
    LOOP
        BEGIN
            -- حساب تواريخ القطع
            v_normal_cutoff := v_policy.retention_start_date + (v_policy.normal_retention_days || ' days')::INTERVAL;
            v_important_cutoff := v_policy.retention_start_date + (v_policy.important_retention_days || ' days')::INTERVAL;
            v_critical_cutoff := v_policy.retention_start_date + (v_policy.critical_retention_days || ' days')::INTERVAL;
            
            -- عد السجلات للمعالجة
            SELECT COUNT(*) INTO v_total_processed
            FROM inventory_log 
            WHERE organization_id = v_policy.organization_id
            AND created_at < v_normal_cutoff;
            
            IF NOT p_dry_run AND v_policy.require_backup_before_delete THEN
                -- نسخ احتياطي للسجلات العادية
                v_total_archived := v_total_archived + backup_inventory_logs_before_delete(
                    v_policy.organization_id, v_normal_cutoff, 'normal', p_executed_by
                );
                
                -- نسخ احتياطي للسجلات المهمة
                v_total_archived := v_total_archived + backup_inventory_logs_before_delete(
                    v_policy.organization_id, v_important_cutoff, 'important', p_executed_by
                );
                
                -- نسخ احتياطي للسجلات الحرجة (إن وجدت)
                v_total_archived := v_total_archived + backup_inventory_logs_before_delete(
                    v_policy.organization_id, v_critical_cutoff, 'critical', p_executed_by
                );
            END IF;
            
            IF NOT p_dry_run AND v_policy.allow_permanent_delete THEN
                -- حذف السجلات العادية
                DELETE FROM inventory_log 
                WHERE organization_id = v_policy.organization_id
                AND created_at < v_normal_cutoff
                AND classify_inventory_log_importance(type, quantity, 0, reference_type) = 'normal'
                AND id IN (
                    SELECT id FROM inventory_log 
                    WHERE organization_id = v_policy.organization_id
                    AND created_at < v_normal_cutoff
                    ORDER BY created_at ASC
                    LIMIT p_max_batch_size
                );
                
                GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
                
                -- تحديث موعد التنظيف التالي
                UPDATE inventory_retention_policies_v2
                SET 
                    last_cleanup_at = NOW(),
                    next_cleanup_at = CURRENT_DATE + INTERVAL '7 days'
                WHERE organization_id = v_policy.organization_id;
            END IF;
            
            -- إضافة النتيجة
            v_org_result := json_build_object(
                'organization_id', v_policy.organization_id,
                'total_processed', v_total_processed,
                'total_archived', v_total_archived,
                'total_deleted', v_total_deleted,
                'cutoff_dates', json_build_object(
                    'normal', v_normal_cutoff,
                    'important', v_important_cutoff,
                    'critical', v_critical_cutoff
                ),
                'dry_run', p_dry_run
            );
            
            v_results := v_results || v_org_result;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_occurred := true;
            v_error_message := SQLERRM;
            
            -- تسجيل الخطأ
            UPDATE inventory_retention_audit 
            SET 
                success = false,
                error_message = v_error_message,
                completed_at = NOW()
            WHERE id = v_audit_id;
            
            EXIT; -- الخروج من الحلقة عند حدوث خطأ
        END;
    END LOOP;
    
    -- تحديث سجل التدقيق
    UPDATE inventory_retention_audit 
    SET 
        logs_processed = v_total_processed,
        logs_archived = v_total_archived,
        logs_deleted = v_total_deleted,
        success = NOT v_error_occurred,
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))
    WHERE id = v_audit_id;
    
    RETURN json_build_object(
        'success', NOT v_error_occurred,
        'audit_id', v_audit_id,
        'total_processed', v_total_processed,
        'total_archived', v_total_archived,
        'total_deleted', v_total_deleted,
        'dry_run', p_dry_run,
        'execution_time_seconds', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)),
        'results', v_results,
        'error_message', v_error_message,
        'timestamp', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    -- تحديث سجل التدقيق في حالة الخطأ العام
    UPDATE inventory_retention_audit 
    SET 
        success = false,
        error_message = SQLERRM,
        completed_at = NOW()
    WHERE id = v_audit_id;
    
    RETURN json_build_object(
        'success', false,
        'audit_id', v_audit_id,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 7. فانكشن لاستعادة السجلات من الأرشيف
CREATE OR REPLACE FUNCTION restore_archived_inventory_logs(
    p_organization_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_executed_by UUID
) RETURNS JSON AS $$
DECLARE
    v_restored_count INTEGER := 0;
    v_archive_record RECORD;
BEGIN
    -- استعادة السجلات من الأرشيف
    FOR v_archive_record IN
        SELECT * FROM inventory_log_archive
        WHERE organization_id = p_organization_id
        AND created_at BETWEEN p_start_date AND p_end_date
    LOOP
        -- إعادة إدراج في الجدول الأصلي
        INSERT INTO inventory_log (
            id, product_id, quantity, previous_stock, new_stock,
            type, reference_id, reference_type, notes, created_by,
            created_at, organization_id
        ) VALUES (
            v_archive_record.original_log_id, v_archive_record.product_id,
            v_archive_record.quantity, v_archive_record.previous_stock,
            v_archive_record.new_stock, v_archive_record.type,
            v_archive_record.reference_id, v_archive_record.reference_type,
            v_archive_record.notes, v_archive_record.created_by,
            v_archive_record.created_at, v_archive_record.organization_id
        );
        
        v_restored_count := v_restored_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'restored_count', v_restored_count,
        'restored_by', p_executed_by,
        'timestamp', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 8. فهرسة للأداء
CREATE INDEX IF NOT EXISTS idx_inventory_log_archive_org_date ON inventory_log_archive(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_log_archive_original_id ON inventory_log_archive(original_log_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_org_date ON inventory_retention_audit(organization_id, started_at);

COMMENT ON TABLE inventory_log_archive IS 'أرشيف آمن لسجلات المخزون المحذوفة';
COMMENT ON TABLE inventory_retention_audit IS 'تدقيق عمليات حذف سجلات المخزون';
COMMENT ON FUNCTION classify_inventory_log_importance IS 'تصنيف أهمية سجلات المخزون حسب النوع والكمية والقيمة';
COMMENT ON FUNCTION secure_cleanup_inventory_logs IS 'تنظيف آمن لسجلات المخزون مع نسخ احتياطي';
COMMENT ON FUNCTION restore_archived_inventory_logs IS 'استعادة السجلات من الأرشيف'; 