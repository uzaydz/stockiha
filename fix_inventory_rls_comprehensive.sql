-- حل شامل لمشكلة Row-Level Security في جدول inventory_log
-- تم إنشاء هذا الملف لحل جميع المشاكل المتعلقة بـ RLS

-- ==========================================
-- الجزء الأول: التحقق من وجود العمود organization_id
-- ==========================================

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

-- ==========================================
-- الجزء الثاني: تحديث البيانات الموجودة لتشمل organization_id
-- ==========================================

-- تحديث السجلات التي لا تحتوي على organization_id
UPDATE inventory_log 
SET organization_id = (
    SELECT p.organization_id 
    FROM products p 
    WHERE p.id = inventory_log.product_id
)
WHERE organization_id IS NULL;

-- التحقق من وجود سجلات بدون organization_id بعد التحديث
DO $$
DECLARE
    missing_org_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_org_count
    FROM inventory_log 
    WHERE organization_id IS NULL;
    
    IF missing_org_count > 0 THEN
        RAISE WARNING 'يوجد % سجل في inventory_log بدون organization_id', missing_org_count;
        
        -- حذف السجلات التي لا يمكن ربطها بمؤسسة
        DELETE FROM inventory_log 
        WHERE organization_id IS NULL;
        
        RAISE NOTICE 'تم حذف % سجل لا يمكن ربطه بمؤسسة', missing_org_count;
    ELSE
        RAISE NOTICE 'جميع السجلات تحتوي على organization_id صالح';
    END IF;
END $$;

-- ==========================================
-- الجزء الثالث: تحديث دالة log_inventory_change
-- ==========================================

CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من وجود organization_id في المنتج
    IF NEW.organization_id IS NULL THEN
        RAISE WARNING 'Product % does not have organization_id', NEW.id;
        RETURN NEW;
    END IF;
    
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'فشل في إدراج سجل المخزون: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- الجزء الرابع: تحسين سياسة RLS
-- ==========================================

-- حذف السياسة القديمة
DROP POLICY IF EXISTS org_tenant_inventory_log_insert ON inventory_log;
DROP POLICY IF EXISTS org_tenant_inventory_log_select ON inventory_log;
DROP POLICY IF EXISTS org_tenant_inventory_log_update ON inventory_log;
DROP POLICY IF EXISTS org_tenant_inventory_log_delete ON inventory_log;

-- إنشاء سياسة INSERT محسنة
CREATE POLICY org_tenant_inventory_log_insert ON inventory_log
FOR INSERT
WITH CHECK (
    -- السماح إذا كان organization_id يطابق المستخدم الحالي
    organization_id = (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR
    -- أو إذا كان المنتج ينتمي لنفس المؤسسة
    EXISTS (
        SELECT 1
        FROM products
        WHERE products.id = inventory_log.product_id
        AND products.organization_id = (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    )
    OR
    -- السماح للمديرين العامين
    EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- إنشاء سياسة SELECT
CREATE POLICY org_tenant_inventory_log_select ON inventory_log
FOR SELECT
USING (
    organization_id = (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- إنشاء سياسة UPDATE
CREATE POLICY org_tenant_inventory_log_update ON inventory_log
FOR UPDATE
USING (
    organization_id = (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    organization_id = (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
);

-- إنشاء سياسة DELETE
CREATE POLICY org_tenant_inventory_log_delete ON inventory_log
FOR DELETE
USING (
    organization_id = (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ==========================================
-- الجزء الخامس: تحديث دالة update_inventory_from_purchase
-- ==========================================

CREATE OR REPLACE FUNCTION update_inventory_from_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update inventory when purchase status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Update product quantities in inventory
    INSERT INTO inventory_log (
      product_id, 
      quantity, 
      type,
      reference_type, 
      reference_id, 
      organization_id, 
      created_by,
      previous_stock,
      new_stock
    )
    SELECT 
      spi.product_id,
      spi.quantity,
      'purchase' AS type,
      'supplier_purchase' AS reference_type,
      NEW.id AS reference_id,
      NEW.organization_id,
      NEW.created_by,
      p.stock_quantity AS previous_stock,
      p.stock_quantity + spi.quantity AS new_stock
    FROM 
      supplier_purchase_items spi
    JOIN 
      products p ON p.id = spi.product_id
    WHERE 
      spi.purchase_id = NEW.id 
      AND spi.product_id IS NOT NULL;
      
    -- Now update the actual stock quantities
    UPDATE products p
    SET 
      stock_quantity = p.stock_quantity + spi.quantity,
      updated_at = NOW()
    FROM 
      supplier_purchase_items spi
    WHERE 
      p.id = spi.product_id 
      AND spi.purchase_id = NEW.id
      AND spi.product_id IS NOT NULL;
  END IF;
  RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'فشل في تحديث المخزون من المشتريات: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- الجزء السادس: إنشاء فهارس لتحسين الأداء
-- ==========================================

-- فهرس على organization_id و product_id
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_product 
ON inventory_log(organization_id, product_id);

-- فهرس على organization_id و created_at
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_date 
ON inventory_log(organization_id, created_at DESC);

-- فهرس على type و organization_id
CREATE INDEX IF NOT EXISTS idx_inventory_log_type_org 
ON inventory_log(type, organization_id);

-- ==========================================
-- الجزء السابع: التحقق النهائي والتقرير
-- ==========================================

DO $$
DECLARE
    total_records INTEGER;
    records_with_org INTEGER;
    policies_count INTEGER;
BEGIN
    -- عدد السجلات الإجمالي
    SELECT COUNT(*) INTO total_records FROM inventory_log;
    
    -- عدد السجلات التي تحتوي على organization_id
    SELECT COUNT(*) INTO records_with_org 
    FROM inventory_log 
    WHERE organization_id IS NOT NULL;
    
    -- عدد السياسات
    SELECT COUNT(*) INTO policies_count 
    FROM pg_policies 
    WHERE tablename = 'inventory_log';
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'تقرير إصلاح inventory_log RLS';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'إجمالي السجلات: %', total_records;
    RAISE NOTICE 'السجلات مع organization_id: %', records_with_org;
    RAISE NOTICE 'عدد سياسات RLS: %', policies_count;
    
    IF records_with_org = total_records THEN
        RAISE NOTICE 'حالة: ✅ جميع السجلات تحتوي على organization_id';
    ELSE
        RAISE WARNING 'حالة: ⚠️  يوجد % سجل بدون organization_id', (total_records - records_with_org);
    END IF;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'تم الانتهاء من إصلاح RLS بنجاح!';
    RAISE NOTICE '====================================';
END $$; 