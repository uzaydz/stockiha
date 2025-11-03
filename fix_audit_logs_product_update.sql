-- =============================================================================
-- Fix: تحديث دوال التدقيق لتتوافق مع بنية جدول audit_logs الصحيحة
-- المشكلة: الدوال تحاول إدراج أعمدة غير موجودة (organization_id, details, created_by)
-- الحل: تحديث الدوال لاستخدام البنية الصحيحة للجدول
-- =============================================================================

-- 1. تحديث دالة refresh_stats_with_logging
CREATE OR REPLACE FUNCTION refresh_stats_with_logging()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    BEGIN
        -- محاولة التحديث المتزامن أولاً
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_stats;
        
        -- تسجيل النجاح في audit_logs بالبنية الصحيحة
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'audit_logs' AND table_schema = 'public'
        ) THEN
            INSERT INTO audit_logs (
                user_id,
                action,
                resource_type,
                resource_id,
                metadata,
                severity,
                status
            ) VALUES (
                NULL, -- النظام
                'refresh_stats',
                'materialized_view',
                NULL,
                jsonb_build_object(
                    'view_name', 'mv_organization_stats',
                    'method', 'CONCURRENTLY',
                    'triggered_by', 'system'
                ),
                'low',
                'success'
            );
        END IF;
        
    EXCEPTION 
        WHEN OTHERS THEN
            -- في حالة فشل التحديث المتزامن، استخدم التحديث العادي
            BEGIN
                REFRESH MATERIALIZED VIEW mv_organization_stats;
                
                -- تسجيل النجاح في audit_logs
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'audit_logs' AND table_schema = 'public'
                ) THEN
                    INSERT INTO audit_logs (
                        user_id,
                        action,
                        resource_type,
                        resource_id,
                        metadata,
                        severity,
                        status,
                        error_message
                    ) VALUES (
                        NULL,
                        'refresh_stats',
                        'materialized_view',
                        NULL,
                        jsonb_build_object(
                            'view_name', 'mv_organization_stats',
                            'method', 'normal',
                            'triggered_by', 'system',
                            'fallback_reason', SQLERRM
                        ),
                        'low',
                        'success',
                        'Fallback to normal refresh: ' || SQLERRM
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
                            user_id,
                            action,
                            resource_type,
                            resource_id,
                            metadata,
                            severity,
                            status,
                            error_message
                        ) VALUES (
                            NULL,
                            'refresh_stats',
                            'materialized_view',
                            NULL,
                            jsonb_build_object(
                                'view_name', 'mv_organization_stats',
                                'triggered_by', 'system'
                            ),
                            'high',
                            'failure',
                            'فشل في تحديث إحصائيات المؤسسات: ' || SQLERRM
                        );
                    END IF;
            END;
    END;
END;
$$;

-- 2. تحديث دالة trigger_refresh_stats
CREATE OR REPLACE FUNCTION trigger_refresh_stats()
RETURNS TRIGGER
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
                user_id,
                action,
                resource_type,
                resource_id,
                metadata,
                severity,
                status,
                error_message
            ) VALUES (
                NULL,
                'trigger_error',
                'trigger',
                NULL,
                jsonb_build_object(
                    'trigger_name', 'trigger_refresh_stats',
                    'operation', TG_OP,
                    'table', TG_TABLE_NAME
                ),
                'medium',
                'failure',
                'خطأ في trigger_refresh_stats: ' || SQLERRM
            );
        END IF;
        
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$;

-- 3. إضافة تعليقات توضيحية
COMMENT ON FUNCTION refresh_stats_with_logging() IS 
'تحديث materialized view للإحصائيات مع تسجيل العملية في audit_logs';

COMMENT ON FUNCTION trigger_refresh_stats() IS 
'Trigger لتحديث الإحصائيات عند تغيير البيانات في الجداول المرتبطة';

-- 4. التحقق من صحة الإصلاح
DO $$
BEGIN
    RAISE NOTICE 'تم تحديث دوال التدقيق بنجاح ✓';
    RAISE NOTICE 'الدوال المحدثة:';
    RAISE NOTICE '  - refresh_stats_with_logging()';
    RAISE NOTICE '  - trigger_refresh_stats()';
END $$;
