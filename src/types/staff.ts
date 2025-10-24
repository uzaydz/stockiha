/**
 * أنواع البيانات الخاصة بموظفي نقطة البيع
 */

// صلاحيات الموظف - تطابق القائمة الجانبية والتبويبات
export interface StaffPermissions {
  // صلاحية الوصول الأساسية لنقطة البيع
  accessPOS?: boolean;
  
  // الصفحات الرئيسية
  canAccessPosDashboard?: boolean;
  canAccessPosAdvanced?: boolean;
  
  // إدارة نقطة البيع (pos-operations)
  canAccessPosOperations?: boolean;
  canViewPosOrders?: boolean;
  canManagePosOrders?: boolean;
  canViewDebts?: boolean;
  canManageDebts?: boolean;
  canViewReturns?: boolean;
  canManageReturns?: boolean;
  canViewLosses?: boolean;
  canManageLosses?: boolean;
  
  // مركز المنتجات (product-operations)
  canAccessProductOperations?: boolean;
  canViewProducts?: boolean;
  canManageProducts?: boolean;
  canViewCategories?: boolean;
  canManageCategories?: boolean;
  canViewInventory?: boolean;
  canManageInventory?: boolean;
  canViewInventoryTracking?: boolean;
  
  // مركز المبيعات والطلبات (sales-operations)
  canAccessSalesOperations?: boolean;
  canViewOnlineOrders?: boolean;
  canManageOnlineOrders?: boolean;
  canViewBlockedCustomers?: boolean;
  canManageBlockedCustomers?: boolean;
  canViewAbandonedOrders?: boolean;
  canManageAbandonedOrders?: boolean;
  canViewInvoices?: boolean;
  canManageInvoices?: boolean;
  
  // مركز الخدمات (services-operations)
  canAccessServicesOperations?: boolean;
  canViewRepairServices?: boolean;
  canManageRepairServices?: boolean;
  canViewSubscriptionServices?: boolean;
  canManageSubscriptionServices?: boolean;
  
  // مركز الموردين (supplier-operations)
  canAccessSupplierOperations?: boolean;
  canViewSuppliers?: boolean;
  canManageSuppliers?: boolean;
  canViewPurchases?: boolean;
  canManagePurchases?: boolean;
  canViewSupplierPayments?: boolean;
  canManageSupplierPayments?: boolean;
  canViewSupplierReports?: boolean;
  
  // دورات ستوكيها (courses-operations)
  canAccessCoursesOperations?: boolean;
  canViewAllCourses?: boolean;
  
  // إدارة المتجر (store-operations)
  canAccessStoreOperations?: boolean;
  canViewStoreSettings?: boolean;
  canManageStoreSettings?: boolean;
  canViewStoreEditor?: boolean;
  canManageStoreEditor?: boolean;
  canViewComponents?: boolean;
  canManageComponents?: boolean;
  canViewThemes?: boolean;
  canManageThemes?: boolean;
  canViewLandingPages?: boolean;
  canManageLandingPages?: boolean;
  canViewThankYouPage?: boolean;
  canManageThankYouPage?: boolean;
  canViewDelivery?: boolean;
  canManageDelivery?: boolean;
  
  // الإعدادات (settings-operations)
  canAccessSettingsOperations?: boolean;
  canViewSettings?: boolean;
  canManageSettings?: boolean;
  canViewSubscription?: boolean;
  canManageSubscription?: boolean;
  canViewCustomDomains?: boolean;
  canManageCustomDomains?: boolean;
  canViewDomainsDocs?: boolean;
  
  // مركز التقارير (reports-operations)
  canAccessReportsOperations?: boolean;
  canViewFinancialReports?: boolean;
  canViewSalesReports?: boolean;
  canViewExpenses?: boolean;
  canManageExpenses?: boolean;
  canViewZakat?: boolean;
  canManageZakat?: boolean;
  canViewSupplierReportsInReports?: boolean;
}

// بيانات الموظف
export interface POSStaffSession {
  id: string;
  organization_id: string;
  user_id?: string; // ربط مع جدول users
  staff_name: string;
  email?: string; // الإيميل من جدول users
  permissions: StaffPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// بيانات إضافة/تعديل موظف
export interface SaveStaffSessionInput {
  id?: string;
  staff_name: string;
  email?: string; // الإيميل (مطلوب للموظفين الجدد)
  password?: string; // كلمة السر (مطلوبة للموظفين الجدد)
  pin_code?: string;
  permissions: StaffPermissions;
  is_active: boolean;
}

// استجابة API
export interface SaveStaffSessionResponse {
  success: boolean;
  action?: 'created' | 'updated';
  staff_id?: string;
  user_id?: string;
  auth_user_id?: string;
  message?: string;
  error?: string;
}

export interface UpdatePinResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DeleteStaffResponse {
  success: boolean;
  message?: string;
  auth_user_id?: string;
  note?: string;
  error?: string;
}

// استجابة تسجيل الدخول
export interface VerifyStaffLoginResponse {
  success: boolean;
  staff?: POSStaffSession;
  error?: string;
}

// بيانات إنشاء موظف مع Auth
export interface CreateStaffWithAuthInput {
  email: string;
  password: string;
  staff_name: string;
  pin_code: string;
  permissions: StaffPermissions;
  is_active: boolean;
}

// مجموعات الصلاحيات المحددة مسبقاً
export const PERMISSION_PRESETS = {
  full_access: {
    label: 'صلاحيات كاملة',
    description: 'الوصول الكامل لجميع الصفحات والميزات',
    permissions: {
      accessPOS: true,  // ✅ إضافة صلاحية الوصول لنقطة البيع
      canAccessPosDashboard: true,
      canAccessPosAdvanced: true,
      canAccessPosOperations: true,
      canViewPosOrders: true,
      canManagePosOrders: true,
      canViewDebts: true,
      canManageDebts: true,
      canViewReturns: true,
      canManageReturns: true,
      canViewLosses: true,
      canManageLosses: true,
      canAccessProductOperations: true,
      canViewProducts: true,
      canManageProducts: true,
      canViewCategories: true,
      canManageCategories: true,
      canViewInventory: true,
      canManageInventory: true,
      canViewInventoryTracking: true,
      canAccessSalesOperations: true,
      canViewOnlineOrders: true,
      canManageOnlineOrders: true,
      canViewBlockedCustomers: true,
      canManageBlockedCustomers: true,
      canViewAbandonedOrders: true,
      canManageAbandonedOrders: true,
      canViewInvoices: true,
      canManageInvoices: true,
      canAccessServicesOperations: true,
      canViewRepairServices: true,
      canManageRepairServices: true,
      canViewSubscriptionServices: true,
      canManageSubscriptionServices: true,
      canAccessSupplierOperations: true,
      canViewSuppliers: true,
      canManageSuppliers: true,
      canViewPurchases: true,
      canManagePurchases: true,
      canViewSupplierPayments: true,
      canManageSupplierPayments: true,
      canViewSupplierReports: true,
      canAccessCoursesOperations: true,
      canViewAllCourses: true,
      canAccessStoreOperations: true,
      canViewStoreSettings: true,
      canManageStoreSettings: true,
      canViewStoreEditor: true,
      canManageStoreEditor: true,
      canViewComponents: true,
      canManageComponents: true,
      canViewThemes: true,
      canManageThemes: true,
      canViewLandingPages: true,
      canManageLandingPages: true,
      canViewThankYouPage: true,
      canManageThankYouPage: true,
      canViewDelivery: true,
      canManageDelivery: true,
      canAccessSettingsOperations: true,
      canViewSettings: true,
      canManageSettings: true,
      canViewSubscription: true,
      canManageSubscription: true,
      canViewCustomDomains: true,
      canManageCustomDomains: true,
      canViewDomainsDocs: true,
      canAccessReportsOperations: true,
      canViewFinancialReports: true,
      canViewSalesReports: true,
      canViewExpenses: true,
      canManageExpenses: true,
      canViewZakat: true,
      canManageZakat: true,
      canViewSupplierReportsInReports: true,
    } as StaffPermissions,
  },
  
  cashier: {
    label: 'كاشير نقطة البيع',
    description: 'صلاحيات محدودة للبيع والطلبات فقط',
    permissions: {
      accessPOS: true,  // ✅ إضافة صلاحية الوصول لنقطة البيع
      canAccessPosDashboard: true,
      canAccessPosAdvanced: true,
      canAccessPosOperations: true,
      canViewPosOrders: true,
      canManagePosOrders: true,
      canViewDebts: true,
      canViewProducts: true,
      canViewInventory: true,
    } as StaffPermissions,
  },
  
  inventory_manager: {
    label: 'مدير المخزون',
    description: 'إدارة المنتجات والمخزون',
    permissions: {
      accessPOS: true,  // ✅ إضافة صلاحية الوصول لنقطة البيع
      canAccessPosDashboard: true,
      canAccessProductOperations: true,
      canViewProducts: true,
      canManageProducts: true,
      canViewCategories: true,
      canManageCategories: true,
      canViewInventory: true,
      canManageInventory: true,
      canViewInventoryTracking: true,
      canAccessSupplierOperations: true,
      canViewSuppliers: true,
      canViewPurchases: true,
      canManagePurchases: true,
    } as StaffPermissions,
  },
  
  read_only: {
    label: 'عرض فقط',
    description: 'عرض البيانات بدون صلاحيات التعديل',
    permissions: {
      accessPOS: true,  // ✅ إضافة صلاحية الوصول لنقطة البيع
      canAccessPosDashboard: true,
      canAccessPosOperations: true,
      canViewPosOrders: true,
      canViewDebts: true,
      canViewReturns: true,
      canViewLosses: true,
      canAccessProductOperations: true,
      canViewProducts: true,
      canViewCategories: true,
      canViewInventory: true,
      canViewInventoryTracking: true,
      canAccessSalesOperations: true,
      canViewOnlineOrders: true,
      canViewInvoices: true,
      canAccessReportsOperations: true,
      canViewFinancialReports: true,
      canViewSalesReports: true,
    } as StaffPermissions,
  },
} as const;

// تسميات الصلاحيات بالعربية
export const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
  accessPOS: 'الوصول لنقطة البيع',
  canAccessPosDashboard: 'لوحة تحكم نقطة البيع',
  canAccessPosAdvanced: 'نقطة البيع المتقدمة',
  canAccessPosOperations: 'إدارة نقطة البيع',
  canViewPosOrders: 'عرض طلبيات نقطة البيع',
  canManagePosOrders: 'إدارة طلبيات نقطة البيع',
  canViewDebts: 'عرض المديونيات',
  canManageDebts: 'إدارة المديونيات',
  canViewReturns: 'عرض الإرجاعات',
  canManageReturns: 'إدارة الإرجاعات',
  canViewLosses: 'عرض الخسائر',
  canManageLosses: 'إدارة الخسائر',
  canAccessProductOperations: 'مركز المنتجات',
  canViewProducts: 'عرض المنتجات',
  canManageProducts: 'إدارة المنتجات',
  canViewCategories: 'عرض الفئات',
  canManageCategories: 'إدارة الفئات',
  canViewInventory: 'عرض المخزون',
  canManageInventory: 'إدارة المخزون',
  canViewInventoryTracking: 'تتبع المخزون',
  canAccessSalesOperations: 'مركز المبيعات والطلبات',
  canViewOnlineOrders: 'عرض الطلبات الإلكترونية',
  canManageOnlineOrders: 'إدارة الطلبات الإلكترونية',
  canViewBlockedCustomers: 'عرض قائمة المحظورين',
  canManageBlockedCustomers: 'إدارة قائمة المحظورين',
  canViewAbandonedOrders: 'عرض الطلبات المتروكة',
  canManageAbandonedOrders: 'إدارة الطلبات المتروكة',
  canViewInvoices: 'عرض الفواتير',
  canManageInvoices: 'إدارة الفواتير',
  canAccessServicesOperations: 'مركز الخدمات',
  canViewRepairServices: 'عرض خدمات التصليح',
  canManageRepairServices: 'إدارة خدمات التصليح',
  canViewSubscriptionServices: 'عرض خدمات الاشتراكات',
  canManageSubscriptionServices: 'إدارة خدمات الاشتراكات',
  canAccessSupplierOperations: 'مركز الموردين',
  canViewSuppliers: 'عرض الموردين',
  canManageSuppliers: 'إدارة الموردين',
  canViewPurchases: 'عرض المشتريات',
  canManagePurchases: 'إدارة المشتريات',
  canViewSupplierPayments: 'عرض مدفوعات الموردين',
  canManageSupplierPayments: 'إدارة مدفوعات الموردين',
  canViewSupplierReports: 'عرض تقارير الموردين',
  canAccessCoursesOperations: 'دورات ستوكيها',
  canViewAllCourses: 'عرض جميع الدورات',
  canAccessStoreOperations: 'إدارة المتجر',
  canViewStoreSettings: 'عرض إعدادات المتجر',
  canManageStoreSettings: 'إدارة إعدادات المتجر',
  canViewStoreEditor: 'عرض محرر المتجر',
  canManageStoreEditor: 'تعديل المتجر',
  canViewComponents: 'عرض المكونات',
  canManageComponents: 'إدارة المكونات',
  canViewThemes: 'عرض القوالب',
  canManageThemes: 'إدارة القوالب',
  canViewLandingPages: 'عرض صفحات الهبوط',
  canManageLandingPages: 'إدارة صفحات الهبوط',
  canViewThankYouPage: 'عرض صفحة الشكر',
  canManageThankYouPage: 'إدارة صفحة الشكر',
  canViewDelivery: 'عرض إدارة التوصيل',
  canManageDelivery: 'إدارة التوصيل',
  canAccessSettingsOperations: 'الإعدادات',
  canViewSettings: 'عرض الإعدادات',
  canManageSettings: 'إدارة الإعدادات',
  canViewSubscription: 'عرض الاشتراكات',
  canManageSubscription: 'إدارة الاشتراكات',
  canViewCustomDomains: 'عرض النطاقات المخصصة',
  canManageCustomDomains: 'إدارة النطاقات المخصصة',
  canViewDomainsDocs: 'دليل النطاقات',
  canAccessReportsOperations: 'مركز التقارير',
  canViewFinancialReports: 'عرض التحليلات المالية',
  canViewSalesReports: 'عرض تحليلات المبيعات',
  canViewExpenses: 'عرض المصروفات',
  canManageExpenses: 'إدارة المصروفات',
  canViewZakat: 'عرض الزكاة',
  canManageZakat: 'إدارة الزكاة',
  canViewSupplierReportsInReports: 'عرض تقارير الموردين في التقارير',
};

// مجموعات الصلاحيات للعرض المنظم
export const PERMISSION_GROUPS = [
  {
    title: 'نقطة البيع',
    permissions: [
      'accessPOS',
      'canAccessPosDashboard',
      'canAccessPosAdvanced',
    ],
  },
  {
    title: 'إدارة نقطة البيع',
    permissions: [
      'canAccessPosOperations',
      'canViewPosOrders',
      'canManagePosOrders',
      'canViewDebts',
      'canManageDebts',
      'canViewReturns',
      'canManageReturns',
      'canViewLosses',
      'canManageLosses',
    ],
  },
  {
    title: 'مركز المنتجات',
    permissions: [
      'canAccessProductOperations',
      'canViewProducts',
      'canManageProducts',
      'canViewCategories',
      'canManageCategories',
      'canViewInventory',
      'canManageInventory',
      'canViewInventoryTracking',
    ],
  },
  {
    title: 'مركز المبيعات',
    permissions: [
      'canAccessSalesOperations',
      'canViewOnlineOrders',
      'canManageOnlineOrders',
      'canViewBlockedCustomers',
      'canManageBlockedCustomers',
      'canViewAbandonedOrders',
      'canManageAbandonedOrders',
      'canViewInvoices',
      'canManageInvoices',
    ],
  },
  {
    title: 'مركز الخدمات',
    permissions: [
      'canAccessServicesOperations',
      'canViewRepairServices',
      'canManageRepairServices',
      'canViewSubscriptionServices',
      'canManageSubscriptionServices',
    ],
  },
  {
    title: 'مركز الموردين',
    permissions: [
      'canAccessSupplierOperations',
      'canViewSuppliers',
      'canManageSuppliers',
      'canViewPurchases',
      'canManagePurchases',
      'canViewSupplierPayments',
      'canManageSupplierPayments',
      'canViewSupplierReports',
    ],
  },
  {
    title: 'إدارة المتجر',
    permissions: [
      'canAccessStoreOperations',
      'canViewStoreSettings',
      'canManageStoreSettings',
      'canViewStoreEditor',
      'canManageStoreEditor',
      'canViewComponents',
      'canManageComponents',
      'canViewThemes',
      'canManageThemes',
      'canViewLandingPages',
      'canManageLandingPages',
      'canViewThankYouPage',
      'canManageThankYouPage',
      'canViewDelivery',
      'canManageDelivery',
    ],
  },
  {
    title: 'الإعدادات',
    permissions: [
      'canAccessSettingsOperations',
      'canViewSettings',
      'canManageSettings',
      'canViewSubscription',
      'canManageSubscription',
      'canViewCustomDomains',
      'canManageCustomDomains',
      'canViewDomainsDocs',
    ],
  },
  {
    title: 'مركز التقارير',
    permissions: [
      'canAccessReportsOperations',
      'canViewFinancialReports',
      'canViewSalesReports',
      'canViewExpenses',
      'canManageExpenses',
      'canViewZakat',
      'canManageZakat',
      'canViewSupplierReportsInReports',
    ],
  },
  {
    title: 'دورات ستوكيها',
    permissions: [
      'canAccessCoursesOperations',
      'canViewAllCourses',
    ],
  },
] as const;
