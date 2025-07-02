-- ===============================================
-- سياسة الاحتفاظ بسجلات المخزون
-- ===============================================

-- 1. جدول لتتبع سياسات الاحتفاظ لكل مؤسسة
CREATE TABLE IF NOT EXISTS inventory_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- إعدادات الاحتفاظ
    retention_start_date TIMESTAMPTZ NOT NULL, -- تاريخ بداية العد للاحتفاظ
    normal_retention_days INTEGER DEFAULT 180, -- 6 أشهر للسجلات العادية
    important_retention_days INTEGER DEFAULT 365, -- 12 شهر للسجلات المهمة
    
    -- السجلات المهمة (لا تحذف بسرعة)
    important_operation_types TEXT[] DEFAULT ARRAY['purchase', 'return', 'major_adjustment'],
    important_quantity_threshold INTEGER DEFAULT 50, -- العمليات أكبر من 50 قطعة
    
    -- معلومات إضافية
    auto_cleanup_enabled BOOLEAN DEFAULT true,
    last_cleanup_at TIMESTAMPTZ,
    next_cleanup_at TIMESTAMPTZ,
    
    -- التدقيق
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- 2. فهرسة للأداء
CREATE INDEX IF NOT EXISTS idx_inventory_retention_org ON inventory_retention_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_retention_next_cleanup ON inventory_retention_policies(next_cleanup_at) WHERE auto_cleanup_enabled = true;

-- 3. تحديث التاريخ عند التعديل
CREATE OR REPLACE FUNCTION update_inventory_retention_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_retention_updated_at_trigger
    BEFORE UPDATE ON inventory_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_retention_updated_at();

-- 4. إنشاء سياسات للمؤسسات الموجودة (العد من اليوم)
INSERT INTO inventory_retention_policies (
    organization_id, 
    retention_start_date,
    normal_retention_days,
    important_retention_days,
    next_cleanup_at
)
SELECT 
    o.id,
    CURRENT_DATE, -- البداية من اليوم للمؤسسات الموجودة
    180, -- 6 أشهر
    365, -- 12 شهر  
    CURRENT_DATE + INTERVAL '7 days' -- أول تنظيف بعد أسبوع
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_retention_policies irp 
    WHERE irp.organization_id = o.id
)
AND o.created_at < CURRENT_DATE; -- المؤسسات الموجودة فقط

-- 5. تريجر لإنشاء سياسة للمؤسسات الجديدة
CREATE OR REPLACE FUNCTION create_inventory_retention_for_new_org()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء سياسة احتفاظ للمؤسسة الجديدة
    INSERT INTO inventory_retention_policies (
        organization_id,
        retention_start_date, -- بداية العد من تاريخ إنشاء المؤسسة
        normal_retention_days,
        important_retention_days,
        next_cleanup_at
    ) VALUES (
        NEW.id,
        NEW.created_at::DATE,
        180, -- 6 أشهر
        365, -- 12 شهر
        NEW.created_at::DATE + INTERVAL '6 months' -- أول تنظيف بعد 6 أشهر
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_organization_retention_trigger
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_inventory_retention_for_new_org();

-- 6. فانكشن لتنظيف السجلات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_inventory_logs(
    p_organization_id UUID DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_policy RECORD;
    v_normal_cutoff_date TIMESTAMPTZ;
    v_important_cutoff_date TIMESTAMPTZ;
    v_normal_deleted INTEGER := 0;
    v_important_deleted INTEGER := 0;
    v_total_checked INTEGER := 0;
    v_results JSON := '[]'::JSON;
    v_org_result JSON;
BEGIN
    -- المرور على كل المؤسسات أو مؤسسة محددة
    FOR v_policy IN 
        SELECT * FROM inventory_retention_policies 
        WHERE auto_cleanup_enabled = true
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
        AND (next_cleanup_at IS NULL OR next_cleanup_at <= NOW())
    LOOP
        -- حساب تواريخ القطع
        v_normal_cutoff_date := v_policy.retention_start_date + (v_policy.normal_retention_days || ' days')::INTERVAL;
        v_important_cutoff_date := v_policy.retention_start_date + (v_policy.important_retention_days || ' days')::INTERVAL;
        
        -- عد السجلات المراد حذفها
        SELECT COUNT(*) INTO v_total_checked
        FROM inventory_log 
        WHERE organization_id = v_policy.organization_id
        AND created_at < v_normal_cutoff_date;
        
        IF NOT p_dry_run THEN
            -- حذف السجلات العادية القديمة
            DELETE FROM inventory_log 
            WHERE organization_id = v_policy.organization_id
            AND created_at < v_normal_cutoff_date
            AND (
                type NOT IN (SELECT unnest(v_policy.important_operation_types))
                AND ABS(quantity) < v_policy.important_quantity_threshold
            );
            
            GET DIAGNOSTICS v_normal_deleted = ROW_COUNT;
            
            -- حذف السجلات المهمة القديمة جداً
            DELETE FROM inventory_log 
            WHERE organization_id = v_policy.organization_id
            AND created_at < v_important_cutoff_date;
            
            GET DIAGNOSTICS v_important_deleted = ROW_COUNT;
            
            -- تحديث موعد التنظيف التالي
            UPDATE inventory_retention_policies 
            SET 
                last_cleanup_at = NOW(),
                next_cleanup_at = CURRENT_DATE + INTERVAL '7 days'
            WHERE organization_id = v_policy.organization_id;
        ELSE
            -- في وضع التجربة، فقط عد السجلات
            SELECT COUNT(*) INTO v_normal_deleted
            FROM inventory_log 
            WHERE organization_id = v_policy.organization_id
            AND created_at < v_normal_cutoff_date
            AND (
                type NOT IN (SELECT unnest(v_policy.important_operation_types))
                AND ABS(quantity) < v_policy.important_quantity_threshold
            );
            
            SELECT COUNT(*) INTO v_important_deleted
            FROM inventory_log 
            WHERE organization_id = v_policy.organization_id
            AND created_at < v_important_cutoff_date;
        END IF;
        
        -- إضافة النتيجة
        v_org_result := json_build_object(
            'organization_id', v_policy.organization_id,
            'retention_start_date', v_policy.retention_start_date,
            'normal_cutoff_date', v_normal_cutoff_date,
            'important_cutoff_date', v_important_cutoff_date,
            'total_logs_checked', v_total_checked,
            'normal_logs_deleted', v_normal_deleted,
            'important_logs_deleted', v_important_deleted,
            'dry_run', p_dry_run
        );
        
        v_results := v_results || v_org_result;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_organizations', json_array_length(v_results),
        'dry_run', p_dry_run,
        'results', v_results,
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

-- 7. فانكشن للحصول على إحصائيات الاحتفاظ
CREATE OR REPLACE FUNCTION get_inventory_retention_stats(p_organization_id UUID)
RETURNS JSON AS $$
DECLARE
    v_policy RECORD;
    v_total_logs INTEGER;
    v_old_normal_logs INTEGER;
    v_old_important_logs INTEGER;
    v_normal_cutoff TIMESTAMPTZ;
    v_important_cutoff TIMESTAMPTZ;
BEGIN
    -- الحصول على السياسة
    SELECT * INTO v_policy 
    FROM inventory_retention_policies 
    WHERE organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لم يتم العثور على سياسة احتفاظ لهذه المؤسسة'
        );
    END IF;
    
    -- حساب التواريخ
    v_normal_cutoff := v_policy.retention_start_date + (v_policy.normal_retention_days || ' days')::INTERVAL;
    v_important_cutoff := v_policy.retention_start_date + (v_policy.important_retention_days || ' days')::INTERVAL;
    
    -- إحصائيات السجلات
    SELECT COUNT(*) INTO v_total_logs
    FROM inventory_log 
    WHERE organization_id = p_organization_id;
    
    SELECT COUNT(*) INTO v_old_normal_logs
    FROM inventory_log 
    WHERE organization_id = p_organization_id
    AND created_at < v_normal_cutoff
    AND (
        type NOT IN (SELECT unnest(v_policy.important_operation_types))
        AND ABS(quantity) < v_policy.important_quantity_threshold
    );
    
    SELECT COUNT(*) INTO v_old_important_logs
    FROM inventory_log 
    WHERE organization_id = p_organization_id
    AND created_at < v_important_cutoff;
    
    RETURN json_build_object(
        'success', true,
        'policy', json_build_object(
            'retention_start_date', v_policy.retention_start_date,
            'normal_retention_days', v_policy.normal_retention_days,
            'important_retention_days', v_policy.important_retention_days,
            'auto_cleanup_enabled', v_policy.auto_cleanup_enabled,
            'last_cleanup_at', v_policy.last_cleanup_at,
            'next_cleanup_at', v_policy.next_cleanup_at
        ),
        'statistics', json_build_object(
            'total_logs', v_total_logs,
            'old_normal_logs', v_old_normal_logs,
            'old_important_logs', v_old_important_logs,
            'normal_cutoff_date', v_normal_cutoff,
            'important_cutoff_date', v_important_cutoff
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 8. جدولة التنظيف التلقائي (إذا كان pg_cron متاح)
-- SELECT cron.schedule('inventory-cleanup', '0 2 * * 0', 'SELECT cleanup_old_inventory_logs(NULL, false);');

COMMENT ON TABLE inventory_retention_policies IS 'سياسات الاحتفاظ بسجلات المخزون لكل مؤسسة';
COMMENT ON FUNCTION cleanup_old_inventory_logs IS 'تنظيف سجلات المخزون القديمة حسب سياسة كل مؤسسة';
COMMENT ON FUNCTION get_inventory_retention_stats IS 'إحصائيات سياسة الاحتفاظ لمؤسسة محددة'; 