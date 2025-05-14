-- ملف الإصلاح النهائي لمشكلة yalidine_fees
-- هذا الملف يحل مشكلة حذف السجلات تلقائيًا بعد إدخالها في جدول yalidine_fees

-- 1. إعادة إنشاء جدول yalidine_fees بطريقة أكثر أمانًا
CREATE TABLE IF NOT EXISTS yalidine_fees_new (
  id SERIAL,
  organization_id UUID NOT NULL,
  from_wilaya_id INTEGER NOT NULL,
  to_wilaya_id INTEGER NOT NULL,
  commune_id INTEGER NOT NULL,
  from_wilaya_name VARCHAR,
  to_wilaya_name VARCHAR,
  commune_name VARCHAR,
  zone INTEGER,
  retour_fee INTEGER,
  cod_percentage FLOAT,
  insurance_percentage FLOAT,
  oversize_fee INTEGER,
  express_home INTEGER,
  express_desk INTEGER,
  economic_home INTEGER,
  economic_desk INTEGER,
  is_home_available BOOLEAN DEFAULT TRUE,
  is_stop_desk_available BOOLEAN DEFAULT TRUE,
  home_fee INTEGER,
  stop_desk_fee INTEGER,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id)
);

-- 2. إنشاء المفاتيح الأجنبية المناسبة بدون CASCADE
-- نضيف المفاتيح فقط إذا كانت الجداول المرجعية موجودة
DO $$
BEGIN
  -- إضافة مفتاح organization_id
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organizations') THEN
    ALTER TABLE yalidine_fees_new 
    ADD CONSTRAINT yalidine_fees_new_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
  END IF;

  -- إضافة مفتاح from_wilaya_id
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'yalidine_provinces_global') THEN
    ALTER TABLE yalidine_fees_new 
    ADD CONSTRAINT yalidine_fees_new_from_wilaya_id_fkey
    FOREIGN KEY (from_wilaya_id) REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT;
  END IF;

  -- إضافة مفتاح to_wilaya_id
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'yalidine_provinces_global') THEN
    ALTER TABLE yalidine_fees_new 
    ADD CONSTRAINT yalidine_fees_new_to_wilaya_id_fkey
    FOREIGN KEY (to_wilaya_id) REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 3. إنشاء trigger لمزامنة الحقول المتشابهة
CREATE OR REPLACE FUNCTION sync_yalidine_fees_new_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- مزامنة express_home و home_fee
  IF NEW.express_home IS NOT NULL AND NEW.home_fee IS DISTINCT FROM NEW.express_home THEN
    NEW.home_fee := NEW.express_home;
  ELSIF NEW.home_fee IS NOT NULL AND NEW.express_home IS DISTINCT FROM NEW.home_fee THEN
    NEW.express_home := NEW.home_fee;
  END IF;

  -- مزامنة express_desk و stop_desk_fee
  IF NEW.express_desk IS NOT NULL AND NEW.stop_desk_fee IS DISTINCT FROM NEW.express_desk THEN
    NEW.stop_desk_fee := NEW.express_desk;
  ELSIF NEW.stop_desk_fee IS NOT NULL AND NEW.express_desk IS DISTINCT FROM NEW.stop_desk_fee THEN
    NEW.express_desk := NEW.stop_desk_fee;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_yalidine_fees_new_columns_trigger ON yalidine_fees_new;

CREATE TRIGGER sync_yalidine_fees_new_columns_trigger
BEFORE INSERT OR UPDATE ON yalidine_fees_new
FOR EACH ROW EXECUTE FUNCTION sync_yalidine_fees_new_columns();

-- 4. نسخ البيانات الموجودة (إن وجدت) من الجدول القديم إلى الجدول الجديد
INSERT INTO yalidine_fees_new (
  organization_id, from_wilaya_id, to_wilaya_id, commune_id, 
  from_wilaya_name, to_wilaya_name, commune_name, zone, 
  retour_fee, cod_percentage, insurance_percentage, oversize_fee, 
  express_home, express_desk, economic_home, economic_desk,
  is_home_available, is_stop_desk_available, 
  home_fee, stop_desk_fee, last_updated_at
)
SELECT 
  organization_id, from_wilaya_id, to_wilaya_id, commune_id, 
  from_wilaya_name, to_wilaya_name, commune_name, zone, 
  retour_fee, cod_percentage, insurance_percentage, oversize_fee, 
  express_home, express_desk, economic_home, economic_desk,
  COALESCE(is_home_available, TRUE), COALESCE(is_stop_desk_available, TRUE), 
  home_fee, stop_desk_fee, last_updated_at
FROM yalidine_fees
ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id) 
DO NOTHING;

-- 5. إنشاء إعادة توجيه للجدول القديم
CREATE OR REPLACE FUNCTION yalidine_fees_redirect()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO yalidine_fees_new (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id, 
      from_wilaya_name, to_wilaya_name, commune_name, zone, 
      retour_fee, cod_percentage, insurance_percentage, oversize_fee, 
      express_home, express_desk, economic_home, economic_desk,
      is_home_available, is_stop_desk_available, 
      home_fee, stop_desk_fee, last_updated_at
    ) VALUES (
      NEW.organization_id, NEW.from_wilaya_id, NEW.to_wilaya_id, NEW.commune_id, 
      NEW.from_wilaya_name, NEW.to_wilaya_name, NEW.commune_name, NEW.zone, 
      NEW.retour_fee, NEW.cod_percentage, NEW.insurance_percentage, NEW.oversize_fee, 
      NEW.express_home, NEW.express_desk, NEW.economic_home, NEW.economic_desk,
      COALESCE(NEW.is_home_available, TRUE), COALESCE(NEW.is_stop_desk_available, TRUE), 
      NEW.home_fee, NEW.stop_desk_fee, COALESCE(NEW.last_updated_at, CURRENT_TIMESTAMP)
    )
    ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id) 
    DO UPDATE SET
      from_wilaya_name = EXCLUDED.from_wilaya_name,
      to_wilaya_name = EXCLUDED.to_wilaya_name,
      commune_name = EXCLUDED.commune_name,
      zone = EXCLUDED.zone,
      retour_fee = EXCLUDED.retour_fee,
      cod_percentage = EXCLUDED.cod_percentage,
      insurance_percentage = EXCLUDED.insurance_percentage,
      oversize_fee = EXCLUDED.oversize_fee,
      express_home = EXCLUDED.express_home,
      express_desk = EXCLUDED.express_desk,
      economic_home = EXCLUDED.economic_home,
      economic_desk = EXCLUDED.economic_desk,
      is_home_available = EXCLUDED.is_home_available,
      is_stop_desk_available = EXCLUDED.is_stop_desk_available,
      home_fee = EXCLUDED.home_fee,
      stop_desk_fee = EXCLUDED.stop_desk_fee,
      last_updated_at = EXCLUDED.last_updated_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE yalidine_fees_new SET
      from_wilaya_name = NEW.from_wilaya_name,
      to_wilaya_name = NEW.to_wilaya_name,
      commune_name = NEW.commune_name,
      zone = NEW.zone,
      retour_fee = NEW.retour_fee,
      cod_percentage = NEW.cod_percentage,
      insurance_percentage = NEW.insurance_percentage,
      oversize_fee = NEW.oversize_fee,
      express_home = NEW.express_home,
      express_desk = NEW.express_desk,
      economic_home = NEW.economic_home,
      economic_desk = NEW.economic_desk,
      is_home_available = COALESCE(NEW.is_home_available, TRUE),
      is_stop_desk_available = COALESCE(NEW.is_stop_desk_available, TRUE),
      home_fee = NEW.home_fee,
      stop_desk_fee = NEW.stop_desk_fee,
      last_updated_at = COALESCE(NEW.last_updated_at, CURRENT_TIMESTAMP)
    WHERE 
      organization_id = NEW.organization_id AND 
      from_wilaya_id = NEW.from_wilaya_id AND 
      to_wilaya_id = NEW.to_wilaya_id AND 
      commune_id = NEW.commune_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM yalidine_fees_new 
    WHERE 
      organization_id = OLD.organization_id AND 
      from_wilaya_id = OLD.from_wilaya_id AND 
      to_wilaya_id = OLD.to_wilaya_id AND 
      commune_id = OLD.commune_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS yalidine_fees_redirect_trigger ON yalidine_fees;

CREATE TRIGGER yalidine_fees_redirect_trigger
BEFORE INSERT OR UPDATE OR DELETE ON yalidine_fees
FOR EACH ROW EXECUTE FUNCTION yalidine_fees_redirect();

-- 6. إنشاء دالة للتحقق من البيانات والإصلاح
CREATE OR REPLACE FUNCTION check_yalidine_fees_health()
RETURNS TABLE (
  total_original_records BIGINT,
  total_new_records BIGINT,
  original_inserts BIGINT,
  original_deletes BIGINT,
  new_inserts BIGINT,
  new_deletes BIGINT,
  unique_combinations BIGINT
) AS $$
DECLARE
  v_original_inserts BIGINT;
  v_original_deletes BIGINT;
  v_new_inserts BIGINT;
  v_new_deletes BIGINT;
  v_original_count BIGINT;
  v_new_count BIGINT;
  v_unique_combos BIGINT;
BEGIN
  -- جمع الإحصائيات
  SELECT pg_stat_get_tuples_inserted('yalidine_fees'::regclass),
         pg_stat_get_tuples_deleted('yalidine_fees'::regclass)
  INTO v_original_inserts, v_original_deletes;
  
  SELECT pg_stat_get_tuples_inserted('yalidine_fees_new'::regclass),
         pg_stat_get_tuples_deleted('yalidine_fees_new'::regclass)
  INTO v_new_inserts, v_new_deletes;
  
  -- عدد السجلات في كل جدول
  EXECUTE 'SELECT COUNT(*) FROM yalidine_fees' INTO v_original_count;
  EXECUTE 'SELECT COUNT(*) FROM yalidine_fees_new' INTO v_new_count;
  
  -- عدد المجموعات الفريدة
  EXECUTE 'SELECT COUNT(*) FROM (
    SELECT DISTINCT organization_id, from_wilaya_id, to_wilaya_id, commune_id 
    FROM yalidine_fees_new
  ) AS unique_combos' INTO v_unique_combos;
  
  -- إرجاع النتائج
  RETURN QUERY
  SELECT 
    v_original_count,
    v_new_count,
    v_original_inserts,
    v_original_deletes,
    v_new_inserts,
    v_new_deletes,
    v_unique_combos;
END;
$$ LANGUAGE plpgsql;

-- 7. تبديل الجداول (أخيرًا، بعد التأكد من صحة البيانات)
-- لاستخدام هذا القسم، قم بإلغاء التعليق بعد التأكد من صحة الجدول الجديد

/*
-- إزالة المؤشرات والقيود من الجدول القديم
DROP TRIGGER IF EXISTS yalidine_fees_redirect_trigger ON yalidine_fees;
DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;
ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey;
ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_fkey;
ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_to_wilaya_id_fkey;

-- إعادة تسمية الجدول القديم
ALTER TABLE yalidine_fees RENAME TO yalidine_fees_old;

-- إعادة تسمية الجدول الجديد ليكون الجدول الرئيسي
ALTER TABLE yalidine_fees_new RENAME TO yalidine_fees;

-- إعادة إنشاء المؤشرات
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_org ON yalidine_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_route ON yalidine_fees(from_wilaya_id, to_wilaya_id, organization_id);
*/

-- 8. تعليق للمستخدم
COMMENT ON TABLE yalidine_fees_new IS 'جدول رسوم ياليدين الجديد المحسن لحل مشكلة الحذف التلقائي';
COMMENT ON FUNCTION check_yalidine_fees_health() IS 'دالة للتحقق من صحة بيانات رسوم ياليدين';
COMMENT ON FUNCTION sync_yalidine_fees_new_columns() IS 'دالة لمزامنة الأعمدة المتشابهة في جدول رسوم ياليدين';
COMMENT ON FUNCTION yalidine_fees_redirect() IS 'دالة تحويل العمليات من الجدول القديم إلى الجدول الجديد'; 