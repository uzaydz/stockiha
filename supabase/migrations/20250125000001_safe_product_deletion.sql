-- ===============================================
-- 🗑️ دالة الحذف الآمن للمنتجات مع تنظيف جميع البيانات المرتبطة
-- ===============================================

-- حذف النسخ القديمة من الدالة أولاً
DROP FUNCTION IF EXISTS safe_delete_product(UUID, UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS safe_delete_product(UUID);

-- إنشاء النسخة الجديدة والصحيحة فقط
CREATE OR REPLACE FUNCTION safe_delete_product(
  p_product_id UUID,
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_force_delete BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
  v_product_name TEXT;
  v_has_orders BOOLEAN := FALSE;
  v_has_active_orders BOOLEAN := FALSE;
  v_deletion_summary JSONB := '{}';
  v_deleted_counts JSONB := '{}';
BEGIN
  -- 🔍 التحقق من وجود المنتج
  SELECT name INTO v_product_name 
  FROM products 
  WHERE id = p_product_id AND organization_id = p_organization_id;
  
  IF v_product_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'product_not_found',
      'message', 'المنتج غير موجود أو لا ينتمي لهذه المؤسسة'
    );
  END IF;

  -- 📊 فحص وجود طلبات مرتبطة بالمنتج
  SELECT 
    EXISTS(
      SELECT 1 FROM online_order_items WHERE product_id = p_product_id
      UNION
      SELECT 1 FROM order_items WHERE product_id = p_product_id
    ) INTO v_has_orders;

  -- 📋 فحص وجود طلبات نشطة (غير مكتملة)
  SELECT EXISTS(
    SELECT 1 FROM online_orders o 
    JOIN online_order_items oi ON o.id = oi.order_id 
    WHERE oi.product_id = p_product_id 
      AND o.status IN ('pending', 'processing', 'shipped')
    UNION
    SELECT 1 FROM orders o 
    JOIN order_items oi ON o.id = oi.order_id 
    WHERE oi.product_id = p_product_id 
      AND o.status IN ('pending', 'processing', 'shipped')
  ) INTO v_has_active_orders;

  -- ⚠️ منع الحذف إذا كانت هناك طلبات نشطة (إلا إذا كان force_delete = true)
  IF v_has_active_orders AND NOT p_force_delete THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'active_orders_exist',
      'message', 'لا يمكن حذف المنتج لوجود طلبات نشطة عليه. استخدم خيار الحذف القسري إذا كنت متأكداً.',
      'has_active_orders', true
    );
  END IF;

  -- 🧹 بدء عملية التنظيف المرحلي
  
  -- 1. حذف البيانات التحليلية والتسويقية (آمن)
  WITH deleted_analytics AS (
    DELETE FROM conversion_events WHERE product_id = p_product_id RETURNING 1
  ), deleted_abandoned AS (
    DELETE FROM abandoned_carts WHERE product_id = p_product_id RETURNING 1
  ), deleted_marketing AS (
    DELETE FROM product_marketing_settings WHERE product_id = p_product_id RETURNING 1
  ), deleted_submissions AS (
    DELETE FROM landing_page_submissions WHERE product_id = p_product_id RETURNING 1
  ), deleted_sessions AS (
    DELETE FROM visitor_sessions WHERE product_id = p_product_id RETURNING 1
  ), deleted_views AS (
    DELETE FROM page_views WHERE product_id = p_product_id RETURNING 1
  )
  SELECT 
    (SELECT COUNT(*) FROM deleted_analytics) as analytics_deleted,
    (SELECT COUNT(*) FROM deleted_abandoned) as abandoned_carts_deleted,
    (SELECT COUNT(*) FROM deleted_marketing) as marketing_deleted,
    (SELECT COUNT(*) FROM deleted_submissions) as submissions_deleted,
    (SELECT COUNT(*) FROM deleted_sessions) as sessions_deleted,
    (SELECT COUNT(*) FROM deleted_views) as views_deleted
  INTO v_deleted_counts;

  -- 2. حذف المرفقات والوسائط
  DELETE FROM product_images WHERE product_id = p_product_id;
  DELETE FROM product_media WHERE product_id = p_product_id;

  -- 3. حذف المتغيرات (الألوان والأحجام)
  DELETE FROM product_colors WHERE product_id = p_product_id;
  DELETE FROM product_sizes WHERE product_id = p_product_id;

  -- 4. حذف الإعدادات المتقدمة
  DELETE FROM product_advanced_settings WHERE product_id = p_product_id;
  DELETE FROM product_wholesale_tiers WHERE product_id = p_product_id;
  DELETE FROM wholesale_tiers WHERE product_id = p_product_id;

  -- 5. حذف المراجعات والتقييمات
  DELETE FROM product_reviews WHERE product_id = p_product_id;

  -- 6. تنظيف سجلات المخزون (حذف دائماً لتجنب مشاكل foreign key)
  DELETE FROM inventory_log WHERE product_id = p_product_id;
  DELETE FROM inventory_batches WHERE product_id = p_product_id;
  DELETE FROM inventory_transactions WHERE product_id = p_product_id;

  -- 7. تنظيف بيانات المبيعات والمشتريات (احذف فقط إذا كان force_delete)
  IF p_force_delete THEN
    -- تحذير: هذا سيؤثر على تقارير المبيعات التاريخية
    DELETE FROM online_order_items WHERE product_id = p_product_id;
    DELETE FROM order_items WHERE product_id = p_product_id;
    DELETE FROM return_items WHERE product_id = p_product_id;
    DELETE FROM loss_items WHERE product_id = p_product_id;
    DELETE FROM supplier_purchase_items WHERE product_id = p_product_id;
    DELETE FROM invoice_items WHERE product_id = p_product_id;
  END IF;

  -- 8. تسجيل محاولة الحذف
  INSERT INTO product_deletion_attempts (
    product_id, product_name, organization_id, 
    deleted_by, deletion_type, success
  ) VALUES (
    p_product_id, v_product_name, p_organization_id,
    p_user_id, 
    CASE WHEN p_force_delete THEN 'force_delete' ELSE 'safe_delete' END,
    true
  );

  -- 9. حذف المنتج نفسه
  DELETE FROM products WHERE id = p_product_id AND organization_id = p_organization_id;

  -- ✅ إرجاع تقرير النجاح
  RETURN jsonb_build_object(
    'success', true,
    'product_name', v_product_name,
    'deletion_type', CASE WHEN p_force_delete THEN 'force_delete' ELSE 'safe_delete' END,
    'had_orders', v_has_orders,
    'had_active_orders', v_has_active_orders,
    'message', 'تم حذف المنتج "' || v_product_name || '" بنجاح',
    'deleted_counts', v_deleted_counts
  );

EXCEPTION WHEN OTHERS THEN
  -- 📝 تسجيل محاولة الحذف الفاشلة
  INSERT INTO product_deletion_attempts (
    product_id, product_name, organization_id, 
    deleted_by, deletion_type, success, error_message
  ) VALUES (
    p_product_id, COALESCE(v_product_name, 'غير معروف'), p_organization_id,
    p_user_id, 
    CASE WHEN p_force_delete THEN 'force_delete' ELSE 'safe_delete' END,
    false, SQLERRM
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', 'deletion_failed',
    'message', 'فشل في حذف المنتج: ' || SQLERRM,
    'sql_error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 🗃️ جدول تسجيل محاولات حذف المنتجات
-- ===============================================

CREATE TABLE IF NOT EXISTS product_deletion_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  organization_id UUID NOT NULL,
  deleted_by UUID,
  deletion_type VARCHAR(20) NOT NULL, -- 'safe_delete', 'force_delete'
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس للبحث السريع (مع التحقق من عدم الوجود)
CREATE INDEX IF NOT EXISTS idx_product_deletion_attempts_org_id ON product_deletion_attempts(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_deletion_attempts_created_at ON product_deletion_attempts(created_at DESC);

-- ===============================================
-- 🔧 دالة مساعدة للتحقق من إمكانية حذف المنتج
-- ===============================================

CREATE OR REPLACE FUNCTION can_delete_product(
  p_product_id UUID,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_product_name TEXT;
  v_has_orders BOOLEAN := FALSE;
  v_has_active_orders BOOLEAN := FALSE;
  v_order_count INTEGER := 0;
  v_active_order_count INTEGER := 0;
  v_inventory_entries INTEGER := 0;
BEGIN
  -- التحقق من وجود المنتج
  SELECT name INTO v_product_name 
  FROM products 
  WHERE id = p_product_id AND organization_id = p_organization_id;
  
  IF v_product_name IS NULL THEN
    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', 'product_not_found'
    );
  END IF;

  -- عد الطلبات المرتبطة
  SELECT 
    COUNT(*) INTO v_order_count
  FROM (
    SELECT 1 FROM online_order_items WHERE product_id = p_product_id
    UNION ALL
    SELECT 1 FROM order_items WHERE product_id = p_product_id
  ) orders;

  -- عد الطلبات النشطة
  SELECT COUNT(*) INTO v_active_order_count
  FROM (
    SELECT 1 FROM online_orders o 
    JOIN online_order_items oi ON o.id = oi.order_id 
    WHERE oi.product_id = p_product_id 
      AND o.status IN ('pending', 'processing', 'shipped')
    UNION ALL
    SELECT 1 FROM orders o 
    JOIN order_items oi ON o.id = oi.order_id 
    WHERE oi.product_id = p_product_id 
      AND o.status IN ('pending', 'processing', 'shipped')
  ) active_orders;

  -- عد سجلات المخزون
  SELECT COUNT(*) INTO v_inventory_entries
  FROM inventory_log 
  WHERE product_id = p_product_id;

  v_has_orders := v_order_count > 0;
  v_has_active_orders := v_active_order_count > 0;

  RETURN jsonb_build_object(
    'can_delete', true,
    'product_name', v_product_name,
    'has_orders', v_has_orders,
    'has_active_orders', v_has_active_orders,
    'total_orders', v_order_count,
    'active_orders', v_active_order_count,
    'inventory_entries', v_inventory_entries,
    'safe_delete_recommended', NOT v_has_active_orders,
    'force_delete_required', v_has_active_orders
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 📝 التعليقات والتوثيق
-- ===============================================

COMMENT ON FUNCTION safe_delete_product(UUID, UUID, UUID, BOOLEAN) IS 'دالة حذف آمنة للمنتجات مع تنظيف البيانات المرتبطة';
COMMENT ON FUNCTION can_delete_product(UUID, UUID) IS 'فحص إمكانية حذف منتج وإرجاع تفاصيل العوائق';
COMMENT ON TABLE product_deletion_attempts IS 'سجل محاولات حذف المنتجات للمراجعة والتدقيق'; 