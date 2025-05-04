-- Expenses Management SQL Schema

-- Main expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  is_recurring BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled'))
);

-- Recurring expenses configuration
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  last_generated TIMESTAMPTZ,
  next_due TIMESTAMPTZ NOT NULL,
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expense categories for better organization
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Insert default expense categories
INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Rent' as name, 
  'Monthly rent payments' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Salaries' as name, 
  'Employee salaries and compensation' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Utilities' as name, 
  'Electricity, water, internet, etc.' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Inventory' as name, 
  'Inventory and product purchases' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Marketing' as name, 
  'Advertising and promotional expenses' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Maintenance' as name, 
  'Equipment and building maintenance' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (organization_id, name, description, is_default) 
SELECT 
  id as organization_id, 
  'Miscellaneous' as name, 
  'Other expenses' as description,
  TRUE as is_default
FROM organizations
ON CONFLICT DO NOTHING;

-- Add RLS policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses table
CREATE POLICY expenses_org_isolation ON expenses
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create policies for recurring_expenses table
CREATE POLICY recurring_expenses_org_isolation ON recurring_expenses
  FOR ALL
  USING (expense_id IN (SELECT id FROM expenses WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())));

-- Create policies for expense_categories table
CREATE POLICY expense_categories_org_isolation ON expense_categories
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create function to generate recurring expenses
CREATE OR REPLACE FUNCTION generate_recurring_expenses()
RETURNS TRIGGER AS $$
DECLARE
  new_expense_id UUID;
  new_next_due TIMESTAMPTZ;
BEGIN
  -- Create a new expense based on the recurring expense
  INSERT INTO expenses (
    organization_id,
    title,
    amount,
    expense_date,
    description,
    category,
    payment_method,
    receipt_url,
    created_by,
    is_recurring,
    status
  )
  SELECT
    e.organization_id,
    e.title,
    e.amount,
    CURRENT_DATE,
    e.description,
    e.category,
    e.payment_method,
    e.receipt_url,
    e.created_by,
    TRUE,
    'pending'
  FROM expenses e
  WHERE e.id = NEW.expense_id
  RETURNING id INTO new_expense_id;

  -- Calculate next due date based on frequency
  CASE NEW.frequency
    WHEN 'daily' THEN
      new_next_due := NEW.next_due + INTERVAL '1 day';
    WHEN 'weekly' THEN
      new_next_due := NEW.next_due + INTERVAL '1 week';
    WHEN 'monthly' THEN
      new_next_due := NEW.next_due + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      new_next_due := NEW.next_due + INTERVAL '3 months';
    WHEN 'yearly' THEN
      new_next_due := NEW.next_due + INTERVAL '1 year';
    ELSE
      new_next_due := NEW.next_due + INTERVAL '1 month';
  END CASE;

  -- Update the recurring expense record
  UPDATE recurring_expenses
  SET 
    last_generated = NEW.next_due,
    next_due = new_next_due
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check and generate due recurring expenses
CREATE OR REPLACE FUNCTION check_recurring_expenses()
RETURNS void AS $$
BEGIN
  -- Generate new expenses for any recurring expenses that are due
  PERFORM generate_recurring_expenses()
  FROM recurring_expenses
  WHERE status = 'active' 
  AND next_due <= CURRENT_TIMESTAMP
  AND (end_date IS NULL OR end_date >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Create an index to improve performance for expense queries
CREATE INDEX IF NOT EXISTS expenses_organization_id_idx ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);
CREATE INDEX IF NOT EXISTS recurring_expenses_next_due_idx ON recurring_expenses(next_due);

-- Function to migrate employee salary payments to expenses system
CREATE OR REPLACE FUNCTION migrate_salary_to_expenses()
RETURNS void AS $$
BEGIN
  INSERT INTO expenses (
    organization_id,
    title,
    amount,
    expense_date,
    description,
    category,
    payment_method,
    created_at,
    created_by,
    is_recurring,
    status
  )
  SELECT
    es.organization_id,
    'Salary Payment - ' || u.name,
    es.amount,
    es.start_date,
    es.notes,
    'Salaries',
    'Bank Transfer',
    es.created_at,
    es.organization_id, -- Using organization_id as a fallback
    TRUE,
    'completed'
  FROM employee_salaries es
  JOIN users u ON es.employee_id = u.id
  WHERE es.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM expenses e 
    WHERE e.description LIKE '%Salary Payment%' 
    AND e.expense_date = es.start_date 
    AND e.amount = es.amount
  );

  -- Set up recurring expenses for active salary arrangements
  INSERT INTO recurring_expenses (
    expense_id,
    frequency,
    start_date,
    end_date,
    last_generated,
    next_due,
    day_of_month,
    status
  )
  SELECT
    e.id,
    'monthly',
    es.start_date,
    es.end_date,
    es.start_date,
    es.start_date + INTERVAL '1 month',
    EXTRACT(DAY FROM es.start_date),
    CASE WHEN es.status = 'active' THEN 'active' ELSE 'completed' END
  FROM employee_salaries es
  JOIN users u ON es.employee_id = u.id
  JOIN expenses e ON e.title = 'Salary Payment - ' || u.name AND e.expense_date = es.start_date
  WHERE es.type = 'monthly'
  AND NOT EXISTS (
    SELECT 1 FROM recurring_expenses re 
    JOIN expenses ex ON re.expense_id = ex.id
    WHERE ex.title = e.title
  );
END;
$$ LANGUAGE plpgsql;

-- Execute migration function
SELECT migrate_salary_to_expenses();

-- إعداد دوال حساب البيانات الإحصائية
CREATE OR REPLACE FUNCTION get_total_expenses()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (SELECT COALESCE(SUM(amount), 0) FROM expenses);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_monthly_expenses(start_date DATE)
RETURNS TABLE(month TEXT, total DECIMAL) AS $$
BEGIN
  RETURN QUERY
    SELECT 
      TO_CHAR(expense_date, 'YYYY-MM') as month,
      COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE expense_date >= start_date
    GROUP BY month
    ORDER BY month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_expenses_by_category()
RETURNS TABLE(category VARCHAR, total DECIMAL) AS $$
BEGIN
  RETURN QUERY
    SELECT 
      e.category,
      COALESCE(SUM(e.amount), 0) as total
    FROM expenses e
    GROUP BY e.category
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 