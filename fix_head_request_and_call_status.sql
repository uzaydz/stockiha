-- ملف SQL لحل مشاكل HEAD request والـ Call Confirmation Status
-- تطبق هذه التغييرات على قاعدة بيانات Supabase

-- =====================================================
-- 1. إضافة العمود المفقود في جدول orders
-- =====================================================

-- إضافة عمود call_confirmation_status_id إلى جدول orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS call_confirmation_status_id INTEGER;

-- إضافة foreign key constraint للعمود الجديد (مع التحقق من عدم الوجود)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_call_status' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT fk_orders_call_status 
        FOREIGN KEY (call_confirmation_status_id) 
        REFERENCES call_confirmation_statuses(id);
    END IF;
END $$;

-- إنشاء فهرس على العمود الجديد
CREATE INDEX IF NOT EXISTS idx_orders_call_confirmation_status_id 
ON orders(call_confirmation_status_id);

-- =====================================================
-- 2. حل مشكلة HEAD request للمنتجات
-- =====================================================

-- إضافة سياسة خاصة للـ anonymous users لعمل count
DROP POLICY IF EXISTS "products_anonymous_count" ON products;

CREATE POLICY "products_anonymous_count" 
ON products
FOR SELECT
TO anon
USING (true);

-- إضافة سياسة لـ authenticated users أيضاً للتأكد
DROP POLICY IF EXISTS "products_count_access" ON products;

CREATE POLICY "products_count_access" 
ON products
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 3. الحصول على ID للحالة الافتراضية
-- =====================================================

-- العثور على الحالة الافتراضية أو إنشاؤها
DO $$
DECLARE
    default_status_id INTEGER;
    org_id UUID := 'fed872f9-1ade-4351-b020-5598fda976fe';
BEGIN
    -- البحث عن الحالة الافتراضية
    SELECT id INTO default_status_id 
    FROM call_confirmation_statuses 
    WHERE organization_id = org_id 
    AND is_default = true 
    LIMIT 1;
    
    -- إذا لم توجد حالة افتراضية، ننشئ واحدة
    IF default_status_id IS NULL THEN
        INSERT INTO call_confirmation_statuses 
        (name, organization_id, color, is_default, icon)
        VALUES ('مؤكد', org_id, '#10B981', true, 'CheckCircle')
        RETURNING id INTO default_status_id;
    END IF;
    
    -- تحديث الطلبات التي لديها call_confirmation_status_id = null
    UPDATE orders 
    SET call_confirmation_status_id = default_status_id,
        updated_at = NOW()
    WHERE call_confirmation_status_id IS NULL 
    AND organization_id = org_id;
    
    -- إضافة قيد افتراضي للطلبات الجديدة
    EXECUTE format('ALTER TABLE orders ALTER COLUMN call_confirmation_status_id SET DEFAULT %s', default_status_id);
    
END $$;

-- =====================================================
-- 4. تحسين سياسات الطلبات
-- =====================================================

-- التأكد من وجود سياسات مناسبة للطلبات
DROP POLICY IF EXISTS "orders_org_access" ON orders;

CREATE POLICY "orders_org_access" 
ON orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = orders.organization_id
  )
);

-- سياسة للقراءة العامة (للعرض في landing pages)
DROP POLICY IF EXISTS "orders_public_read" ON orders;

CREATE POLICY "orders_public_read" 
ON orders
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 5. تحسين سياسات call_confirmation_statuses
-- =====================================================

-- التأكد من وجود سياسات مناسبة
DROP POLICY IF EXISTS "call_statuses_org_access" ON call_confirmation_statuses;

CREATE POLICY "call_statuses_org_access" 
ON call_confirmation_statuses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = call_confirmation_statuses.organization_id
  )
);

-- سياسة للقراءة العامة
DROP POLICY IF EXISTS "call_statuses_public_read" ON call_confirmation_statuses;

CREATE POLICY "call_statuses_public_read" 
ON call_confirmation_statuses
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 6. إنشاء فهارس إضافية لتحسين الأداء
-- =====================================================

-- فهرس على organization_id في جدول orders
CREATE INDEX IF NOT EXISTS idx_orders_organization_id 
ON orders(organization_id);

-- فهرس على organization_id في جدول call_confirmation_statuses
CREATE INDEX IF NOT EXISTS idx_call_statuses_organization_id 
ON call_confirmation_statuses(organization_id);

-- فهرس مركب على organization_id و call_confirmation_status_id
CREATE INDEX IF NOT EXISTS idx_orders_org_call_status 
ON orders(organization_id, call_confirmation_status_id);

-- =====================================================
-- 7. التحقق من النتائج
-- =====================================================

-- عرض الطلبات التي تم تحديثها
-- SELECT 
--   COUNT(*) as total_orders,
--   call_confirmation_status_id,
--   organization_id
-- FROM orders 
-- WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
-- GROUP BY call_confirmation_status_id, organization_id
-- ORDER BY call_confirmation_status_id;

-- عرض حالات التأكيد المتاحة
-- SELECT 
--   id,
--   name,
--   color,
--   is_default
-- FROM call_confirmation_statuses 
-- WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
-- ORDER BY id;

-- =====================================================
-- انتهاء الإصلاحات
-- =====================================================

-- هذا الملف يحل:
-- 1. إضافة العمود المفقود call_confirmation_status_id
-- 2. مشكلة HEAD request للمنتجات
-- 3. مشكلة null values في call_confirmation_status_id
-- 4. تحسين الأداء والفهارس
-- 5. ضمان البيانات المتسقة مستقبلاً 