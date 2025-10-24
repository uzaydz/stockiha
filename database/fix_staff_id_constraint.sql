-- ✅ إصلاح مشكلة Foreign Key Constraint لـ created_by_staff_id
-- الحل: إزالة القيد تماماً لأن الحقل اختياري ومعلوماتي فقط

-- 1️⃣ حذف القيد القديم إذا كان موجوداً
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_created_by_staff_id_fkey;

-- 2️⃣ جعل الحقل nullable بشكل صريح
ALTER TABLE orders 
ALTER COLUMN created_by_staff_id DROP NOT NULL;

-- 3️⃣ تنظيف السجلات القديمة التي لديها staff_id غير موجود في users
-- تعيينها إلى NULL لتجنب المشاكل
UPDATE orders o
SET created_by_staff_id = NULL
WHERE created_by_staff_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = o.created_by_staff_id
  );

-- 4️⃣ لا نضيف القيد مرة أخرى - الحقل سيكون حراً بدون قيود
-- السبب: created_by_staff_id هو حقل معلوماتي فقط (للتتبع)
-- ليس ضرورياً أن يكون موجوداً في users دائماً

-- ✅ التحقق من النتيجة
SELECT 
  COUNT(*) as total_orders,
  COUNT(created_by_staff_id) as orders_with_staff_id,
  COUNT(*) - COUNT(created_by_staff_id) as orders_without_staff_id
FROM orders;

-- تعليق
COMMENT ON COLUMN orders.created_by_staff_id IS 
'معرف الموظف الذي أنشأ الطلب - nullable - يمكن أن يكون NULL إذا لم يكن هناك موظف محدد';
