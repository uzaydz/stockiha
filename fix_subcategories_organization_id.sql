-- Fix missing organization_id in product_subcategories table
-- This script updates subcategories to inherit organization_id from their parent categories

-- First, update subcategories that have NULL organization_id
-- by setting it to match their parent category's organization_id
UPDATE product_subcategories 
SET organization_id = (
    SELECT pc.organization_id 
    FROM product_categories pc 
    WHERE pc.id = product_subcategories.category_id
)
WHERE organization_id IS NULL 
  AND category_id IS NOT NULL;

-- Add a comment to track the fix
COMMENT ON COLUMN product_subcategories.organization_id IS 'Organization ID - updated to match parent category organization';

-- Verify the fix by checking counts
SELECT 
    COUNT(*) as total_subcategories,
    COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as missing_org_id,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as has_org_id
FROM product_subcategories; 