// تصدير أنواع مركز الاتصال والتأكيد
export * from './callCenter';
export * from './confirmation';

// ⚡ تصدير أنواع المنتجات المحلية الموحدة
export * from './localProduct';

// Product Types
export type ProductCategory = 
  | 'consoles' // أجهزة
  | 'accessories' // إكسسوارات
  | 'games_physical' // ألعاب فيزيائية
  | 'games_digital' // ألعاب رقمية
  | 'controllers' // وحدات تحكم
  | 'components' // قطع غيار
  | 'merchandise'; // منتجات تذكارية

export interface ProductColor {
  id: string;
  name: string;
  color_code: string;
  image_url?: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
  has_sizes?: boolean;
  sizes?: ProductSize[];
}

export interface ProductSize {
  id: string;
  size_name: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number; // سعر مقارن (للخصومات)
  sku: string;
  barcode?: string;
  category: ProductCategory;
  category_id?: string; // إضافة معرف الفئة
  subcategory?: string;
  brand?: string;
  images: string[];
  thumbnailImage: string;
  thumbnail_image?: string; // خاصية من قاعدة البيانات
  stockQuantity: number;
  stock_quantity: number;
  min_stock_level?: number; // الحد الأدنى للمخزون
  reorder_level?: number; // حد إعادة الطلب
  reorder_quantity?: number; // كمية إعادة الطلب
  features?: string[];
  specifications?: Record<string, string>;
  isDigital: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
  colors?: ProductColor[];
  has_variants?: boolean;
  use_sizes?: boolean;
  synced?: boolean; // حالة مزامنة المنتج مع الخادم
  
  // خصائص الجملة المحسنة
  wholesale_price?: number;
  partial_wholesale_price?: number;
  min_wholesale_quantity?: number;
  min_partial_wholesale_quantity?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  
  // خصائص إضافية من قاعدة البيانات
  compare_at_price?: number;
  purchase_price?: number;
  subcategory_id?: string;
  slug?: string;
  show_price_on_landing?: boolean;
  last_inventory_update?: string;
  is_active?: boolean;
  
  // معلومات إضافية
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  
  // معلومات الوحدة
  is_sold_by_unit?: boolean;
  unit_type?: string;
  use_variant_prices?: boolean;
  unit_purchase_price?: number;
  unit_sale_price?: number;
  
  // إعدادات الشحن
  shipping_clone_id?: number;
  name_for_shipping?: string;
  use_shipping_clone?: boolean;
  shipping_method_type?: string;

  // تتبع المستخدم
  created_by_user_id?: string;
  updated_by_user_id?: string;

  // === أنواع البيع المتقدمة ===

  // البيع بالوزن
  sell_by_weight?: boolean;
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz';
  price_per_weight_unit?: number;
  average_item_weight?: number;
  min_weight?: number;
  max_weight?: number;

  // البيع بالعلبة/الكرتون
  sell_by_box?: boolean;
  units_per_box?: number;
  box_price?: number;
  box_barcode?: string;

  // البيع بالمتر
  sell_by_meter?: boolean;
  price_per_meter?: number;
  min_meters?: number;
  roll_length?: number;
  meter_unit?: string;

  // === المخزون المتقدم ===
  available_weight?: number;        // الوزن المتاح للبيع
  total_weight_purchased?: number;  // إجمالي الوزن المشترى
  available_length?: number;        // الأمتار المتاحة للبيع
  total_meters_purchased?: number;  // إجمالي الأمتار المشتراة
  available_boxes?: number;         // عدد الصناديق المتاحة
  total_boxes_purchased?: number;   // إجمالي الصناديق المشتراة

  // === التتبع المتقدم ===

  // نوع التتبع الموحد
  tracking_type?: 'none' | 'batch' | 'serial' | 'both';

  // تتبع الصلاحية
  track_expiry?: boolean;
  default_expiry_days?: number;
  alert_days_before_expiry?: number;

  // الأرقام التسلسلية
  track_serial_numbers?: boolean;
  require_serial_on_sale?: boolean;
  supports_imei?: boolean;

  // الضمان
  has_warranty?: boolean;
  warranty_duration_months?: number;
  warranty_months?: number; // اختصار لـ warranty_duration_months
  warranty_type?: 'manufacturer' | 'store' | 'extended';

  // الدفعات
  track_batches?: boolean;
  use_fifo?: boolean;

  // === مستويات الأسعار ===
  price_tiers?: Array<{
    tier_type: 'retail' | 'wholesale' | 'vip' | 'reseller' | 'distributor';
    min_quantity: number;
    price: number;
    discount_percentage?: number;
  }>;

  // === حقول خاصة بالنشاط ===

  // صيدلية
  requires_prescription?: boolean;
  active_ingredient?: string;
  dosage_form?: string;

  // مطعم
  preparation_time_minutes?: number;
  calories?: number;
  allergens?: string[];
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;

  // قطع غيار
  oem_number?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  compatible_models?: string[];

  // مواد بناء
  material_type?: string;
  weight_kg?: number;
  dimensions?: string;
  coverage_area?: number;
}

// Service Types
export type ServiceCategory = 
  | 'repair' // خدمات إصلاح
  | 'installation' // خدمات تركيب
  | 'maintenance' // خدمات صيانة
  | 'customization'; // خدمات تخصيص

export type ServiceStatus = 
  | 'pending' // قيد الانتظار
  | 'in_progress' // جاري العمل
  | 'completed' // مكتملة
  | 'cancelled' // ملغية
  | 'delayed'; // مؤجلة

export interface ServiceProgress {
  id: string;
  serviceBookingId: string;
  status: ServiceStatus;
  note?: string;
  timestamp: Date;
  createdBy: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedTime: string; // وقت تقديري للخدمة
  category: ServiceCategory;
  image?: string;
  isAvailable: boolean;
  isPriceDynamic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Order Types
export type OrderStatus = 
  | 'pending' // معلق
  | 'processing' // قيد المعالجة
  | 'shipped' // تم الإرسال
  | 'delivered' // تم الاستلام
  | 'cancelled' // ملغي
  | 'completed' // مكتمل (للتوافق مع POS)
  | 'refunded'; // مسترد // مسترجع

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isDigital: boolean;
  slug: string;
  name: string;
  isWholesale?: boolean; // Flag to indicate if wholesale pricing was applied
  originalPrice?: number; // Original retail price before wholesale discount
  saleType?: 'retail' | 'wholesale' | 'partial_wholesale'; // نوع البيع
  colorId?: string | null;
  colorName?: string | null;
  sizeId?: string | null;
  sizeName?: string | null;
  variant_info?: {
    colorId?: string;
    colorName?: string;
    colorCode?: string;
    sizeId?: string;
    sizeName?: string;
    variantImage?: string;
  }; // معلومات المتغيرات (اللون والمقاس)

  // === أنواع البيع المتقدمة ===

  // البيع بالوزن
  weight?: number;              // الوزن المحدد
  weightUnit?: string;          // وحدة الوزن
  pricePerWeightUnit?: number;  // السعر لكل وحدة وزن

  // البيع بالعلبة
  boxCount?: number;            // عدد الصناديق
  unitsPerBox?: number;         // عدد الوحدات في الصندوق
  boxPrice?: number;            // سعر الصندوق

  // البيع بالمتر
  length?: number;              // الطول بالمتر
  pricePerMeter?: number;       // السعر لكل متر

  // نوع الوحدة المستخدمة
  sellingUnit?: 'piece' | 'weight' | 'box' | 'meter';

  // معلومات الدفعة والصلاحية
  batchId?: string;              // معرف الدفعة
  batchNumber?: string;          // رقم الدفعة
  expiryDate?: string;           // تاريخ انتهاء الصلاحية
  serialNumber?: string;         // رقم تسلسلي واحد (للتوافقية)
  serialNumbers?: string[];      // مصفوفة الأرقام التسلسلية
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  scheduledDate?: Date;
  notes?: string;
  customerId?: string;
  customer_name?: string;
  customer_phone?: string; // رقم هاتف العميل
  repair_location_id?: string; // معرف مكان التصليح
  status: ServiceStatus;
  assignedTo?: string;
  completedAt?: Date;
  progress?: ServiceProgress[];
  public_tracking_code?: string; // كود التتبع العام
}

export interface PartialPayment {
  amountPaid: number;
  remainingAmount: number;
}

export interface SubscriptionAccountInfo {
  username?: string;
  email?: string;
  password?: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  services?: ServiceBooking[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  shippingAddress?: Address;
  shippingMethod?: string;
  shippingCost?: number;
  shipping_option?: string;
  notes?: string;
  isOnline: boolean; // طلب عبر الإنترنت أو من المتجر الفعلي
  employeeId?: string; // معرف الموظف الذي أتم الطلب (للمتجر الفعلي)
  partialPayment?: PartialPayment; // بيانات الدفع الجزئي
  considerRemainingAsPartial?: boolean; // هل يعتبر المبلغ المتبقي دفع جزئي أم خصم
  subscriptionAccountInfo?: SubscriptionAccountInfo; // معلومات حساب الاشتراك (للطلبيات التي تحتوي على خدمات اشتراك)
  createdAt: Date;
  updatedAt: Date;
  organization_id?: string; // معرف المنظمة/المؤسسة
  slug?: string; // المعرف المقروء للطلب
  customer_order_number?: number; // رقم الطلبية الخاص بالعميل
}

// User Types
export type UserRole = 'admin' | 'employee' | 'customer' | 'owner' | 'call_center_agent' | 'confirmation_agent';

export interface UserPermissions {
  manageProducts: boolean;
  manageServices: boolean;
  manageOrders: boolean;
  manageUsers: boolean;
  manageEmployees: boolean;
  viewReports: boolean;
  accessPOS: boolean;
  processPayments: boolean;
  
  // صلاحيات مركز الاتصال
  accessCallCenter?: boolean;           // الوصول لمركز الاتصال
  viewAssignedOrders?: boolean;         // عرض الطلبيات المخصصة
  updateCallStatus?: boolean;           // تحديث حالة المكالمة
  addCallNotes?: boolean;               // إضافة ملاحظات المكالمة
  scheduleCallbacks?: boolean;          // جدولة معاودة الاتصال
  reassignOrders?: boolean;             // إعادة تخصيص الطلبيات
  viewAllOrders?: boolean;              // عرض جميع الطلبيات (للمشرفين)
  makeOutboundCalls?: boolean;          // إجراء مكالمات صادرة
  receiveInboundCalls?: boolean;        // استقبال مكالمات واردة
  transferCalls?: boolean;              // تحويل المكالمات
  recordCalls?: boolean;                // تسجيل المكالمات
  viewOwnPerformance?: boolean;         // عرض الأداء الشخصي
  viewTeamPerformance?: boolean;        // عرض أداء الفريق
  viewDetailedReports?: boolean;        // عرض التقارير المفصلة
  exportReports?: boolean;              // تصدير التقارير
  manageAgents?: boolean;               // إدارة الموظفين (للمشرفين)
  assignOrdersToAgents?: boolean;       // تخصيص الطلبيات للموظفين
  viewAgentSessions?: boolean;          // عرض جلسات الموظفين
  manageWorkSchedules?: boolean;        // إدارة جداول العمل
  manageCallCenterSettings?: boolean;   // إدارة إعدادات مركز الاتصال
  viewSystemLogs?: boolean;             // عرض سجلات النظام
  escalateToSupervisor?: boolean;       // التصعيد للمشرف
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  permissions?: UserPermissions;
  addresses?: Address[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organization_id: string;
}

// Shared Types
export interface Address {
  id: string;
  userId: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

// Inventory Types
export type InventoryLogType = 'purchase' | 'sale' | 'adjustment' | 'return' | 'loss' | 'online_order';

export interface InventoryLog {
  id: string;
  product_id: string;
  productName?: string; // للعرض فقط
  quantity: number;
  previous_stock: number;
  new_stock: number;
  type: InventoryLogType;
  reference_id?: string; // معرف الطلب أو المرجع
  reference_type?: string; // نوع المرجع (طلب، شراء، تعديل يدوي)
  notes?: string;
  created_by?: string;
  created_by_name?: string; // للعرض فقط
  created_at: Date;
}

// Financial Types
export interface Transaction {
  id: string;
  orderId?: string;
  amount: number;
  type: 'sale' | 'refund' | 'expense';
  paymentMethod: string;
  description?: string;
  createdAt: Date;
  slug?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  approvedBy?: string;
}

// Dashboard Types
export interface SalesSummary {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
}

export interface InventorySummary {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
}

export interface DashboardStats {
  sales: SalesSummary;
  revenue: SalesSummary;
  profits: SalesSummary;
  orders: {
    pending: number;
    processing: number;
    completed: number;
    total: number;
  };
  inventory: InventorySummary;
  customers: {
    total: number;
    new: number;
  };
}

// Repair Location Types
export interface WorkingHours {
  [day: string]: {
    start?: string;
    end?: string;
    closed?: boolean;
  };
}

export interface RepairLocation {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_default: boolean;
  capacity: number;
  working_hours?: WorkingHours;
  specialties?: string[];
  manager_name?: string;
  created_at: Date;
  updated_at: Date;
}
