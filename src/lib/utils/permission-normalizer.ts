/**
 * Permission Normalizer - توحيد أسماء الصلاحيات
 * 
 * هذا الملف يحل مشكلة عدم تناسق أسماء الصلاحيات بين:
 * - StaffPermissions (canViewProducts, canManageProducts...)
 * - PermissionsContext (viewProducts, manageProducts...)
 * - Sidebar items (viewProducts, manageProducts...)
 */

/**
 * خريطة الأسماء البديلة للصلاحيات
 * كل صلاحية لها قائمة بالأسماء المكافئة
 */
export const PERMISSION_ALIASES: Record<string, string[]> = {
  // === نقطة البيع ===
  'accessPOS': [
    'accessPOS', 
    'canAccessPOS', 
    'canAccessPosDashboard', 
    'canAccessPosAdvanced',
    'access_pos',
    'can_access_pos',
    'posAccess',
    'pos_access',
  ],
  
  // === المنتجات ===
  'viewProducts': ['viewProducts', 'canViewProducts', 'canAccessProductOperations'],
  'manageProducts': ['manageProducts', 'canManageProducts', 'addProducts', 'editProducts', 'deleteProducts'],
  'addProducts': ['addProducts', 'canManageProducts', 'manageProducts'],
  'editProducts': ['editProducts', 'canManageProducts', 'manageProducts'],
  'deleteProducts': ['deleteProducts', 'canManageProducts', 'manageProducts'],
  
  // === الفئات ===
  'viewCategories': ['viewCategories', 'canViewCategories'],
  'manageCategories': ['manageCategories', 'canManageCategories', 'manageProductCategories'],
  'manageProductCategories': ['manageProductCategories', 'manageCategories', 'canManageCategories'],
  
  // === المخزون ===
  'viewInventory': ['viewInventory', 'canViewInventory', 'has_inventory_access'],
  'manageInventory': ['manageInventory', 'canManageInventory'],
  
  // === الطلبات ===
  'viewOrders': ['viewOrders', 'canViewOnlineOrders', 'canViewPosOrders'],
  'manageOrders': ['manageOrders', 'canManageOnlineOrders', 'canManagePosOrders'],
  'viewPOSOrders': ['viewPOSOrders', 'canViewPosOrders', 'accessPOS'],
  'managePOSOrders': ['managePOSOrders', 'canManagePosOrders', 'accessPOS'],
  
  // === العملاء ===
  'viewCustomers': ['viewCustomers', 'canViewCustomers'],
  'manageCustomers': ['manageCustomers', 'canManageCustomers'],
  
  // === الديون ===
  'viewDebts': ['viewDebts', 'canViewDebts', 'recordDebtPayments'],
  'manageDebts': ['manageDebts', 'canManageDebts', 'recordDebtPayments'],
  
  // === الإرجاعات ===
  'viewReturns': ['viewReturns', 'canViewReturns'],
  'manageReturns': ['manageReturns', 'canManageReturns'],
  
  // === الخسائر ===
  'viewLosses': ['viewLosses', 'canViewLosses'],
  'manageLosses': ['manageLosses', 'canManageLosses'],
  
  // === التقارير ===
  'viewReports': ['viewReports', 'canAccessReportsOperations', 'viewFinancialReports', 'viewSalesReports'],
  'viewFinancialReports': ['viewFinancialReports', 'canViewFinancialReports', 'viewReports'],
  'viewSalesReports': ['viewSalesReports', 'canViewSalesReports', 'viewReports'],
  
  // === الموظفين ===
  'viewStaff': ['viewStaff', 'viewEmployees', 'manageStaff', 'manageEmployees'],
  'manageStaff': ['manageStaff', 'manageEmployees', 'viewStaff', 'viewEmployees'],
  'viewEmployees': ['viewEmployees', 'viewStaff', 'manageStaff', 'manageEmployees'],
  'manageEmployees': ['manageEmployees', 'manageStaff', 'viewStaff', 'viewEmployees'],
  
  // === الموردين ===
  'viewSuppliers': ['viewSuppliers', 'canViewSuppliers', 'canAccessSupplierOperations'],
  'manageSuppliers': ['manageSuppliers', 'canManageSuppliers'],
  
  // === الخدمات (التصليح) ===
  'viewRepairs': ['viewRepairs', 'canViewRepairServices', 'viewServices'],
  'manageRepairs': ['manageRepairs', 'canManageRepairServices', 'manageServices'],
  
  // === الإعدادات ===
  'viewSettings': ['viewSettings', 'canViewSettings', 'canAccessSettingsOperations'],
  'manageSettings': ['manageSettings', 'canManageSettings', 'manageOrganizationSettings'],
  
  // === الفواتير ===
  'viewInvoices': ['viewInvoices', 'canViewInvoices'],
  'manageInvoices': ['manageInvoices', 'canManageInvoices'],
  
  // === المصروفات ===
  'viewExpenses': ['viewExpenses', 'canViewExpenses'],
  'manageExpenses': ['manageExpenses', 'canManageExpenses'],
  
  // === الخدمات (التصليح والاشتراكات) ===
  'viewServices': ['viewServices', 'canAccessServicesOperations', 'viewRepairs', 'canViewRepairServices'],
  'manageServices': ['manageServices', 'manageRepairs', 'canManageRepairServices'],
  'viewSubscriptionServices': ['viewSubscriptionServices', 'canViewSubscriptionServices'],
  'manageSubscriptionServices': ['manageSubscriptionServices', 'canManageSubscriptionServices'],
  
  // === الدورات التعليمية ===
  'viewCourses': ['viewCourses', 'canAccessCoursesOperations', 'canViewAllCourses'],
  'canAccessCoursesOperations': ['canAccessCoursesOperations', 'viewCourses', 'canViewAllCourses', 'accessPOS'],
  
  // === المتجر ===
  'viewStore': ['viewStore', 'canAccessStoreOperations', 'canViewStoreSettings'],
  'manageStore': ['manageStore', 'canManageStoreSettings', 'canManageStoreEditor'],
  'viewLandingPages': ['viewLandingPages', 'canViewLandingPages'],
  'manageLandingPages': ['manageLandingPages', 'canManageLandingPages'],
  'viewDelivery': ['viewDelivery', 'canViewDelivery'],
  'manageDelivery': ['manageDelivery', 'canManageDelivery'],
  
  // === الاشتراكات ===
  'viewSubscription': ['viewSubscription', 'canViewSubscription', 'viewSettings'],
  'manageSubscription': ['manageSubscription', 'canManageSubscription', 'manageSettings'],
  
  // === النطاقات المخصصة ===
  'viewCustomDomains': ['viewCustomDomains', 'canViewCustomDomains', 'viewSettings'],
  'manageCustomDomains': ['manageCustomDomains', 'canManageCustomDomains', 'manageSettings'],
  
  // === إعدادات المؤسسة ===
  'manageOrganizationSettings': ['manageOrganizationSettings', 'manageSettings', 'canManageSettings'],
  
  // === الزكاة ===
  'viewZakat': ['viewZakat', 'canViewZakat', 'viewFinancialReports'],
  'manageZakat': ['manageZakat', 'canManageZakat'],
  
  // === المشتريات ===
  'viewPurchases': ['viewPurchases', 'canViewPurchases'],
  'managePurchases': ['managePurchases', 'canManagePurchases'],
  
  // === مدفوعات الموردين ===
  'viewSupplierPayments': ['viewSupplierPayments', 'canViewSupplierPayments'],
  'manageSupplierPayments': ['manageSupplierPayments', 'canManageSupplierPayments'],
  
  // === تقارير الموردين ===
  'viewSupplierReports': ['viewSupplierReports', 'canViewSupplierReports', 'viewReports'],
  
  // === أدوار خاصة ===
  'isSuperAdmin': ['isSuperAdmin', 'is_super_admin', 'superAdmin'],
  'isOrgAdmin': ['isOrgAdmin', 'is_org_admin', 'orgAdmin'],
};

/**
 * تحويل اسم الصلاحية من صيغة can... إلى الصيغة العادية
 * مثال: canViewProducts → viewProducts
 */
export function normalizePermissionName(permission: string): string {
  if (!permission) return '';
  
  // إذا بدأ بـ can، حوّله
  if (permission.startsWith('can')) {
    // canViewProducts → viewProducts
    // canManageProducts → manageProducts
    const withoutCan = permission.slice(3); // ViewProducts
    return withoutCan.charAt(0).toLowerCase() + withoutCan.slice(1); // viewProducts
  }
  
  return permission;
}

/**
 * تحويل اسم الصلاحية من الصيغة العادية إلى صيغة can...
 * مثال: viewProducts → canViewProducts
 */
export function toStaffPermissionName(permission: string): string {
  if (!permission) return '';
  
  // إذا بدأ بـ can، أعده كما هو
  if (permission.startsWith('can')) {
    return permission;
  }
  
  // viewProducts → canViewProducts
  return 'can' + permission.charAt(0).toUpperCase() + permission.slice(1);
}

/**
 * التحقق من صلاحية مع دعم الأسماء البديلة
 * يبحث في جميع الأسماء المكافئة للصلاحية
 */
export function checkPermissionWithAliases(
  permission: string,
  permissions: Record<string, boolean | undefined> | null | undefined
): boolean {
  if (!permissions || !permission) return false;
  
  // 1. فحص مباشر
  if (permissions[permission] === true) return true;
  
  // 2. تطبيع الاسم وفحص
  const normalized = normalizePermissionName(permission);
  if (permissions[normalized] === true) return true;
  
  // 3. تحويل لصيغة staff وفحص
  const staffFormat = toStaffPermissionName(permission);
  if (permissions[staffFormat] === true) return true;
  
  // 4. البحث في الأسماء البديلة
  const aliases = PERMISSION_ALIASES[permission] || PERMISSION_ALIASES[normalized] || [];
  for (const alias of aliases) {
    if (permissions[alias] === true) return true;
    // جرّب صيغة can أيضاً
    if (permissions[toStaffPermissionName(alias)] === true) return true;
  }
  
  return false;
}

/**
 * جلب جميع الأسماء المكافئة لصلاحية معينة
 */
export function getPermissionAliases(permission: string): string[] {
  const normalized = normalizePermissionName(permission);
  const aliases = PERMISSION_ALIASES[permission] || PERMISSION_ALIASES[normalized] || [permission];
  
  // أضف صيغ can... لكل الأسماء
  const allAliases = new Set<string>();
  for (const alias of aliases) {
    allAliases.add(alias);
    allAliases.add(toStaffPermissionName(alias));
    allAliases.add(normalizePermissionName(alias));
  }
  
  return Array.from(allAliases);
}

/**
 * التحقق من عدة صلاحيات (أي واحدة منها)
 */
export function checkAnyPermission(
  permissions: string[],
  userPermissions: Record<string, boolean | undefined> | null | undefined
): boolean {
  return permissions.some(p => checkPermissionWithAliases(p, userPermissions));
}

/**
 * التحقق من عدة صلاحيات (جميعها مطلوبة)
 */
export function checkAllPermissions(
  permissions: string[],
  userPermissions: Record<string, boolean | undefined> | null | undefined
): boolean {
  return permissions.every(p => checkPermissionWithAliases(p, userPermissions));
}

/**
 * الأدوار الإدارية التي لها صلاحيات كاملة
 */
export const ADMIN_ROLES = ['admin', 'owner', 'org_admin', 'super_admin'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

/**
 * التحقق إذا كان الدور إدارياً
 */
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as AdminRole);
}
