/**
 * تصدير الـ Feature بالكامل
 */

// Context
export { OrdersProvider, useOrders } from './context/OrdersContext';

// Components
export {
  OrdersHeader,
  OrdersStatsCards,
  OrdersFilters,
  OrdersToolbar,
  OrdersTable,
  OrdersDialogs,
} from './components';

// Hooks
export { useOrdersPermissions } from './hooks';
export type { OrdersPermissions } from './hooks';

// Types
export type {
  Order,
  OrderStatus,
  OrderFilters,
  OrderCounts,
  OrderStats,
  OrdersSharedData,
  PaginationState,
  ViewMode,
  ShippingProvider,
  CallConfirmationStatus,
  OrderItem,
  OrderCustomer,
  OrderFormData,
  ShippingAddress,
} from './types';
