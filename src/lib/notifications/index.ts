/**
 * نظام الإشعارات الموحد
 *
 * يوفر نظام إشعارات شامل يعمل أوفلاين مع:
 * - تخزين SQLite
 * - مزامنة مع الخادم
 * - إشعارات المخزون
 * - إشعارات الطلبات
 * - إشعارات العملاء والديون
 * - مكونات UI جاهزة
 */

// ====== الخدمات الأساسية ======

// جسر المزامنة مع SQLite للنظام الحالي
export { offlineSyncBridge } from './offlineSyncBridge';

// خدمة الإشعارات الأوفلاين الرئيسية
export {
  offlineNotificationService,
  type OfflineNotification,
  type NotificationType,
  type NotificationPriority,
  type NotificationStatus,
  type NotificationSource,
  type LowStockSettings,
  type DebtReminderSettings,
  type NotificationSettings
} from './offlineNotificationService';

// خدمة إشعارات الطلبات
export {
  orderNotificationService,
  type OrderStatus,
  type OrderSummary,
  type OrderNotificationSettings
} from './orderNotificationService';

// خدمة إشعارات العملاء
export {
  customerNotificationService,
  type CustomerInfo,
  type DebtInfo,
  type CustomerNotificationSettings
} from './customerNotificationService';

// ====== React Hooks ======

export {
  useNotifications,
  useUnreadCount,
  useNotificationsByType,
  useDebtStats,
  useUrgentNotifications,
  type NotificationsState,
  type NotificationFilterOptions,
  type UnifiedNotificationSettings,
  type NotificationStats
} from './useNotifications';

// ====== دالة التهيئة الموحدة ======

/**
 * تهيئة نظام الإشعارات بالكامل
 *
 * @param organizationId معرف المؤسسة
 */
export async function initializeNotificationSystem(organizationId: string): Promise<void> {
  const { offlineNotificationService } = await import('./offlineNotificationService');
  const { orderNotificationService } = await import('./orderNotificationService');
  const { customerNotificationService } = await import('./customerNotificationService');

  await Promise.all([
    offlineNotificationService.initialize(organizationId),
    orderNotificationService.initialize(organizationId),
    customerNotificationService.initialize(organizationId)
  ]);

  console.log('[Notifications] System initialized for organization:', organizationId);
}

/**
 * إيقاف نظام الإشعارات
 */
export function stopNotificationSystem(): void {
  const { offlineNotificationService } = require('./offlineNotificationService');
  const { orderNotificationService } = require('./orderNotificationService');
  const { customerNotificationService } = require('./customerNotificationService');

  offlineNotificationService.stop();
  orderNotificationService.stop();
  customerNotificationService.stop();

  console.log('[Notifications] System stopped');
}

// ====== أنواع الإشعارات المتاحة ======

export const NOTIFICATION_TYPES = {
  // الطلبات
  NEW_ORDER: 'new_order' as const,
  ORDER_STATUS_CHANGE: 'order_status_change' as const,

  // المخزون
  LOW_STOCK: 'low_stock' as const,
  OUT_OF_STOCK: 'out_of_stock' as const,
  STOCK_RESTORED: 'stock_restored' as const,

  // الديون والمدفوعات
  PAYMENT_RECEIVED: 'payment_received' as const,
  DEBT_REMINDER: 'debt_reminder' as const,
  DEBT_OVERDUE: 'debt_overdue' as const,

  // العملاء
  CUSTOMER_INACTIVE: 'customer_inactive' as const,

  // الاشتراكات
  SUBSCRIPTION_EXPIRY: 'subscription_expiry' as const,

  // المزامنة
  SYNC_COMPLETED: 'sync_completed' as const,
  SYNC_FAILED: 'sync_failed' as const,

  // أخرى
  REPAIR_STATUS: 'repair_status' as const,
  INVOICE_DUE: 'invoice_due' as const,
  RETURN_REQUEST: 'return_request' as const,
  PRICE_CHANGE: 'price_change' as const,
  CUSTOM: 'custom' as const
};

// ====== ثوابت الأولويات ======

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  URGENT: 'urgent' as const
};

// ====== دوال مساعدة ======

/**
 * الحصول على لون الأولوية
 */
export function getPriorityColor(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
  const colors = {
    low: '#3b82f6',     // blue
    medium: '#eab308',  // yellow
    high: '#f97316',    // orange
    urgent: '#ef4444'   // red
  };
  return colors[priority];
}

/**
 * الحصول على أيقونة النوع
 */
export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    new_order: 'shopping-cart',
    order_status_change: 'package',
    low_stock: 'alert-triangle',
    out_of_stock: 'x-circle',
    stock_restored: 'check-circle',
    payment_received: 'credit-card',
    debt_reminder: 'clock',
    debt_overdue: 'alert-circle',
    customer_inactive: 'user-x',
    subscription_expiry: 'calendar',
    sync_completed: 'refresh-cw',
    sync_failed: 'x',
    custom: 'bell'
  };
  return icons[type] || 'bell';
}

/**
 * تنسيق الوقت النسبي
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
  return date.toLocaleDateString('ar-DZ');
}

/**
 * ترجمة نوع الإشعار
 */
export function translateNotificationType(type: string): string {
  const translations: Record<string, string> = {
    new_order: 'طلب جديد',
    order_status_change: 'تغيير حالة طلب',
    low_stock: 'مخزون منخفض',
    out_of_stock: 'نفاد المخزون',
    stock_restored: 'استعادة المخزون',
    payment_received: 'دفعة مستلمة',
    debt_reminder: 'تذكير بدين',
    debt_overdue: 'دين متأخر',
    customer_inactive: 'عميل غير نشط',
    subscription_expiry: 'انتهاء الاشتراك',
    sync_completed: 'اكتمال المزامنة',
    sync_failed: 'فشل المزامنة',
    repair_status: 'حالة إصلاح',
    invoice_due: 'فاتورة مستحقة',
    return_request: 'طلب إرجاع',
    price_change: 'تغيير سعر',
    custom: 'إشعار'
  };
  return translations[type] || 'إشعار';
}
