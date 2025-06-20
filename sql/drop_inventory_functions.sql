-- حذف جميع دوال المخزون المتقدمة لإعادة إنشاؤها
-- Drop Inventory Advanced Functions

-- حذف الدوال الموجودة مع تجاهل الأخطاء إذا لم تكن موجودة
DROP FUNCTION IF EXISTS search_inventory_autocomplete(uuid, text, integer);
DROP FUNCTION IF EXISTS get_inventory_products_paginated(uuid, integer, integer, text, text, text, text, text[], decimal, decimal, integer, integer, boolean);
DROP FUNCTION IF EXISTS get_inventory_advanced_stats(uuid);
DROP FUNCTION IF EXISTS bulk_update_inventory(uuid, jsonb);
DROP FUNCTION IF EXISTS get_product_inventory_details(uuid, uuid);
DROP FUNCTION IF EXISTS update_variant_inventory(uuid, uuid, uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS sync_inventory_levels(uuid, uuid);
DROP FUNCTION IF EXISTS get_inventory_variants_log(uuid, uuid, integer, integer);

-- حذف الفهارس المحسنة إذا كانت موجودة
DROP INDEX IF EXISTS idx_products_search_optimized;
DROP INDEX IF EXISTS idx_products_inventory_filter;
DROP INDEX IF EXISTS idx_products_category_brand;
DROP INDEX IF EXISTS idx_product_colors_inventory;
DROP INDEX IF EXISTS idx_product_sizes_inventory;
DROP INDEX IF EXISTS idx_inventory_log_product_variant;

-- رسالة تأكيد
DO $$ 
BEGIN 
    RAISE NOTICE 'تم حذف جميع دوال المخزون المتقدمة بنجاح. يمكن الآن تشغيل سكريبت fix_inventory_functions_final.sql';
END $$; 