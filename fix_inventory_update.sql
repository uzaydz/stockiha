-- إضافة عمود last_inventory_update لجدول products إذا لم يكن موجودًا
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'last_inventory_update'
  ) THEN
    ALTER TABLE products ADD COLUMN last_inventory_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'تم إضافة عمود last_inventory_update إلى جدول products بنجاح';
  ELSE
    RAISE NOTICE 'عمود last_inventory_update موجود بالفعل في جدول products';
  END IF;
END
$$;

-- إنشاء دالة للتأكد من تحديث المخزون بشكل صحيح
CREATE OR REPLACE FUNCTION update_product_inventory(
  p_product_id UUID,
  p_new_quantity INTEGER,
  p_type TEXT DEFAULT 'sale',
  p_reference_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
  v_product_name TEXT;
  v_user_id UUID;
BEGIN
  -- الحصول على كمية المخزون الحالية
  SELECT stock_quantity, name INTO v_current_stock, v_product_name
  FROM products 
  WHERE id = p_product_id;
  
  -- التحقق من وجود المنتج
  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'المنتج غير موجود: %', p_product_id;
  END IF;
  
  -- تحديث كمية المخزون في جدول المنتجات
  UPDATE products
  SET 
    stock_quantity = p_new_quantity,
    updated_at = NOW(),
    last_inventory_update = NOW()
  WHERE id = p_product_id;
  
  -- إضافة سجل في جدول inventory_logs
  INSERT INTO inventory_logs (
    product_id,
    product_name,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    notes,
    created_at
  ) VALUES (
    p_product_id,
    v_product_name,
    (p_new_quantity - v_current_stock), -- الكمية المضافة أو المخصومة
    v_current_stock,
    p_new_quantity,
    p_type,
    p_reference_id,
    p_notes,
    NOW()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'خطأ أثناء تحديث المخزون: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- تحديث جدول inventory_logs إذا لم يكن موجودًا
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_logs') THEN
    CREATE TABLE inventory_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      product_name TEXT,
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'sale',
      reference_id TEXT,
      notes TEXT,
      created_by UUID,
      created_by_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      organization_id UUID
    );
    RAISE NOTICE 'تم إنشاء جدول inventory_logs بنجاح';
  ELSE
    RAISE NOTICE 'جدول inventory_logs موجود بالفعل';
  END IF;
END
$$;

-- تحديث القواعد لمنع المستخدمين من تعديل حقل last_inventory_update مباشرة
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- إنشاء قاعدة للتأكد من أن التحديث يحدث من خلال دالة update_product_inventory
CREATE OR REPLACE RULE prevent_direct_update_on_last_inventory_update AS
ON UPDATE TO products
WHERE NEW.last_inventory_update IS DISTINCT FROM OLD.last_inventory_update
DO INSTEAD
  SELECT 1;  -- لا تفعل شيئًا، استخدم الدالة بدلاً من ذلك

-- إنشاء دالة لإصلاح أخطاء التحديث السابقة
CREATE OR REPLACE FUNCTION repair_inventory_inconsistencies() RETURNS VOID AS $$
BEGIN
  -- تحديث المنتجات التي ليس لديها تاريخ تحديث للمخزون
  UPDATE products
  SET last_inventory_update = updated_at
  WHERE last_inventory_update IS NULL;
  
  -- التأكد من أن جميع المنتجات لديها سجلات مخزون صحيحة
  INSERT INTO inventory_logs (
    product_id,
    product_name,
    quantity,
    previous_stock,
    new_stock,
    type,
    notes,
    created_at
  )
  SELECT
    id,
    name,
    stock_quantity,
    0,
    stock_quantity,
    'adjustment',
    'تصحيح تلقائي للمخزون',
    NOW()
  FROM products p
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory_logs l WHERE l.product_id = p.id
  );
  
  RAISE NOTICE 'تم إصلاح تناقضات المخزون بنجاح';
END;
$$ LANGUAGE plpgsql; 