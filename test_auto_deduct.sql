-- اختبار منطق خصم المخزون التلقائي
DO $$
DECLARE
  v_org_settings JSONB;
  v_auto_deduct_inventory BOOLEAN := FALSE;
  v_organization_id UUID := '6c2ed605-0880-4e40-af50-78f80f7283bb';
BEGIN
  -- التحقق من إعدادات المؤسسة لخصم المخزون التلقائي
  SELECT custom_js INTO v_org_settings 
  FROM organization_settings 
  WHERE organization_id = v_organization_id;
  
  RAISE NOTICE 'إعدادات المؤسسة: %', v_org_settings;
  
  -- استخراج إعداد خصم المخزون التلقائي
  IF v_org_settings IS NOT NULL THEN
    v_auto_deduct_inventory := COALESCE((v_org_settings->>'auto_deduct_inventory')::BOOLEAN, FALSE);
  END IF;
  
  RAISE NOTICE 'إعداد خصم المخزون التلقائي: %', v_auto_deduct_inventory;
  
  -- اختبار المنطق
  IF v_auto_deduct_inventory = TRUE THEN
    RAISE NOTICE 'سيتم خصم المخزون تلقائياً';
  ELSE
    RAISE NOTICE 'لن يتم خصم المخزون تلقائياً';
  END IF;
END $$; 