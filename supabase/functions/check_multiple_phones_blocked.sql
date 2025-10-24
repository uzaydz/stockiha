-- دالة للتحقق من عدة أرقام هاتف في طلب واحد
-- تقلل عدد الطلبات من N إلى 1
CREATE OR REPLACE FUNCTION check_multiple_phones_blocked(
  p_org_id UUID,
  p_phones TEXT[]
)
RETURNS TABLE(phone TEXT, is_blocked BOOLEAN, reason TEXT, blocked_id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_norm TEXT;
BEGIN
  -- التحقق من كل رقم هاتف في المصفوفة
  FOREACH v_phone IN ARRAY p_phones
  LOOP
    v_norm := normalize_phone(v_phone);
    
    IF v_norm IS NULL THEN
      RETURN QUERY SELECT v_phone, false, NULL::TEXT, NULL::UUID, NULL::TEXT;
    ELSE
      RETURN QUERY
      SELECT 
        v_phone,
        TRUE,
        bc.reason,
        bc.id,
        bc.name
      FROM blocked_customers bc
      WHERE bc.organization_id = p_org_id
        AND bc.phone_normalized = v_norm
      LIMIT 1;
      
      -- إذا لم نجد نتيجة، نرجع false
      IF NOT FOUND THEN
        RETURN QUERY SELECT v_phone, false, NULL::TEXT, NULL::UUID, NULL::TEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;
