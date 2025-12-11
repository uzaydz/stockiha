-- =====================================================
-- إنشاء دالة التحقق من صلاحيات المستخدم للمؤسسة
-- هذه الدالة حرجة لعمل RLS policies
-- تاريخ الإنشاء: 2025-12-10
-- =====================================================

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS public.check_user_permissions_for_org(TEXT);

-- إنشاء الدالة
CREATE OR REPLACE FUNCTION public.check_user_permissions_for_org(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  user_permissions JSONB;
  current_org_id UUID;
BEGIN
  -- الحصول على organization_id للمستخدم الحالي
  current_org_id := public.get_current_organization_id();

  -- جلب بيانات المستخدم
  SELECT
    u.is_super_admin,
    u.is_org_admin,
    u.role,
    u.permissions,
    u.organization_id,
    u.is_active
  INTO user_record
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
     OR u.id = auth.uid();

  -- إذا لم يتم العثور على المستخدم
  IF user_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- إذا كان المستخدم غير نشط
  IF user_record.is_active = FALSE THEN
    RETURN FALSE;
  END IF;

  -- Super Admin لديه جميع الصلاحيات
  IF user_record.is_super_admin = TRUE THEN
    RETURN TRUE;
  END IF;

  -- التحقق من أن المستخدم ينتمي للمؤسسة الحالية (إذا كان هناك org_id)
  IF current_org_id IS NOT NULL AND user_record.organization_id != current_org_id THEN
    RETURN FALSE;
  END IF;

  -- Org Admin لديه جميع صلاحيات المؤسسة
  IF user_record.is_org_admin = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Admin / Owner roles لديهم صلاحيات كاملة
  IF user_record.role IN ('admin', 'owner', 'org_admin') THEN
    RETURN TRUE;
  END IF;

  -- التحقق من الصلاحية المحددة في permissions JSONB
  user_permissions := user_record.permissions;

  -- إذا لم تكن هناك صلاحيات محددة
  IF user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  -- التحقق من الصلاحية المباشرة
  IF user_permissions ? permission_name AND (user_permissions->>permission_name)::boolean = TRUE THEN
    RETURN TRUE;
  END IF;

  -- التحقق من الصلاحيات الأبوية (Parent Permissions)
  -- manageProducts تشمل: viewProducts, addProducts, editProducts, deleteProducts
  IF permission_name IN ('viewProducts', 'addProducts', 'editProducts', 'deleteProducts') THEN
    IF user_permissions ? 'manageProducts' AND (user_permissions->>'manageProducts')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageInventory تشمل: viewInventory
  IF permission_name = 'viewInventory' THEN
    IF user_permissions ? 'manageInventory' AND (user_permissions->>'manageInventory')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
    -- أيضاً manageProducts تسمح بعرض المخزون
    IF user_permissions ? 'manageProducts' AND (user_permissions->>'manageProducts')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageOrders تشمل: viewOrders, updateOrderStatus, cancelOrders
  IF permission_name IN ('viewOrders', 'updateOrderStatus', 'cancelOrders', 'viewPOSOrders') THEN
    IF user_permissions ? 'manageOrders' AND (user_permissions->>'manageOrders')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageCustomers تشمل: viewCustomers
  IF permission_name = 'viewCustomers' THEN
    IF user_permissions ? 'manageCustomers' AND (user_permissions->>'manageCustomers')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
    -- accessPOS يسمح أيضاً بعرض العملاء
    IF user_permissions ? 'accessPOS' AND (user_permissions->>'accessPOS')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageEmployees تشمل: viewEmployees
  IF permission_name = 'viewEmployees' THEN
    IF user_permissions ? 'manageEmployees' AND (user_permissions->>'manageEmployees')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageSuppliers تشمل: viewSuppliers
  IF permission_name = 'viewSuppliers' THEN
    IF user_permissions ? 'manageSuppliers' AND (user_permissions->>'manageSuppliers')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- viewReports تشمل تقارير فرعية
  IF permission_name IN ('viewFinancialReports', 'viewSalesReports', 'viewInventoryReports', 'viewCustomerReports') THEN
    IF user_permissions ? 'viewReports' AND (user_permissions->>'viewReports')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageSettings تشمل إعدادات فرعية
  IF permission_name IN ('manageProfileSettings', 'manageAppearanceSettings', 'manageSecuritySettings',
                         'manageNotificationSettings', 'manageOrganizationSettings', 'manageBillingSettings',
                         'manageIntegrations', 'manageAdvancedSettings') THEN
    IF user_permissions ? 'manageSettings' AND (user_permissions->>'manageSettings')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageServices تشمل: viewServices
  IF permission_name IN ('viewServices', 'addServices', 'editServices', 'deleteServices') THEN
    IF user_permissions ? 'manageServices' AND (user_permissions->>'manageServices')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- manageFlexi تشمل صلاحيات الفليكسي
  IF permission_name IN ('sellFlexiAndDigitalCurrency', 'viewFlexiAndDigitalCurrencySales', 'manageFlexiAndDigitalCurrency') THEN
    IF user_permissions ? 'manageFlexi' AND (user_permissions->>'manageFlexi')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- viewDebts و recordDebtPayments
  IF permission_name = 'recordDebtPayments' THEN
    IF user_permissions ? 'viewDebts' AND (user_permissions->>'viewDebts')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
    IF user_permissions ? 'manageCustomers' AND (user_permissions->>'manageCustomers')::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- لم يتم العثور على الصلاحية
  RETURN FALSE;
END;
$$;

-- منح الصلاحية للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION public.check_user_permissions_for_org(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_permissions_for_org(TEXT) TO service_role;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION public.check_user_permissions_for_org(TEXT) IS
'التحقق من صلاحية معينة للمستخدم في المؤسسة الحالية.
يستخدم في RLS policies للتحقق من صلاحيات CRUD.
يدعم الصلاحيات الأبوية (مثل manageProducts تشمل viewProducts).
يعيد TRUE للـ super_admin و org_admin و admin و owner.';

-- إنشاء index لتسريع البحث عن المستخدم
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON public.users USING gin(permissions);
