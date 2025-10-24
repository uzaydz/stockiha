// تعريف أنواع البيانات للطلبات ومكوناتها

import type { ConfirmationOrderAssignment, ConfirmationAgent } from '@/types/confirmation';

export type ShippingOrder = {
  id: number;
  tracking_number: string;
  provider_id: number;
};

export type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color_id?: string;
  color_name?: string;
  color_code?: string | null;
  size_id?: string;
  size_name?: string;
};

// نوع حالة تأكيد الإتصال
export type CallConfirmationStatus = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean;
};

export type Order = {
  id: string;
  customer_id: string | null;
  subtotal: number;
  tax: number;
  discount: number | null;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_address_id: string | null;
  shipping_method: string | null;
  shipping_cost: number | null;
  shipping_option?: string | null;
  shipping_orders?: ShippingOrder[];
  notes: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  slug: string | null;
  customer_order_number: number | null;
  created_from?: string;
  stop_desk_id?: string | null;
  // حقول تأكيد الإتصال الجديدة
  call_confirmation_status_id?: number | null;
  call_confirmation_notes?: string | null;
  call_confirmation_updated_at?: string | null;
  call_confirmation_updated_by?: string | null;
  call_confirmation_status?: CallConfirmationStatus | null;
  // حقول تتبع الشحن
  yalidine_tracking_id?: string | null;
  yalidine_label_url?: string | null;
  zrexpress_tracking_id?: string | null;
  ecotrack_tracking_id?: string | null;
  order_items?: OrderItem[];
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: {
    id: string;
    name?: string;
    street_address?: string;
    city?: string;
    state?: string;
    municipality?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  };
  form_data?: any;
  metadata?: any;
  confirmation_assignment?: ConfirmationOrderAssignment | null;
  confirmation_agent?: ConfirmationAgent | null;
  // Additional optimized fields for performance
  _shipping_info?: {
    tracking_number: string;
    provider: {
      id: number;
      code: string;
      name: string;
    };
  } | null;
};

export type OrdersTableProps = {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (orderId: string, newStatus: string, userId?: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  onSendToProvider?: (orderId: string, providerCode: string) => Promise<void>;
  onBulkUpdateStatus?: (orderIds: string[], newStatus: string, userId?: string) => Promise<void>;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  visibleColumns?: string[];
  currentUserId?: string;
  // ربط البحث مع الخادم (اختياري)
  onSearchTermChange?: (value: string) => void;
  // تفعيل التحميل التلقائي عند الاقتراب من نهاية الصفحة
  autoLoadMoreOnScroll?: boolean;
  // Pagination props
  currentPage?: number;
  totalItems?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPageChange?: (page: number) => void;
  hasMoreOrders?: boolean;
  shippingProviders?: Array<{
    provider_id: number | null;
    provider_code: string;
    provider_name: string;
    is_enabled: boolean;
  }>;
};

export type ExtendedOrdersTableProps = OrdersTableProps & {
  currentPage?: number;
  totalItems?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPageChange?: (page: number) => void;
  onLoadMore?: () => void;
  hasMoreOrders?: boolean;
  shippingProviders?: Array<{
    provider_id: number | null;
    provider_code: string;
    provider_name: string;
    is_enabled: boolean;
  }>;
  onOrderUpdated?: (orderId: string, updatedOrder: any) => void;
  localUpdates?: Record<string, any>;
};

export type OrdersTableRowProps = { 
  order: Order;
  selected: boolean;
  onSelect: (orderId: string, selected: boolean) => void;
  onUpdateStatus: (orderId: string, newStatus: string, userId?: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  onSendToProvider?: (orderId: string, providerCode: string) => Promise<void>;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  visibleColumns?: string[];
  expanded?: boolean;
  onToggleExpand?: () => void;
  currentUserId?: string;
  shippingProviders?: Array<{
    provider_id: number | null;
    provider_code: string;
    provider_name: string;
    is_enabled: boolean;
  }>;
  onOrderUpdated?: (orderId: string, updatedOrder: any) => void;
  localUpdates?: Record<string, any>;
};

export type OrderBulkActionsProps = {
  selectedOrders: string[];
  onUpdateStatus?: (orderIds: string[], newStatus: string, userId?: string) => Promise<void>;
  onReset: () => void;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  currentUserId?: string;
};

export type OrderActionsDropdownProps = {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: string, userId?: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  currentUserId?: string;
};

export type OrderStatusBadgeProps = {
  status: string;
};

export type OrderSourceBadgeProps = {
  source: string;
};

export type OrderDetailsPanelProps = {
  order: Order;
};
