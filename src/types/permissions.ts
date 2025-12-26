/**
 * نظام الصلاحيات الموحد - RBAC
 * Single Source of Truth للصلاحيات
 * تاريخ الإنشاء: 2025-12-10
 */

// ========================================
// الأدوار المتاحة في النظام
// ========================================
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  STAFF = 'staff',
  CALL_CENTER_AGENT = 'call_center_agent',
  CONFIRMATION_AGENT = 'confirmation_agent',
  CUSTOMER = 'customer',
  AUTHENTICATED = 'authenticated'
}

// ========================================
// الصلاحيات الموحدة
// ========================================
export enum Permission {
  // === نقطة البيع ===
  ACCESS_POS = 'accessPOS',
  PROCESS_PAYMENTS = 'processPayments',

  // === المنتجات ===
  VIEW_PRODUCTS = 'viewProducts',
  ADD_PRODUCTS = 'addProducts',
  EDIT_PRODUCTS = 'editProducts',
  DELETE_PRODUCTS = 'deleteProducts',
  MANAGE_PRODUCTS = 'manageProducts',
  MANAGE_PRODUCT_CATEGORIES = 'manageProductCategories',

  // === المخزون ===
  VIEW_INVENTORY = 'viewInventory',
  MANAGE_INVENTORY = 'manageInventory',

  // === الجرد (Stocktake) ===
  START_STOCKTAKE = 'startStocktake',
  PERFORM_STOCKTAKE = 'performStocktake',
  REVIEW_STOCKTAKE = 'reviewStocktake',
  APPROVE_STOCKTAKE = 'approveStocktake',
  DELETE_STOCKTAKE = 'deleteStocktake',

  // === الطلبات ===
  VIEW_ORDERS = 'viewOrders',
  VIEW_POS_ORDERS = 'viewPOSOrders',
  MANAGE_ORDERS = 'manageOrders',
  UPDATE_ORDER_STATUS = 'updateOrderStatus',
  CANCEL_ORDERS = 'cancelOrders',

  // === العملاء ===
  VIEW_CUSTOMERS = 'viewCustomers',
  MANAGE_CUSTOMERS = 'manageCustomers',

  // === الديون ===
  VIEW_DEBTS = 'viewDebts',
  RECORD_DEBT_PAYMENTS = 'recordDebtPayments',
  VIEW_CUSTOMER_DEBT_HISTORY = 'viewCustomerDebtHistory',

  // === الموظفين ===
  VIEW_EMPLOYEES = 'viewEmployees',
  MANAGE_EMPLOYEES = 'manageEmployees',
  MANAGE_USERS = 'manageUsers',

  // === التقارير ===
  VIEW_REPORTS = 'viewReports',
  VIEW_FINANCIAL_REPORTS = 'viewFinancialReports',
  VIEW_SALES_REPORTS = 'viewSalesReports',
  VIEW_INVENTORY_REPORTS = 'viewInventoryReports',
  VIEW_CUSTOMER_REPORTS = 'viewCustomerReports',
  EXPORT_REPORTS = 'exportReports',

  // === الإعدادات ===
  VIEW_SETTINGS = 'viewSettings',
  MANAGE_SETTINGS = 'manageSettings',
  MANAGE_PROFILE_SETTINGS = 'manageProfileSettings',
  MANAGE_APPEARANCE_SETTINGS = 'manageAppearanceSettings',
  MANAGE_SECURITY_SETTINGS = 'manageSecuritySettings',
  MANAGE_NOTIFICATION_SETTINGS = 'manageNotificationSettings',
  MANAGE_ORGANIZATION_SETTINGS = 'manageOrganizationSettings',
  MANAGE_BILLING_SETTINGS = 'manageBillingSettings',
  MANAGE_INTEGRATIONS = 'manageIntegrations',
  MANAGE_ADVANCED_SETTINGS = 'manageAdvancedSettings',

  // === الموردين والمشتريات ===
  VIEW_SUPPLIERS = 'viewSuppliers',
  MANAGE_SUPPLIERS = 'manageSuppliers',
  MANAGE_PURCHASES = 'managePurchases',

  // === الخدمات ===
  VIEW_SERVICES = 'viewServices',
  ADD_SERVICES = 'addServices',
  EDIT_SERVICES = 'editServices',
  DELETE_SERVICES = 'deleteServices',
  MANAGE_SERVICES = 'manageServices',
  TRACK_SERVICES = 'trackServices',

  // === الفليكسي والعملات الرقمية ===
  MANAGE_FLEXI = 'manageFlexi',
  MANAGE_FLEXI_AND_DIGITAL_CURRENCY = 'manageFlexiAndDigitalCurrency',
  SELL_FLEXI_AND_DIGITAL_CURRENCY = 'sellFlexiAndDigitalCurrency',
  VIEW_FLEXI_AND_DIGITAL_CURRENCY_SALES = 'viewFlexiAndDigitalCurrencySales'
}

// ========================================
// خريطة الصلاحيات الأبوية
// ========================================
export const PERMISSION_HIERARCHY: Record<string, string[]> = {
  // manageProducts تشمل جميع صلاحيات المنتجات
  manageProducts: [
    'viewProducts',
    'addProducts',
    'editProducts',
    'deleteProducts',
    'manageProductCategories'
  ],

  // manageInventory تشمل عرض المخزون
  manageInventory: [
    'viewInventory',
    // stocktake ops (defaults to allowed when inventory is managed)
    'startStocktake',
    'performStocktake',
    'reviewStocktake',
    'approveStocktake',
    'deleteStocktake',
  ],

  // manageOrders تشمل جميع صلاحيات الطلبات
  manageOrders: [
    'viewOrders',
    'viewPOSOrders',
    'updateOrderStatus',
    'cancelOrders'
  ],

  // manageCustomers تشمل صلاحيات العملاء
  manageCustomers: [
    'viewCustomers',
    'viewDebts',
    'recordDebtPayments',
    'viewCustomerDebtHistory'
  ],

  // manageEmployees تشمل عرض الموظفين
  manageEmployees: ['viewEmployees', 'manageUsers'],

  // manageSuppliers تشمل عرض الموردين
  manageSuppliers: ['viewSuppliers', 'managePurchases'],

  // manageServices تشمل جميع صلاحيات الخدمات
  manageServices: [
    'viewServices',
    'addServices',
    'editServices',
    'deleteServices',
    'trackServices'
  ],

  // viewReports تشمل التقارير الفرعية
  viewReports: [
    'viewFinancialReports',
    'viewSalesReports',
    'viewInventoryReports',
    'viewCustomerReports'
  ],

  // manageSettings تشمل جميع الإعدادات
  manageSettings: [
    'viewSettings',
    'manageProfileSettings',
    'manageAppearanceSettings',
    'manageSecuritySettings',
    'manageNotificationSettings',
    'manageOrganizationSettings',
    'manageBillingSettings',
    'manageIntegrations',
    'manageAdvancedSettings'
  ],

  // manageFlexi تشمل صلاحيات الفليكسي
  manageFlexi: [
    'manageFlexiAndDigitalCurrency',
    'sellFlexiAndDigitalCurrency',
    'viewFlexiAndDigitalCurrencySales'
  ],

  // accessPOS يسمح بعرض بعض البيانات
  accessPOS: ['viewCustomers', 'viewProducts', 'viewOrders']
};

// ========================================
// الصلاحيات الافتراضية حسب الدور
// ========================================
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ORG_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.OWNER]: Object.values(Permission),

  [UserRole.MANAGER]: [
    Permission.ACCESS_POS,
    Permission.PROCESS_PAYMENTS,
    Permission.VIEW_PRODUCTS,
    Permission.ADD_PRODUCTS,
    Permission.EDIT_PRODUCTS,
    Permission.MANAGE_PRODUCT_CATEGORIES,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_ORDERS,
    Permission.VIEW_POS_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_CUSTOMERS,
    Permission.MANAGE_CUSTOMERS,
    Permission.VIEW_DEBTS,
    Permission.RECORD_DEBT_PAYMENTS,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SALES_REPORTS,
    Permission.VIEW_INVENTORY_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_PROFILE_SETTINGS
  ],

  [UserRole.EMPLOYEE]: [
    Permission.ACCESS_POS,
    Permission.PROCESS_PAYMENTS,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_ORDERS,
    Permission.VIEW_POS_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_DEBTS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_PROFILE_SETTINGS
  ],

  [UserRole.STAFF]: [
    Permission.ACCESS_POS,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_CUSTOMERS
  ],

  [UserRole.CALL_CENTER_AGENT]: [
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_CUSTOMERS,
    Permission.MANAGE_CUSTOMERS
  ],

  [UserRole.CONFIRMATION_AGENT]: [
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_CUSTOMERS
  ],

  [UserRole.CUSTOMER]: [],
  [UserRole.AUTHENTICATED]: []
};

// ========================================
// أنواع البيانات
// ========================================
export interface UserPermissionData {
  userId: string;
  authUserId: string;
  email?: string;
  name?: string;
  organizationId: string | null;
  role: UserRole | string;
  permissions: Record<string, boolean>;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastSyncedAt?: string;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  source: 'direct' | 'parent' | 'role' | 'admin';
  checkedPermission: string;
}

// ========================================
// دوال مساعدة
// ========================================

/**
 * التحقق مما إذا كان الدور يعتبر مدير
 */
export function isAdminRole(role: string | UserRole): boolean {
  const adminRoles: string[] = [
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.ADMIN,
    UserRole.OWNER
  ];
  return adminRoles.includes(role as string);
}

/**
 * الحصول على الصلاحيات الموروثة من صلاحية أبوية
 */
export function getInheritedPermissions(permission: string): string[] {
  return PERMISSION_HIERARCHY[permission] || [];
}

/**
 * الحصول على الصلاحية الأبوية لصلاحية معينة
 */
export function getParentPermission(permission: string): string | null {
  for (const [parent, children] of Object.entries(PERMISSION_HIERARCHY)) {
    if (children.includes(permission)) {
      return parent;
    }
  }
  return null;
}

/**
 * الحصول على جميع الصلاحيات (المباشرة والموروثة) لمجموعة صلاحيات
 */
export function expandPermissions(permissions: Record<string, boolean>): Record<string, boolean> {
  const expanded: Record<string, boolean> = { ...permissions };

  for (const [perm, value] of Object.entries(permissions)) {
    if (value === true) {
      const inherited = getInheritedPermissions(perm);
      for (const child of inherited) {
        expanded[child] = true;
      }
    }
  }

  return expanded;
}

/**
 * تحويل قائمة صلاحيات إلى كائن
 */
export function permissionsArrayToObject(permissions: string[]): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  for (const perm of permissions) {
    obj[perm] = true;
  }
  return obj;
}

/**
 * الحصول على الصلاحيات الافتراضية لدور معين
 */
export function getDefaultPermissionsForRole(role: UserRole | string): Record<string, boolean> {
  const rolePerms = ROLE_PERMISSIONS[role as UserRole];
  if (rolePerms) {
    return permissionsArrayToObject(rolePerms);
  }
  return {};
}

// ========================================
// تصدير للتوافق مع الكود القديم
// ========================================
export type PermissionKey = keyof typeof Permission;
export type RoleKey = keyof typeof UserRole;

// خريطة أسماء الصلاحيات للعرض
export const PERMISSION_DISPLAY_NAMES: Record<string, string> = {
  accessPOS: 'الوصول لنقطة البيع',
  processPayments: 'معالجة المدفوعات',
  viewProducts: 'عرض المنتجات',
  addProducts: 'إضافة منتجات',
  editProducts: 'تعديل المنتجات',
  deleteProducts: 'حذف المنتجات',
  manageProducts: 'إدارة المنتجات',
  manageProductCategories: 'إدارة فئات المنتجات',
  viewInventory: 'عرض المخزون',
  manageInventory: 'إدارة المخزون',
  startStocktake: 'بدء جلسة جرد',
  performStocktake: 'تنفيذ الجرد (مسح/عد)',
  reviewStocktake: 'مراجعة الجرد (إغلاق للمراجعة)',
  approveStocktake: 'اعتماد الجرد وتعديل المخزون',
  deleteStocktake: 'حذف جلسات الجرد',
  viewOrders: 'عرض الطلبات',
  viewPOSOrders: 'عرض طلبات نقطة البيع',
  manageOrders: 'إدارة الطلبات',
  updateOrderStatus: 'تحديث حالة الطلب',
  cancelOrders: 'إلغاء الطلبات',
  viewCustomers: 'عرض العملاء',
  manageCustomers: 'إدارة العملاء',
  viewDebts: 'عرض الديون',
  recordDebtPayments: 'تسجيل دفعات الديون',
  viewEmployees: 'عرض الموظفين',
  manageEmployees: 'إدارة الموظفين',
  viewReports: 'عرض التقارير',
  viewFinancialReports: 'عرض التقارير المالية',
  viewSalesReports: 'عرض تقارير المبيعات',
  viewInventoryReports: 'عرض تقارير المخزون',
  exportReports: 'تصدير التقارير',
  viewSettings: 'عرض الإعدادات',
  manageSettings: 'إدارة الإعدادات',
  manageOrganizationSettings: 'إدارة إعدادات المؤسسة',
  viewSuppliers: 'عرض الموردين',
  manageSuppliers: 'إدارة الموردين',
  managePurchases: 'إدارة المشتريات',
  viewServices: 'عرض الخدمات',
  manageServices: 'إدارة الخدمات',
  manageFlexi: 'إدارة الفليكسي'
};

/**
 * الحصول على اسم العرض لصلاحية
 */
export function getPermissionDisplayName(permission: string): string {
  return PERMISSION_DISPLAY_NAMES[permission] || permission;
}
