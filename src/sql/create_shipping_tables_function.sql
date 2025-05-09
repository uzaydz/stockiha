-- Function to create create_shipping_tables function if it doesn't exist
CREATE OR REPLACE FUNCTION create_function_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_shipping_tables'
  ) THEN
    -- Create the function
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION create_shipping_tables()
      RETURNS void AS $inner$
      BEGIN
        -- Create shipping_providers table if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'shipping_providers') THEN
          CREATE TABLE shipping_providers (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,  -- Unique code like 'yalidine', 'zrexpress'
            name VARCHAR(100) NOT NULL,        -- Display name
            is_active BOOLEAN DEFAULT true,
            base_url VARCHAR(255),             -- API base URL
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Insert default providers
          INSERT INTO shipping_providers (code, name, base_url)
          VALUES 
            ('yalidine', 'ياليدين', 'https://api.yalidine.app/v1/'),
            ('zrexpress', 'ZR Express', 'https://api.zrexpress.dz/'),
            ('mayesto', 'مايستو', 'https://api.mayesto.com/'),
            ('ecotrack', 'إيكوتراك', 'https://api.ecotrack.dz/')
          ON CONFLICT (code) DO NOTHING;
        END IF;

        -- Create shipping_provider_settings table if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'shipping_provider_settings') THEN
          CREATE TABLE shipping_provider_settings (
            id SERIAL PRIMARY KEY,
            organization_id UUID NOT NULL,
            provider_id INTEGER NOT NULL REFERENCES shipping_providers(id) ON DELETE CASCADE,
            is_enabled BOOLEAN DEFAULT false,
            api_token VARCHAR(255),            -- API token/ID
            api_key VARCHAR(255),              -- API key/secret
            auto_shipping BOOLEAN DEFAULT false, -- Flag for automatic shipping creation
            track_updates BOOLEAN DEFAULT false, -- Flag for automatic tracking updates
            settings JSONB DEFAULT '{}'::jsonb,  -- Additional provider-specific settings
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(organization_id, provider_id)
          );
        END IF;

        -- Create shipping_rates table if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'shipping_rates') THEN
          CREATE TABLE shipping_rates (
            id SERIAL PRIMARY KEY,
            organization_id UUID NOT NULL,
            provider_id INTEGER NOT NULL REFERENCES shipping_providers(id) ON DELETE CASCADE,
            from_region VARCHAR(50),           -- Origin region (wilaya code for Algeria)
            to_region VARCHAR(50) NOT NULL,    -- Destination region (wilaya code for Algeria)
            price DECIMAL(10, 2) NOT NULL,     -- Price in default currency
            delivery_time_min INTEGER,         -- Minimum delivery time in hours
            delivery_time_max INTEGER,         -- Maximum delivery time in hours
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(organization_id, provider_id, from_region, to_region)
          );
        END IF;

        -- Create shipping_orders table if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'shipping_orders') THEN
          CREATE TABLE shipping_orders (
            id SERIAL PRIMARY KEY,
            organization_id UUID NOT NULL,
            provider_id INTEGER NOT NULL REFERENCES shipping_providers(id) ON DELETE CASCADE,
            order_id UUID,
            tracking_number VARCHAR(100),      -- Provider's tracking number
            external_id VARCHAR(100),          -- External ID in the provider's system
            recipient_name VARCHAR(255) NOT NULL,
            recipient_phone VARCHAR(50) NOT NULL,
            recipient_phone_alt VARCHAR(50),
            address TEXT NOT NULL,
            region VARCHAR(50) NOT NULL,       -- Region/wilaya
            city VARCHAR(100) NOT NULL,        -- City/commune
            amount DECIMAL(10, 2) NOT NULL,    -- Cash on delivery amount
            shipping_cost DECIMAL(10, 2),      -- Shipping cost
            status VARCHAR(50) DEFAULT 'pending',
            delivery_type INTEGER DEFAULT 1,   -- 1: Home delivery, 2: Pickup point
            package_type INTEGER DEFAULT 0,    -- 0: Regular, 1: Exchange
            is_confirmed BOOLEAN DEFAULT false,
            notes TEXT,
            label_url TEXT,                    -- URL or base64 of shipping label
            products_description TEXT,         -- Description of products
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        END IF;

        -- Create function to update updated_at timestamp if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'update_modified_column'
        ) THEN
          CREATE OR REPLACE FUNCTION update_modified_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE 'plpgsql';
        END IF;

        -- Create triggers for timestamp updates if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'update_shipping_provider_settings_timestamp'
        ) THEN
          CREATE TRIGGER update_shipping_provider_settings_timestamp
          BEFORE UPDATE ON shipping_provider_settings
          FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'update_shipping_rates_timestamp'
        ) THEN
          CREATE TRIGGER update_shipping_rates_timestamp
          BEFORE UPDATE ON shipping_rates
          FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'update_shipping_orders_timestamp'
        ) THEN
          CREATE TRIGGER update_shipping_orders_timestamp
          BEFORE UPDATE ON shipping_orders
          FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
        END IF;
        
        -- Add reference to organizations if it exists
        BEGIN
          -- Check if organizations table exists
          IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organizations') THEN
            -- Add foreign key constraint to shipping_provider_settings
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'shipping_provider_settings_organization_id_fkey'
            ) THEN
              ALTER TABLE shipping_provider_settings
              ADD CONSTRAINT shipping_provider_settings_organization_id_fkey
              FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
            END IF;
            
            -- Add foreign key constraint to shipping_rates
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'shipping_rates_organization_id_fkey'
            ) THEN
              ALTER TABLE shipping_rates
              ADD CONSTRAINT shipping_rates_organization_id_fkey
              FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
            END IF;
            
            -- Add foreign key constraint to shipping_orders
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'shipping_orders_organization_id_fkey'
            ) THEN
              ALTER TABLE shipping_orders
              ADD CONSTRAINT shipping_orders_organization_id_fkey
              FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
            END IF;
          END IF;
          
          -- Check if orders table exists
          IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders') THEN
            -- Add foreign key constraint to shipping_orders
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'shipping_orders_order_id_fkey'
            ) THEN
              ALTER TABLE shipping_orders
              ADD CONSTRAINT shipping_orders_order_id_fkey
              FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
            END IF;
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            -- Ignore errors when trying to add foreign keys
            RAISE NOTICE 'Could not add foreign key constraints: %', SQLERRM;
        END;
      END;
      $inner$ LANGUAGE plpgsql;
    $func$;
  END IF;
END;
$$ LANGUAGE plpgsql; 