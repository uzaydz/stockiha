-- =============================================================================
-- إصلاح فوري للمنتجات النشطة ذات المخزون السلبي
-- يستعيد قدرة العملاء على البيع فوراً
-- =============================================================================

CREATE OR REPLACE FUNCTION fix_active_negative_products_urgent()
RETURNS TABLE(
    organization_name TEXT,
    product_name TEXT,
    current_stock INT,
    recent_sales INT,
    recommended_stock INT,
    new_stock INT,
    action_taken TEXT
) AS $$
DECLARE
    product_rec RECORD;
    recommended_stock_value INT;
BEGIN
    -- إصلاح فوري للمنتجات النشطة ذات المخزون السلبي
    FOR product_rec IN 
        SELECT 
            p.id, p.organization_id, p.name, p.stock_quantity,
            o.name as org_name,
            COALESCE(recent_sales.sales_30d, 0) as recent_sales_30d
        FROM products p
        JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN (
            SELECT 
                product_id,
                SUM(quantity) as sales_30d
            FROM inventory_log 
            WHERE type = 'sale' 
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY product_id
        ) recent_sales ON p.id = recent_sales.product_id
        WHERE p.stock_quantity < 0
        AND COALESCE(recent_sales.sales_30d, 0) > 0  -- فقط المنتجات النشطة
        ORDER BY COALESCE(recent_sales.sales_30d, 0) DESC
    LOOP
        -- حساب مخزون مُوصى به بناءً على النشاط
        -- متوسط البيع الأسبوعي × 4 أسابيع + buffer 20%
        recommended_stock_value := CEIL(product_rec.recent_sales_30d / 4.0 * 1.2);
        
        -- حد أدنى 5 قطع للمنتجات النشطة
        recommended_stock_value := GREATEST(recommended_stock_value, 5);
        
        -- حد أقصى معقول 50 قطعة
        recommended_stock_value := LEAST(recommended_stock_value, 50);
        
        -- تطبيق الإصلاح
        UPDATE products 
        SET stock_quantity = recommended_stock_value,
            updated_at = NOW()
        WHERE id = product_rec.id;
        
        -- توثيق العملية
        INSERT INTO inventory_log (
            organization_id, product_id, type, quantity,
            previous_stock, new_stock, reference_type, notes, created_at
        ) VALUES (
            product_rec.organization_id, product_rec.id, 'adjustment',
            recommended_stock_value - product_rec.stock_quantity,
            product_rec.stock_quantity, recommended_stock_value,
            'urgent_active_fix',
            FORMAT('إصلاح عاجل منتج نشط: من %s إلى %s (مبيعات شهرية: %s)', 
                   product_rec.stock_quantity, recommended_stock_value, product_rec.recent_sales_30d),
            NOW()
        );
        
        -- إرجاع النتائج
        organization_name := product_rec.org_name;
        product_name := product_rec.name;
        current_stock := product_rec.stock_quantity;
        recent_sales := product_rec.recent_sales_30d;
        recommended_stock := recommended_stock_value;
        new_stock := recommended_stock_value;
        action_taken := FORMAT('تم رفع المخزون من %s إلى %s', 
                              product_rec.stock_quantity, recommended_stock_value);
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تنفيذ الإصلاح الفوري
SELECT * FROM fix_active_negative_products_urgent();

-- التحقق السريع من النتائج
SELECT 
    'منتجات نشطة بمخزون سلبي بعد الإصلاح' as check_type,
    COUNT(*) as remaining_count
FROM products p
WHERE p.stock_quantity < 0
AND p.id IN (
    SELECT DISTINCT il.product_id
    FROM inventory_log il
    WHERE il.type = 'sale' 
    AND il.created_at >= NOW() - INTERVAL '30 days'
);

-- تقرير سريع للعملاء
SELECT 
    o.name as organization_name,
    COUNT(*) FILTER (WHERE p.stock_quantity > 0) as products_available,
    COUNT(*) as total_products,
    ROUND(
        COUNT(*) FILTER (WHERE p.stock_quantity > 0)::NUMERIC / 
        COUNT(*) * 100, 1
    ) as availability_percentage,
    CASE 
        WHEN COUNT(*) FILTER (WHERE p.stock_quantity > 0)::NUMERIC / COUNT(*) >= 0.9 
        THEN '✅ جاهز للبيع'
        ELSE '⚠️ يحتاج مراجعة'
    END as status
FROM organizations o
JOIN products p ON o.id = p.organization_id
WHERE o.id IN (
    -- المؤسسات التي كان لديها منتجات نشطة بمخزون سلبي
    SELECT DISTINCT p.organization_id
    FROM products p
    WHERE p.id IN (
        SELECT product_id FROM inventory_log 
        WHERE reference_type = 'urgent_active_fix'
        AND created_at >= NOW() - INTERVAL '10 minutes'
    )
)
GROUP BY o.id, o.name
ORDER BY availability_percentage DESC; 