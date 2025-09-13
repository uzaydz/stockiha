-- إنشاء نظام العملاء المحظورين

-- دالة توحيد أرقام الهاتف
CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(COALESCE(p_phone, ''), '[^0-9]+', '', 'g') AS d
  ),
  removed_00 AS (
    SELECT CASE WHEN d LIKE '00%' THEN substring(d FROM 3) ELSE d END AS d2 FROM cleaned
  )
  SELECT CASE 
           WHEN d2 = '' THEN NULL
           WHEN d2 LIKE '0%' THEN '213' || substring(d2 FROM 2)
           ELSE d2
         END
  FROM removed_00;
$$;

-- جدول العملاء المحظورين
CREATE TABLE IF NOT EXISTS blocked_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  phone_raw TEXT,
  phone_normalized TEXT NOT NULL,
  name TEXT,
  reason TEXT,
  source TEXT DEFAULT 'manual',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- قيود وفهارس
CREATE UNIQUE INDEX IF NOT EXISTS uniq_blocked_customers_org_phone
  ON blocked_customers(organization_id, phone_normalized);

CREATE INDEX IF NOT EXISTS idx_blocked_customers_org
  ON blocked_customers(organization_id);

-- Trigger لتعبئة phone_normalized وتحديث updated_at
CREATE OR REPLACE FUNCTION blocked_customers_biud()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone_normalized IS NULL OR NEW.phone_normalized = '' THEN
    NEW.phone_normalized := normalize_phone(COALESCE(NEW.phone_raw, ''));
  ELSE
    NEW.phone_normalized := normalize_phone(NEW.phone_normalized);
  END IF;
  IF NEW.phone_raw IS NULL OR NEW.phone_raw = '' THEN
    NEW.phone_raw := COALESCE(NEW.phone_normalized, NEW.phone_raw);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blocked_customers_biud ON blocked_customers;
CREATE TRIGGER trg_blocked_customers_biud
BEFORE INSERT OR UPDATE ON blocked_customers
FOR EACH ROW EXECUTE FUNCTION blocked_customers_biud();

-- تفعيل RLS وسياسات الوصول حسب المؤسسة
ALTER TABLE blocked_customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blocked_customers' AND policyname = 'blocked_select'
  ) THEN
    CREATE POLICY blocked_select ON blocked_customers
      FOR SELECT USING (
        organization_id::text = auth.jwt()->>'org_id' OR auth.jwt()->>'is_super_admin' = 'true'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blocked_customers' AND policyname = 'blocked_insert'
  ) THEN
    CREATE POLICY blocked_insert ON blocked_customers
      FOR INSERT WITH CHECK (
        organization_id::text = auth.jwt()->>'org_id' OR auth.jwt()->>'is_super_admin' = 'true'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blocked_customers' AND policyname = 'blocked_update'
  ) THEN
    CREATE POLICY blocked_update ON blocked_customers
      FOR UPDATE USING (
        organization_id::text = auth.jwt()->>'org_id' OR auth.jwt()->>'is_super_admin' = 'true'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blocked_customers' AND policyname = 'blocked_delete'
  ) THEN
    CREATE POLICY blocked_delete ON blocked_customers
      FOR DELETE USING (
        organization_id::text = auth.jwt()->>'org_id' OR auth.jwt()->>'is_super_admin' = 'true'
      );
  END IF;
END $$;

