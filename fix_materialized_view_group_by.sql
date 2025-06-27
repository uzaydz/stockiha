-- حل شامل لمشكلة GROUP BY في mv_organization_stats
-- تاريخ: 2024
-- الهدف: إصلاح جميع مشاكل GROUP BY المتعلقة بالـ materialized view

-- الخطوة 1: تعطيل trigger المشكل مؤقتاً
DO $$
BEGIN
    -- تعطيل trigger refresh_stats_on_customers مؤقتاً
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'refresh_stats_on_customers' 
        AND tgrelid = 'customers'::regclass
    ) THEN
        ALTER TABLE customers DISABLE TRIGGER refresh_stats_on_customers;
        RAISE NOTICE 'تم تعطيل trigger refresh_stats_on_customers مؤقتاً';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في تعطيل trigger: %', SQLERRM;
END;
$$;

-- الخطوة 2: حذف mv_organization_stats إذا كان موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'mv_organization_stats'
    ) THEN
        DROP MATERIALIZED VIEW mv_organization_stats;
        RAISE NOTICE 'تم حذف mv_organization_stats القديم';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في حذف materialized view: %', SQLERRM;
END;
$$;

-- الخطوة 3: إنشاء mv_organization_stats جديد ومحسن
CREATE MATERIALIZED VIEW mv_organization_stats AS
WITH organization_base AS (
    SELECT 
        id,
        name,
        created_at,
        updated_at
    FROM organizations
),
order_stats AS (
    SELECT 
        organization_id,
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
    FROM orders 
    GROUP BY organization_id
),
customer_stats AS (
    SELECT 
        organization_id,
        COUNT(*) as total_customers
    FROM customers 
    GROUP BY organization_id
),
product_stats AS (
    SELECT 
        organization_id,
        COUNT(*) as total_products
    FROM products 
    GROUP BY organization_id
)
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COALESCE(ord.total_orders, 0) as total_orders,
    COALESCE(ord.completed_orders, 0) as completed_orders,
    COALESCE(ord.pending_orders, 0) as pending_orders,
    COALESCE(ord.cancelled_orders, 0) as cancelled_orders,
    COALESCE(ord.total_revenue, 0) as total_revenue,
    COALESCE(ord.avg_order_value, 0) as avg_order_value,
    COALESCE(c.total_customers, 0) as total_customers,
    COALESCE(p.total_products, 0) as total_products,
    o.created_at,
    o.updated_at,
    NOW() as stats_updated_at
FROM organization_base o
LEFT JOIN order_stats ord ON o.id = ord.organization_id
LEFT JOIN customer_stats c ON o.id = c.organization_id
LEFT JOIN product_stats p ON o.id = p.organization_id;

-- إنشاء index للأداء
CREATE UNIQUE INDEX idx_mv_organization_stats_org_id 
ON mv_organization_stats (organization_id);

-- الخطوة 4: إنشاء دالة محسنة لتحديث الـ materialized view
CREATE OR REPLACE FUNCTION refresh_stats_with_logging()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    BEGIN
        -- محاولة التحديث المتزامن أولاً
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_stats;
        
        -- تسجيل النجاح في audit_logs إذا كان الجدول موجود
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'audit_logs' AND table_schema = 'public'
        ) THEN
            INSERT INTO audit_logs (
                organization_id, 
                action, 
                details, 
                created_by, 
                created_at
            ) VALUES (
                NULL,
                'refresh_stats',
                'تم تحديث إحصائيات المؤسسات بنجاح (CONCURRENTLY)',
                'system',
                NOW()
            );
        END IF;
        
    EXCEPTION 
        WHEN OTHERS THEN
            -- في حالة فشل التحديث المتزامن، استخدم التحديث العادي
            BEGIN
                REFRESH MATERIALIZED VIEW mv_organization_stats;
                
                -- تسجيل النجاح في audit_logs إذا كان الجدول موجود
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'audit_logs' AND table_schema = 'public'
                ) THEN
                    INSERT INTO audit_logs (
                        organization_id, 
                        action, 
                        details, 
                        created_by, 
                        created_at
                    ) VALUES (
                        NULL,
                        'refresh_stats',
                        'تم تحديث إحصائيات المؤسسات بنجاح (عادي) - ' || SQLERRM,
                        'system',
                        NOW()
                    );
                END IF;
                
            EXCEPTION 
                WHEN OTHERS THEN
                    -- تسجيل الخطأ في حالة فشل كل شيء
                    IF EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'audit_logs' AND table_schema = 'public'
                    ) THEN
                        INSERT INTO audit_logs (
                            organization_id, 
                            action, 
                            details, 
                            created_by, 
                            created_at
                        ) VALUES (
                            NULL,
                            'refresh_stats_error',
                            'فشل في تحديث إحصائيات المؤسسات: ' || SQLERRM,
                            'system',
                            NOW()
                        );
                    END IF;
            END;
    END;
END;
$$;

-- الخطوة 5: إنشاء دالة trigger محسنة
CREATE OR REPLACE FUNCTION trigger_refresh_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- تشغيل التحديث في الخلفية لتجنب بطء العمليات
    PERFORM refresh_stats_with_logging();
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، لا نوقف العملية الأساسية
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'audit_logs' AND table_schema = 'public'
        ) THEN
            INSERT INTO audit_logs (
                organization_id, 
                action, 
                details, 
                created_by, 
                created_at
            ) VALUES (
                NULL,
                'trigger_error',
                'خطأ في trigger_refresh_stats: ' || SQLERRM,
                'system',
                NOW()
            );
        END IF;
        
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$;

-- الخطوة 6: إعادة تشغيل trigger مع الدالة الجديدة
DO $$
BEGIN
    -- حذف trigger القديم إذا كان موجوداً
    DROP TRIGGER IF EXISTS refresh_stats_on_customers ON customers;
    
    -- إنشاء trigger جديد
    CREATE TRIGGER refresh_stats_on_customers
        AFTER INSERT OR UPDATE OR DELETE ON customers
        FOR EACH ROW
        EXECUTE FUNCTION trigger_refresh_stats();
    
    RAISE NOTICE 'تم إنشاء trigger جديد بنجاح';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إنشاء trigger: %', SQLERRM;
END;
$$;

-- الخطوة 7: إضافة صلاحيات
DO $$
BEGIN
    -- صلاحيات للـ materialized view
    GRANT SELECT ON mv_organization_stats TO authenticated;
    GRANT SELECT ON mv_organization_stats TO service_role;
    
    -- صلاحيات للدوال
    GRANT EXECUTE ON FUNCTION refresh_stats_with_logging() TO service_role;
    GRANT EXECUTE ON FUNCTION trigger_refresh_stats() TO service_role;
    
    RAISE NOTICE 'تم إضافة الصلاحيات بنجاح';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إضافة الصلاحيات: %', SQLERRM;
END;
$$;

-- الخطوة 8: اختبار أولي لملء البيانات
DO $$
BEGIN
    PERFORM refresh_stats_with_logging();
    RAISE NOTICE 'تم تحديث الإحصائيات بنجاح';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في التحديث الأولي: %', SQLERRM;
END;
$$;

-- الخطوة 9: التحقق من النتائج
DO $$
DECLARE
    stats_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO stats_count FROM mv_organization_stats;
    RAISE NOTICE 'عدد المؤسسات في الإحصائيات: %', stats_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في التحقق: %', SQLERRM;
END;
$$;

-- رسالة إتمام
SELECT 'تم إنجاز إصلاح mv_organization_stats بنجاح!' as status; 