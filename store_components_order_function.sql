-- وظيفة لتحديث ترتيب مكونات المتجر
-- هذه الوظيفة تأخذ مصفوفة من معرفات المكونات ومعرف المؤسسة وتحدث ترتيب المكونات بناءً على ترتيب المصفوفة

CREATE OR REPLACE FUNCTION public.update_store_components_order(
  p_organization_id UUID,
  p_component_ids UUID[]
) RETURNS VOID AS $$
DECLARE
  v_component_id UUID;
  v_index INTEGER;
BEGIN
  -- التحقق من صحة المعلمات
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'معرف المؤسسة مطلوب';
  END IF;
  
  IF p_component_ids IS NULL OR array_length(p_component_ids, 1) = 0 THEN
    RAISE EXCEPTION 'معرفات المكونات مطلوبة';
  END IF;
  
  -- تحديث ترتيب كل مكون حسب موقعه في المصفوفة
  FOR v_index IN 1..array_length(p_component_ids, 1) LOOP
    v_component_id := p_component_ids[v_index];
    
    -- التحقق من أن المكون ينتمي إلى نفس المؤسسة
    IF NOT EXISTS (
      SELECT 1 FROM store_settings 
      WHERE id = v_component_id AND organization_id = p_organization_id
    ) THEN
      CONTINUE; -- تخطي المكونات التي لا تنتمي للمؤسسة
    END IF;
    
    -- تحديث ترتيب المكون
    UPDATE store_settings
    SET order_index = v_index,
        updated_at = NOW()
    WHERE id = v_component_id
    AND organization_id = p_organization_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION public.update_store_components_order(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_components_order(UUID, UUID[]) TO service_role;

COMMENT ON FUNCTION public.update_store_components_order(UUID, UUID[]) IS 'تحديث ترتيب مكونات المتجر بناءً على مصفوفة معرفات'; 