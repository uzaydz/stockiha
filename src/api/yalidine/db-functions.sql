-- وظائف قاعدة البيانات المساعدة لإصلاح مزامنة رسوم ياليدين

-- التحقق من وجود جدول
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- الحصول على معلومات الجدول (الأعمدة)
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    columns.column_name::TEXT,
    columns.data_type::TEXT,
    (columns.is_nullable = 'YES')::BOOLEAN
  FROM 
    information_schema.columns
  WHERE 
    table_schema = 'public' 
    AND table_name = $1
  ORDER BY 
    ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- إضافة عمود إذا لم يكن موجوداً
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_column_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- التحقق من وجود العمود
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = p_table_name
    AND column_name = p_column_name
  ) INTO v_exists;
  
  -- إضافة العمود إذا لم يكن موجوداً
  IF NOT v_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', 
      p_table_name, p_column_name, p_column_type);
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لمزامنة الأعمدة المتشابهة
CREATE OR REPLACE FUNCTION create_sync_columns_trigger(
  p_table_name TEXT,
  p_column_mapping JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_trigger_name TEXT;
  v_trigger_function_name TEXT;
  v_trigger_function TEXT;
  v_mapping_key TEXT;
  v_mapping_value TEXT;
BEGIN
  -- أسماء الـ trigger والوظيفة
  v_trigger_name := p_table_name || '_sync_columns_trigger';
  v_trigger_function_name := p_table_name || '_sync_columns_func';
  
  -- حذف الـ trigger إذا كان موجوداً
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 
    v_trigger_name, p_table_name);
  
  -- حذف وظيفة الـ trigger إذا كانت موجودة
  EXECUTE format('DROP FUNCTION IF EXISTS %I()', 
    v_trigger_function_name);
  
  -- إنشاء نص وظيفة الـ trigger
  v_trigger_function := format('
    CREATE OR REPLACE FUNCTION %I()
    RETURNS TRIGGER AS $func$
    BEGIN
  ', v_trigger_function_name);
  
  -- إضافة عبارات المزامنة لكل زوج من الأعمدة
  FOR v_mapping_key, v_mapping_value IN 
    SELECT * FROM jsonb_each_text(p_column_mapping)
  LOOP
    v_trigger_function := v_trigger_function || format('
      -- مزامنة %s مع %s
      IF (NEW.%I IS NOT NULL AND NEW.%I IS DISTINCT FROM NEW.%I) THEN
        NEW.%I := NEW.%I;
      ELSIF (NEW.%I IS NOT NULL AND NEW.%I IS DISTINCT FROM NEW.%I) THEN
        NEW.%I := NEW.%I;
      END IF;
    ', 
    v_mapping_key, v_mapping_value,
    v_mapping_key, v_mapping_key, v_mapping_value,
    v_mapping_value, v_mapping_key,
    v_mapping_value, v_mapping_value, v_mapping_key,
    v_mapping_key, v_mapping_value
    );
  END LOOP;
  
  -- إكمال نص وظيفة الـ trigger
  v_trigger_function := v_trigger_function || '
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  ';
  
  -- إنشاء وظيفة الـ trigger
  EXECUTE v_trigger_function;
  
  -- إنشاء الـ trigger
  EXECUTE format('
    CREATE TRIGGER %I
    BEFORE INSERT OR UPDATE ON %I
    FOR EACH ROW
    EXECUTE FUNCTION %I();
  ', v_trigger_name, p_table_name, v_trigger_function_name);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating trigger: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- إصلاح قيود المفتاح الفريد
CREATE OR REPLACE FUNCTION fix_yalidine_fees_constraints()
RETURNS BOOLEAN AS $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  -- التحقق من وجود قيد المفتاح الفريد
  SELECT EXISTS (
    SELECT FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'yalidine_fees'
    AND constraint_name = 'yalidine_fees_organization_from_to_commune_key'
  ) INTO v_constraint_exists;
  
  -- إذا لم يكن قيد المفتاح الفريد موجوداً، قم بإنشائه
  IF NOT v_constraint_exists THEN
    BEGIN
      -- حذف قيد المفتاح الفريد القديم إذا كان موجوداً
      EXECUTE 'ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_to_wilaya_id_key';
      
      -- إضافة قيد المفتاح الفريد الجديد
      EXECUTE 'ALTER TABLE yalidine_fees ADD CONSTRAINT yalidine_fees_organization_from_to_commune_key UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id)';
      
      RETURN TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing constraints: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- تنظيف البيانات المكررة
CREATE OR REPLACE FUNCTION cleanup_duplicate_yalidine_fees()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- حذف السجلات المكررة، والاحتفاظ بأحدث سجل لكل مجموعة فريدة
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER(PARTITION BY organization_id, from_wilaya_id, to_wilaya_id, commune_id 
                             ORDER BY last_updated_at DESC) as row_num
    FROM yalidine_fees
  )
  DELETE FROM yalidine_fees
  WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- وظيفة للتحقق من وجود وظيفة معينة في قاعدة البيانات
CREATE OR REPLACE FUNCTION check_function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_proc
    WHERE proname = $1
    AND pg_function_is_visible(oid)
  );
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتنفيذ ملف SQL محدد
CREATE OR REPLACE FUNCTION execute_sql_file(sql_file TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- هذه الوظيفة تحتاج إلى تنفيذ على جانب الخادم
  -- يتم استدعاؤها من طرف الخادم لتنفيذ ملف SQL محدد
  RAISE NOTICE 'Requested to execute SQL file: %', sql_file;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- إصلاح قيود المفاتيح الأجنبية لمنع الحذف التلقائي
CREATE OR REPLACE FUNCTION fix_yalidine_fees_foreign_keys()
RETURNS BOOLEAN AS $$
BEGIN
  -- تغيير سلوك قيود المفاتيح الأجنبية لمنع الحذف التلقائي
  BEGIN
    -- إسقاط القيود القديمة
    EXECUTE 'ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_fkey';
    EXECUTE 'ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_to_wilaya_id_fkey';
    
    -- إضافة قيود جديدة بسلوك RESTRICT
    EXECUTE 'ALTER TABLE yalidine_fees ADD CONSTRAINT yalidine_fees_from_wilaya_id_fkey
             FOREIGN KEY (from_wilaya_id)
             REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT';
    
    EXECUTE 'ALTER TABLE yalidine_fees ADD CONSTRAINT yalidine_fees_to_wilaya_id_fkey
             FOREIGN KEY (to_wilaya_id)
             REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT';
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing foreign key constraints: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لاسترجاع إحصائيات الجدول
CREATE OR REPLACE FUNCTION get_table_stats(table_name TEXT)
RETURNS TABLE (
  inserts BIGINT,
  deletes BIGINT,
  live_records BIGINT,
  table_size BIGINT
) AS $$
DECLARE
  v_inserts BIGINT;
  v_deletes BIGINT;
  v_live_records BIGINT;
  v_table_size BIGINT;
BEGIN
  -- الحصول على عدد السجلات المدرجة والمحذوفة
  EXECUTE format('
    SELECT 
      (pg_stat_get_tuples_inserted(%L::regclass))::BIGINT AS inserts,
      (pg_stat_get_tuples_deleted(%L::regclass))::BIGINT AS deletes,
      (pg_stat_get_live_tuples(%L::regclass))::BIGINT AS live_tuples,
      pg_relation_size(%L::regclass) AS table_size',
    table_name, table_name, table_name, table_name)
  INTO v_inserts, v_deletes, v_live_records, v_table_size;
  
  -- إرجاع النتائج
  RETURN QUERY
  SELECT 
    v_inserts AS inserts,
    v_deletes AS deletes,
    v_live_records AS live_records,
    v_table_size AS table_size;
END;
$$ LANGUAGE plpgsql; 