-- ============================================================
-- 🛒 Smart Purchase System Migration
-- ============================================================
-- تاريخ: 2025-12-07
-- الوصف: تحديث نظام المشتريات لدعم:
--   - تحويل الوحدات (قطعة، كرتونة، متر، كيلو)
--   - المتغيرات (الألوان والمقاسات)
--   - التسعير الذكي
--   - التكاليف الإضافية (Landed Costs)
--   - وضع التوربو
-- ============================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. تحديث جدول supplier_purchases (المشتريات الرئيسي)
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة الأعمدة الجديدة لجدول المشتريات
ALTER TABLE supplier_purchases
ADD COLUMN IF NOT EXISTS supplier_name text,
ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'fixed', -- 'fixed' | 'percentage'
ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS landed_costs_total numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_total numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_base_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS invoice_date date,
ADD COLUMN IF NOT EXISTS delivery_date date,
ADD COLUMN IF NOT EXISTS received_date date,
ADD COLUMN IF NOT EXISTS expected_delivery_date date,
ADD COLUMN IF NOT EXISTS shipping_method text,
ADD COLUMN IF NOT EXISTS shipping_tracking text,
ADD COLUMN IF NOT EXISTS warehouse_id text,
ADD COLUMN IF NOT EXISTS warehouse_location text,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'DZD',
ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,4) DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_imported boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS country_of_origin text,
ADD COLUMN IF NOT EXISTS customs_declaration text,
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS turbo_mode_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entry_duration_seconds integer,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_org_date
ON supplier_purchases(organization_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier
ON supplier_purchases(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_purchases_status
ON supplier_purchases(status);

CREATE INDEX IF NOT EXISTS idx_supplier_purchases_payment_status
ON supplier_purchases(payment_status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. تحديث جدول supplier_purchase_items (عناصر المشتريات)
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة organization_id إذا لم يكن موجوداً
ALTER TABLE supplier_purchase_items
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- تحديث organization_id من جدول المشتريات
UPDATE supplier_purchase_items spi
SET organization_id = sp.organization_id
FROM supplier_purchases sp
WHERE spi.purchase_id = sp.id
AND spi.organization_id IS NULL;

-- جعل organization_id مطلوباً للسجلات الجديدة
ALTER TABLE supplier_purchase_items
ALTER COLUMN organization_id SET NOT NULL;

-- إضافة الأعمدة الجديدة لعناصر المشتريات
ALTER TABLE supplier_purchase_items
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS product_sku text,
ADD COLUMN IF NOT EXISTS product_barcode text,
ADD COLUMN IF NOT EXISTS product_image text,
-- الوحدات والتحويل
ADD COLUMN IF NOT EXISTS purchase_unit text DEFAULT 'piece', -- 'piece' | 'box' | 'pack' | 'roll' | 'meter' | 'kg' | 'gram' | 'liter' | 'dozen' | 'pallet'
ADD COLUMN IF NOT EXISTS conversion_factor numeric(10,4) DEFAULT 1,
ADD COLUMN IF NOT EXISTS purchase_quantity numeric(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_quantity numeric(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_cost numeric(12,4) DEFAULT 0,
-- المتغيرات (الألوان والمقاسات)
ADD COLUMN IF NOT EXISTS variant_type text, -- 'none' | 'color_only' | 'size_only' | 'color_size'
ADD COLUMN IF NOT EXISTS color_id uuid,
ADD COLUMN IF NOT EXISTS color_name text,
ADD COLUMN IF NOT EXISTS size_id uuid,
ADD COLUMN IF NOT EXISTS size_name text,
ADD COLUMN IF NOT EXISTS variant_display_name text,
-- الأسعار والتكاليف
ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS landed_cost_share numeric(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_cost numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_base_cost numeric(12,4) DEFAULT 0,
-- المخزون
ADD COLUMN IF NOT EXISTS current_stock numeric(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_stock numeric(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_updated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_updated_at timestamptz,
-- التسعير الذكي
ADD COLUMN IF NOT EXISTS price_changed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS old_purchase_price numeric(12,4),
ADD COLUMN IF NOT EXISTS suggested_selling_price numeric(12,2),
ADD COLUMN IF NOT EXISTS old_selling_price numeric(12,2),
ADD COLUMN IF NOT EXISTS new_selling_price numeric(12,2),
ADD COLUMN IF NOT EXISTS price_update_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price_update_applied_at timestamptz,
ADD COLUMN IF NOT EXISTS margin_percentage numeric(5,2),
-- الدفعات والتتبع
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS batch_number text,
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS serial_numbers jsonb DEFAULT '[]',
-- البيع بالوزن
ADD COLUMN IF NOT EXISTS weight_kg numeric(10,4),
ADD COLUMN IF NOT EXISTS weight_unit text,
ADD COLUMN IF NOT EXISTS price_per_weight_unit numeric(12,4),
-- البيع بالمتر
ADD COLUMN IF NOT EXISTS meters numeric(10,4),
ADD COLUMN IF NOT EXISTS price_per_meter numeric(12,4),
-- البيع بالصندوق
ADD COLUMN IF NOT EXISTS boxes_count integer,
ADD COLUMN IF NOT EXISTS units_per_box integer,
ADD COLUMN IF NOT EXISTS box_price numeric(12,4),
-- ملاحظات
ADD COLUMN IF NOT EXISTS item_notes text,
ADD COLUMN IF NOT EXISTS quality_notes text,
ADD COLUMN IF NOT EXISTS received_quantity numeric(12,4),
ADD COLUMN IF NOT EXISTS damaged_quantity numeric(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS returned_quantity numeric(12,4) DEFAULT 0;

-- إنشاء indexes للبحث السريع
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_org
ON supplier_purchase_items(organization_id);

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_purchase
ON supplier_purchase_items(purchase_id);

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_product
ON supplier_purchase_items(product_id);

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_color
ON supplier_purchase_items(color_id) WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_size
ON supplier_purchase_items(size_id) WHERE size_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. إنشاء جدول التكاليف الإضافية (Landed Costs)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_landed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES supplier_purchases(id) ON DELETE CASCADE,

  -- نوع التكلفة
  cost_type text NOT NULL, -- 'shipping' | 'customs' | 'insurance' | 'handling' | 'other'
  label text NOT NULL,

  -- المبلغ والنسبة
  amount numeric(12,2) NOT NULL DEFAULT 0,
  percentage_of_total numeric(5,2), -- للحساب التلقائي

  -- طريقة التوزيع
  distribution_method text NOT NULL DEFAULT 'by_value', -- 'by_value' | 'by_quantity' | 'by_weight' | 'equal'

  -- معلومات إضافية
  reference_number text,
  vendor_name text,
  invoice_number text,
  notes text,

  -- التواريخ
  cost_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT valid_cost_type CHECK (cost_type IN ('shipping', 'customs', 'insurance', 'handling', 'other')),
  CONSTRAINT valid_distribution_method CHECK (distribution_method IN ('by_value', 'by_quantity', 'by_weight', 'equal'))
);

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_purchase_landed_costs_org
ON purchase_landed_costs(organization_id);

CREATE INDEX IF NOT EXISTS idx_purchase_landed_costs_purchase
ON purchase_landed_costs(purchase_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. إنشاء جدول سجل تحديث الأسعار
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_price_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES supplier_purchases(id) ON DELETE CASCADE,
  purchase_item_id uuid NOT NULL REFERENCES supplier_purchase_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,

  -- معلومات المنتج
  product_name text,
  color_id uuid,
  color_name text,
  size_id uuid,
  size_name text,

  -- تغيير سعر الشراء
  old_purchase_price numeric(12,4),
  new_purchase_price numeric(12,4),
  purchase_price_change_amount numeric(12,4),
  purchase_price_change_percent numeric(5,2),

  -- تغيير سعر البيع
  old_selling_price numeric(12,2),
  suggested_selling_price numeric(12,2),
  new_selling_price numeric(12,2),
  selling_price_change_amount numeric(12,2),
  selling_price_change_percent numeric(5,2),

  -- الهوامش
  old_margin_amount numeric(12,2),
  old_margin_percent numeric(5,2),
  new_margin_amount numeric(12,2),
  new_margin_percent numeric(5,2),

  -- حالة التحديث
  status text DEFAULT 'pending', -- 'pending' | 'applied' | 'skipped' | 'rejected'
  applied_at timestamptz,
  applied_by uuid,
  rejection_reason text,

  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_purchase_price_updates_org
ON purchase_price_updates(organization_id);

CREATE INDEX IF NOT EXISTS idx_purchase_price_updates_product
ON purchase_price_updates(product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_price_updates_status
ON purchase_price_updates(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. إنشاء جدول قوالب المشتريات (للإدخال السريع)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- معلومات القالب
  name text NOT NULL,
  description text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text,

  -- العناصر (JSON array)
  items jsonb NOT NULL DEFAULT '[]',

  -- الإعدادات
  auto_apply_landed_costs boolean DEFAULT false,
  default_landed_costs jsonb DEFAULT '[]',

  -- الاستخدام
  use_count integer DEFAULT 0,
  last_used_at timestamptz,

  -- الحالة
  is_active boolean DEFAULT true,
  is_favorite boolean DEFAULT false,

  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_purchase_templates_org
ON purchase_templates(organization_id);

CREATE INDEX IF NOT EXISTS idx_purchase_templates_supplier
ON purchase_templates(supplier_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. إنشاء View للمشتريات مع التفاصيل
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW purchase_details_view AS
SELECT
  sp.*,
  s.name as supplier_display_name,
  s.company_name as supplier_company,
  s.phone as supplier_phone,
  s.email as supplier_email,
  (
    SELECT COUNT(*) FROM supplier_purchase_items spi WHERE spi.purchase_id = sp.id
  ) as calculated_items_count,
  (
    SELECT COALESCE(SUM(spi.base_quantity), 0)
    FROM supplier_purchase_items spi WHERE spi.purchase_id = sp.id
  ) as calculated_total_quantity,
  (
    SELECT COALESCE(SUM(plc.amount), 0)
    FROM purchase_landed_costs plc WHERE plc.purchase_id = sp.id
  ) as calculated_landed_costs
FROM supplier_purchases sp
LEFT JOIN suppliers s ON sp.supplier_id = s.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. إنشاء Functions للحسابات
-- ═══════════════════════════════════════════════════════════════════════════

-- Function لتوزيع التكاليف الإضافية
CREATE OR REPLACE FUNCTION distribute_landed_costs(p_purchase_id uuid)
RETURNS void AS $$
DECLARE
  v_total_value numeric;
  v_total_quantity numeric;
  v_total_weight numeric;
  v_items_count integer;
  v_cost RECORD;
BEGIN
  -- حساب الإجماليات
  SELECT
    COALESCE(SUM(total_cost), 0),
    COALESCE(SUM(base_quantity), 0),
    COALESCE(SUM(weight_kg), 0),
    COUNT(*)
  INTO v_total_value, v_total_quantity, v_total_weight, v_items_count
  FROM supplier_purchase_items
  WHERE purchase_id = p_purchase_id;

  -- إعادة تعيين حصص التكاليف
  UPDATE supplier_purchase_items
  SET landed_cost_share = 0
  WHERE purchase_id = p_purchase_id;

  -- توزيع كل تكلفة
  FOR v_cost IN
    SELECT * FROM purchase_landed_costs WHERE purchase_id = p_purchase_id
  LOOP
    CASE v_cost.distribution_method
      WHEN 'by_value' THEN
        UPDATE supplier_purchase_items
        SET landed_cost_share = landed_cost_share +
          CASE WHEN v_total_value > 0
            THEN (total_cost / v_total_value) * v_cost.amount
            ELSE 0
          END
        WHERE purchase_id = p_purchase_id;

      WHEN 'by_quantity' THEN
        UPDATE supplier_purchase_items
        SET landed_cost_share = landed_cost_share +
          CASE WHEN v_total_quantity > 0
            THEN (base_quantity / v_total_quantity) * v_cost.amount
            ELSE 0
          END
        WHERE purchase_id = p_purchase_id;

      WHEN 'by_weight' THEN
        UPDATE supplier_purchase_items
        SET landed_cost_share = landed_cost_share +
          CASE WHEN v_total_weight > 0
            THEN (COALESCE(weight_kg, 0) / v_total_weight) * v_cost.amount
            ELSE 0
          END
        WHERE purchase_id = p_purchase_id;

      WHEN 'equal' THEN
        UPDATE supplier_purchase_items
        SET landed_cost_share = landed_cost_share +
          CASE WHEN v_items_count > 0
            THEN v_cost.amount / v_items_count
            ELSE 0
          END
        WHERE purchase_id = p_purchase_id;
    END CASE;
  END LOOP;

  -- تحديث التكلفة النهائية
  UPDATE supplier_purchase_items
  SET
    final_cost = total_cost + landed_cost_share,
    final_base_cost = CASE WHEN base_quantity > 0
      THEN (total_cost + landed_cost_share) / base_quantity
      ELSE 0
    END
  WHERE purchase_id = p_purchase_id;

  -- تحديث إجمالي المشتريات
  UPDATE supplier_purchases
  SET
    landed_costs_total = (SELECT COALESCE(SUM(amount), 0) FROM purchase_landed_costs WHERE purchase_id = p_purchase_id),
    final_total = total_amount + landed_costs_total
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث المخزون عند تأكيد المشتريات
CREATE OR REPLACE FUNCTION apply_purchase_to_inventory(p_purchase_id uuid)
RETURNS void AS $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM supplier_purchase_items
    WHERE purchase_id = p_purchase_id AND stock_updated = false
  LOOP
    -- تحديث مخزون المنتج الرئيسي
    IF v_item.variant_type IS NULL OR v_item.variant_type = 'none' THEN
      UPDATE products
      SET
        stock_quantity = stock_quantity + v_item.base_quantity,
        purchase_price = v_item.final_base_cost,
        last_inventory_update = now()
      WHERE id = v_item.product_id;

    -- تحديث مخزون اللون فقط
    ELSIF v_item.variant_type = 'color_only' THEN
      UPDATE product_colors
      SET
        quantity = quantity + v_item.base_quantity,
        purchase_price = v_item.final_base_cost
      WHERE id = v_item.color_id;

    -- تحديث مخزون المقاس فقط
    ELSIF v_item.variant_type = 'size_only' THEN
      UPDATE product_sizes
      SET
        quantity = quantity + v_item.base_quantity,
        purchase_price = v_item.final_base_cost
      WHERE id = v_item.size_id;

    -- تحديث مخزون اللون والمقاس
    ELSIF v_item.variant_type = 'color_size' THEN
      UPDATE product_sizes
      SET
        quantity = quantity + v_item.base_quantity,
        purchase_price = v_item.final_base_cost
      WHERE id = v_item.size_id;
    END IF;

    -- تحديث حالة العنصر
    UPDATE supplier_purchase_items
    SET
      stock_updated = true,
      stock_updated_at = now(),
      new_stock = current_stock + base_quantity
    WHERE id = v_item.id;

    -- إنشاء دفعة مخزون جديدة
    INSERT INTO inventory_batches (
      organization_id, product_id, color_id, size_id,
      batch_number, supplier_id, supplier_purchase_item_id,
      purchase_date, purchase_price, selling_price,
      quantity_received, quantity_remaining,
      expiry_date, cost_per_unit, is_active,
      variant_type, variant_display_name
    ) VALUES (
      v_item.organization_id, v_item.product_id, v_item.color_id, v_item.size_id,
      COALESCE(v_item.batch_number, 'PO-' || p_purchase_id || '-' || v_item.id),
      (SELECT supplier_id FROM supplier_purchases WHERE id = p_purchase_id),
      v_item.id,
      (SELECT purchase_date FROM supplier_purchases WHERE id = p_purchase_id),
      v_item.final_base_cost,
      v_item.suggested_selling_price,
      v_item.base_quantity,
      v_item.base_quantity,
      v_item.expiry_date,
      v_item.final_base_cost,
      true,
      v_item.variant_type,
      v_item.variant_display_name
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. إنشاء Triggers للتحديث التلقائي
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق Trigger على الجداول الجديدة
DROP TRIGGER IF EXISTS update_purchase_landed_costs_updated_at ON purchase_landed_costs;
CREATE TRIGGER update_purchase_landed_costs_updated_at
  BEFORE UPDATE ON purchase_landed_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_price_updates_updated_at ON purchase_price_updates;
CREATE TRIGGER update_purchase_price_updates_updated_at
  BEFORE UPDATE ON purchase_price_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_templates_updated_at ON purchase_templates;
CREATE TRIGGER update_purchase_templates_updated_at
  BEFORE UPDATE ON purchase_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. RLS Policies للجداول الجديدة
-- ═══════════════════════════════════════════════════════════════════════════

-- تفعيل RLS
ALTER TABLE purchase_landed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_price_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_templates ENABLE ROW LEVEL SECURITY;

-- Policies لـ purchase_landed_costs
CREATE POLICY "Users can view their org landed costs" ON purchase_landed_costs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org landed costs" ON purchase_landed_costs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org landed costs" ON purchase_landed_costs
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org landed costs" ON purchase_landed_costs
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policies لـ purchase_price_updates
CREATE POLICY "Users can view their org price updates" ON purchase_price_updates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org price updates" ON purchase_price_updates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org price updates" ON purchase_price_updates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policies لـ purchase_templates
CREATE POLICY "Users can view their org templates" ON purchase_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org templates" ON purchase_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org templates" ON purchase_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org templates" ON purchase_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. تحديث RLS لـ supplier_purchase_items لتشمل organization_id
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view their org purchase items" ON supplier_purchase_items;
DROP POLICY IF EXISTS "Users can insert their org purchase items" ON supplier_purchase_items;
DROP POLICY IF EXISTS "Users can update their org purchase items" ON supplier_purchase_items;
DROP POLICY IF EXISTS "Users can delete their org purchase items" ON supplier_purchase_items;

-- تفعيل RLS
ALTER TABLE supplier_purchase_items ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات الجديدة
CREATE POLICY "Users can view their org purchase items" ON supplier_purchase_items
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org purchase items" ON supplier_purchase_items
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org purchase items" ON supplier_purchase_items
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org purchase items" ON supplier_purchase_items
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Comments للتوثيق
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE purchase_landed_costs IS 'التكاليف الإضافية للمشتريات (شحن، جمارك، تأمين)';
COMMENT ON TABLE purchase_price_updates IS 'سجل تحديثات أسعار البيع بناءً على تغيرات أسعار الشراء';
COMMENT ON TABLE purchase_templates IS 'قوالب المشتريات للإدخال السريع';

COMMENT ON COLUMN supplier_purchases.turbo_mode_used IS 'هل تم استخدام وضع التوربو للإدخال السريع';
COMMENT ON COLUMN supplier_purchases.landed_costs_total IS 'إجمالي التكاليف الإضافية (شحن، جمارك، إلخ)';
COMMENT ON COLUMN supplier_purchases.final_total IS 'الإجمالي النهائي شامل التكاليف الإضافية';

COMMENT ON COLUMN supplier_purchase_items.purchase_unit IS 'وحدة الشراء (قطعة، كرتونة، متر، كيلو)';
COMMENT ON COLUMN supplier_purchase_items.conversion_factor IS 'معامل التحويل من وحدة الشراء إلى الوحدة الأساسية';
COMMENT ON COLUMN supplier_purchase_items.base_quantity IS 'الكمية بالوحدة الأساسية (قطع)';
COMMENT ON COLUMN supplier_purchase_items.landed_cost_share IS 'حصة العنصر من التكاليف الإضافية';
COMMENT ON COLUMN supplier_purchase_items.final_base_cost IS 'تكلفة الوحدة الأساسية شاملة التكاليف الإضافية';

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية Migration
-- ═══════════════════════════════════════════════════════════════════════════
