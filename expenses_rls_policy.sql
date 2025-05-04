-- إضافة سياسات أمان الصفوف (RLS) لجداول المصروفات

-- تأكد من تفعيل RLS على الجداول
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- إلغاء السياسات الحالية إن وجدت لتجنب التكرار
DROP POLICY IF EXISTS expense_categories_select_policy ON expense_categories;
DROP POLICY IF EXISTS expense_categories_insert_policy ON expense_categories;
DROP POLICY IF EXISTS expense_categories_update_policy ON expense_categories;
DROP POLICY IF EXISTS expense_categories_delete_policy ON expense_categories;

DROP POLICY IF EXISTS expenses_select_policy ON expenses;
DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
DROP POLICY IF EXISTS expenses_update_policy ON expenses;
DROP POLICY IF EXISTS expenses_delete_policy ON expenses;

DROP POLICY IF EXISTS recurring_expenses_select_policy ON recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_insert_policy ON recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_update_policy ON recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_delete_policy ON recurring_expenses;

-- سياسات جدول فئات المصروفات

-- سياسة القراءة - السماح لجميع المستخدمين المصرح لهم بالقراءة
CREATE POLICY expense_categories_select_policy ON expense_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- سياسة الإضافة - السماح لجميع المستخدمين المصرح لهم بالإضافة
CREATE POLICY expense_categories_insert_policy ON expense_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- سياسة التحديث - السماح لجميع المستخدمين المصرح لهم بالتحديث
CREATE POLICY expense_categories_update_policy ON expense_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- سياسة الحذف - السماح لجميع المستخدمين المصرح لهم بالحذف
CREATE POLICY expense_categories_delete_policy ON expense_categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- سياسات جدول المصروفات

-- سياسة القراءة - السماح لجميع المستخدمين المصرح لهم بالقراءة
CREATE POLICY expenses_select_policy ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');

-- سياسة الإضافة - السماح لجميع المستخدمين المصرح لهم بالإضافة
CREATE POLICY expenses_insert_policy ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- سياسة التحديث - السماح لجميع المستخدمين المصرح لهم بالتحديث
CREATE POLICY expenses_update_policy ON expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

-- سياسة الحذف - السماح لجميع المستخدمين المصرح لهم بالحذف
CREATE POLICY expenses_delete_policy ON expenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- سياسات جدول المصروفات المتكررة

-- سياسة القراءة - السماح لجميع المستخدمين المصرح لهم بالقراءة
CREATE POLICY recurring_expenses_select_policy ON recurring_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

-- سياسة الإضافة - السماح لجميع المستخدمين المصرح لهم بالإضافة
CREATE POLICY recurring_expenses_insert_policy ON recurring_expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- سياسة التحديث - السماح لجميع المستخدمين المصرح لهم بالتحديث
CREATE POLICY recurring_expenses_update_policy ON recurring_expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

-- سياسة الحذف - السماح لجميع المستخدمين المصرح لهم بالحذف
CREATE POLICY recurring_expenses_delete_policy ON recurring_expenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- إنشاء السياسات المتساهلة لبيئة التطوير (يمكن استخدامها مؤقتًا)
-- ملاحظة: يجب تعطيل هذه السياسات في بيئة الإنتاج

-- سياسة القراءة لجميع المستخدمين (بدون قيود)
CREATE POLICY expenses_anon_select_policy ON expenses
  FOR SELECT USING (true);

-- سياسة الإضافة لجميع المستخدمين (بدون قيود)
CREATE POLICY expenses_anon_insert_policy ON expenses
  FOR INSERT WITH CHECK (true);

-- سياسة التحديث لجميع المستخدمين (بدون قيود)
CREATE POLICY expenses_anon_update_policy ON expenses
  FOR UPDATE USING (true);

-- سياسة الحذف لجميع المستخدمين (بدون قيود)
CREATE POLICY expenses_anon_delete_policy ON expenses
  FOR DELETE USING (true);

-- تطبيق نفس السياسات على الجداول الأخرى
CREATE POLICY recurring_expenses_anon_select_policy ON recurring_expenses FOR SELECT USING (true);
CREATE POLICY recurring_expenses_anon_insert_policy ON recurring_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY recurring_expenses_anon_update_policy ON recurring_expenses FOR UPDATE USING (true);
CREATE POLICY recurring_expenses_anon_delete_policy ON recurring_expenses FOR DELETE USING (true);

CREATE POLICY expense_categories_anon_select_policy ON expense_categories FOR SELECT USING (true);
CREATE POLICY expense_categories_anon_insert_policy ON expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY expense_categories_anon_update_policy ON expense_categories FOR UPDATE USING (true);
CREATE POLICY expense_categories_anon_delete_policy ON expense_categories FOR DELETE USING (true); 