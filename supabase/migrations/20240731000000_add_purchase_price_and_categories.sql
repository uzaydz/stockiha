-- Migration file: add_purchase_price_and_categories
-- إضافة عمود سعر الشراء للمنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);

-- إنشاء جدول للفئات الرئيسية
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slug TEXT UNIQUE,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول للفئات الفرعية
CREATE TABLE IF NOT EXISTS product_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (category_id, name),
  UNIQUE (category_id, slug)
);

-- إنشاء وظيفة لتحديث updated_at عند تعديل السجلات
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الوظيفة على الجداول المناسبة
DROP TRIGGER IF EXISTS update_product_categories_modtime ON product_categories;
CREATE TRIGGER update_product_categories_modtime
BEFORE UPDATE ON product_categories
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_product_subcategories_modtime ON product_subcategories;
CREATE TRIGGER update_product_subcategories_modtime
BEFORE UPDATE ON product_subcategories
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- إنشاء فهارس (indexes) للأداء
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_id ON product_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_subcategories_is_active ON product_subcategories(is_active);

-- تفعيل سياسات أمان الصفوف (RLS) للجداول الجديدة
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات للفئات الرئيسية
CREATE POLICY "Allow select for all users" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON product_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated users" ON product_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete for authenticated users" ON product_categories FOR DELETE USING (auth.role() = 'authenticated');

-- إنشاء سياسات للفئات الفرعية
CREATE POLICY "Allow select for all users" ON product_subcategories FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON product_subcategories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated users" ON product_subcategories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete for authenticated users" ON product_subcategories FOR DELETE USING (auth.role() = 'authenticated');

-- تعديل جدول المنتجات لاستخدام المراجع (references) للفئات
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id),
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES product_subcategories(id);

-- وظيفة لحساب هامش الربح
CREATE OR REPLACE FUNCTION calculate_profit_margin(purchase_price DECIMAL, selling_price DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF purchase_price IS NULL OR purchase_price = 0 THEN
    RETURN 0;
  ELSE
    RETURN ((selling_price - purchase_price) / purchase_price) * 100;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- تعديل سياسة إدخال المنتجات
DROP POLICY IF EXISTS "Allow insert for admin users" ON products;
CREATE POLICY "Allow insert for authenticated users" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 