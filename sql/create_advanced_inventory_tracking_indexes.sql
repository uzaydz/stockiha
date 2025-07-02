-- =====================================
-- فهارس متقدمة لتتبع المخزون والعمليات
-- Advanced Inventory Tracking Indexes
-- =====================================

-- فهارس مركبة للاستعلامات الزمنية السريعة
-- Composite indexes for fast time-based queries

-- فهرس مركب للبحث بالمؤسسة والوقت والنوع
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_time_type_performance 
ON inventory_log (organization_id, created_at DESC, type, product_id) 
INCLUDE (quantity, previous_stock, new_stock, created_by, reference_type, reference_id);

-- فهرس للبحث بالمستخدم والوقت
CREATE INDEX IF NOT EXISTS idx_inventory_log_user_time_performance 
ON inventory_log (created_by, created_at DESC, organization_id) 
INCLUDE (type, product_id, quantity, reference_type);

-- فهرس للبحث بالمنتج والوقت
CREATE INDEX IF NOT EXISTS idx_inventory_log_product_time_performance 
ON inventory_log (product_id, created_at DESC, organization_id) 
INCLUDE (type, quantity, previous_stock, new_stock, created_by);

-- فهرس للبحث بنوع المرجع والمعرف
CREATE INDEX IF NOT EXISTS idx_inventory_log_reference_performance 
ON inventory_log (reference_type, reference_id, organization_id, created_at DESC) 
INCLUDE (product_id, quantity, type, created_by);

-- فهرس للاحصائيات اليومية (استخدام created_at مباشرة للأداء الأفضل)
CREATE INDEX IF NOT EXISTS idx_inventory_log_daily_stats 
ON inventory_log (organization_id, created_at, type) 
INCLUDE (product_id, quantity, created_by);

-- فهرس للاحصائيات الشهرية (استخدام created_at مباشرة للأداء الأفضل)
CREATE INDEX IF NOT EXISTS idx_inventory_log_monthly_stats 
ON inventory_log (organization_id, created_at, type) 
INCLUDE (product_id, quantity, created_by);

-- =====================================
-- فهارس inventory_batch_movements
-- =====================================

-- فهرس مركب للحركات بالدفعة والوقت
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch_time_performance 
ON inventory_batch_movements (batch_id, created_at DESC, organization_id) 
INCLUDE (movement_type, quantity, reference_type, reference_id, created_by);

-- فهرس للبحث بنوع الحركة والوقت
CREATE INDEX IF NOT EXISTS idx_batch_movements_type_time_performance 
ON inventory_batch_movements (movement_type, created_at DESC, organization_id) 
INCLUDE (batch_id, quantity, reference_type, created_by);

-- فهرس للبحث بالمرجع
CREATE INDEX IF NOT EXISTS idx_batch_movements_reference_performance 
ON inventory_batch_movements (reference_type, reference_id, organization_id) 
INCLUDE (batch_id, movement_type, quantity, created_at, created_by);

-- =====================================
-- فهارس inventory_operations_log
-- =====================================

-- فهرس للبحث بنوع العملية والوقت
CREATE INDEX IF NOT EXISTS idx_operations_log_type_time_performance 
ON inventory_operations_log (operation_type, created_at DESC, organization_id) 
INCLUDE (created_by, operation_data, result);

-- فهرس لبيانات العملية (JSONB)
CREATE INDEX IF NOT EXISTS idx_operations_log_data_gin 
ON inventory_operations_log USING GIN (operation_data) 
WHERE operation_data IS NOT NULL;

-- فهرس لنتائج العملية (JSONB)
CREATE INDEX IF NOT EXISTS idx_operations_log_result_gin 
ON inventory_operations_log USING GIN (result) 
WHERE result IS NOT NULL;

-- =====================================
-- فهارس inventory_batches المحسنة
-- =====================================

-- فهرس للبحث بالمؤسسة والوقت
CREATE INDEX IF NOT EXISTS idx_inventory_batches_org_time_performance 
ON inventory_batches (organization_id, created_at DESC, is_active) 
INCLUDE (product_id, batch_number, quantity_remaining, purchase_date, supplier_id);

-- فهرس لتتبع المخزون الحالي
CREATE INDEX IF NOT EXISTS idx_inventory_batches_current_stock 
ON inventory_batches (organization_id, product_id, is_active, quantity_remaining DESC) 
WHERE quantity_remaining > 0 AND is_active = true;

-- فهرس للبحث بتاريخ انتهاء الصلاحية
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date 
ON inventory_batches (organization_id, expiry_date ASC, is_active, product_id, batch_number, quantity_remaining) 
WHERE expiry_date IS NOT NULL AND is_active = true;

-- =====================================
-- فهارس دعم للجداول المرتبطة
-- =====================================

-- فهرس محسن لجدول products
CREATE INDEX IF NOT EXISTS idx_products_org_performance 
ON products (organization_id, is_active, created_at DESC) 
INCLUDE (name, sku, stock_quantity, purchase_price, price);

-- فهرس محسن لجدول users  
CREATE INDEX IF NOT EXISTS idx_users_org_performance 
ON users (organization_id, is_active, created_at DESC) 
INCLUDE (name, email, role);

-- فهرس محسن لجدول orders (يشمل طلبيات POS والمتجر الإلكتروني)
CREATE INDEX IF NOT EXISTS idx_orders_org_time_performance 
ON orders (organization_id, created_at DESC, status, is_online) 
INCLUDE (total, customer_id, employee_id, payment_method, pos_order_type);

-- فهرس محسن لطلبيات POS فقط
CREATE INDEX IF NOT EXISTS idx_pos_orders_performance 
ON orders (organization_id, created_at DESC, employee_id, status) 
WHERE is_online = false;

-- فهرس محسن لطلبيات المتجر الإلكتروني (للمستقبل)
CREATE INDEX IF NOT EXISTS idx_online_orders_performance 
ON orders (organization_id, created_at DESC, customer_id, status) 
WHERE is_online = true;

-- =====================================
-- فهارس للاحصائيات والتقارير
-- =====================================

-- فهرس للاحصائيات السريعة حسب المنتج
CREATE INDEX IF NOT EXISTS idx_inventory_stats_by_product 
ON inventory_log (organization_id, product_id, type, created_at) 
INCLUDE (quantity, created_by);

-- فهرس للاحصائيات السريعة حسب المستخدم
CREATE INDEX IF NOT EXISTS idx_inventory_stats_by_user 
ON inventory_log (organization_id, created_by, type, created_at) 
INCLUDE (product_id, quantity);

-- فهرس للبحث في الملاحظات (Full Text Search)
CREATE INDEX IF NOT EXISTS idx_inventory_log_notes_fts 
ON inventory_log USING GIN (to_tsvector('simple', COALESCE(notes, ''))) 
WHERE notes IS NOT NULL AND notes != '';

-- =====================================
-- تحسين أداء الفهارس الموجودة
-- =====================================

-- تم حذف أوامر REINDEX لتجنب أخطاء التنفيذ
-- يمكن تشغيلها يدوياً عند الحاجة

-- =====================================
-- إحصائيات للمحسن
-- =====================================

-- تحديث إحصائيات الجداول
ANALYZE inventory_log;
ANALYZE inventory_batch_movements;
ANALYZE inventory_operations_log;
ANALYZE inventory_batches;
ANALYZE products;
ANALYZE users;
ANALYZE orders;

-- =====================================
-- تعليقات الفهارس
-- =====================================

COMMENT ON INDEX idx_inventory_log_org_time_type_performance IS 'فهرس محسن للاستعلامات بالمؤسسة والوقت والنوع';
COMMENT ON INDEX idx_inventory_log_user_time_performance IS 'فهرس محسن للبحث بالمستخدم والوقت';
COMMENT ON INDEX idx_inventory_log_product_time_performance IS 'فهرس محسن للبحث بالمنتج والوقت';
COMMENT ON INDEX idx_inventory_log_daily_stats IS 'فهرس للاحصائيات اليومية السريعة';
COMMENT ON INDEX idx_inventory_log_notes_fts IS 'فهرس البحث النصي في الملاحظات بالعربية';
COMMENT ON INDEX idx_orders_org_time_performance IS 'فهرس شامل لجميع الطلبيات (POS والإلكترونية)';
COMMENT ON INDEX idx_pos_orders_performance IS 'فهرس محسن لطلبيات نقطة البيع فقط';
COMMENT ON INDEX idx_online_orders_performance IS 'فهرس محسن لطلبيات المتجر الإلكتروني'; 