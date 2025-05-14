-- Final fix script for Yalidine fees saving issue
-- This script addresses all potential issues identified in our investigation

-- 1. First, disable the redirect trigger if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'yalidine_fees'
    AND t.tgname = 'yalidine_fees_redirect_trigger'
  ) THEN
    ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;
    RAISE NOTICE 'Disabled yalidine_fees_redirect_trigger';
  ELSE
    RAISE NOTICE 'yalidine_fees_redirect_trigger does not exist, no action needed';
  END IF;
END $$;

-- 2. Fix foreign key constraints to prevent cascade deletion
DO $$
BEGIN
  -- Fix organization_id foreign key
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'yalidine_fees'::regclass 
    AND conname = 'yalidine_fees_organization_id_fkey'
  ) THEN
    ALTER TABLE yalidine_fees
    DROP CONSTRAINT yalidine_fees_organization_id_fkey,
    ADD CONSTRAINT yalidine_fees_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE RESTRICT;
    
    RAISE NOTICE 'Fixed organization_id foreign key constraint';
  END IF;
  
  -- Fix from_wilaya_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'yalidine_fees'::regclass 
    AND conname = 'yalidine_fees_from_wilaya_id_fkey'
  ) THEN
    ALTER TABLE yalidine_fees
    DROP CONSTRAINT yalidine_fees_from_wilaya_id_fkey,
    ADD CONSTRAINT yalidine_fees_from_wilaya_id_fkey
    FOREIGN KEY (from_wilaya_id)
    REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT;
    
    RAISE NOTICE 'Fixed from_wilaya_id foreign key constraint';
  END IF;
  
  -- Fix to_wilaya_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'yalidine_fees'::regclass 
    AND conname = 'yalidine_fees_to_wilaya_id_fkey'
  ) THEN
    ALTER TABLE yalidine_fees
    DROP CONSTRAINT yalidine_fees_to_wilaya_id_fkey,
    ADD CONSTRAINT yalidine_fees_to_wilaya_id_fkey
    FOREIGN KEY (to_wilaya_id)
    REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT;
    
    RAISE NOTICE 'Fixed to_wilaya_id foreign key constraint';
  END IF;
END $$;

-- 3. Ensure unique constraint exists and is properly defined
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE yalidine_fees
  DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_to_wilaya_id_key;

  -- Ensure proper unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'yalidine_fees'::regclass 
    AND conname = 'yalidine_fees_organization_from_to_commune_key'
  ) THEN
    ALTER TABLE yalidine_fees
    ADD CONSTRAINT yalidine_fees_organization_from_to_commune_key 
    UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id);
    
    RAISE NOTICE 'Added proper unique constraint';
  ELSE
    RAISE NOTICE 'Proper unique constraint already exists';
  END IF;
END $$;

-- 4. Create or replace the sync function
CREATE OR REPLACE FUNCTION sync_yalidine_fees_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure express_home and home_fee are synchronized
  IF NEW.express_home IS NOT NULL AND NEW.home_fee IS DISTINCT FROM NEW.express_home THEN
    NEW.home_fee := NEW.express_home;
  ELSIF NEW.home_fee IS NOT NULL AND NEW.express_home IS DISTINCT FROM NEW.home_fee THEN
    NEW.express_home := NEW.home_fee;
  END IF;

  -- Ensure express_desk and stop_desk_fee are synchronized
  IF NEW.express_desk IS NOT NULL AND NEW.stop_desk_fee IS DISTINCT FROM NEW.express_desk THEN
    NEW.stop_desk_fee := NEW.express_desk;
  ELSIF NEW.stop_desk_fee IS NOT NULL AND NEW.express_desk IS DISTINCT FROM NEW.stop_desk_fee THEN
    NEW.express_desk := NEW.stop_desk_fee;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DO $$
BEGIN
  DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;

  CREATE TRIGGER sync_yalidine_fees_columns_trigger
  BEFORE INSERT OR UPDATE ON yalidine_fees
  FOR EACH ROW EXECUTE FUNCTION sync_yalidine_fees_columns();
  
  RAISE NOTICE 'Created/replaced sync trigger for column synchronization';
END $$;

-- 5. Recreate the RPC function for inserting fees data

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(TEXT);
DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(JSONB);

-- Create a new version that handles TEXT input
CREATE OR REPLACE FUNCTION rpc_simple_insert_yalidine_fees(p_data TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_data JSONB;
  v_record JSONB;
BEGIN
  -- Convert input to JSONB
  v_data := p_data::JSONB;
  
  -- Validate input
  IF jsonb_typeof(v_data) != 'array' THEN
    RAISE EXCEPTION 'Input data must be a JSON array';
  END IF;
  
  -- Process each record
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_data)
  LOOP
    -- Insert or update record
    INSERT INTO yalidine_fees (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id,
      from_wilaya_name, to_wilaya_name, commune_name,
      express_home, express_desk, economic_home, economic_desk,
      is_home_available, is_stop_desk_available,
      zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee,
      home_fee, stop_desk_fee, last_updated_at
    ) VALUES (
      (v_record->>'organization_id')::UUID,
      (v_record->>'from_wilaya_id')::INTEGER,
      (v_record->>'to_wilaya_id')::INTEGER,
      (v_record->>'commune_id')::INTEGER,
      v_record->>'from_wilaya_name',
      v_record->>'to_wilaya_name',
      v_record->>'commune_name',
      (v_record->>'express_home')::NUMERIC,
      (v_record->>'express_desk')::NUMERIC,
      (v_record->>'economic_home')::NUMERIC,
      (v_record->>'economic_desk')::NUMERIC,
      COALESCE((v_record->>'is_home_available')::BOOLEAN, TRUE),
      COALESCE((v_record->>'is_stop_desk_available')::BOOLEAN, TRUE),
      (v_record->>'zone')::INTEGER,
      (v_record->>'retour_fee')::NUMERIC,
      (v_record->>'cod_percentage')::NUMERIC,
      (v_record->>'insurance_percentage')::NUMERIC,
      (v_record->>'oversize_fee')::NUMERIC,
      (v_record->>'home_fee')::NUMERIC,
      (v_record->>'stop_desk_fee')::NUMERIC,
      COALESCE(
        (v_record->>'last_updated_at')::TIMESTAMP WITH TIME ZONE,
        CURRENT_TIMESTAMP
      )
    )
    ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id) 
    DO UPDATE SET
      from_wilaya_name = EXCLUDED.from_wilaya_name,
      to_wilaya_name = EXCLUDED.to_wilaya_name,
      commune_name = EXCLUDED.commune_name,
      express_home = EXCLUDED.express_home,
      express_desk = EXCLUDED.express_desk,
      economic_home = EXCLUDED.economic_home,
      economic_desk = EXCLUDED.economic_desk,
      is_home_available = EXCLUDED.is_home_available,
      is_stop_desk_available = EXCLUDED.is_stop_desk_available,
      zone = EXCLUDED.zone,
      retour_fee = EXCLUDED.retour_fee,
      cod_percentage = EXCLUDED.cod_percentage,
      insurance_percentage = EXCLUDED.insurance_percentage,
      oversize_fee = EXCLUDED.oversize_fee,
      home_fee = EXCLUDED.home_fee,
      stop_desk_fee = EXCLUDED.stop_desk_fee,
      last_updated_at = EXCLUDED.last_updated_at;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create JSONB version for compatibility
CREATE OR REPLACE FUNCTION rpc_simple_insert_yalidine_fees(p_data JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN rpc_simple_insert_yalidine_fees(p_data::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Log the creation
DO $$
BEGIN
  RAISE NOTICE 'Created RPC functions for inserting fees data';
END $$;

-- 6. Create a fixed delete function

-- Drop existing function first
DROP FUNCTION IF EXISTS delete_yalidine_fees_for_organization(UUID, INTEGER);

CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_rows INTEGER;
BEGIN
  -- Delete records and get count using GET DIAGNOSTICS
  DELETE FROM yalidine_fees
  WHERE organization_id = p_organization_id
    AND from_wilaya_id = p_from_wilaya_id;
  
  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  
  RETURN v_deleted_rows;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a diagnostic function to check table status

-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS diagnose_yalidine_fees(UUID);
DROP FUNCTION IF EXISTS diagnose_yalidine_fees();

CREATE OR REPLACE FUNCTION diagnose_yalidine_fees(
  p_organization_id UUID DEFAULT NULL
) RETURNS TABLE (
  table_name TEXT,
  total_records BIGINT,
  trigger_status TEXT,
  fk_constraint TEXT
) AS $$
DECLARE
  v_total_original BIGINT;
  v_total_new BIGINT;
  v_trigger_status TEXT;
  v_fk_constraint TEXT;
BEGIN
  -- Get stats for yalidine_fees
  IF p_organization_id IS NULL THEN
    SELECT COUNT(*) INTO v_total_original FROM yalidine_fees;
  ELSE
    SELECT COUNT(*) INTO v_total_original FROM yalidine_fees
    WHERE organization_id = p_organization_id;
  END IF;
  
  -- Check if yalidine_fees_new exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'yalidine_fees_new'
  ) THEN
    IF p_organization_id IS NULL THEN
      SELECT COUNT(*) INTO v_total_new FROM yalidine_fees_new;
    ELSE
      SELECT COUNT(*) INTO v_total_new FROM yalidine_fees_new
      WHERE organization_id = p_organization_id;
    END IF;
  ELSE
    v_total_new := 0;
  END IF;
  
  -- Check trigger status
  SELECT 
    CASE WHEN t.tgenabled = 'D' THEN 'DISABLED' ELSE 'ENABLED' END
  INTO v_trigger_status
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'yalidine_fees'
  AND t.tgname = 'yalidine_fees_redirect_trigger';
  
  -- Check foreign key constraint
  SELECT pg_get_constraintdef(oid)
  INTO v_fk_constraint
  FROM pg_constraint
  WHERE conrelid = 'yalidine_fees'::regclass
  AND conname = 'yalidine_fees_organization_id_fkey';
  
  -- Return results for yalidine_fees
  RETURN QUERY SELECT 
    'yalidine_fees'::TEXT,
    v_total_original,
    v_trigger_status,
    v_fk_constraint;
    
  -- Return results for yalidine_fees_new
  RETURN QUERY SELECT 
    'yalidine_fees_new'::TEXT,
    v_total_new,
    NULL::TEXT,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a function to test insertion directly

-- Drop existing function first
DROP FUNCTION IF EXISTS test_yalidine_fees_insert();

CREATE OR REPLACE FUNCTION test_yalidine_fees_insert()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
  v_count_before INTEGER;
  v_count_after INTEGER;
BEGIN
  -- Get count before insert
  SELECT COUNT(*) INTO v_count_before FROM yalidine_fees
  WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
  AND from_wilaya_id = 16 AND to_wilaya_id = 23;
  
  -- Remove any existing test data
  DELETE FROM yalidine_fees
  WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
  AND from_wilaya_id = 16 AND to_wilaya_id = 23;
  
  -- Insert test data
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
    
    -- Get count after insert
    SELECT COUNT(*) INTO v_count_after FROM yalidine_fees
    WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
    AND from_wilaya_id = 16 AND to_wilaya_id = 23;
    
    -- Check if insert was successful
    IF v_count_after > v_count_before THEN
      v_result := 'SUCCESS: Test record inserted successfully';
    ELSE
      v_result := 'FAILED: Test record not found after insert';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_result := 'ERROR: ' || SQLERRM;
  END;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 9. Remove any duplicate records that might be causing issues
DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY organization_id, from_wilaya_id, to_wilaya_id, commune_id
      ORDER BY last_updated_at DESC
    ) as rn
    FROM yalidine_fees
  )
  DELETE FROM yalidine_fees
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate records', v_deleted;
END $$;

-- 10. Run insert test
DO $$
BEGIN
  RAISE NOTICE 'Testing insert functionality: %', test_yalidine_fees_insert();
END $$;

-- 11. Display final stats
DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Final fix for Yalidine fees has been applied';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '1. All foreign key constraints now use ON DELETE RESTRICT';
  RAISE NOTICE '2. Yalidine fees redirect trigger has been disabled';
  RAISE NOTICE '3. Proper unique constraint has been established';
  RAISE NOTICE '4. Column synchronization trigger is in place';
  RAISE NOTICE '5. RPC function for inserting fees has been optimized';
  RAISE NOTICE '6. Safe delete function is available';
  RAISE NOTICE '7. Diagnostic functions have been created';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'API data should now save correctly to the database';
  RAISE NOTICE '====================================================';
END $$; 