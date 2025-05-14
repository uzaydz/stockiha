-- SQL script to set up tables for global Yalidine data synchronization management

-- Function to update the updated_at column automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table for storing global Yalidine API credentials and sync status for Super Admin
CREATE TABLE IF NOT EXISTS global_yalidine_configuration (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensures only one row for this global configuration
    yalidine_api_key TEXT NULL,                      -- To be stored encrypted by the backend
    yalidine_api_token TEXT NULL,                     -- To be stored encrypted by the backend
    last_global_provinces_sync TIMESTAMPTZ NULL,     -- Timestamp of the last successful global provinces sync
    last_global_municipalities_sync TIMESTAMPTZ NULL, -- Timestamp of the last successful global municipalities sync
    last_global_centers_sync TIMESTAMPTZ NULL,        -- Timestamp of the last successful global centers sync
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically update updated_at on row modification for global_yalidine_configuration
-- Drop the trigger first if it exists to avoid errors on re-running the script
DROP TRIGGER IF EXISTS set_timestamp_on_global_yalidine_config ON global_yalidine_configuration;
CREATE TRIGGER set_timestamp_on_global_yalidine_config
BEFORE UPDATE ON global_yalidine_configuration
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Ensure the single configuration row exists. If it does, do nothing.
INSERT INTO global_yalidine_configuration (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE global_yalidine_configuration IS 'Stores global Yalidine API credentials (for Super Admin use) and timestamps of the last global data syncs.';
COMMENT ON COLUMN global_yalidine_configuration.yalidine_api_key IS 'Encrypted Yalidine API Key for global data fetching.';
COMMENT ON COLUMN global_yalidine_configuration.yalidine_api_token IS 'Encrypted Yalidine API Token for global data fetching.';

-- NOTE: The following tables are expected to already exist in the database
-- for storing the actual synchronized Yalidine global data.
-- - yalidine_provinces_global
-- - yalidine_municipalities_global
-- - yalidine_centers_global
-- If these tables do not exist, they need to be created with appropriate schemas
-- reflecting the data structure from the Yalidine API.
-- Ensure they also have `created_at` and `updated_at` columns with a trigger like `trigger_set_timestamp` if modifications are tracked.

SELECT 'Global Yalidine sync configuration table setup script executed successfully.' AS status;
