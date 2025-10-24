-- =====================================================
-- إضافة تتبع الموظف الفعلي للطلبيات
-- =====================================================
-- 
-- ⚠️ مهم جداً: نفذ الملفات بالترتيب التالي:
-- 
-- 1️⃣ نفذ هذا الملف أولاً (add_staff_tracking_simple.sql)
-- 2️⃣ ثم نفذ: database/functions/create_pos_order_fast.sql
-- 
-- =====================================================

-- 1. إضافة الحقول الجديدة لجدول orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES pos_staff_sessions(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by_staff_name VARCHAR(255);

-- 2. إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_orders_created_by_staff ON orders(created_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_staff_date ON orders(created_by_staff_id, created_at DESC);

-- 3. Comments
COMMENT ON COLUMN orders.created_by_staff_id IS 'معرف الموظف الفعلي من pos_staff_sessions الذي أنشأ الطلبية';
COMMENT ON COLUMN orders.created_by_staff_name IS 'اسم الموظف الفعلي (نسخة للسرعة)';

-- ✅ تم! 
-- الآن انتقل للخطوة 2️⃣: نفذ ملف database/functions/create_pos_order_fast.sql
