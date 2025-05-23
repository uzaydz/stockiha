-- إجراء لاستخراج أفضل الولايات من حيث عدد الطلبات وإجمالي الإيرادات
CREATE OR REPLACE FUNCTION get_top_provinces_by_orders(
  p_organization_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  province_name text,
  province_id text,
  order_count bigint,
  total_revenue numeric,
  avg_order_value numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH provinces_data AS (
    SELECT 
      CASE 
        WHEN ov.province ~ '^[0-9]+$' THEN ypg.name_ar
        ELSE ov.province
      END as province_name,
      COALESCE(ypg.id::text, ov.province) as province_id,
      COUNT(*) as order_count,
      SUM(ov.total) as total_revenue,
      AVG(ov.total) as avg_order_value
    FROM 
      online_orders_view ov
    LEFT JOIN 
      yalidine_provinces_global ypg ON (ov.province ~ '^[0-9]+$' AND ypg.id = ov.province::integer) OR 
                                      (ov.province !~ '^[0-9]+$' AND ypg.name_ar = ov.province)
    WHERE
      ov.organization_id = p_organization_id
      AND ov.province IS NOT NULL
    GROUP BY 
      CASE 
        WHEN ov.province ~ '^[0-9]+$' THEN ypg.name_ar
        ELSE ov.province
      END,
      COALESCE(ypg.id::text, ov.province)
  )
  SELECT 
    province_name,
    province_id,
    order_count,
    total_revenue,
    avg_order_value
  FROM 
    provinces_data
  WHERE
    province_name IS NOT NULL
  ORDER BY 
    order_count DESC, total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql; 