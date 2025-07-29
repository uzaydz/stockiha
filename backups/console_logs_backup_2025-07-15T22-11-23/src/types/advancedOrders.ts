// أنواع البيانات للطلبيات المتقدمة

export interface AdvancedOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color_id?: string;
  color_name?: string;
  size_id?: string;
  size_name?: string;
  product_image?: string;
  product_sku?: string;
}

export interface AdvancedOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  
  // Order totals
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  
  // Payment info
  payment_method: string;
  payment_status: string;
  
  // Shipping info
  shipping_provider?: string;
  shipping_cost: number;
  shipping_address?: string;
  tracking_id?: string;
  
  // Status info
  status: string;
  call_confirmation_status: string;
  call_confirmation_notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Additional data
  items: AdvancedOrderItem[];
  form_data?: any;
  metadata?: any;
  
  // Source info
  created_from?: string;
  source_url?: string;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  pending_orders: number;
  
  status_distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  
  top_shipping_providers: Array<{
    provider: string;
    count: number;
    percentage: number;
  }>;
  
  daily_trend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  
  // Additional stats
  completion_rate: number;
  cancellation_rate: number;
  average_processing_time: number;
}

export interface OrderFilters {
  status?: string;
  search_term?: string;
  date_from?: string;
  date_to?: string;
  call_confirmation_status_id?: string;
  shipping_provider?: string;
  payment_method?: string;
  payment_status?: string;
  created_from?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CallConfirmationStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ShippingProvider {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  logo_url?: string;
  tracking_url_template?: string;
}

// حالات الطلبيات
export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

// حالات الدفع
export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

// طرق الدفع
export type PaymentMethod = 
  | 'cash_on_delivery'
  | 'bank_transfer'
  | 'credit_card'
  | 'mobile_payment'
  | 'crypto';

// تسميات الحالات
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'في الانتظار',
  processing: 'قيد المعالجة',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  returned: 'مرتجع'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'في الانتظار',
  paid: 'مدفوع',
  failed: 'فشل',
  refunded: 'مسترد',
  partially_refunded: 'مسترد جزئياً'
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: 'الدفع عند الاستلام',
  bank_transfer: 'تحويل بنكي',
  credit_card: 'بطاقة ائتمان',
  mobile_payment: 'دفع عبر الهاتف',
  crypto: 'عملة رقمية'
};

// ألوان الحالات
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800'
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-blue-100 text-blue-800',
  partially_refunded: 'bg-orange-100 text-orange-800'
};

// خيارات الترتيب
export const SORT_OPTIONS = [
  { value: 'created_at', label: 'تاريخ الإنشاء' },
  { value: 'updated_at', label: 'تاريخ التحديث' },
  { value: 'total', label: 'المبلغ الإجمالي' },
  { value: 'customer_name', label: 'اسم العميل' },
  { value: 'status', label: 'الحالة' }
];

// خيارات عدد العناصر في الصفحة
export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 عناصر' },
  { value: 20, label: '20 عنصر' },
  { value: 50, label: '50 عنصر' },
  { value: 100, label: '100 عنصر' }
];

// دوال مساعدة
export const formatOrderStatus = (status: string): string => {
  return ORDER_STATUS_LABELS[status as OrderStatus] || status;
};

export const formatPaymentStatus = (status: string): string => {
  return PAYMENT_STATUS_LABELS[status as PaymentStatus] || status;
};

export const formatPaymentMethod = (method: string): string => {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] || method;
};

export const getOrderStatusColor = (status: string): string => {
  return ORDER_STATUS_COLORS[status as OrderStatus] || 'bg-gray-100 text-gray-800';
};

export const getPaymentStatusColor = (status: string): string => {
  return PAYMENT_STATUS_COLORS[status as PaymentStatus] || 'bg-gray-100 text-gray-800';
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 