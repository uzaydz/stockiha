-- Add type column to product_categories table
ALTER TABLE product_categories ADD COLUMN type VARCHAR(20) DEFAULT 'product';

-- Update existing records to have the default value
UPDATE product_categories SET type = 'product';

-- Make the column non-nullable after setting default values
ALTER TABLE product_categories ALTER COLUMN type SET NOT NULL; 