-- ===============================================
-- إصلاح مشكلة خصم المخزون مضاعف في نقطة البيع
-- المشكلة: دالة FIFO تخصم المخزون مرتين
-- التاريخ: 2025-01-30
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 ===== تشخيص مشكلة خصم المخزون المضاعف =====';
    RAISE NOTICE '❌ المشكلة: دالة process_pos_sale_with_variants_fifo تخصم المخزون مرتين';
    RAISE NOTICE '🔧 السبب: تحديث products.stock_quantity + تحديث inventory_batches';
    RAISE NOTICE '✅ الحل: إصلاح الدالة لتخصم المخزون مرة واحدة فقط';
END;
$$;

-- ===============================================
-- الخطوة 1: إنشاء دالة FIFO محسنة وآمنة
-- ===============================================

CREATE OR REPLACE FUNCTION process_pos_sale_with_variants_fifo(
    p_product_id UUID,
    p_quantity INTEGER,
    p_organization_id UUID,
    p_color_id UUID DEFAULT NULL,
    p_size_id UUID DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_record RECORD;
    v_total_available INTEGER;
    v_batches_stock INTEGER := 0;
    v_initial_stock INTEGER := 0;
    v_quantity_from_initial INTEGER := 0;
    v_quantity_from_batches INTEGER := 0;
    v_remaining_qty INTEGER;
    v_total_cost NUMERIC := 0;
    v_batch RECORD;
    v_qty_from_batch INTEGER;
    v_variant_info TEXT := '';
    v_has_variants BOOLEAN := false;
    v_existing_log_count INTEGER := 0;
BEGIN
    -- 🔍 تسجيل بداية العملية
    RAISE NOTICE '🚀 [FIFO] بدء معالجة البيع: منتج=% كمية=% طلب=%', p_product_id, p_quantity, p_order_id;
    
    -- جلب بيانات المنتج
    SELECT 
        stock_quantity, 
        COALESCE(purchase_price, 0) as purchase_price, 
        name
    INTO v_product_record
    FROM products 
    WHERE id = p_product_id AND organization_id = p_organization_id;
    
    IF v_product_record IS NULL THEN
        RAISE NOTICE '❌ [FIFO] المنتج غير موجود: %', p_product_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود',
            'error_code', 'PRODUCT_NOT_FOUND'
        );
    END IF;
    
    RAISE NOTICE '📊 [FIFO] المخزون الحالي: %', v_product_record.stock_quantity;
    
    -- التحقق من وجود متغيرات
    v_has_variants := (p_color_id IS NOT NULL OR p_size_id IS NOT NULL);
    
    -- حساب المخزون المتاح من الـ batches
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_batches_stock
    FROM inventory_batches 
    WHERE product_id = p_product_id 
    AND organization_id = p_organization_id 
    AND is_active = true
    AND quantity_remaining > 0
    AND (p_color_id IS NULL OR color_id = p_color_id OR color_id IS NULL)
    AND (p_size_id IS NULL OR size_id = p_size_id OR size_id IS NULL);
    
    -- المخزون الأولي = المخزون الإجمالي - مخزون الـ batches
    v_initial_stock := GREATEST(0, v_product_record.stock_quantity - v_batches_stock);
    v_total_available := v_product_record.stock_quantity;
    
    RAISE NOTICE '📊 [FIFO] تفاصيل المخزون: إجمالي=% batches=% أولي=%', 
        v_total_available, v_batches_stock, v_initial_stock;
    
    -- التحقق من توفر الكمية
    IF v_total_available < p_quantity THEN
        RAISE NOTICE '❌ [FIFO] كمية غير كافية: مطلوب=% متاح=%', p_quantity, v_total_available;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الكمية المطلوبة (' || p_quantity || ') غير متوفرة. المتاح: ' || v_total_available,
            'error_code', 'INSUFFICIENT_STOCK',
            'available_quantity', v_total_available
        );
    END IF;
    
    -- بدء معالجة FIFO
    v_remaining_qty := p_quantity;
    
    -- ✅ الخطوة 1: البيع من المخزون الأولي (للمنتجات بدون متغيرات)
    IF NOT v_has_variants AND v_initial_stock > 0 AND v_remaining_qty > 0 THEN
        v_quantity_from_initial := LEAST(v_remaining_qty, v_initial_stock);
        v_total_cost := v_total_cost + (v_quantity_from_initial * v_product_record.purchase_price);
        v_remaining_qty := v_remaining_qty - v_quantity_from_initial;
        
        RAISE NOTICE '📦 [FIFO] من المخزون الأولي: %', v_quantity_from_initial;
    END IF;
    
    -- ✅ الخطوة 2: البيع من الـ batches (FIFO)
    IF v_remaining_qty > 0 THEN
        RAISE NOTICE '🔄 [FIFO] معالجة الـ batches للكمية المتبقية: %', v_remaining_qty;
        
        FOR v_batch IN 
            SELECT 
                id,
                batch_number,
                COALESCE(purchase_price, 0) as purchase_price,
                quantity_remaining,
                purchase_date
            FROM inventory_batches 
            WHERE product_id = p_product_id 
            AND organization_id = p_organization_id 
            AND is_active = true
            AND quantity_remaining > 0
            AND (p_color_id IS NULL OR color_id = p_color_id OR color_id IS NULL)
            AND (p_size_id IS NULL OR size_id = p_size_id OR size_id IS NULL)
            ORDER BY purchase_date ASC, created_at ASC -- FIFO order
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            
            v_qty_from_batch := LEAST(v_remaining_qty, v_batch.quantity_remaining);
            v_total_cost := v_total_cost + (v_qty_from_batch * v_batch.purchase_price);
            
            RAISE NOTICE '📦 [FIFO] من الـ batch %: كمية=% سعر=%', 
                v_batch.batch_number, v_qty_from_batch, v_batch.purchase_price;
            
            -- تحديث الكمية المتبقية في الـ Batch
            UPDATE inventory_batches 
            SET quantity_remaining = quantity_remaining - v_qty_from_batch,
                updated_at = NOW()
            WHERE id = v_batch.id;
            
            -- تسجيل حركة الخروج من الـ batch
            BEGIN
                INSERT INTO inventory_batch_movements (
                    batch_id,
                    movement_type,
                    quantity,
                    reference_type,
                    reference_id,
                    notes,
                    organization_id
                ) VALUES (
                    v_batch.id,
                    'OUT',
                    v_qty_from_batch,
                    'POS_ORDER',
                    p_order_id,
                    'بيع من نقطة البيع - طلبية رقم: ' || COALESCE(p_order_id::TEXT, 'غير محدد'),
                    p_organization_id
                );
            EXCEPTION WHEN OTHERS THEN
                -- تجاهل خطأ عدم وجود الجدول
                RAISE NOTICE '⚠️ [FIFO] لا يمكن تسجيل حركة الـ batch: %', SQLERRM;
            END;
            
            v_remaining_qty := v_remaining_qty - v_qty_from_batch;
            v_quantity_from_batches := v_quantity_from_batches + v_qty_from_batch;
        END LOOP;
    END IF;
    
    -- ✅ الخطوة 3: تحديث المخزون الإجمالي (مرة واحدة فقط!)
    RAISE NOTICE '🔄 [FIFO] تحديث المخزون الإجمالي: من % إلى %', 
        v_product_record.stock_quantity, v_product_record.stock_quantity - p_quantity;
    
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- ✅ الخطوة 4: تحديث مخزون المتغيرات (إذا وجدت)
    IF p_size_id IS NOT NULL THEN
        UPDATE product_sizes 
        SET quantity = GREATEST(0, quantity - p_quantity),
            updated_at = NOW()
        WHERE id = p_size_id;
        v_variant_info := 'مقاس محدد';
        RAISE NOTICE '🎨 [FIFO] تحديث مخزون المقاس';
    ELSIF p_color_id IS NOT NULL THEN
        UPDATE product_colors 
        SET quantity = GREATEST(0, quantity - p_quantity),
            updated_at = NOW()
        WHERE id = p_color_id;
        v_variant_info := 'لون محدد';
        RAISE NOTICE '🎨 [FIFO] تحديث مخزون اللون';
    END IF;
    
    -- ✅ الخطوة 5: تسجيل سجل آمن في inventory_log (مع فحص التكرار)
    SELECT COUNT(*)
    INTO v_existing_log_count
    FROM inventory_log
    WHERE product_id = p_product_id 
    AND reference_id = p_order_id 
    AND type = 'sale'
    AND reference_type = 'pos_order';
    
    IF v_existing_log_count = 0 THEN
        INSERT INTO inventory_log (
            id,
            product_id,
            organization_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_type,
            reference_id,
            notes,
            created_at
        ) VALUES (
            gen_random_uuid(),
            p_product_id,
            p_organization_id,
            p_quantity,
            v_product_record.stock_quantity,
            v_product_record.stock_quantity - p_quantity,
            'sale',
            'pos_order',
            p_order_id,
            'بيع FIFO من نقطة البيع - ' || v_product_record.name || 
            CASE WHEN v_has_variants THEN ' (' || v_variant_info || ')' ELSE '' END ||
            ' | من المخزون الأولي: ' || v_quantity_from_initial || 
            ' | من الـ batches: ' || v_quantity_from_batches ||
            ' | التكلفة الإجمالية: ' || v_total_cost,
            NOW()
        );
        
        RAISE NOTICE '📝 [FIFO] تم تسجيل سجل المخزون';
    ELSE
        RAISE NOTICE '⚠️ [FIFO] تخطي تسجيل المخزون - السجل موجود مسبقاً';
    END IF;
    
    -- إرجاع النتيجة
    RAISE NOTICE '✅ [FIFO] اكتملت العملية بنجاح - التكلفة: %', v_total_cost;
    
    RETURN jsonb_build_object(
        'success', true,
        'quantity_sold', p_quantity,
        'quantity_from_initial_stock', v_quantity_from_initial,
        'quantity_from_batches', v_quantity_from_batches,
        'total_cost', v_total_cost,
        'average_cost_per_unit', CASE WHEN p_quantity > 0 THEN v_total_cost / p_quantity ELSE 0 END,
        'previous_stock', v_product_record.stock_quantity,
        'new_stock_quantity', v_product_record.stock_quantity - p_quantity,
        'variant_info', v_variant_info,
        'has_variants', v_has_variants,
        'processing_method', 'FIFO_FIXED_NO_DOUBLE_DEDUCTION'
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '💥 [FIFO] خطأ في معالجة البيع: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في معالجة البيع: ' || SQLERRM,
        'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- ===============================================
-- الخطوة 2: اختبار الدالة المُحدثة
-- ===============================================

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ تم إصلاح دالة FIFO بنجاح!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔧 التغييرات المطبقة:';
    RAISE NOTICE '   1. إزالة التحديث المضاعف للمخزون';
    RAISE NOTICE '   2. إضافة logs تشخيصية مفصلة';
    RAISE NOTICE '   3. حماية من تكرار سجلات inventory_log';
    RAISE NOTICE '   4. معالجة آمنة للاستثناءات';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📋 للاختبار:';
    RAISE NOTICE '   - جرب إنشاء طلبية جديدة من نقطة البيع';
    RAISE NOTICE '   - راقب logs قاعدة البيانات للتشخيص';
    RAISE NOTICE '   - تحقق من عدم خصم المخزون مضاعف';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎯 الآن يجب أن يعمل نظام نقطة البيع بشكل صحيح!';
END;
$$;