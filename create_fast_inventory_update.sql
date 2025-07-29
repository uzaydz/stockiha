-- دالة محسنة جداً لتحديث المخزون بسرعة فائقة (بدون FIFO المعقد)
-- التاريخ: 2025-01-14
-- الغرض: تحسين أداء إنشاء طلبيات نقطة البيع

CREATE OR REPLACE FUNCTION update_product_stock_ultra_fast(
    p_product_id UUID,
    p_quantity_sold INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- تحديث المخزون مباشرة بدون استعلامات إضافية
    UPDATE products 
    SET 
        stock_quantity = GREATEST(0, stock_quantity - p_quantity_sold),
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id
    RETURNING stock_quantity INTO v_new_stock;
    
    -- إذا لم يتم العثور على المنتج
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    -- في حالة حدوث خطأ، إرجاع false
    RETURN FALSE;
END;
$$;

-- دالة تحديث مجمع للمنتجات (محسنة للسرعة)
CREATE OR REPLACE FUNCTION bulk_update_products_stock_ultra_fast(
    p_product_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_update JSONB;
    v_product_id UUID;
    v_quantity_sold INTEGER;
    v_success_count INTEGER := 0;
    v_total_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
BEGIN
    -- معالجة كل تحديث من التحديثات
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_product_updates)
    LOOP
        v_total_count := v_total_count + 1;
        
        BEGIN
            v_product_id := (v_update->>'product_id')::UUID;
            v_quantity_sold := (v_update->>'quantity_sold')::INTEGER;
            
            -- تحديث المنتج
            UPDATE products 
            SET 
                stock_quantity = GREATEST(0, stock_quantity - v_quantity_sold),
                updated_at = NOW(),
                last_inventory_update = NOW()
            WHERE id = v_product_id;
            
            IF FOUND THEN
                v_success_count := v_success_count + 1;
            ELSE
                v_errors := v_errors || jsonb_build_object(
                    'product_id', v_product_id,
                    'error', 'المنتج غير موجود'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'product_id', v_product_id,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_processed', v_total_count,
        'successful_updates', v_success_count,
        'errors', v_errors,
        'message', 'تم معالجة ' || v_success_count || ' من أصل ' || v_total_count || ' منتج'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'فشل في التحديث المجمع'
    );
END;
$$;

-- منح الصلاحيات للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION update_product_stock_ultra_fast(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_products_stock_ultra_fast(JSONB) TO authenticated;

-- إنشاء فهرس محسن للأداء إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_products_stock_update_fast 
ON products (id, stock_quantity, organization_id) 
WHERE stock_quantity IS NOT NULL;

COMMENT ON FUNCTION update_product_stock_ultra_fast IS 
'دالة محسنة لتحديث مخزون المنتج بسرعة فائقة - بدون FIFO المعقد';

COMMENT ON FUNCTION bulk_update_products_stock_ultra_fast IS 
'دالة محسنة للتحديث المجمع لمخزون عدة منتجات بسرعة فائقة'; 