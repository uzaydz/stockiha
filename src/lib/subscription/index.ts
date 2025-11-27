/**
 * Subscription Module - نظام الاشتراكات
 *
 * يوفر:
 * - إشعارات انتهاء الاشتراك
 * - مزامنة الاشتراكات
 * - Hooks للاستخدام في React
 */

// تصدير نظام الإشعارات
export {
  expiryNotifier,
  useSubscriptionExpiry,
  type SubscriptionNotification
} from './expiryNotifier';

// تصدير مدير المزامنة
export {
  syncManager,
  useSyncState,
  type SyncState,
  type SyncResult
} from './syncManager';
