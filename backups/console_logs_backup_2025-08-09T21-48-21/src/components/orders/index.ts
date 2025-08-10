// تصدير المكونات الرئيسية لإدارة الطلبات

// المكونات الأساسية
export { default as OrdersTable } from './table/OrdersTable';
export { default as ResponsiveOrdersTable } from './ResponsiveOrdersTable';

// مكونات البطاقات للهاتف
export { default as OrderCard } from './cards/OrderCard';
export { default as OrdersCardView } from './cards/OrdersCardView';
export { default as OrderExpandedDetailsCard } from './cards/OrderExpandedDetailsCard';

// المكونات المساعدة
export { default as OrderStatusBadge } from './table/OrderStatusBadge';
export { default as OrderStatusDropdown } from './OrderStatusDropdown';
export { default as CallConfirmationBadge } from './CallConfirmationBadge';
export { default as CallConfirmationDropdown } from './CallConfirmationDropdown';
export { default as CallConfirmationDropdownStandalone } from './CallConfirmationDropdownStandalone';

// الأنواع
export type {
  Order,
  OrdersTableProps,
  ExtendedOrdersTableProps,
  OrderItem,
  CallConfirmationStatus,
  ShippingOrder
} from './table/OrderTableTypes';

// Hook مخصص
export { useOrdersTableLogic } from './table/useOrdersTableLogic';
