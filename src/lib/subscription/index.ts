/**
 * Subscription Module - نظام الاشتراكات
 *
 * ⭐ محدث: دعم الخطط الجديدة (v2) والحدود
 *
 * يوفر:
 * - إشعارات انتهاء الاشتراك
 * - مزامنة الاشتراكات
 * - Hooks للاستخدام في React
 * - التحقق من الحدود (Offline-First)
 * - كشف التلاعب والأمان
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

// ⭐ تصدير خدمات الاشتراك
export {
  subscriptionCache,
  type SubscriptionData
} from '@/lib/subscription-cache';

export {
  SubscriptionService,
  PLAN_CODES,
  DEFAULT_PLAN_LIMITS
} from '@/lib/subscription-service';

export {
  offlineSubscriptionService,
  type OfflineSubscriptionStatus
} from '@/api/offlineSubscriptionService';

// ⭐ تصدير الأنواع
export type {
  SubscriptionPlanLimits,
  SubscriptionPlanPermissions,
  PlanCode,
  LimitCheckResult,
  SubscriptionSummary,
  SubscriptionCheckResult,
  SubscriptionStatus,
  SubscriptionValidationResult
} from '@/types/subscription';

// ⭐ تصدير hooks
export { useOfflineSubscription } from '@/hooks/useOfflineSubscription';
export { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

// ⭐ تصدير مكونات UI
export { SubscriptionUsageCard } from '@/components/subscription/SubscriptionUsageCard';
