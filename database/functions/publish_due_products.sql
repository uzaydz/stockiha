-- دالة تقوم بنشر المنتجات المجدولة التي حان وقتها
CREATE OR REPLACE FUNCTION public.publish_due_products()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.products
  SET publication_status = 'published',
      is_active = TRUE,
      published_at = COALESCE(published_at, NOW()),
      updated_at = NOW()
  WHERE publication_status = 'scheduled'
    AND publish_at IS NOT NULL
    AND publish_at <= NOW();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;


