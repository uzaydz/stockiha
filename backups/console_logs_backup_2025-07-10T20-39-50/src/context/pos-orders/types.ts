// =================================================================
// 🎯 POS Orders Types - أنواع البيانات المحسنة
// =================================================================

export interface POSOrderWithDetails {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  is_online: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  order_items: {
    id: string;
    product_id: string;
    product_name?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    is_wholesale: boolean;
    variant_info?: any;
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
  }[];
  
  // حقول محسوبة للمرتجعات
  items_count: number;
  effective_status?: string;
  effective_total?: number;
  original_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
  
  // حقول جديدة لنوع البيع
  sale_type?: 'product' | 'subscription';
  product_items_count?: number;
  subscription_items_count?: number;
  metadata?: any;
}

export interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  pending_payment_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  // إحصائيات المرتجعات
  fully_returned_orders?: number;
  partially_returned_orders?: number;
  total_returned_amount?: number;
  effective_revenue?: number;
  return_rate?: number;
}

export interface POSOrderFilters {
  status?: string;
  payment_method?: string;
  payment_status?: string;
  employee_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
}

export interface POSOrdersData {
  // البيانات الأساسية
  stats: POSOrderStats | null;
  orders: POSOrderWithDetails[];
  employees: Employee[];
  
  // بيانات pagination
  totalOrders: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  
  // بيانات إضافية
  organizationSettings: any;
  organizationSubscriptions: any[];
  posSettings: any;
  
  // حالات التحميل
  isLoading: boolean;
  isStatsLoading: boolean;
  isOrdersLoading: boolean;
  isEmployeesLoading: boolean;
  
  // الأخطاء
  errors: {
    stats?: string;
    orders?: string;
    employees?: string;
  };
  
  // دوال التحديث
  refreshAll: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshOrders: (page?: number, filters?: POSOrderFilters) => Promise<void>;
  
  // دوال الفلترة والصفحات
  setFilters: (filters: POSOrderFilters) => void;
  setPage: (page: number) => void;
  
  // دوال العمليات
  updateOrderStatus: (orderId: string, status: string, notes?: string) => Promise<boolean>;
  updatePaymentStatus: (orderId: string, paymentStatus: string, amountPaid?: number) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  updateOrderInCache: (updatedOrder: POSOrderWithDetails) => void;
  
  // دوال تحديث المخزون
  refreshProductsCache: () => void;
  
  // دوال lazy loading
  fetchOrderDetails: (orderId: string) => Promise<any[]>;
}

export interface POSOrdersDataProviderProps {
  children: React.ReactNode;
} 