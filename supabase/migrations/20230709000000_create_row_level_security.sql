-- إضافة سياسات السماح للزوار بقراءة البيانات العامة كالمنتجات والفئات

-- Enable Row Level Security on tables that need protection
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Products Policies - السماح للمستخدمين المصادق عليهم وللزوار بقراءة المنتجات العامة
DROP POLICY IF EXISTS "Allow public read access for products" ON products;
CREATE POLICY "Allow public read access for products" ON products 
FOR SELECT USING (true); -- السماح للجميع بقراءة المنتجات

-- Product Categories Policies - السماح بقراءة الفئات للزوار
DROP POLICY IF EXISTS "Allow public read access for product categories" ON product_categories;
CREATE POLICY "Allow public read access for product categories" ON product_categories 
FOR SELECT USING (true); -- السماح للجميع بقراءة الفئات

-- Services Policies - السماح بقراءة الخدمات للزوار
DROP POLICY IF EXISTS "Allow public read access for services" ON services;
CREATE POLICY "Allow public read access for services" ON services 
FOR SELECT USING (true); -- السماح للجميع بقراءة الخدمات

-- Organizations Policies - السماح بقراءة بيانات المؤسسة للزوار
DROP POLICY IF EXISTS "Allow public read access for organizations" ON organizations;
CREATE POLICY "Allow public read access for organizations" ON organizations 
FOR SELECT USING (true); -- السماح للجميع بقراءة بيانات المؤسسة العامة 