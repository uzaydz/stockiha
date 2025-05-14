-- Diagnostic script for Yalidine fees saving issue
-- This script will help diagnose why data might not be saving to the yalidine_fees table

-- 1. Check if the yalidine_fees table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'yalidine_fees'
  ) THEN
    RAISE NOTICE 'Table yalidine_fees exists ✓';
  ELSE
    RAISE NOTICE 'Table yalidine_fees does not exist! ✗';
  END IF;
END $$;

-- 2. Check if the yalidine_fees_new table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'yalidine_fees_new'
  ) THEN
    RAISE NOTICE 'Table yalidine_fees_new exists ✓';
  ELSE
    RAISE NOTICE 'Table yalidine_fees_new does not exist! ✗';
  END IF;
END $$;

-- 3. Check the status of yalidine_fees_redirect_trigger
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_trigger_enabled BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'yalidine_fees'
    AND t.tgname = 'yalidine_fees_redirect_trigger'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    SELECT t.tgenabled <> 'D' INTO v_trigger_enabled
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'yalidine_fees'
    AND t.tgname = 'yalidine_fees_redirect_trigger';
    
    IF v_trigger_enabled THEN
      RAISE NOTICE 'Trigger yalidine_fees_redirect_trigger exists and is ENABLED! ✗';
    ELSE
      RAISE NOTICE 'Trigger yalidine_fees_redirect_trigger exists but is DISABLED ✓';
    END IF;
  ELSE
    RAISE NOTICE 'Trigger yalidine_fees_redirect_trigger does not exist ✓';
  END IF;
END $$;

-- 4. Check for foreign key constraints that might be causing issues
DO $$
DECLARE
  constraints RECORD;
BEGIN
  RAISE NOTICE '=== Foreign Key Constraints on yalidine_fees ===';
  
  FOR constraints IN (
    SELECT conname, pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint
    WHERE conrelid = 'yalidine_fees'::regclass
    AND contype = 'f'
  ) LOOP
    RAISE NOTICE 'Constraint %: %', constraints.conname, constraints.constraint_def;
  END LOOP;
END $$;

-- 5. Check for unique constraints
DO $$
DECLARE
  constraints RECORD;
BEGIN
  RAISE NOTICE '=== Unique Constraints on yalidine_fees ===';
  
  FOR constraints IN (
    SELECT conname, pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint
    WHERE conrelid = 'yalidine_fees'::regclass
    AND contype = 'u'
  ) LOOP
    RAISE NOTICE 'Constraint %: %', constraints.conname, constraints.constraint_def;
  END LOOP;
END $$;

-- 6. Check for other triggers on the table
DO $$
DECLARE
  triggers RECORD;
BEGIN
  RAISE NOTICE '=== All Triggers on yalidine_fees ===';
  
  FOR triggers IN (
    SELECT t.tgname, pg_get_triggerdef(t.oid) as trigger_def,
           CASE WHEN t.tgenabled = 'D' THEN 'DISABLED' ELSE 'ENABLED' END as status
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'yalidine_fees'
  ) LOOP
    RAISE NOTICE 'Trigger %: % (Status: %)', triggers.tgname, triggers.trigger_def, triggers.status;
  END LOOP;
END $$;

-- 7. Check for missing columns required by the API
DO $$
DECLARE
  missing_columns TEXT := '';
  required_columns TEXT[] := ARRAY[
    'organization_id', 'from_wilaya_id', 'to_wilaya_id', 'commune_id',
    'from_wilaya_name', 'to_wilaya_name', 'express_home', 'express_desk'
  ];
  col TEXT;
BEGIN
  RAISE NOTICE '=== Required Columns Check ===';
  
  FOREACH col IN ARRAY required_columns LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'yalidine_fees'
      AND column_name = col
    ) THEN
      missing_columns := missing_columns || col || ', ';
    END IF;
  END LOOP;
  
  IF missing_columns <> '' THEN
    missing_columns := substring(missing_columns, 1, length(missing_columns) - 2);
    RAISE NOTICE 'Missing required columns: %', missing_columns;
  ELSE
    RAISE NOTICE 'All required columns exist ✓';
  END IF;
END $$;

-- 8. Check for RPC functions related to yalidine_fees
DO $$
DECLARE
  functions RECORD;
BEGIN
  RAISE NOTICE '=== RPC Functions related to yalidine_fees ===';
  
  FOR functions IN (
    SELECT proname, prosrc
    FROM pg_proc
    WHERE proname LIKE '%yalidine%fee%'
  ) LOOP
    RAISE NOTICE 'Function %', functions.proname;
  END LOOP;
END $$;

-- 9. Check statistics for both tables
DO $$
DECLARE
  stats_original RECORD;
  stats_new RECORD;
BEGIN
  -- Get yalidine_fees stats
  SELECT 
    pg_stat_get_tuples_inserted('yalidine_fees'::regclass) as inserts,
    pg_stat_get_tuples_deleted('yalidine_fees'::regclass) as deletes,
    pg_stat_get_live_tuples('yalidine_fees'::regclass) as live_tuples,
    (SELECT COUNT(*) FROM yalidine_fees) as total_count
  INTO stats_original;
  
  RAISE NOTICE '=== yalidine_fees Statistics ===';
  RAISE NOTICE 'Inserts: %, Deletes: %, Live tuples: %, Total count: %', 
    stats_original.inserts, 
    stats_original.deletes, 
    stats_original.live_tuples,
    stats_original.total_count;
  
  -- Check if new table exists before querying stats
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'yalidine_fees_new'
  ) THEN
    SELECT 
      pg_stat_get_tuples_inserted('yalidine_fees_new'::regclass) as inserts,
      pg_stat_get_tuples_deleted('yalidine_fees_new'::regclass) as deletes,
      pg_stat_get_live_tuples('yalidine_fees_new'::regclass) as live_tuples,
      (SELECT COUNT(*) FROM yalidine_fees_new) as total_count
    INTO stats_new;
    
    RAISE NOTICE '=== yalidine_fees_new Statistics ===';
    RAISE NOTICE 'Inserts: %, Deletes: %, Live tuples: %, Total count: %', 
      stats_new.inserts, 
      stats_new.deletes,
      stats_new.live_tuples,
      stats_new.total_count;
  END IF;
END $$;

-- 10. Test Insert
DO $$
BEGIN
  RAISE NOTICE '=== Testing Insert Operation ===';
  
  -- Delete test data first if exists
  DELETE FROM yalidine_fees 
  WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe' 
  AND from_wilaya_id = 16 
  AND to_wilaya_id = 23;
  
  -- Try inserting a test record
  BEGIN
    INSERT INTO yalidine_fees (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id,
      from_wilaya_name, to_wilaya_name, commune_name,
      express_home, express_desk, zone, 
      last_updated_at
    ) VALUES (
      'fed872f9-1ade-4351-b020-5598fda976fe', 16, 23, 0,
      'الجزائر', 'عنابة', 'مركز',
      1500, 1300, 2,
      CURRENT_TIMESTAMP
    );
    
    -- Check if insert was successful
    IF EXISTS (
      SELECT 1 FROM yalidine_fees 
      WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
      AND from_wilaya_id = 16 
      AND to_wilaya_id = 23
    ) THEN
      RAISE NOTICE 'Test insert successful ✓';
    ELSE
      RAISE NOTICE 'Test insert failed - data not found after insert ✗';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed with error: % ✗', SQLERRM;
  END;
END $$;

-- 11. Check the organization_id for valid UUID
DO $$
BEGIN
  RAISE NOTICE '=== Checking organization_id validity ===';
  
  IF 'fed872f9-1ade-4351-b020-5598fda976fe'::UUID IS NOT NULL THEN
    RAISE NOTICE 'Organization ID is a valid UUID ✓';
    
    -- Check if organization exists
    IF EXISTS (
      SELECT 1 FROM organizations 
      WHERE id = 'fed872f9-1ade-4351-b020-5598fda976fe'
    ) THEN
      RAISE NOTICE 'Organization exists in the database ✓';
    ELSE
      RAISE NOTICE 'Organization does not exist in the database ✗';
    END IF;
  ELSE
    RAISE NOTICE 'Organization ID is not a valid UUID ✗';
  END IF;
END $$;

-- 12. Check for duplicate records that might violate constraints
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT organization_id, from_wilaya_id, to_wilaya_id, commune_id, COUNT(*)
    FROM yalidine_fees
    GROUP BY organization_id, from_wilaya_id, to_wilaya_id, commune_id
    HAVING COUNT(*) > 1
  ) as duplicates;
  
  RAISE NOTICE '=== Checking for duplicate records ===';
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % sets of duplicate records that might violate constraints ✗', duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicate records found ✓';
  END IF;
END $$;

-- 13. Final recommendation
DO $$
BEGIN
  RAISE NOTICE '==============================';
  RAISE NOTICE 'FINAL RECOMMENDATION';
  RAISE NOTICE '==============================';
  RAISE NOTICE 'If you are having issues with data not being saved, make sure:';
  RAISE NOTICE '1. The yalidine_fees_redirect_trigger is DISABLED';
  RAISE NOTICE '2. Foreign key constraints use ON DELETE RESTRICT (not CASCADE)';
  RAISE NOTICE '3. The organization_id exists and is valid';
  RAISE NOTICE '4. There are no duplicate records violating unique constraints';
  RAISE NOTICE '5. Check for any triggers that might be deleting data';
  RAISE NOTICE '==============================';
END $$; 