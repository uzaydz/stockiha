// =====================================================
// خدمة مكافآت الإحالة - Referral Rewards Service
// =====================================================

import { supabase } from '@/lib/supabase-unified';
import type {
  ReferralReward,
  ReferralRedemption,
  RedemptionStatus,
  RewardType,
  TierLevel,
} from '@/types/referral';

/**
 * خدمة إدارة المكافآت والاستبدالات
 */
export class ReferralRewardsService {
  /**
   * جلب جميع المكافآت النشطة
   */
  static async getActiveRewards(): Promise<ReferralReward[]> {
    console.log('[ReferralRewards] 🔍 Fetching active rewards...');

    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (error) {
      console.error('[ReferralRewards] ❌ Error fetching rewards:', error);
      return [];
    }

    console.log('[ReferralRewards] ✅ Fetched rewards:', data?.length || 0, data);
    return data || [];
  }

  /**
   * جلب المكافآت المتاحة للمستخدم حسب مستواه ونقاطه
   */
  static async getAvailableRewards(
    tierLevel: TierLevel,
    availablePoints: number
  ): Promise<ReferralReward[]> {
    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('is_active', true)
      .lte('min_tier_level', tierLevel)
      .order('points_cost', { ascending: true });

    if (error) {
      console.error('Error fetching available rewards:', error);
      return [];
    }

    // إضافة معلومة إمكانية الاستبدال
    return (data || []).map((reward) => ({
      ...reward,
      can_redeem: availablePoints >= reward.points_cost,
    }));
  }

  /**
   * جلب مكافأة محددة
   */
  static async getReward(rewardId: string): Promise<ReferralReward | null> {
    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (error) {
      console.error('Error fetching reward:', error);
      return null;
    }

    return data;
  }

  /**
   * جلب طلبات الاستبدال للمؤسسة
   */
  static async getRedemptions(
    orgId: string,
    status?: RedemptionStatus
  ): Promise<ReferralRedemption[]> {
    let query = supabase
      .from('referral_redemptions')
      .select(`
        *,
        reward:referral_rewards(*)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching redemptions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * جلب طلب استبدال محدد
   */
  static async getRedemption(redemptionId: string): Promise<ReferralRedemption | null> {
    const { data, error } = await supabase
      .from('referral_redemptions')
      .select(`
        *,
        reward:referral_rewards(*)
      `)
      .eq('id', redemptionId)
      .single();

    if (error) {
      console.error('Error fetching redemption:', error);
      return null;
    }

    return data;
  }

  /**
   * جلب المكافآت حسب النوع
   */
  static async getRewardsByType(type: RewardType): Promise<ReferralReward[]> {
    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('reward_type', type)
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (error) {
      console.error('Error fetching rewards by type:', error);
      return [];
    }

    return data || [];
  }

  /**
   * حساب عدد طلبات الاستبدال حسب الحالة
   */
  static async getRedemptionsCount(
    orgId: string
  ): Promise<Record<RedemptionStatus, number>> {
    const { data, error } = await supabase
      .from('referral_redemptions')
      .select('status')
      .eq('organization_id', orgId);

    if (error || !data) {
      return { pending: 0, approved: 0, rejected: 0, completed: 0 };
    }

    return data.reduce(
      (acc, { status }) => {
        acc[status as RedemptionStatus] = (acc[status as RedemptionStatus] || 0) + 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, completed: 0 }
    );
  }

  /**
   * تنسيق أيقونة نوع المكافأة
   */
  static getRewardTypeIcon(type: RewardType): string {
    const icons: Record<RewardType, string> = {
      free_subscription: '📅',
      ad_short: '📢',
      ad_month: '📣',
      barcode_scanner: '📦',
      store_tracking: '📊',
      ccp_withdrawal: '💰',
      custom: '🎁',
    };
    return icons[type] || '🎁';
  }

  /**
   * تنسيق اسم نوع المكافأة بالعربي
   */
  static getRewardTypeName(type: RewardType): string {
    const names: Record<RewardType, string> = {
      free_subscription: 'اشتراك مجاني',
      ad_short: 'إشهار قصير',
      ad_month: 'إشهار شهري',
      barcode_scanner: 'سكانر باركود',
      store_tracking: 'تتبع المحل',
      ccp_withdrawal: 'سحب CCP',
      custom: 'مكافأة مخصصة',
    };
    return names[type] || 'أخرى';
  }

  /**
   * تنسيق حالة طلب الاستبدال
   */
  static getRedemptionStatusInfo(status: RedemptionStatus): {
    label: string;
    color: string;
    icon: string;
  } {
    const info: Record<RedemptionStatus, { label: string; color: string; icon: string }> = {
      pending: { label: 'قيد الانتظار', color: 'yellow', icon: '⏳' },
      approved: { label: 'تمت الموافقة', color: 'blue', icon: '✅' },
      rejected: { label: 'مرفوض', color: 'red', icon: '❌' },
      completed: { label: 'مكتمل', color: 'green', icon: '🎉' },
    };
    return info[status] || info.pending;
  }
}

export default ReferralRewardsService;
