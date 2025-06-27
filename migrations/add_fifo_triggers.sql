-- Triggers لأتمتة نظام FIFO
-- تاريخ الإنشاء: 2025-01-27

-- 1. Trigger لإنشاء Batch تلقائياً عند إضافة عنصر شراء
CREATE TRIGGER trigger_create_batch_from_purchase
    AFTER INSERT ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION create_batch_from_purchase_item();

-- 2. Function لتحديث المخزون عند تعديل Batches
CREATE OR REPLACE FUNCTION update_product_stock_from_batches()
RETURNS TRIGGER AS $$
DECLARE
    total_stock INTEGER;
BEGIN
    -- حساب المخزون الإجمالي من جميع Batches
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO total_stock
    FROM inventory_batches
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND is_active = true;
    
    -- تحديث المخزون في جدول المنتجات
    UPDATE products 
    SET stock_quantity = total_stock,
        last_inventory_update = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger لتحديث المخزون عند تغيير Batches
CREATE TRIGGER trigger_update_product_stock_after_batch_change
    AFTER INSERT OR UPDATE OR DELETE ON inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock_from_batches();

-- 4. Function للتحقق من صحة البيانات قبل الحذف
CREATE OR REPLACE FUNCTION validate_batch_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- منع حذف Batch إذا كان مرتبط بمبيعات
    IF EXISTS (
        SELECT 1 FROM inventory_batch_movements 
        WHERE batch_id = OLD.id 
        AND movement_type = 'OUT'
    ) THEN
        RAISE EXCEPTION 'لا يمكن حذف الـ Batch لأنه مرتبط بمبيعات سابقة';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger للتحقق قبل حذف Batch
CREATE TRIGGER trigger_validate_batch_deletion
    BEFORE DELETE ON inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION validate_batch_deletion();

-- 6. Function لمزامنة Batch مع عنصر الشراء عند التحديث
CREATE OR REPLACE FUNCTION sync_batch_with_purchase_item()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا تم تحديث الكمية أو السعر في عنصر الشراء
    IF OLD.quantity != NEW.quantity OR OLD.unit_price != NEW.unit_price THEN
        -- تحديث الـ Batch المرتبط
        UPDATE inventory_batches 
        SET 
            quantity_received = NEW.quantity::INTEGER,
            quantity_remaining = quantity_remaining + (NEW.quantity::INTEGER - OLD.quantity::INTEGER),
            purchase_price = NEW.unit_price,
            cost_per_unit = NEW.unit_price,
            updated_at = NOW()
        WHERE supplier_purchase_item_id = NEW.id;
        
        -- تسجيل حركة التعديل
        INSERT INTO inventory_batch_movements (
            batch_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            organization_id
        )
        SELECT 
            id,
            CASE 
                WHEN NEW.quantity::INTEGER > OLD.quantity::INTEGER THEN 'ADJUSTMENT_IN'
                ELSE 'ADJUSTMENT_OUT'
            END,
            ABS(NEW.quantity::INTEGER - OLD.quantity::INTEGER),
            'PURCHASE_ADJUSTMENT',
            NEW.purchase_id,
            'تعديل من فاتورة الشراء: تغيير الكمية من ' || OLD.quantity || ' إلى ' || NEW.quantity,
            (SELECT organization_id FROM supplier_purchases WHERE id = NEW.purchase_id)
        FROM inventory_batches 
        WHERE supplier_purchase_item_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger لمزامنة التحديثات
CREATE TRIGGER trigger_sync_batch_with_purchase_item
    AFTER UPDATE ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_batch_with_purchase_item();

-- 8. Function لإنشاء Views للاستعلامات السريعة
CREATE OR REPLACE VIEW fifo_inventory_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    p.organization_id,
    COUNT(ib.id) as total_batches,
    SUM(ib.quantity_remaining) as total_quantity,
    ROUND(
        CASE 
            WHEN SUM(ib.quantity_remaining) > 0 
            THEN SUM(ib.quantity_remaining * ib.purchase_price) / SUM(ib.quantity_remaining)
            ELSE 0 
        END, 2
    ) as average_cost,
    MIN(ib.purchase_date) as oldest_batch_date,
    MAX(ib.purchase_date) as newest_batch_date,
    SUM(CASE WHEN ib.purchase_date < NOW() - INTERVAL '90 days' THEN ib.quantity_remaining ELSE 0 END) as old_stock_quantity
FROM products p
LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.is_active = true AND ib.quantity_remaining > 0
GROUP BY p.id, p.name, p.sku, p.organization_id;

-- 9. إضافة تعليقات للتوثيق
COMMENT ON TRIGGER trigger_create_batch_from_purchase ON supplier_purchase_items IS 'إنشاء Batch تلقائياً عند إضافة عنصر شراء جديد';
COMMENT ON TRIGGER trigger_update_product_stock_after_batch_change ON inventory_batches IS 'تحديث مخزون المنتج تلقائياً عند تغيير Batches';
COMMENT ON TRIGGER trigger_validate_batch_deletion ON inventory_batches IS 'التحقق من صحة حذف Batch';
COMMENT ON TRIGGER trigger_sync_batch_with_purchase_item ON supplier_purchase_items IS 'مزامنة تحديثات عنصر الشراء مع الـ Batch';
COMMENT ON VIEW fifo_inventory_summary IS 'ملخص المخزون حسب نظام FIFO مع التكلفة المتوسطة'; 