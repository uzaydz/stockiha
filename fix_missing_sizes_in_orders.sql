

-- سكريپت إصلاح شامل للمقاسات والألوان المفقودة في الطلبيات
-- تاريخ الإنشاء: يوليو 2025
-- الغرض: إصلاح آمن للطلبيات مع تجنب البيانات المرجعية المحذوفة

-- 1. تحليل المشكلة وعرض التقرير الشامل
DO $$
DECLARE
    rec RECORD;
    v_total_affected INTEGER;
    v_fixable_orders INTEGER;
    v_deleted_sizes INTEGER;
    v_deleted_colors INTEGER;
BEGIN
    RAISE NOTICE '=== تحليل شامل لمشكلة المقاسات والألوان المفقودة ===';
    
    -- إحصائيات عامة
    SELECT COUNT(*) INTO v_total_affected
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    WHERE (oi.size_id IS NULL OR oi.color_id IS NULL)
    AND (o.form_data->>'product_size' IS NOT NULL OR o.form_data->>'product_color' IS NOT NULL);
    
    RAISE NOTICE 'إجمالي الطلبيات المتأثرة: %', v_total_affected;
    
    -- الطلبيات القابلة للإصلاح
    SELECT COUNT(*) INTO v_fixable_orders
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    LEFT JOIN product_sizes ps ON ps.id::text = o.form_data->>'product_size'
    LEFT JOIN product_colors pc ON pc.id::text = o.form_data->>'product_color'
    WHERE (oi.size_id IS NULL OR oi.color_id IS NULL)
    AND ((o.form_data->>'product_size' IS NOT NULL AND ps.id IS NOT NULL) OR oi.size_id IS NOT NULL)
    AND ((o.form_data->>'product_color' IS NOT NULL AND pc.id IS NOT NULL) OR oi.color_id IS NOT NULL);
    
    RAISE NOTICE 'الطلبيات القابلة للإصلاح الآمن: %', v_fixable_orders;
    
    -- المقاسات المحذوفة
    SELECT COUNT(DISTINCT o.form_data->>'product_size') INTO v_deleted_sizes
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    LEFT JOIN product_sizes ps ON ps.id::text = o.form_data->>'product_size'
    WHERE o.form_data->>'product_size' IS NOT NULL 
    AND oi.size_id IS NULL
    AND ps.id IS NULL;
    
    RAISE NOTICE 'مقاسات محذوفة: %', v_deleted_sizes;
    
    -- الألوان المحذوفة
    SELECT COUNT(DISTINCT o.form_data->>'product_color') INTO v_deleted_colors
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    LEFT JOIN product_colors pc ON pc.id::text = o.form_data->>'product_color'
    WHERE o.form_data->>'product_color' IS NOT NULL 
    AND oi.color_id IS NULL
    AND pc.id IS NULL;
    
    RAISE NOTICE 'ألوان محذوفة: %', v_deleted_colors;
    
    RAISE NOTICE '--- تفصيل الطلبيات حسب الحالة ---';
    
    FOR rec IN (
        SELECT 
            CASE 
                WHEN ps.id IS NOT NULL AND pc.id IS NOT NULL THEN 'مقاس صالح + لون صالح'
                WHEN ps.id IS NULL AND pc.id IS NOT NULL THEN 'مقاس محذوف + لون صالح'
                WHEN ps.id IS NOT NULL AND pc.id IS NULL THEN 'مقاس صالح + لون محذوف'
                ELSE 'مقاس محذوف + لون محذوف'
            END as category,
            COUNT(*) as count
        FROM online_orders o
        INNER JOIN online_order_items oi ON o.id = oi.order_id
        LEFT JOIN product_sizes ps ON ps.id::text = o.form_data->>'product_size'
        LEFT JOIN product_colors pc ON pc.id::text = o.form_data->>'product_color'
        WHERE (oi.size_id IS NULL OR oi.color_id IS NULL)
        AND (o.form_data->>'product_size' IS NOT NULL OR o.form_data->>'product_color' IS NOT NULL)
        GROUP BY 
            CASE 
                WHEN ps.id IS NOT NULL AND pc.id IS NOT NULL THEN 'مقاس صالح + لون صالح'
                WHEN ps.id IS NULL AND pc.id IS NOT NULL THEN 'مقاس محذوف + لون صالح'
                WHEN ps.id IS NOT NULL AND pc.id IS NULL THEN 'مقاس صالح + لون محذوف'
                ELSE 'مقاس محذوف + لون محذوف'
            END
        ORDER BY count DESC
    ) LOOP
        RAISE NOTICE '- %: % طلبية', rec.category, rec.count;
    END LOOP;
    
END $$;

-- 2. إصلاح آمن للمقاسات الصالحة فقط
UPDATE online_order_items 
SET 
    size_id = form_size_data.extracted_size_id,
    size_name = form_size_data.extracted_size_name
FROM (
    SELECT 
        oi.id as item_id,
        (o.form_data->>'product_size')::uuid as extracted_size_id,
        ps.size_name as extracted_size_name,
        o.customer_order_number,
        oi.product_name
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    INNER JOIN product_sizes ps ON ps.id = (o.form_data->>'product_size')::uuid
    WHERE o.form_data->>'product_size' IS NOT NULL 
    AND o.form_data->>'product_size' != ''
    AND oi.size_id IS NULL
) as form_size_data
WHERE online_order_items.id = form_size_data.item_id;

-- 3. إصلاح آمن للألوان الصالحة فقط
UPDATE online_order_items 
SET 
    color_id = form_color_data.extracted_color_id,
    color_name = form_color_data.extracted_color_name
FROM (
    SELECT 
        oi.id as item_id,
        (o.form_data->>'product_color')::uuid as extracted_color_id,
        pc.color_name as extracted_color_name,
        o.customer_order_number,
        oi.product_name
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    INNER JOIN product_colors pc ON pc.id = (o.form_data->>'product_color')::uuid
    WHERE o.form_data->>'product_color' IS NOT NULL 
    AND o.form_data->>'product_color' != ''
    AND oi.color_id IS NULL
) as form_color_data
WHERE online_order_items.id = form_color_data.item_id;

-- 4. تقرير النتائج بعد الإصلاح
DO $$
DECLARE
    v_fixed_sizes INTEGER;
    v_fixed_colors INTEGER;
    v_remaining_issues INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '=== نتائج الإصلاح ===';
    
    -- عدد المقاسات المُصلحة
    SELECT COUNT(*) INTO v_fixed_sizes
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    INNER JOIN product_sizes ps ON ps.id = oi.size_id
    WHERE o.form_data->>'product_size' IS NOT NULL 
    AND ps.id::text = o.form_data->>'product_size';
    
    RAISE NOTICE 'المقاسات المُصلحة: %', v_fixed_sizes;
    
    -- عدد الألوان المُصلحة
    SELECT COUNT(*) INTO v_fixed_colors
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    INNER JOIN product_colors pc ON pc.id = oi.color_id
    WHERE o.form_data->>'product_color' IS NOT NULL 
    AND pc.id::text = o.form_data->>'product_color';
    
    RAISE NOTICE 'الألوان المُصلحة: %', v_fixed_colors;
    
    -- المشاكل المتبقية
    SELECT COUNT(*) INTO v_remaining_issues
    FROM online_orders o
    INNER JOIN online_order_items oi ON o.id = oi.order_id
    WHERE (oi.size_id IS NULL OR oi.color_id IS NULL)
    AND (o.form_data->>'product_size' IS NOT NULL OR o.form_data->>'product_color' IS NOT NULL);
    
    RAISE NOTICE 'المشاكل المتبقية (بيانات محذوفة): %', v_remaining_issues;
    
    -- تفصيل المشاكل المتبقية
    RAISE NOTICE '--- المشاكل المتبقية حسب المنتج ---';
    
    FOR rec IN (
        SELECT 
            oi.product_name,
            COUNT(*) as remaining_count,
            STRING_AGG(o.customer_order_number::text, ', ' ORDER BY o.customer_order_number) as order_numbers
        FROM online_orders o
        INNER JOIN online_order_items oi ON o.id = oi.order_id
        WHERE (oi.size_id IS NULL OR oi.color_id IS NULL)
        AND (o.form_data->>'product_size' IS NOT NULL OR o.form_data->>'product_color' IS NOT NULL)
        GROUP BY oi.product_name
        ORDER BY remaining_count DESC
    ) LOOP
        RAISE NOTICE '- %: % طلبية (أرقام: %)', rec.product_name, rec.remaining_count, 
                    CASE WHEN LENGTH(rec.order_numbers) > 50 
                         THEN LEFT(rec.order_numbers, 50) || '...' 
                         ELSE rec.order_numbers END;
    END LOOP;
    
END $$;

-- 5. إنشاء تقرير للبيانات المحذوفة التي تحتاج لإعادة إنشاء
CREATE TEMPORARY TABLE temp_deleted_references AS
SELECT DISTINCT
    'product_sizes' as table_name,
    o.form_data->>'product_size' as deleted_id,
    NULL as name_hint,
    COUNT(*) as affected_orders
FROM online_orders o
INNER JOIN online_order_items oi ON o.id = oi.order_id
LEFT JOIN product_sizes ps ON ps.id::text = o.form_data->>'product_size'
WHERE o.form_data->>'product_size' IS NOT NULL 
AND oi.size_id IS NULL
AND ps.id IS NULL
GROUP BY o.form_data->>'product_size'

UNION ALL

SELECT DISTINCT
    'product_colors' as table_name,
    o.form_data->>'product_color' as deleted_id,
    NULL as name_hint,
    COUNT(*) as affected_orders
FROM online_orders o
INNER JOIN online_order_items oi ON o.id = oi.order_id
LEFT JOIN product_colors pc ON pc.id::text = o.form_data->>'product_color'
WHERE o.form_data->>'product_color' IS NOT NULL 
AND oi.color_id IS NULL
AND pc.id IS NULL
GROUP BY o.form_data->>'product_color';

-- عرض البيانات المحذوفة
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== البيانات المرجعية المحذوفة التي تحتاج إعادة إنشاء ===';
    
    FOR rec IN (
        SELECT table_name, deleted_id, affected_orders
        FROM temp_deleted_references
        ORDER BY table_name, affected_orders DESC
    ) LOOP
        RAISE NOTICE '% - ID: % (يؤثر على % طلبية)', 
                    rec.table_name, rec.deleted_id, rec.affected_orders;
    END LOOP;
    
END $$;

-- تنظيف الجدول المؤقت
DROP TABLE IF EXISTS temp_deleted_references;

RAISE NOTICE '=== انتهى الإصلاح الآمن ===';
RAISE NOTICE 'ملاحظة: الطلبيات التي تحتوي على بيانات مرجعية محذوفة تحتاج لتدخل يدوي';
RAISE NOTICE 'يُنصح بإعادة إنشاء المقاسات والألوان المحذوفة أو تحديث الطلبيات يدوياً'; 