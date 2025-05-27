import { ProductColor } from '@/api/store';

// Product Types
export type ProductCategory = 
  | 'consoles' // أجهزة
  | 'accessories' // إكسسوارات
  | 'games_physical' // ألعاب فيزيائية
  | 'games_digital' // ألعاب رقمية
  | 'controllers' // وحدات تحكم
  | 'components' // قطع غيار
  | 'merchandise'; // منتجات تذكارية

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
  | 'pending' // قيد الانتظار
  | 'processing' // قيد المعالجة
  | 'completed' // مكتمل
  | 'cancelled' // ملغي
  | 'refunded'; // مسترجع

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
  variant_info?: {
    colorId?: string;
    colorName?: string;
    colorCode?: string;
    sizeId?: string;
    sizeName?: string;
    variantImage?: string;
  }; // معلومات المتغيرات (اللون والمقاس)
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
  createdAt: Date;
  updatedAt: Date;
  organization_id?: string; // معرف المنظمة/المؤسسة
  slug?: string; // المعرف المقروء للطلب
}

// User Types
export type UserRole = 'admin' | 'employee' | 'customer' | 'owner';

export interface UserPermissions {
  manageProducts: boolean;
  manageServices: boolean;
  manageOrders: boolean;
  manageUsers: boolean;
  manageEmployees: boolean;
  viewReports: boolean;
  accessPOS: boolean;
  processPayments: boolean;
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
