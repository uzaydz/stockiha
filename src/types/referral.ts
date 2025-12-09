// =====================================================
// أنواع نظام الإحالة - Referral System Types
// =====================================================

// المستويات
export type TierLevel = 1 | 2 | 3 | 4 | 5;

export interface ReferralTier {
  id: string;
  name: string;
  name_ar: string;
  level: TierLevel;
  min_points: number;
  max_points: number | null;
  bonus_percentage: number;
  badge_icon: string;
  badge_color: string;
  perks: string[];
  exclusive_rewards: string | null;
  created_at: string;
  updated_at: string;
}

// أكواد الإحالة
export interface ReferralCode {
  id: string;
  organization_id: string;
  code: string;
  total_clicks: number;
  total_signups: number;
  total_subscriptions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// رصيد النقاط
export interface ReferralPoints {
  id: string;
  organization_id: string;
  total_points: number;
  available_points: number;
  spent_points: number;
  current_tier_id: string;
  tier_upgraded_at: string | null;
  lifetime_referrals: number;
  active_referrals: number;
  created_at: string;
  updated_at: string;
}

// حالات الإحالة
export type ReferralStatus = 'pending' | 'signed_up' | 'subscribed' | 'churned';

// سجل الإحالات
export interface Referral {
  id: string;
  referrer_org_id: string;
  referred_org_id: string;
  referral_code_id: string;
  status: ReferralStatus;
  signup_date: string | null;
  first_subscription_date: string | null;
  points_awarded: number;
  bonus_points: number;
  total_renewals: number;
  total_points_from_renewals: number;
  created_at: string;
  updated_at: string;
}

// أنواع المعاملات
export type TransactionType =
  | 'referral_signup'
  | 'referral_subscription'
  | 'renewal_bonus'
  | 'redemption'
  | 'refund'
  | 'admin_bonus'
  | 'admin_deduction'
  | 'tier_change';

// معاملات النقاط
export interface ReferralPointsTransaction {
  id: string;
  organization_id: string;
  referral_id: string | null;
  transaction_type: TransactionType;
  points: number;
  balance_before: number;
  balance_after: number;
  description_ar: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// أنواع المكافآت
export type RewardType =
  | 'free_subscription'
  | 'ad_short'
  | 'ad_month'
  | 'barcode_scanner'
  | 'store_tracking'
  | 'ccp_withdrawal'
  | 'custom';

// المكافآت
export interface ReferralReward {
  id: string;
  name_ar: string;
  description_ar: string | null;
  reward_type: RewardType;
  points_cost: number;
  monetary_value: number | null;
  min_tier_level: TierLevel;
  duration_days: number | null;
  requires_manual_fulfillment: boolean;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// حالات طلب الاستبدال
export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

// محتوى الإشهار
export interface AdContent {
  title?: string;
  description?: string;
  image_url?: string;
  link?: string;
  platforms?: ('facebook' | 'instagram' | 'website')[];
}

// عنوان الشحن
export interface ShippingAddress {
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  postal_code?: string;
  notes?: string;
}

// طلبات الاستبدال
export interface ReferralRedemption {
  id: string;
  organization_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  ad_content: AdContent | null;
  shipping_address: ShippingAddress | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// أنواع الإشعارات
export type NotificationType =
  | 'referral_signup'
  | 'referral_subscription'
  | 'points_earned'
  | 'tier_upgrade'
  | 'tier_change'
  | 'redemption_created'
  | 'redemption_approved'
  | 'redemption_rejected'
  | 'redemption_completed'
  | 'code_activated'
  | 'code_deactivated';

// الإشعارات
export interface ReferralNotification {
  id: string;
  organization_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// =====================================================
// أنواع الاستجابات من RPC Functions
// =====================================================

// لوحة تحكم الإحالة
export interface ReferralDashboard {
  code: {
    code: string;
    is_active: boolean;
    total_clicks: number;
    total_signups: number;
    total_subscriptions: number;
  };
  points: {
    total: number;
    available: number;
    spent: number;
    lifetime_referrals: number;
    active_referrals: number;
  };
  tier: {
    name: string;
    name_ar: string;
    level: number;
    bonus_percentage: number;
    badge_icon: string;
    badge_color: string;
  };
  next_tier: {
    name_ar: string;
    points_needed: number;
    bonus_percentage: number;
  } | null;
  recent_referrals: Array<{
    id: string;
    referred_name: string;
    status: ReferralStatus;
    points_awarded: number;
    created_at: string;
  }>;
  recent_transactions: Array<{
    id: string;
    type: TransactionType;
    points: number;
    description: string;
    created_at: string;
  }>;
  available_rewards: Array<{
    id: string;
    name_ar: string;
    points_cost: number;
    min_tier_level: number;
    can_redeem: boolean;
  }>;
}

// نتيجة الاستبدال
export interface RedemptionResult {
  success: boolean;
  error?: string;
  redemption_id?: string;
  points_spent?: number;
  new_balance?: number;
  status?: RedemptionStatus;
  required?: number;
  available?: number;
}

// نتيجة تحديث المستوى
export interface TierUpdateResult {
  success: boolean;
  error?: string;
  upgraded: boolean;
  current_tier: string;
  tier_level: number;
  bonus_percentage: number;
}

// =====================================================
// أنواع Super Admin
// =====================================================

// إحصائيات النظام
export interface AdminReferralStats {
  total_referrals: number;
  referrals_this_month: number;
  successful_referrals: number;
  conversion_rate: number;
  total_points_distributed: number;
  total_points_redeemed: number;
  total_rewards_value: number;
  pending_redemptions: number;
  active_referrers: number;
  tier_distribution: Array<{
    tier_name: string;
    tier_level: number;
    count: number;
  }>;
  monthly_referrals: Array<{
    month: string;
    count: number;
  }>;
  top_referrers: Array<{
    organization_id: string;
    organization_name: string;
    total_points: number;
    referral_count: number;
    tier_name: string;
  }>;
}

// المُحيل في قائمة الإدارة
export interface AdminReferrer {
  organization_id: string;
  organization_name: string;
  code: string;
  is_active: boolean;
  tier_name: string;
  tier_level: number;
  tier_color: string;
  total_points: number;
  available_points: number;
  spent_points: number;
  lifetime_referrals: number;
  active_referrals: number;
  total_clicks: number;
  total_signups: number;
  total_subscriptions: number;
  created_at: string;
  last_referral_at: string | null;
}

// طلب الاستبدال في قائمة الإدارة
export interface AdminRedemption {
  id: string;
  organization_id: string;
  organization_name: string;
  reward_id: string;
  reward_name: string;
  reward_type: RewardType;
  points_spent: number;
  status: RedemptionStatus;
  ad_content: AdContent | null;
  shipping_address: ShippingAddress | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
}

// المعاملة في قائمة الإدارة
export interface AdminTransaction {
  id: string;
  organization_id: string;
  organization_name: string;
  transaction_type: TransactionType;
  points: number;
  balance_before: number;
  balance_after: number;
  description_ar: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// استجابات القوائم المُصفحة
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// فلاتر قائمة المُحيلين
export interface ReferrersFilter {
  tier_level?: number;
  min_points?: number;
  max_points?: number;
  is_active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// فلاتر قائمة الاستبدالات
export interface RedemptionsFilter {
  status?: RedemptionStatus;
  reward_type?: RewardType;
  search?: string;
  limit?: number;
  offset?: number;
}

// فلاتر قائمة المعاملات
export interface TransactionsFilter {
  org_id?: string;
  type?: TransactionType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// بيانات تحديث المكافأة
export interface UpdateRewardData {
  name_ar?: string;
  description_ar?: string;
  reward_type?: RewardType;
  points_cost?: number;
  monetary_value?: number;
  min_tier_level?: TierLevel;
  duration_days?: number;
  is_active?: boolean;
  requires_manual_fulfillment?: boolean;
  icon?: string;
}

// بيانات تحديث المستوى
export interface UpdateTierData {
  name?: string;
  name_ar?: string;
  min_points?: number;
  max_points?: number | null;
  bonus_percentage?: number;
  badge_icon?: string;
  badge_color?: string;
  perks?: string[];
  exclusive_rewards?: string;
}

// =====================================================
// أنواع مساعدة
// =====================================================

// ثوابت المستويات
export const TIER_NAMES: Record<TierLevel, { en: string; ar: string }> = {
  1: { en: 'Bronze', ar: 'برونزي' },
  2: { en: 'Silver', ar: 'فضي' },
  3: { en: 'Gold', ar: 'ذهبي' },
  4: { en: 'Platinum', ar: 'بلاتيني' },
  5: { en: 'Diamond', ar: 'ماسي' },
};

// ثوابت ألوان المستويات
export const TIER_COLORS: Record<TierLevel, string> = {
  1: '#CD7F32', // Bronze
  2: '#C0C0C0', // Silver
  3: '#FFD700', // Gold
  4: '#E5E4E2', // Platinum
  5: '#B9F2FF', // Diamond
};

// ثوابت أيقونات المستويات
export const TIER_ICONS: Record<TierLevel, string> = {
  1: '🥉',
  2: '🥈',
  3: '🥇',
  4: '💎',
  5: '👑',
};

// نقاط لكل نوع اشتراك
export const REFERRAL_POINTS = {
  monthly: 300,
  yearly: 1000,
} as const;

// خصم المُحال
export const REFERRED_DISCOUNT = 0.20; // 20%
