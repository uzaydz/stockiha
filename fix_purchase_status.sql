-- ملف SQL لإصلاح مشكلة تناقض حالات المشتريات في نظام Bazaar
-- إنشاء بواسطة: Claude
-- التاريخ: تاريخ اليوم

-- 1. عرض المشتريات التي بها تناقض بين status و payment_status
SELECT id, purchase_number, supplier_id, total_amount, paid_amount, balance_due, status, payment_status
FROM supplier_purchases
WHERE status != payment_status
ORDER BY purchase_date DESC;

-- 2. عرض المشتريات المسجلة كمدفوعة بالكامل لكن بها متبقي من الحق
SELECT id, purchase_number, supplier_id, total_amount, paid_amount, balance_due, status, payment_status
FROM supplier_purchases
WHERE status = 'paid' AND balance_due > 0
ORDER BY balance_due DESC;

-- 3. تصحيح المشتريات ذات الحالة "مدفوعة" رغم وجود متبقي
UPDATE supplier_purchases
SET status = 'partially_paid',
    updated_at = NOW()
WHERE status = 'paid' 
  AND balance_due > 0
  AND payment_status = 'partially_paid';

-- 4. تصحيح المشتريات ذات حالة الدفع "مدفوعة" رغم وجود متبقي
-- ملاحظة: لا يمكن تحديث payment_status مباشرة لأنه عمود مُولّد تلقائياً
-- بدلاً من ذلك، يمكننا تعديل paid_amount لإعادة حساب payment_status تلقائياً
SELECT id, purchase_number, total_amount, paid_amount, balance_due, status, payment_status
FROM supplier_purchases
WHERE payment_status = 'paid' 
  AND balance_due > 0;
  
-- ملاحظة: اتبع هذا النهج لتصحيح المشكلة في الحالات الفردية:
-- UPDATE supplier_purchases
-- SET paid_amount = paid_amount - 0.01,  -- تخفيض المبلغ المدفوع بمقدار طفيف لتغيير الحالة
--     updated_at = NOW()
-- WHERE id = 'معرف_المشتريات_هنا'  -- استبدل بمعرف المشتريات المحدد

-- 5. التأكد من أن المشتريات المدفوعة بالكامل لها حالة "مدفوعة"
UPDATE supplier_purchases
SET status = 'paid',
    updated_at = NOW()
WHERE paid_amount >= total_amount
  AND status != 'paid';

-- 6. أضف TRIGGER للتأكد من تطابق status و payment_status في المستقبل
CREATE OR REPLACE FUNCTION sync_purchase_status()
RETURNS TRIGGER AS $$
BEGIN
  -- لا نقوم بتحديث payment_status مباشرة هنا لأنه عمود مُولّد تلقائياً
  -- نقوم فقط بتحديث status ليتطابق مع قيمة payment_status المحسوبة تلقائياً
  IF NEW.paid_amount = 0 THEN
    NEW.status = 'draft';
  ELSIF NEW.paid_amount >= NEW.total_amount THEN
    NEW.status = 'paid';
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
    NEW.status = 'partially_paid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إذا لم يكن TRIGGER موجودًا، قم بإنشائه
DROP TRIGGER IF EXISTS sync_purchase_status_trigger ON supplier_purchases;
CREATE TRIGGER sync_purchase_status_trigger
BEFORE INSERT OR UPDATE OF paid_amount, total_amount ON supplier_purchases
FOR EACH ROW
EXECUTE FUNCTION sync_purchase_status();

-- 7. إضافة TRIGGER إضافي للتأكد من تصحيح الحالات عند تغيير payment_status
CREATE OR REPLACE FUNCTION fix_status_after_payment_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- تأكد من أن status يعكس payment_status
  UPDATE supplier_purchases
  SET status = NEW.payment_status
  WHERE id = NEW.id AND status != NEW.payment_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fix_status_after_payment_status_update_trigger ON supplier_purchases;
CREATE TRIGGER fix_status_after_payment_status_update_trigger
AFTER UPDATE OF payment_status ON supplier_purchases
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION fix_status_after_payment_status_update();

-- 8. تحسين CASE للحقل payment_status المحسوب تلقائيًا
-- هذا قد يحتاج إلى تنفيذ بواسطة مسؤول قاعدة البيانات
/* 
ALTER TABLE supplier_purchases 
ALTER COLUMN payment_status SET DEFAULT
CASE
    WHEN (paid_amount = 0) THEN 'unpaid'
    WHEN (paid_amount < total_amount) THEN 'partially_paid'
    WHEN (paid_amount >= total_amount) THEN 'paid'
    ELSE NULL
END;
*/

-- 1. فحص جميع المشتريات التي بها مبالغ متبقية صغيرة جدًا (بسبب أخطاء التقريب)
SELECT id, purchase_number, total_amount, paid_amount, balance_due, status, payment_status,
       round(balance_due::numeric, 2) AS rounded_balance
FROM supplier_purchases
WHERE balance_due > 0 AND balance_due < 1
ORDER BY balance_due;

-- 2. فحص المشتريات التي بها تناقض بين total_amount و paid_amount و balance_due
SELECT id, purchase_number, total_amount, paid_amount, balance_due,
       (total_amount - paid_amount) AS calculated_balance,
       abs(balance_due - (total_amount - paid_amount)) AS balance_difference,
       status, payment_status
FROM supplier_purchases
WHERE abs(balance_due - (total_amount - paid_amount)) > 0.001
ORDER BY balance_difference DESC;

-- 3. إصلاح مشكلة أخطاء التقريب في المبالغ المتبقية (تصفير المبالغ الصغيرة جدًا)
UPDATE supplier_purchases
SET 
    -- نعدل paid_amount لجعله يساوي total_amount تمامًا
    paid_amount = total_amount,
    updated_at = NOW()
WHERE 
    balance_due > 0 
    AND balance_due < 0.1  -- نعالج فقط المبالغ الصغيرة جدًا
    AND status = 'paid';

-- 4. إصلاح المشتريات ذات الحالة "مدفوعة" رغم وجود متبقي كبير
UPDATE supplier_purchases
SET 
    status = 'partially_paid',
    updated_at = NOW()
WHERE 
    status = 'paid' 
    AND balance_due >= 0.1  -- فقط للمبالغ المتبقية الكبيرة
    AND payment_status = 'partially_paid';

-- 5. سيناريو خاص: تسديد جميع المشتريات المتبقية بشكل كامل
-- تنفيذ هذا الاستعلام سيصفّر جميع المبالغ المتبقية ويجعل المشتريات "مدفوعة بالكامل"
-- ملاحظة: استخدم هذا فقط إذا كنت تريد تسديد جميع المشتريات غير المكتملة
/*
UPDATE supplier_purchases
SET 
    paid_amount = total_amount,  -- جعل المبلغ المدفوع مساويًا للمبلغ الإجمالي
    updated_at = NOW()
WHERE 
    balance_due > 0
    AND status != 'paid';
*/

-- 6. تعديل وظيفة recordPayment لتجنب مشاكل التقريب
-- أنشئ وظيفة جديدة في قاعدة البيانات للتعامل مع المدفوعات

CREATE OR REPLACE FUNCTION record_payment_with_precision(
    p_purchase_id UUID,
    p_amount NUMERIC,
    p_is_full_payment BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_total_amount NUMERIC;
    v_paid_amount NUMERIC;
BEGIN
    -- الحصول على معلومات المشتريات
    SELECT total_amount, paid_amount 
    INTO v_total_amount, v_paid_amount
    FROM supplier_purchases
    WHERE id = p_purchase_id;
    
    -- إذا كان التسديد كاملاً، نضبط المبلغ المدفوع ليكون مساويًا للمبلغ الإجمالي
    IF p_is_full_payment THEN
        UPDATE supplier_purchases
        SET paid_amount = total_amount,
            updated_at = NOW()
        WHERE id = p_purchase_id;
    ELSE
        -- تسديد المبلغ المحدد فقط
        UPDATE supplier_purchases
        SET paid_amount = paid_amount + p_amount,
            updated_at = NOW()
        WHERE id = p_purchase_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. وظيفة تصحيح جميع المشتريات التي تحتاج إلى تسديد كامل
CREATE OR REPLACE FUNCTION fix_almost_paid_purchases() RETURNS VOID AS $$
DECLARE
    v_record RECORD;
BEGIN
    FOR v_record IN 
        SELECT id, total_amount, paid_amount, balance_due
        FROM supplier_purchases
        WHERE 
            balance_due > 0 
            AND balance_due < 1
            AND paid_amount / total_amount > 0.99  -- أكثر من 99% مدفوع
    LOOP
        UPDATE supplier_purchases
        SET paid_amount = total_amount,
            updated_at = NOW()
        WHERE id = v_record.id;
        
        RAISE NOTICE 'تم تصحيح المشتريات: % (المتبقي كان: %)', v_record.id, v_record.balance_due;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تنفيذ الوظيفة (إلغاء التعليق لتصحيح جميع المشتريات شبه المسددة)
-- SELECT fix_almost_paid_purchases();

-- 8. تعديل TRIGGER للتعامل مع حالات التقريب
CREATE OR REPLACE FUNCTION sync_purchase_status_with_precision()
RETURNS TRIGGER AS $$
BEGIN
    -- التعامل مع حالات التقريب - إذا كان الفرق أقل من 0.01، نعتبره مدفوعًا بالكامل
    IF abs(NEW.total_amount - NEW.paid_amount) < 0.01 THEN
        -- إذا كان الفرق ضئيلًا جدًا، اضبط paid_amount ليساوي total_amount تمامًا
        NEW.paid_amount = NEW.total_amount;
    END IF;
    
    -- تحديث الحالة وفقًا للمبلغ المدفوع
    IF NEW.paid_amount = 0 THEN
        NEW.status = 'draft';
    ELSIF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status = 'paid';
    ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
        NEW.status = 'partially_paid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إذا لم يكن TRIGGER موجودًا، قم بإنشائه
DROP TRIGGER IF EXISTS sync_purchase_status_with_precision_trigger ON supplier_purchases;
CREATE TRIGGER sync_purchase_status_with_precision_trigger
BEFORE INSERT OR UPDATE OF paid_amount, total_amount ON supplier_purchases
FOR EACH ROW
EXECUTE FUNCTION sync_purchase_status_with_precision(); 