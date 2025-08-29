// إعدادات الصلاحيات الشاملة للنظام
import { EmployeePermissions } from '@/types/employee';

// تجميع الصلاحيات حسب الفئات
export const PERMISSION_GROUPS = {
  // التقارير والتحليلات
  REPORTS: {
    viewReports: 'عرض التقارير (عام - قديم)',
    viewFinancialReports: 'عرض التقارير المالية',
    viewSalesReports: 'عرض تقارير المبيعات',
    viewInventoryReports: 'عرض تقارير المخزون',
    viewCustomerReports: 'عرض تقارير العملاء',
    exportReports: 'تصدير التقارير',
  },
  
  // الإعدادات
  SETTINGS: {
    viewSettings: 'عرض الإعدادات',
    manageProfileSettings: 'إدارة إعدادات الملف الشخصي',
    manageAppearanceSettings: 'إدارة إعدادات المظهر',
    manageSecuritySettings: 'إدارة إعدادات الأمان',
    manageNotificationSettings: 'إدارة إعدادات الإشعارات',
    manageOrganizationSettings: 'إدارة إعدادات المؤسسة',
    manageBillingSettings: 'إدارة إعدادات الفوترة',
    manageIntegrations: 'إدارة التكامل مع أنظمة أخرى',
    manageAdvancedSettings: 'إدارة الإعدادات المتقدمة',
  },
  
  // الفليكسي والعملات الرقمية
  FLEXI: {
    manageFlexi: 'إدارة نظام فليكسي',
    manageFlexiAndDigitalCurrency: 'إدارة الفليكسي والعملات الرقمية',
    sellFlexiAndDigitalCurrency: 'بيع خدمات الفليكسي والعملات الرقمية',
    viewFlexiAndDigitalCurrencySales: 'رؤية تحليل مبيعات الفليكسي والعملات الرقمية',
  },
} as const;

// ربط الصفحات بالصلاحيات المطلوبة
export const PAGE_PERMISSIONS: Record<string, keyof EmployeePermissions[]> = {
  // التقارير
  '/dashboard/sales': ['viewReports', 'viewSalesReports'],
  '/dashboard/reports/financial': ['viewReports', 'viewFinancialReports'],
  '/dashboard/reports/sales': ['viewReports', 'viewSalesReports'],
  '/dashboard/reports/inventory': ['viewInventory', 'viewInventoryReports'],
  
  // الإعدادات
  '/dashboard/settings': ['viewSettings'],
  '/dashboard/settings/profile': ['manageProfileSettings'],
  '/dashboard/settings/security': ['manageSecuritySettings'],
  '/dashboard/settings/notifications': ['manageNotificationSettings'],
  '/dashboard/settings/organization': ['manageOrganizationSettings'],
  '/dashboard/settings/billing': ['manageBillingSettings'],
  '/dashboard/settings/integrations': ['manageIntegrations'],
  '/dashboard/settings/advanced': ['manageAdvancedSettings'],
  
  // الفليكسي
  '/dashboard/flexi': ['manageFlexi'],
  '/dashboard/flexi-management': ['manageFlexiAndDigitalCurrency'],
  '/dashboard/flexi-sales': ['sellFlexiAndDigitalCurrency'],
};

// الصلاحيات الافتراضية للموظفين
export const DEFAULT_EMPLOYEE_PERMISSIONS: Partial<EmployeePermissions> = {
  // صلاحيات أساسية
  accessPOS: false,
  processPayments: false,
  
  // المنتجات والمخزون
  viewProducts: true,
  viewInventory: true,
  addProducts: false,
  editProducts: false,
  deleteProducts: false,
  manageInventory: false,
  
  // الطلبات
  viewOrders: true,
  addOrders: true,
  editOrders: false,
  deleteOrders: false,
  processOrders: false,
  
  // العملاء
  viewCustomers: true,
  addCustomers: true,
  editCustomers: false,
  deleteCustomers: false,
  
  // التقارير
  viewReports: false,
  viewSalesReports: false,
  viewFinancialReports: false,
  viewInventoryReports: false,
  
  // الإعدادات
  viewSettings: true,
  manageProfileSettings: true,
  manageAppearanceSettings: true,
  manageSecuritySettings: true,
  manageNotificationSettings: true,
  manageOrganizationSettings: false,
  manageBillingSettings: false,
  manageIntegrations: false,
  manageAdvancedSettings: false,
  
  // الفليكسي
  manageFlexi: false,
  manageFlexiAndDigitalCurrency: false,
  sellFlexiAndDigitalCurrency: false,
  viewFlexiAndDigitalCurrencySales: false,
  
  // الموظفين
  manageEmployees: false,
};

// الصلاحيات الافتراضية للمديرين
export const DEFAULT_ADMIN_PERMISSIONS: Partial<EmployeePermissions> = {
  // منح جميع الصلاحيات للمديرين
  ...Object.keys(DEFAULT_EMPLOYEE_PERMISSIONS).reduce((acc, key) => {
    acc[key as keyof EmployeePermissions] = true;
    return acc;
  }, {} as Partial<EmployeePermissions>),
};

// وظائف مساعدة
export const getPermissionDisplayName = (permission: keyof EmployeePermissions): string => {
  // البحث في جميع المجموعات
  for (const group of Object.values(PERMISSION_GROUPS)) {
    if (permission in group) {
      return group[permission as keyof typeof group];
    }
  }
  
  // إرجاع الاسم الافتراضي إذا لم يتم العثور عليه
  const defaultNames: Record<string, string> = {
    accessPOS: 'الوصول لنقطة البيع',
    processPayments: 'معالجة المدفوعات',
    viewProducts: 'عرض المنتجات',
    addProducts: 'إضافة منتجات',
    editProducts: 'تعديل المنتجات',
    deleteProducts: 'حذف المنتجات',
    viewInventory: 'عرض المخزون',
    manageInventory: 'إدارة المخزون',
    viewOrders: 'عرض الطلبات',
    addOrders: 'إضافة طلبات',
    editOrders: 'تعديل الطلبات',
    deleteOrders: 'حذف الطلبات',
    processOrders: 'معالجة الطلبات',
    viewCustomers: 'عرض العملاء',
    addCustomers: 'إضافة عملاء',
    editCustomers: 'تعديل العملاء',
    deleteCustomers: 'حذف العملاء',
    manageEmployees: 'إدارة الموظفين',
  };
  
  return defaultNames[permission] || permission;
};

export const getPermissionsByGroup = () => {
  return {
    reports: PERMISSION_GROUPS.REPORTS,
    settings: PERMISSION_GROUPS.SETTINGS,
    flexi: PERMISSION_GROUPS.FLEXI,
  };
};

export const isPageAccessible = (pathname: string, userPermissions: Partial<EmployeePermissions>): boolean => {
  const requiredPermissions = PAGE_PERMISSIONS[pathname];
  
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true; // الصفحة متاحة للجميع إذا لم تكن هناك صلاحيات مطلوبة
  }
  
  // التحقق من وجود أي صلاحية من الصلاحيات المطلوبة
  return requiredPermissions.some(permission => userPermissions[permission] === true);
};
