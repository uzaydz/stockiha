
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
  subcategory?: string;
  brand?: string;
  images: string[];
  thumbnailImage: string;
  stockQuantity: number;
  features?: string[];
  specifications?: Record<string, string>;
  isDigital: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Service Types
export type ServiceCategory = 
  | 'repair' // خدمات إصلاح
  | 'installation' // خدمات تركيب
  | 'maintenance' // خدمات صيانة
  | 'customization'; // خدمات تخصيص

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedTime: string; // وقت تقديري للخدمة
  category: ServiceCategory;
  image?: string;
  isAvailable: boolean;
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
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  scheduledDate?: Date;
  notes?: string;
  status: OrderStatus;
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
  notes?: string;
  isOnline: boolean; // طلب عبر الإنترنت أو من المتجر الفعلي
  employeeId?: string; // معرف الموظف الذي أتم الطلب (للمتجر الفعلي)
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export type UserRole = 'admin' | 'employee' | 'customer';

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

// Financial Types
export interface Transaction {
  id: string;
  orderId?: string;
  amount: number;
  type: 'sale' | 'refund' | 'expense';
  paymentMethod: string;
  description?: string;
  employeeId?: string;
  createdAt: Date;
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
