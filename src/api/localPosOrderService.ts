/**
 * ⚡ localPosOrderService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedOrderService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedOrderService للعمل Offline-First
 */

import { unifiedOrderService } from '@/services/UnifiedOrderService';

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
export type { Order as LocalPOSOrder, OrderItem as LocalPOSOrderItem } from '@/services/UnifiedOrderService';

// ⚡ دوال التوافق القديمة (PowerSync يتعامل مع المزامنة تلقائياً)
/**
 * حفظ الطلبات من السيرفر (PowerSync يتعامل معها تلقائياً)
 * @deprecated PowerSync handles sync automatically
 */
export const saveRemoteOrders = async (orders: any[]): Promise<void> => {
  if (!orders?.length) return;
  console.log('[saveRemoteOrders] ⚡ PowerSync handles sync automatically');
  // PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لاستدعاء صريح
};

/**
 * حفظ عناصر الطلبات من السيرفر (PowerSync يتعامل معها تلقائياً)
 * @deprecated PowerSync handles sync automatically
 */
export const saveRemoteOrderItems = async (orderId: string, items: any[]): Promise<void> => {
  if (!items?.length) return;
  console.log('[saveRemoteOrderItems] ⚡ PowerSync handles sync automatically');
  // PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لاستدعاء صريح
};
