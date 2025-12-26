/**
 * Types موحدة لصفحة الطلبيات
 */

// ============================================
// Order Types
// ============================================

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type ViewMode = 'all' | 'mine' | 'unassigned';

export type DeliveryType = 'home' | 'office' | 'stop_desk' | 'stopdesk';

export interface OrderCustomer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
}

export interface ShippingAddress {
  id?: string;
  street_address?: string;
  province?: string;
  municipality?: string;
  country?: string;
  phone?: string;
}

export interface OrderFormData {
  fullName?: string;
  phone?: string;
  province?: string;
  wilaya?: string;
  wilayaId?: string;
  municipality?: string;
  commune?: string;
  communeId?: string;
  address?: string;
  deliveryType?: DeliveryType;
  delivery_type?: DeliveryType;
  stopdesk_id?: number;
  stopdeskId?: number;
  wilayaName?: string;
  communeName?: string;
}

export interface OrderAssignment {
  staff_id: string;
  status: 'assigned' | 'accepted' | 'rejected';
  agent_id?: string;
}

export interface CallConfirmationStatus {
  id: number;
  name: string;
  color?: string | null;
}

export interface Order {
  id: string;
  customer_order_number?: string;
  customer?: OrderCustomer | null;
  form_data?: OrderFormData | null;
  shipping_address?: ShippingAddress | null;
  order_items?: OrderItem[];
  subtotal: number;
  tax: number;
  discount?: number | null;
  total: number;
  shipping_cost?: number | null;
  status: OrderStatus;
  payment_method?: string;
  payment_status?: string;
  shipping_provider?: string | null;
  shipping_method?: string | null;
  yalidine_tracking_id?: string | null;
  zrexpress_tracking_id?: string | null;
  ecotrack_tracking_id?: string | null;
  maystro_tracking_id?: string | null;
  call_confirmation_status_id?: number | null;
  call_confirmation_status?: CallConfirmationStatus | null;
  call_confirmation_notes?: string | null;
  call_confirmation_updated_at?: string | null;
  call_confirmation_updated_by?: string | null;
  notes?: string | null;
  employee_id?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Enriched fields
  assignment?: OrderAssignment | null;
  confirmation_assignment?: OrderAssignment | null;
  confirmation_agent?: { id: string; name: string } | null;
  assigned_staff_name?: string | null;
  assigned_staff_name_resolved?: string | null;
}

// ============================================
// Filter Types
// ============================================

export interface OrderFilters {
  status: OrderStatus | 'all';
  searchTerm: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  callConfirmationStatusId: number | null;
  shippingProvider: string | null;
  viewMode: ViewMode;
}

export const DEFAULT_FILTERS: OrderFilters = {
  status: 'all',
  searchTerm: '',
  dateFrom: null,
  dateTo: null,
  callConfirmationStatusId: null,
  shippingProvider: null,
  viewMode: 'all',
};

// ============================================
// Stats Types
// ============================================

export interface OrderCounts {
  all: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface OrderStats {
  totalSales: number;
  avgOrderValue: number;
  totalOrders: number;
}

export const DEFAULT_COUNTS: OrderCounts = {
  all: 0,
  pending: 0,
  processing: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
};

export const DEFAULT_STATS: OrderStats = {
  totalSales: 0,
  avgOrderValue: 0,
  totalOrders: 0,
};

// ============================================
// Shipping Provider Types
// ============================================

export interface ShippingProvider {
  // UI-friendly fields used by dropdowns/tables
  code: string;
  name: string;

  // Backend/RPC fields (kept for compatibility)
  provider_id: string;
  provider_code: string;
  provider_name: string;
  is_enabled: boolean;
  auto_shipping?: boolean;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;

// ============================================
// Shared Data Types
// ============================================

export interface OrdersSharedData {
  callConfirmationStatuses: CallConfirmationStatus[];
  shippingProviders: ShippingProvider[];
  provinces: Array<{ id: number; name: string }>;
  municipalities: Array<{ id: number; name: string; wilaya_id: number }>;
  organizationSettings: Record<string, unknown> | null;
}

// ============================================
// Action Result Types
// ============================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Stop Desk Types
// ============================================

export interface StopDeskCenter {
  id: number;
  name: string;
  commune_id: number;
  commune_name: string;
  wilaya_id: number;
  wilaya_name: string;
  address?: string;
}

export interface PendingShipmentData {
  orderId: string;
  providerCode: string;
  order: Order & {
    wilayaId?: string;
    communeId?: string;
  };
}
