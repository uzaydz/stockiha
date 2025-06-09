-- حل مشكلة الأعمدة المفقودة في جدول returns
-- إضافة عمود approval_notes والأعمدة الأخرى المطلوبة

-- إضافة عمود approval_notes إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' AND column_name = 'approval_notes'
    ) THEN
        ALTER TABLE returns ADD COLUMN approval_notes TEXT;
    END IF;
END $$;

-- إضافة عمود rejection_reason إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE returns ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- إضافة عمود rejected_by إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE returns ADD COLUMN rejected_by UUID;
    END IF;
END $$;

-- إضافة عمود rejected_at إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE returns ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- إضافة constraint لجدول returns إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'returns' AND constraint_name = 'returns_rejected_by_fkey'
    ) THEN
        ALTER TABLE returns ADD CONSTRAINT returns_rejected_by_fkey 
            FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- إضافة تعليقات للأعمدة الجديدة
COMMENT ON COLUMN returns.approval_notes IS 'ملاحظات الموافقة على طلب الإرجاع';
COMMENT ON COLUMN returns.rejection_reason IS 'سبب رفض طلب الإرجاع';
COMMENT ON COLUMN returns.rejected_by IS 'معرف المسؤول الذي رفض طلب الإرجاع';
COMMENT ON COLUMN returns.rejected_at IS 'تاريخ ووقت رفض طلب الإرجاع'; 