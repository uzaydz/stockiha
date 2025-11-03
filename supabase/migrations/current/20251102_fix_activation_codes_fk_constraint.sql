-- Migration: Fix activation_codes foreign key constraint
-- التاريخ: 2025-11-02
-- الوصف: إصلاح مشكلة foreign key constraint بين activation_codes و organization_subscriptions
--         بحيث يتم تعيين subscription_id إلى NULL عند حذف/تحديث الاشتراك

-- 🔧 الخطوة 1: حذف الـ constraint القديم (إذا كان موجوداً)
DO $$
BEGIN
    -- محاولة حذف الـ constraint القديم
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_codes_subscription_id_fkey'
        AND table_name = 'activation_codes'
    ) THEN
        ALTER TABLE activation_codes
        DROP CONSTRAINT activation_codes_subscription_id_fkey;

        RAISE NOTICE 'تم حذف الـ constraint القديم بنجاح';
    END IF;
END $$;

-- 🔧 الخطوة 2: إضافة الـ constraint الجديد مع ON DELETE SET NULL و ON UPDATE CASCADE
ALTER TABLE activation_codes
ADD CONSTRAINT activation_codes_subscription_id_fkey
FOREIGN KEY (subscription_id)
REFERENCES organization_subscriptions(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 🔍 التحقق من النتيجة
DO $$
BEGIN
    RAISE NOTICE 'تم إضافة الـ constraint الجديد بنجاح مع ON DELETE SET NULL';
END $$;

-- 📝 ملاحظات:
-- 1. عند حذف subscription، سيتم تعيين subscription_id في activation_codes إلى NULL تلقائياً
-- 2. عند تحديث subscription ID، سيتم تحديثه في activation_codes تلقائياً
-- 3. هذا يحل مشكلة "violates foreign key constraint" عند إنهاء الاشتراك
