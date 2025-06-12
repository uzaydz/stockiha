-- إصلاح مشكلة Row-Level Security في جدول inventory_log
-- تحديث دالة log_inventory_change لتشمل organization_id

CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert record in inventory_log table
    INSERT INTO inventory_log (
        product_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_id,
        reference_type,
        notes,
        created_by,
        organization_id,
        created_at
    ) VALUES (
        NEW.id,
        NEW.stock_quantity - OLD.stock_quantity,
        OLD.stock_quantity,
        NEW.stock_quantity,
        CASE 
            WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'purchase'
            ELSE 'sale'
        END,
        NULL,  -- To be set by application
        'system',
        'Automatic stock update',
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),  -- Default to an admin user
        NEW.organization_id,  -- إضافة organization_id من المنتج
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- التأكد من أن العمود organization_id موجود في جدول inventory_log
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'inventory_log' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE inventory_log ADD COLUMN organization_id UUID;
        RAISE NOTICE 'تم إضافة عمود organization_id إلى جدول inventory_log';
    ELSE
        RAISE NOTICE 'عمود organization_id موجود بالفعل في جدول inventory_log';
    END IF;
END $$;

-- تحديث البيانات الموجودة لتشمل organization_id
UPDATE inventory_log 
SET organization_id = (
    SELECT p.organization_id 
    FROM products p 
    WHERE p.id = inventory_log.product_id
)
WHERE organization_id IS NULL;

-- التأكد من أن جميع سياسات RLS تعمل بشكل صحيح
-- يمكن إضافة سياسات أخرى حسب الحاجة 