-- Fix for yalidine_fees deletion issue
-- This script addresses the issue where yalidine_fees records are being inserted but automatically deleted

-- STEP 1: Remove the CASCADE DELETE behavior from foreign keys
ALTER TABLE IF EXISTS yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_fkey,
ADD CONSTRAINT yalidine_fees_from_wilaya_id_fkey
FOREIGN KEY (from_wilaya_id)
REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_to_wilaya_id_fkey,
ADD CONSTRAINT yalidine_fees_to_wilaya_id_fkey
FOREIGN KEY (to_wilaya_id)
REFERENCES yalidine_provinces_global(id) ON DELETE RESTRICT;

-- STEP 2: Ensure proper unique constraint
ALTER TABLE IF EXISTS yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_to_wilaya_id_key;

ALTER TABLE IF EXISTS yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_organization_from_to_commune_key,
ADD CONSTRAINT yalidine_fees_organization_from_to_commune_key 
UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id);

-- STEP 3: Fix column synchronization to handle API field name differences
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
DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;

CREATE TRIGGER sync_yalidine_fees_columns_trigger
BEFORE INSERT OR UPDATE ON yalidine_fees
FOR EACH ROW EXECUTE FUNCTION sync_yalidine_fees_columns();

-- STEP 4: Create a diagnostic function to get table statistics
CREATE OR REPLACE FUNCTION get_yalidine_fees_stats()
RETURNS TABLE (
  total_records BIGINT,
  unique_combinations BIGINT,
  duplicate_records BIGINT,
  inserts BIGINT,
  deletes BIGINT,
  live_records BIGINT
) AS $$
DECLARE
  v_inserts BIGINT;
  v_deletes BIGINT;
  v_live_records BIGINT;
  v_total_records BIGINT;
  v_unique_combos BIGINT;
  v_dupes BIGINT;
BEGIN
  -- Get PostgreSQL stats
  SELECT 
    pg_stat_get_tuples_inserted('yalidine_fees'::regclass),
    pg_stat_get_tuples_deleted('yalidine_fees'::regclass),
    pg_stat_get_live_tuples('yalidine_fees'::regclass)
  INTO v_inserts, v_deletes, v_live_records;
  
  -- Count total records
  EXECUTE 'SELECT COUNT(*) FROM yalidine_fees' INTO v_total_records;
  
  -- Count unique fee combinations
  EXECUTE 'SELECT COUNT(*) FROM (
    SELECT DISTINCT organization_id, from_wilaya_id, to_wilaya_id, commune_id 
    FROM yalidine_fees
  ) AS unique_combos' INTO v_unique_combos;
  
  -- Calculate duplicates (should be 0 after fix)
  v_dupes := v_total_records - v_unique_combos;
  
  RETURN QUERY
  SELECT 
    v_total_records,
    v_unique_combos,
    v_dupes,
    v_inserts,
    v_deletes,
    v_live_records;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Add missing columns if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'yalidine_fees' 
                AND column_name = 'home_fee') THEN
    ALTER TABLE yalidine_fees ADD COLUMN home_fee INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'yalidine_fees' 
                AND column_name = 'stop_desk_fee') THEN
    ALTER TABLE yalidine_fees ADD COLUMN stop_desk_fee INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'yalidine_fees' 
                AND column_name = 'is_home_available') THEN
    ALTER TABLE yalidine_fees ADD COLUMN is_home_available BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'yalidine_fees' 
                AND column_name = 'is_stop_desk_available') THEN
    ALTER TABLE yalidine_fees ADD COLUMN is_stop_desk_available BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- STEP 6: Initialize the empty columns with corresponding values
UPDATE yalidine_fees 
SET home_fee = express_home
WHERE home_fee IS NULL AND express_home IS NOT NULL;

UPDATE yalidine_fees 
SET stop_desk_fee = express_desk
WHERE stop_desk_fee IS NULL AND express_desk IS NOT NULL;

-- Add a comment documenting the fix
COMMENT ON TABLE yalidine_fees IS 'Stores Yalidine shipping fees information. Fixed to prevent automatic deletion of records.'; 