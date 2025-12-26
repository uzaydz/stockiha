/**
 * ⚡ posOrdersService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedOrderService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedOrderService للعمل Offline-First
 */

// إعادة تصدير جميع الصادرات من الخدمة الموحدة
export * from '@/services/UnifiedOrderService';

// إعادة تصدير كـ default للتوافق
export { unifiedOrderService as default } from '@/services/UnifiedOrderService';

// إعادة تصدير الأنواع للتوافق
export type {
  Order,
  OrderItem,
  OrderWithItems,
  OrderFilters,
  OrderStats,
  CreateOrderInput,
  PaginatedOrders,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  POSOrderType
} from '@/services/UnifiedOrderService';

// إعادة تصدير الأنواع القديمة للتوافق
export type { Order as POSOrderWithDetails, OrderFilters as POSOrderFilters, OrderStats as POSOrderStats } from '@/services/UnifiedOrderService';






















































