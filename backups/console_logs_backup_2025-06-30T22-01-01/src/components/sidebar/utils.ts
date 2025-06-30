// خريطة لتصحيح أسماء الصلاحيات
export const permissionMapping: Record<string, string[]> = {
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
  'trackServices': ['trackServices', 'manageServices'],
  'viewSuppliers': ['viewSuppliers', 'manageSuppliers'],
  'managePurchases': ['managePurchases', 'manageSuppliers'],
  'viewReports': ['viewReports'],
  'manageFlexiAndDigitalCurrency': ['manageFlexi'],
  'sellFlexiAndDigitalCurrency': ['manageFlexi', 'processPayments'],
  'viewFlexiAndDigitalCurrencySales': ['manageFlexi', 'viewReports'],
  'manageProductCategories': ['manageProductCategories', 'manageProducts', 'editProducts'],
  'updateOrderStatus': ['updateOrderStatus', 'manageOrders'],
  'manageNotificationSettings': ['manageNotificationSettings', 'viewSettings', 'manageSettings'],
  'manageSettings': ['manageSettings', 'viewSettings'],
  'manageDatabase': ['manageDatabase', 'manageSettings'],
  'manageCallCenter': ['manageCallCenter', 'manageOrganizationSettings'],
  'viewCallCenterReports': ['viewCallCenterReports', 'viewReports', 'manageOrganizationSettings'],
  'manageCallCenterAgents': ['manageCallCenterAgents', 'manageOrganizationSettings'],
  'viewCallCenterMonitoring': ['viewCallCenterMonitoring', 'manageOrganizationSettings']
};

// دالة للتحقق من صلاحية باستخدام خريطة التصحيح
export const checkPermission = (
  permissionName: string | null,
  permissions: any
): boolean => {
  if (!permissionName) return true; // لا تتطلب صلاحية
  
  // البحث عن صلاحيات بديلة في خريطة التصحيح
  const mappedPermissions = permissionMapping[permissionName] || [permissionName];
  
  // التحقق من أي من الصلاحيات البديلة
  return mappedPermissions.some(mappedPerm => permissions[mappedPerm] === true);
};
