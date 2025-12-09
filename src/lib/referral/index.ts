// =====================================================
// Referral System - نظام الإحالة
// =====================================================

// الخدمات
export { ReferralService, default as referralService } from './referralService';
export { ReferralPointsService, default as referralPointsService } from './referralPointsService';
export { ReferralRewardsService, default as referralRewardsService } from './referralRewardsService';
export { ReferralAdminService, default as referralAdminService } from './referralAdminService';

// إعادة تصدير الأنواع للسهولة
export type {
  // المستويات
  TierLevel,
  ReferralTier,

  // أكواد الإحالة
  ReferralCode,

  // النقاط
  ReferralPoints,
  ReferralPointsTransaction,
  TransactionType,

  // الإحالات
  Referral,
  ReferralStatus,

  // المكافآت
  ReferralReward,
  RewardType,

  // الاستبدالات
  ReferralRedemption,
  RedemptionStatus,
  AdContent,
  ShippingAddress,

  // الإشعارات
  ReferralNotification,
  NotificationType,

  // الاستجابات
  ReferralDashboard,
  RedemptionResult,
  TierUpdateResult,

  // أنواع الإدارة
  AdminReferralStats,
  AdminReferrer,
  AdminRedemption,
  AdminTransaction,
  PaginatedResponse,
  ReferrersFilter,
  RedemptionsFilter,
  TransactionsFilter,
  UpdateRewardData,
  UpdateTierData,
} from '@/types/referral';

// الثوابت
export {
  TIER_NAMES,
  TIER_COLORS,
  TIER_ICONS,
  REFERRAL_POINTS,
  REFERRED_DISCOUNT,
} from '@/types/referral';
