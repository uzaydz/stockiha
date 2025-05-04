-- إضافة محفزات (triggers) لضبط organization_id تلقائياً لجداول المصروفات

-- التأكد من وجود دالة set_organization_id (إذا لم تكن موجودة)
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة المحفزات لجداول المصروفات
DROP TRIGGER IF EXISTS set_expenses_organization_id ON expenses;
CREATE TRIGGER set_expenses_organization_id
BEFORE INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

DROP TRIGGER IF EXISTS set_recurring_expenses_organization_id ON recurring_expenses;
CREATE TRIGGER set_recurring_expenses_organization_id
BEFORE INSERT ON recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

DROP TRIGGER IF EXISTS set_expense_categories_organization_id ON expense_categories;
CREATE TRIGGER set_expense_categories_organization_id
BEFORE INSERT ON expense_categories
FOR EACH ROW
EXECUTE FUNCTION set_organization_id(); 