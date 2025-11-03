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
  // مجموعات الطلبات الإلكترونية
  onlineOrdersGroupId?: string;
  onlineOrdersGroupRole?: 'member' | 'manager';
  canSelfAssignOnlineOrders?: boolean;
  canReassignOnlineOrders?: boolean;
  canManageOnlineOrderGroups?: boolean;
  // أفعال تفصيلية - الطلبات الإلكترونية
  canUpdateOrderStatus?: boolean;
  canCancelOrders?: boolean;
  canProcessOrderPayments?: boolean;
  canViewBlockedCustomers?: boolean;
  canManageBlockedCustomers?: boolean;
  canViewAbandonedOrders?: boolean;
  canManageAbandonedOrders?: boolean;
  // أفعال تفصيلية - الطلبات المتروكة
  canRecoverAbandonedOrder?: boolean;
  canExportAbandonedReports?: boolean;
  canViewInvoices?: boolean;
  canManageInvoices?: boolean;
  
  // مركز الخدمات (services-operations)
  canAccessServicesOperations?: boolean;
  canViewRepairServices?: boolean;
  canManageRepairServices?: boolean;
  // أفعال تفصيلية - خدمات التصليح
  canCreateRepairOrder?: boolean;
  canUpdateRepairStatus?: boolean;
  canDeleteRepairOrder?: boolean;
  canPrintRepairTicket?: boolean;
  canViewSubscriptionServices?: boolean;
  canManageSubscriptionServices?: boolean;
  // أفعال تفصيلية - خدمات الاشتراكات
  canCreateSubscriptionService?: boolean;
  canEditSubscriptionService?: boolean;
  canDeleteSubscriptionService?: boolean;
  canViewSubscriptionTransactions?: boolean;
  canRefundSubscriptionPayment?: boolean;
  
  // مركز الموردين (supplier-operations)
  canAccessSupplierOperations?: boolean;
  canViewSuppliers?: boolean;
  canManageSuppliers?: boolean;
  // أفعال تفصيلية - الموردون
  canCreateSupplier?: boolean;
  canEditSupplier?: boolean;
  canDeleteSupplier?: boolean;
  canViewPurchases?: boolean;
  canManagePurchases?: boolean;
  // أفعال تفصيلية - المشتريات
  canCreatePurchase?: boolean;
  canEditPurchase?: boolean;
  canDeletePurchase?: boolean;
  canViewSupplierPayments?: boolean;
  canManageSupplierPayments?: boolean;
  // أفعال تفصيلية - مدفوعات الموردين
  canRecordSupplierPayment?: boolean;
  canEditSupplierPayment?: boolean;
  canDeleteSupplierPayment?: boolean;
  canExportSupplierPayments?: boolean;
  canViewSupplierReports?: boolean;
  // أفعال تفصيلية - تقارير الموردين
  canExportSupplierReports?: boolean;
  
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
  // أفعال تفصيلية - مالية
  canExportFinancialReports?: boolean;
  canViewSalesReports?: boolean;
  // أفعال تفصيلية - المبيعات
  canExportSalesReports?: boolean;
  canViewExpenses?: boolean;
  canManageExpenses?: boolean;
  // أفعال تفصيلية - المصروفات
  canCreateExpense?: boolean;
  canEditExpense?: boolean;
  canDeleteExpense?: boolean;
  canExportExpenses?: boolean;
  canViewZakat?: boolean;
  canManageZakat?: boolean;
  // أفعال تفصيلية - الزكاة
  canExportZakatReports?: boolean;
  canViewSupplierReportsInReports?: boolean;
  // أفعال تفصيلية - تقارير الموردين داخل مركز التقارير
  canExportSupplierReportsInReports?: boolean;
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
      onlineOrdersGroupId: undefined,
      onlineOrdersGroupRole: 'manager',
      canSelfAssignOnlineOrders: true,
      canReassignOnlineOrders: true,
      canManageOnlineOrderGroups: true,
      // أفعال تفصيلية - الطلبات الإلكترونية
      canUpdateOrderStatus: true,
      canCancelOrders: true,
      canProcessOrderPayments: true,
      canViewBlockedCustomers: true,
      canManageBlockedCustomers: true,
      canViewAbandonedOrders: true,
      canManageAbandonedOrders: true,
      // أفعال تفصيلية - الطلبات المتروكة
      canRecoverAbandonedOrder: true,
      canExportAbandonedReports: true,
      canViewInvoices: true,
      canManageInvoices: true,
      canAccessServicesOperations: true,
      canViewRepairServices: true,
      canManageRepairServices: true,
      // أفعال تفصيلية - خدمات التصليح
      canCreateRepairOrder: true,
      canUpdateRepairStatus: true,
      canDeleteRepairOrder: true,
      canPrintRepairTicket: true,
      canViewSubscriptionServices: true,
      canManageSubscriptionServices: true,
      // أفعال تفصيلية - خدمات الاشتراكات
      canCreateSubscriptionService: true,
      canEditSubscriptionService: true,
      canDeleteSubscriptionService: true,
      canViewSubscriptionTransactions: true,
      canRefundSubscriptionPayment: true,
      canAccessSupplierOperations: true,
      canViewSuppliers: true,
      canManageSuppliers: true,
      // أفعال تفصيلية - الموردون
      canCreateSupplier: true,
      canEditSupplier: true,
      canDeleteSupplier: true,
      canViewPurchases: true,
      canManagePurchases: true,
      // أفعال تفصيلية - المشتريات
      canCreatePurchase: true,
      canEditPurchase: true,
      canDeletePurchase: true,
      canViewSupplierPayments: true,
      canManageSupplierPayments: true,
      // أفعال تفصيلية - مدفوعات الموردين
      canRecordSupplierPayment: true,
      canEditSupplierPayment: true,
      canDeleteSupplierPayment: true,
      canExportSupplierPayments: true,
      canViewSupplierReports: true,
      // أفعال تفصيلية - تقارير الموردين
      canExportSupplierReports: true,
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
      // أفعال تفصيلية - مالية
      canExportFinancialReports: true,
      canViewSalesReports: true,
      // أفعال تفصيلية - المبيعات
      canExportSalesReports: true,
      canViewExpenses: true,
      canManageExpenses: true,
      // أفعال تفصيلية - المصروفات
      canCreateExpense: true,
      canEditExpense: true,
      canDeleteExpense: true,
      canExportExpenses: true,
      canViewZakat: true,
      canManageZakat: true,
      // أفعال تفصيلية - الزكاة
      canExportZakatReports: true,
      canViewSupplierReportsInReports: true,
      // أفعال تفصيلية - تقارير الموردين داخل مركز التقارير
      canExportSupplierReportsInReports: true,
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
      // أفعال تفصيلية - المشتريات
      canCreatePurchase: true,
      canEditPurchase: true,
      canDeletePurchase: true,
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
  onlineOrdersGroupId: 'مجموعة الطلبات الإلكترونية',
  onlineOrdersGroupRole: 'دور المجموعة (طلبات إلكترونية)',
  canSelfAssignOnlineOrders: 'تعيين الطلب لنفسي (Claim)',
  canReassignOnlineOrders: 'إعادة تعيين طلب إلكتروني',
  canManageOnlineOrderGroups: 'إدارة مجموعات الطلبات الإلكترونية',
  canUpdateOrderStatus: 'تحديث حالة الطلب',
  canCancelOrders: 'إلغاء الطلب',
  canProcessOrderPayments: 'معالجة المدفوعات',
  canViewBlockedCustomers: 'عرض قائمة المحظورين',
  canManageBlockedCustomers: 'إدارة قائمة المحظورين',
  canViewAbandonedOrders: 'عرض الطلبات المتروكة',
  canManageAbandonedOrders: 'إدارة الطلبات المتروكة',
  canRecoverAbandonedOrder: 'استرجاع الطلب المتروك',
  canExportAbandonedReports: 'تصدير تقارير المتروكة',
  canViewInvoices: 'عرض الفواتير',
  canManageInvoices: 'إدارة الفواتير',
  canAccessServicesOperations: 'مركز الخدمات',
  canViewRepairServices: 'عرض خدمات التصليح',
  canManageRepairServices: 'إدارة خدمات التصليح',
  canCreateRepairOrder: 'إنشاء تذكرة تصليح',
  canUpdateRepairStatus: 'تحديث حالة التصليح',
  canDeleteRepairOrder: 'حذف تذكرة',
  canPrintRepairTicket: 'طباعة التذكرة',
  canViewSubscriptionServices: 'عرض خدمات الاشتراكات',
  canManageSubscriptionServices: 'إدارة خدمات الاشتراكات',
  canCreateSubscriptionService: 'إضافة خدمة اشتراك',
  canEditSubscriptionService: 'تعديل خدمة اشتراك',
  canDeleteSubscriptionService: 'حذف خدمة اشتراك',
  canViewSubscriptionTransactions: 'عرض معاملات الاشتراكات',
  canRefundSubscriptionPayment: 'استرجاع مدفوعات الاشتراك',
  canAccessSupplierOperations: 'مركز الموردين',
  canViewSuppliers: 'عرض الموردين',
  canManageSuppliers: 'إدارة الموردين',
  canCreateSupplier: 'إضافة مورد',
  canEditSupplier: 'تعديل مورد',
  canDeleteSupplier: 'حذف مورد',
  canViewPurchases: 'عرض المشتريات',
  canManagePurchases: 'إدارة المشتريات',
  canCreatePurchase: 'إنشاء مشتريات',
  canEditPurchase: 'تعديل مشتريات',
  canDeletePurchase: 'حذف مشتريات',
  canViewSupplierPayments: 'عرض مدفوعات الموردين',
  canManageSupplierPayments: 'إدارة مدفوعات الموردين',
  canRecordSupplierPayment: 'تسجيل دفع',
  canEditSupplierPayment: 'تعديل دفع',
  canDeleteSupplierPayment: 'حذف دفع',
  canExportSupplierPayments: 'تصدير المدفوعات',
  canViewSupplierReports: 'عرض تقارير الموردين',
  canExportSupplierReports: 'تصدير تقارير الموردين',
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
  canExportFinancialReports: 'تصدير التقارير المالية',
  canViewSalesReports: 'عرض تحليلات المبيعات',
  canExportSalesReports: 'تصدير تقارير المبيعات',
  canViewExpenses: 'عرض المصروفات',
  canManageExpenses: 'إدارة المصروفات',
  canCreateExpense: 'إضافة مصروف',
  canEditExpense: 'تعديل مصروف',
  canDeleteExpense: 'حذف مصروف',
  canExportExpenses: 'تصدير المصروفات',
  canViewZakat: 'عرض الزكاة',
  canManageZakat: 'إدارة الزكاة',
  canExportZakatReports: 'تصدير تقارير الزكاة',
  canViewSupplierReportsInReports: 'عرض تقارير الموردين في التقارير',
  canExportSupplierReportsInReports: 'تصدير تقارير الموردين (مركز التقارير)',
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
