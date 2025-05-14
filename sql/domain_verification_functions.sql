-- دالة حذف سجل التحقق من النطاق المخصص

CREATE OR REPLACE FUNCTION public.delete_domain_verification(
  p_organization_id uuid,
  p_domain text
)
RETURNS void AS $$
DECLARE
BEGIN
  -- حذف سجل التحقق بناءً على معرف المؤسسة والنطاق
  DELETE FROM domain_verifications
  WHERE organization_id = p_organization_id AND domain = p_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION public.delete_domain_verification(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_domain_verification(uuid, text) TO service_role;

COMMENT ON FUNCTION public.delete_domain_verification(uuid, text) IS 'حذف سجل التحقق من النطاق المخصص لمؤسسة معينة'; 