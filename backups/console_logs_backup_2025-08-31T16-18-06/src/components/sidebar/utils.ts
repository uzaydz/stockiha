// خريطة لتصحيح أسماء الصلاحيات - محدثة ومحسنة
export const permissionMapping: Record<string, string[]> = {
  // الصلاحيات الأساسية
  'viewServices': ['viewServices', 'manageServices'],
  'viewProducts': ['viewProducts', 'manageProducts', 'editProducts'],
  'viewOrders': ['viewOrders', 'manageOrders'],
  'viewSalesReports': ['viewSalesReports', 'viewReports'],
  'viewFinancialReports': ['viewFinancialReports', 'viewReports'],
  'viewCustomers': ['viewCustomers', 'manageCustomers'],
  'viewDebts': ['viewDebts', 'manageCustomers', 'viewCustomers'],
  'viewEmployees': ['viewEmployees', 'manageEmployees'],
  'manageOrganizationSettings': ['manageOrganizationSettings', 'manageSettings'],
  'viewSettings': ['viewSettings', 'manageSettings'],
  'viewInventory': ['viewInventory', 'manageInventory'],
  'accessPOS': ['accessPOS'],
  
  // صلاحيات الخدمات
  'trackServices': ['trackServices', 'manageServices'],
  'addServices': ['addServices', 'manageServices'],
  'editServices': ['editServices', 'manageServices'],
  'deleteServices': ['deleteServices', 'manageServices'],
  
  // صلاحيات المنتجات
  'addProducts': ['addProducts', 'manageProducts'],
  'editProducts': ['editProducts', 'manageProducts'],
  'deleteProducts': ['deleteProducts', 'manageProducts'],
  'manageProductCategories': ['manageProductCategories', 'manageProducts', 'editProducts'],
  
  // صلاحيات الطلبات
  'updateOrderStatus': ['updateOrderStatus', 'manageOrders'],
  'cancelOrders': ['cancelOrders', 'manageOrders'],
  
  // صلاحيات الموردين
  'viewSuppliers': ['viewSuppliers', 'manageSuppliers'],
  'managePurchases': ['managePurchases', 'manageSuppliers'],
  
  // صلاحيات التقارير
  'viewReports': ['viewReports'],
  
  // صلاحيات فليكسي والعملات الرقمية
  'manageFlexiAndDigitalCurrency': ['manageFlexi', 'manageFlexiAndDigitalCurrency'],
  'sellFlexiAndDigitalCurrency': ['manageFlexi', 'processPayments', 'sellFlexiAndDigitalCurrency'],
  'viewFlexiAndDigitalCurrencySales': ['manageFlexi', 'viewReports', 'viewFlexiAndDigitalCurrencySales'],
  
  // صلاحيات العملاء
  'manageCustomers': ['manageCustomers'],
  'recordDebtPayments': ['recordDebtPayments'],
  'viewCustomerDebtHistory': ['viewCustomerDebtHistory'],
  
  // صلاحيات الإعدادات
  'manageNotificationSettings': ['manageNotificationSettings', 'viewSettings', 'manageSettings'],
  'manageSettings': ['manageSettings', 'viewSettings'],
  'manageDatabase': ['manageDatabase', 'manageSettings'],
  'manageProfileSettings': ['manageProfileSettings'],
  'manageSecuritySettings': ['manageSecuritySettings'],
  'manageAppearanceSettings': ['manageAppearanceSettings'],
  'manageAdvancedSettings': ['manageAdvancedSettings'],
  'manageBillingSettings': ['manageBillingSettings'],
  'manageIntegrations': ['manageIntegrations'],
  
  // صلاحيات مركز الاتصال
  'manageCallCenter': ['manageCallCenter', 'manageOrganizationSettings'],
  'viewCallCenterReports': ['viewCallCenterReports', 'viewReports', 'manageOrganizationSettings'],
  'manageCallCenterAgents': ['manageCallCenterAgents', 'manageOrganizationSettings'],
  'viewCallCenterMonitoring': ['viewCallCenterMonitoring', 'manageOrganizationSettings'],
  
  // صلاحيات إضافية
  'manageGameDownloads': ['manageGameDownloads'],
  'viewFlexiCrypto': ['viewFlexiCrypto', 'manageFlexi'],
  'manageFlexiBalance': ['manageFlexiBalance', 'manageFlexi'],
  'sellFlexiCrypto': ['sellFlexiCrypto', 'sellFlexiAndDigitalCurrency'],
  'viewFlexiAnalytics': ['viewFlexiAnalytics', 'viewFlexiAndDigitalCurrencySales']
};

// دالة للتحقق من صلاحية باستخدام خريطة التصحيح - محسنة
export const checkPermission = (
  permissionName: string | null,
  permissions: any
): boolean => {
  if (!permissionName) return true; // لا تتطلب صلاحية
  
  // إذا كان المستخدم لديه الصلاحية مباشرة
  if (permissions[permissionName] === true) {
    return true;
  }
  
  // البحث عن صلاحيات بديلة في خريطة التصحيح
  const mappedPermissions = permissionMapping[permissionName] || [permissionName];
  
  // التحقق من أي من الصلاحيات البديلة
  const hasPermission = mappedPermissions.some(mappedPerm => {
    const permValue = permissions[mappedPerm];
    return permValue === true || permValue === 'true';
  });
  
  return hasPermission;
};

// دالة جديدة للتحقق من عدة صلاحيات
export const checkMultiplePermissions = (
  permissionNames: (string | null)[],
  permissions: any,
  requireAll: boolean = false
): boolean => {
  if (!permissionNames.length) return true;
  
  const results = permissionNames.map(perm => checkPermission(perm, permissions));
  
  if (requireAll) {
    return results.every(result => result === true);
  } else {
    return results.some(result => result === true);
  }
};

// دالة للتحقق من صلاحيات المستخدم مع طباعة معلومات تشخيصية
export const debugPermissions = (
  permissionName: string | null,
  permissions: any,
  userRole?: string
): { hasPermission: boolean; debugInfo: any } => {
  if (!permissionName) {
    return { hasPermission: true, debugInfo: { reason: 'No permission required' } };
  }
  
  const debugInfo = {
    permissionName,
    userRole,
    permissions,
    directCheck: permissions[permissionName],
    mappedPermissions: permissionMapping[permissionName] || [permissionName],
    mappedResults: (permissionMapping[permissionName] || [permissionName]).map(perm => ({
      permission: perm,
      value: permissions[perm]
    }))
  };
  
  const hasPermission = checkPermission(permissionName, permissions);
  
  return { hasPermission, debugInfo };
};
