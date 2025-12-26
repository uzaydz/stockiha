// النوع الأساسي للموظف
export interface Employee {
  id: string;
  user_id?: string; // قد يكون مفيدًا للربط مع جدول المصادقة
  name: string;
  email: string;
  phone?: string | null;
  role: 'admin' | 'employee'; // الأدوار المتاحة
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
  organization_id?: string; // معرف المؤسسة التي ينتمي إليها الموظف
  // كائن الصلاحيات المخصص
  permissions?: EmployeePermissions; 
}

// صلاحيات الموظف
export interface EmployeePermissions {
  // --- الصلاحيات الحالية (سيتم مراجعتها أو استبدالها) ---
  accessPOS: boolean;         // الوصول لنقطة البيع
  manageOrders: boolean;      // إدارة الطلبات (قديمة - انظر الصلاحيات المفصلة أدناه)
  processPayments: boolean;   // معالجة المدفوعات
  manageUsers: boolean;       // إدارة المستخدمين (قديمة - انظر manageEmployees)
  viewReports: boolean;       // عرض التقارير (سيتم الاحتفاظ بها وتفصيلها)
  manageProducts: boolean;    // إدارة المنتجات (قديمة - انظر الصلاحيات المفصلة أدناه)
  manageServices: boolean;    // إدارة الخدمات (قديمة - انظر الصلاحيات المفصلة أدناه)
  manageEmployees: boolean;   // إدارة الموظفين (سيتم الاحتفاظ بها وتوضيحها)

  // --- صلاحيات مقترحة جديدة ومفصلة ---

  // المنتجات والفئات والمخزون
  viewProducts?: boolean;      // عرض المنتجات والفئات والمخزون
  addProducts?: boolean;       // إضافة منتجات جديدة
  editProducts?: boolean;      // تعديل المنتجات الحالية (بيانات، أسعار)
  deleteProducts?: boolean;    // حذف المنتجات
  manageProductCategories?: boolean; // إدارة فئات المنتجات (إضافة/تعديل/حذف)
  manageInventory?: boolean;   // تعديل كميات المخزون يدويًا وعرض سجل المخزون
  viewInventory?: boolean;    // مشاهدة صفحة المخزون فقط دون إمكانية تعديله

  // الجرد (Stocktake)
  startStocktake?: boolean;   // فتح/بدء جلسة جرد
  performStocktake?: boolean; // مسح/عد داخل الجلسة
  reviewStocktake?: boolean;  // إنهاء للجلسة للمراجعة
  approveStocktake?: boolean; // اعتماد وتعديل المخزون (حسّاسة)
  deleteStocktake?: boolean;  // حذف جلسات الجرد

  // الخدمات ومتابعتها
  viewServices?: boolean;      // عرض الخدمات المقدمة
  addServices?: boolean;       // إضافة خدمات جديدة
  editServices?: boolean;      // تعديل الخدمات الحالية
  deleteServices?: boolean;    // حذف الخدمات
  trackServices?: boolean;     // عرض وتحديث حالة متابعة الخدمات

  // الطلبات (بدلاً من manageOrders العامة)
  viewOrders: boolean;        // عرض الطلبات والتفاصيل (من المتجر الإلكتروني أو POS)
  viewPOSOrders?: boolean;     // عرض طلبات نقطة البيع فقط
  updateOrderStatus?: boolean; // تحديث حالة الطلب (غير الإلغاء)
  cancelOrders?: boolean;      // إلغاء الطلبات (قد يتطلب manageInventory)

  // العملاء
  viewCustomers?: boolean;     // عرض قائمة العملاء والتفاصيل
  manageCustomers?: boolean;   // إضافة/تعديل/حذف العملاء

  // الديون والدفعات
  viewDebts?: boolean;        // مشاهدة صفحة الديون والتفاصيل
  recordDebtPayments?: boolean; // تسجيل دفعات للديون
  viewCustomerDebtHistory?: boolean; // مشاهدة سجل ديون العميل

  // الموردين والمشتريات
  viewSuppliers?: boolean;     // عرض الموردين
  manageSuppliers?: boolean;   // إضافة/تعديل/حذف الموردين
  managePurchases?: boolean;   // إدارة المشتريات من الموردين

  // الموظفين (توضيح manageEmployees)
  viewEmployees?: boolean;     // عرض قائمة الموظفين (دون تعديل الصلاحيات)
  // manageEmployees: boolean; // (موجودة بالفعل) إضافة/تعديل/حذف الموظفين وتغيير صلاحياتهم

  // التقارير (توضيح viewReports)
  // viewReports: boolean;    // (موجودة بالفعل) عرض التقارير (مالية، مبيعات، مخزون، إلخ)
  viewFinancialReports?: boolean; // عرض التقارير المالية تحديدًا
  viewSalesReports?: boolean;     // عرض تقارير المبيعات تحديدًا
  viewInventoryReports?: boolean; // عرض تقارير المخزون تحديدًا
  viewCustomerReports?: boolean;  // عرض تقارير العملاء تحديدًا
  exportReports?: boolean;        // تصدير التقارير

  // الإعدادات
  viewSettings?: boolean;      // الوصول لصفحة الإعدادات وعرض الإعدادات المتاحة للدور
  manageProfileSettings?: boolean; // تعديل ملفه الشخصي
  manageAppearanceSettings?: boolean; // تعديل إعدادات المظهر
  manageSecuritySettings?: boolean; // تعديل إعدادات الأمان الخاصة بالمستخدم (مثل كلمة المرور)
  manageNotificationSettings?: boolean; // تعديل تفضيلات الإشعارات للمستخدم
  manageOrganizationSettings?: boolean; // إدارة إعدادات المؤسسة (للمسؤولين فقط عادة)
  manageBillingSettings?: boolean;    // إدارة الفوترة والاشتراكات (للمسؤولين فقط عادة)
  manageIntegrations?: boolean;       // إدارة الربط والتكامل (للمسؤولين فقط عادة)
  manageAdvancedSettings?: boolean;   // الوصول للإعدادات المتقدمة (للمسؤولين فقط عادة)

   // صلاحيات أخرى خاصة
   manageFlexi?: boolean;       // إدارة رصيد/مبيعات فليكسي (إذا كانت ميزة منفصلة)
   
   // صلاحيات الفليكسي والعملات الرقمية
   manageFlexiAndDigitalCurrency?: boolean;   // إدارة الفليكسي والعملات الرقمية
   sellFlexiAndDigitalCurrency?: boolean;     // بيع خدمات الفليكسي والعملات الرقمية
   viewFlexiAndDigitalCurrencySales?: boolean; // رؤية تحليل مبيعات الفليكسي والعملات الرقمية
}

// موظف مع إحصائيات إضافية
export interface EmployeeWithStats extends Employee {
  ordersCount: number;
  salesTotal: number;
  servicesCount: number;
  lastActive?: string;
}

// راتب الموظف
export interface EmployeeSalary {
  id: string;
  employee_id: string;
  amount: number;
  start_date: string;
  end_date?: string;
  type: 'monthly' | 'commission' | 'bonus' | 'other';
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  created_at: string;
}

// نشاط الموظف
export interface EmployeeActivity {
  id: string;
  employee_id: string;
  action_type: 'login' | 'logout' | 'order_created' | 'service_assigned' | 'product_updated' | 'other';
  action_details: string;
  related_entity?: 'order' | 'product' | 'service' | 'customer' | 'other';
  related_entity_id?: string;
  created_at: string;
}

// فلتر الموظفين
export interface EmployeeFilter {
  query?: string;
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'created_at' | 'ordersCount' | 'salesTotal';
  sortOrder?: 'asc' | 'desc';
}

// إحصائيات الموظفين
export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
}
