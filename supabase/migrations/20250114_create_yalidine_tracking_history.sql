-- =====================================================
-- Migration: Yalidine Delivery Tracking History
-- Date: 2025-01-14
-- Description: إنشاء جدول تتبع تاريخ شحنات ياليدين
-- =====================================================

-- 1. إنشاء جدول سجل التتبع
CREATE TABLE IF NOT EXISTS yalidine_delivery_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- معلومات التتبع
    tracking_number VARCHAR(100) NOT NULL,

    -- معلومات الحالة
    date_status TIMESTAMPTZ NOT NULL,
    status VARCHAR(100) NOT NULL,              -- الحالة بالفرنسية من API (مثل: Livré, En cours...)
    status_ar VARCHAR(100),                    -- الحالة بالعربية
    status_normalized VARCHAR(50),             -- الحالة الموحدة (delivered, in_transit, etc.)
    reason TEXT,                               -- سبب الفشل/التأجيل إن وجد

    -- معلومات الموقع
    center_id INTEGER,
    center_name VARCHAR(255),
    wilaya_id INTEGER,
    wilaya_name VARCHAR(100),
    commune_id INTEGER,
    commune_name VARCHAR(100),

    -- معلومات إضافية
    raw_data JSONB,                            -- البيانات الخام الكاملة من API للرجوع إليها

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_yalidine_history_order_id
    ON yalidine_delivery_history(order_id);

CREATE INDEX IF NOT EXISTS idx_yalidine_history_tracking
    ON yalidine_delivery_history(tracking_number);

CREATE INDEX IF NOT EXISTS idx_yalidine_history_org_id
    ON yalidine_delivery_history(organization_id);

CREATE INDEX IF NOT EXISTS idx_yalidine_history_date_desc
    ON yalidine_delivery_history(date_status DESC);

CREATE INDEX IF NOT EXISTS idx_yalidine_history_status
    ON yalidine_delivery_history(status_normalized);

-- Index مركب للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_yalidine_history_order_date
    ON yalidine_delivery_history(order_id, date_status DESC);

-- 3. Unique constraint لمنع التكرار
-- نفس الطلب + نفس رقم التتبع + نفس التاريخ + نفس الحالة = سجل واحد فقط
CREATE UNIQUE INDEX IF NOT EXISTS idx_yalidine_history_unique
    ON yalidine_delivery_history(order_id, tracking_number, date_status, status);

-- 4. جدول تخزين آخر تحديث (لتجنب Rate Limit)
CREATE TABLE IF NOT EXISTS yalidine_tracking_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- معلومات الكاش
    last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fetch_count INTEGER DEFAULT 1,
    last_status VARCHAR(100),
    last_status_normalized VARCHAR(50),

    -- TTL Settings (Time To Live)
    cache_ttl_minutes INTEGER DEFAULT 30,      -- مدة صلاحية الكاش بالدقائق

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(tracking_number, order_id)
);

-- Index للكاش
CREATE INDEX IF NOT EXISTS idx_tracking_cache_org
    ON yalidine_tracking_cache(organization_id);

CREATE INDEX IF NOT EXISTS idx_tracking_cache_last_fetched
    ON yalidine_tracking_cache(last_fetched_at);

CREATE INDEX IF NOT EXISTS idx_tracking_cache_tracking
    ON yalidine_tracking_cache(tracking_number);

-- 5. تفعيل Row Level Security
ALTER TABLE yalidine_delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE yalidine_tracking_cache ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies لجدول yalidine_delivery_history

-- المستخدمون يمكنهم قراءة سجلات مؤسستهم فقط
DROP POLICY IF EXISTS "Users can view their org delivery history" ON yalidine_delivery_history;
CREATE POLICY "Users can view their org delivery history"
    ON yalidine_delivery_history
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Service role يمكنه الإدراج (من خلال API)
DROP POLICY IF EXISTS "Service role can insert delivery history" ON yalidine_delivery_history;
CREATE POLICY "Service role can insert delivery history"
    ON yalidine_delivery_history
    FOR INSERT
    WITH CHECK (true);

-- Service role يمكنه التحديث
DROP POLICY IF EXISTS "Service role can update delivery history" ON yalidine_delivery_history;
CREATE POLICY "Service role can update delivery history"
    ON yalidine_delivery_history
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 7. RLS Policies لجدول yalidine_tracking_cache

DROP POLICY IF EXISTS "Users can view their org tracking cache" ON yalidine_tracking_cache;
CREATE POLICY "Users can view their org tracking cache"
    ON yalidine_tracking_cache
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage tracking cache" ON yalidine_tracking_cache;
CREATE POLICY "Service role can manage tracking cache"
    ON yalidine_tracking_cache
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_yalidine_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لجدول yalidine_delivery_history
DROP TRIGGER IF EXISTS update_yalidine_history_updated_at ON yalidine_delivery_history;
CREATE TRIGGER update_yalidine_history_updated_at
    BEFORE UPDATE ON yalidine_delivery_history
    FOR EACH ROW
    EXECUTE FUNCTION update_yalidine_tracking_updated_at();

-- Trigger لجدول yalidine_tracking_cache
DROP TRIGGER IF EXISTS update_tracking_cache_updated_at ON yalidine_tracking_cache;
CREATE TRIGGER update_tracking_cache_updated_at
    BEFORE UPDATE ON yalidine_tracking_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_yalidine_tracking_updated_at();

-- 9. Function لجلب آخر حالة تتبع
CREATE OR REPLACE FUNCTION get_latest_tracking_status(p_order_id UUID)
RETURNS TABLE (
    status VARCHAR(100),
    status_ar VARCHAR(100),
    status_normalized VARCHAR(50),
    date_status TIMESTAMPTZ,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.status,
        h.status_ar,
        h.status_normalized,
        h.date_status,
        h.reason
    FROM yalidine_delivery_history h
    WHERE h.order_id = p_order_id
    ORDER BY h.date_status DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function للتحقق من حاجة التحديث (Smart Cache Check)
CREATE OR REPLACE FUNCTION should_refresh_tracking(p_tracking_number VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    v_last_fetched TIMESTAMPTZ;
    v_cache_ttl INTEGER;
    v_last_status VARCHAR(50);
BEGIN
    -- جلب معلومات الكاش
    SELECT last_fetched_at, cache_ttl_minutes, last_status_normalized
    INTO v_last_fetched, v_cache_ttl, v_last_status
    FROM yalidine_tracking_cache
    WHERE tracking_number = p_tracking_number
    LIMIT 1;

    -- إذا لم يوجد سجل في الكاش، يحتاج تحديث
    IF v_last_fetched IS NULL THEN
        RETURN TRUE;
    END IF;

    -- إذا كانت الحالة "تم التسليم"، لا حاجة للتحديث (حالة نهائية)
    IF v_last_status IN ('delivered', 'returned', 'cancelled') THEN
        RETURN FALSE;
    END IF;

    -- التحقق من انتهاء صلاحية الكاش
    IF NOW() - v_last_fetched > (v_cache_ttl || ' minutes')::INTERVAL THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. View لعرض آخر حالة لكل طلب (لتحسين الأداء)
CREATE OR REPLACE VIEW orders_latest_tracking AS
SELECT DISTINCT ON (h.order_id)
    h.order_id,
    h.tracking_number,
    h.status,
    h.status_ar,
    h.status_normalized,
    h.date_status,
    h.reason,
    h.center_name,
    h.wilaya_name,
    h.commune_name
FROM yalidine_delivery_history h
ORDER BY h.order_id, h.date_status DESC;

-- 12. Function للتنظيف التلقائي للبيانات القديمة (اختياري - لتوفير المساحة)
CREATE OR REPLACE FUNCTION cleanup_old_tracking_cache()
RETURNS void AS $$
BEGIN
    -- حذف سجلات الكاش الأقدم من 90 يوم للطلبات المكتملة
    DELETE FROM yalidine_tracking_cache
    WHERE last_status_normalized IN ('delivered', 'returned', 'cancelled')
    AND last_fetched_at < NOW() - INTERVAL '90 days';

    -- حذف سجلات التتبع الأقدم من 180 يوم للطلبات المكتملة
    DELETE FROM yalidine_delivery_history
    WHERE status_normalized IN ('delivered', 'returned', 'cancelled')
    AND date_status < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. إضافة تعليقات للتوثيق
COMMENT ON TABLE yalidine_delivery_history IS 'سجل تتبع شحنات ياليدين - يحتوي على جميع أحداث التتبع لكل طلب';
COMMENT ON TABLE yalidine_tracking_cache IS 'كاش ذكي لتتبع آخر تحديث وتجنب تجاوز حدود API';
COMMENT ON FUNCTION should_refresh_tracking IS 'دالة ذكية للتحقق من حاجة تحديث معلومات التتبع بناءً على TTL والحالة';
COMMENT ON FUNCTION get_latest_tracking_status IS 'جلب آخر حالة تتبع لطلب معين';
COMMENT ON VIEW orders_latest_tracking IS 'عرض سريع لآخر حالة تتبع لكل طلب';

-- 14. Grant Permissions
GRANT SELECT ON yalidine_delivery_history TO authenticated;
GRANT SELECT ON yalidine_tracking_cache TO authenticated;
GRANT SELECT ON orders_latest_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_tracking_status TO authenticated;
GRANT EXECUTE ON FUNCTION should_refresh_tracking TO authenticated;

-- =====================================================
-- نهاية Migration
-- =====================================================
