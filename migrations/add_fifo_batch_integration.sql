-- إضافة نظام FIFO وربط المشتريات بـ Batches
-- تاريخ الإنشاء: 2025-01-27

-- 1. إضافة batch_id إلى جدول supplier_purchase_items
ALTER TABLE supplier_purchase_items 
ADD COLUMN batch_id UUID REFERENCES inventory_batches(id);

-- 2. إضافة supplier_purchase_item_id إلى جدول inventory_batches
ALTER TABLE inventory_batches 
ADD COLUMN supplier_purchase_item_id UUID REFERENCES supplier_purchase_items(id);

-- 3. إضافة فهرس لتحسين الأداء
CREATE INDEX idx_supplier_purchase_items_batch_id ON supplier_purchase_items(batch_id);
CREATE INDEX idx_inventory_batches_supplier_purchase_item_id ON inventory_batches(supplier_purchase_item_id);
CREATE INDEX idx_inventory_batches_fifo_order ON inventory_batches(product_id, purchase_date, created_at);

-- 4. إضافة قيود للتأكد من صحة البيانات
ALTER TABLE inventory_batches
ADD CONSTRAINT check_quantity_positive 
CHECK (quantity_received > 0 AND quantity_remaining >= 0);

ALTER TABLE inventory_batches
ADD CONSTRAINT check_quantity_logic 
CHECK (quantity_remaining <= quantity_received);

-- 5. إضافة تعليقات للتوثيق
COMMENT ON COLUMN supplier_purchase_items.batch_id IS 'ربط عنصر الشراء بـ Batch في المخزون';
COMMENT ON COLUMN inventory_batches.supplier_purchase_item_id IS 'ربط الـ Batch بعنصر الشراء الأصلي';
COMMENT ON INDEX idx_inventory_batches_fifo_order IS 'فهرس لترتيب FIFO حسب تاريخ الشراء'; 