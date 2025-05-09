-- دالة مخصصة لحساب عدد المنتجات في كل فئة لمؤسسة معينة
CREATE OR REPLACE FUNCTION get_product_counts_by_category(org_id UUID)
RETURNS TABLE (
  category_id UUID,
  count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.category_id,
    COUNT(p.id)::BIGINT
  FROM 
    products p
  WHERE 
    p.organization_id = org_id
    AND p.is_active = true
    AND p.category_id IS NOT NULL
  GROUP BY 
    p.category_id;
END;
$$;

-- منح صلاحيات الوصول
GRANT EXECUTE ON FUNCTION get_product_counts_by_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_counts_by_category(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_product_counts_by_category(UUID) TO service_role; 