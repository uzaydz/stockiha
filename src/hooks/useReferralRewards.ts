// =====================================================
// Hook إدارة مكافآت الإحالة
// =====================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReferralRewardsService } from '@/lib/referral';
import type {
  ReferralReward,
  ReferralRedemption,
  RedemptionStatus,
  RewardType,
  TierLevel,
} from '@/types/referral';
import { useTenant } from '@/context/tenant';
import { useReferralPoints } from './useReferralPoints';

const REWARDS_KEY = 'referral-rewards';
const REDEMPTIONS_KEY = 'referral-redemptions';

export function useReferralRewards() {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const orgId = organization?.id;
  const { tierLevel, availablePoints } = useReferralPoints();

  // جلب جميع المكافآت النشطة
  const {
    data: allRewards = [],
    isLoading: isLoadingRewards,
  } = useQuery<ReferralReward[]>({
    queryKey: [REWARDS_KEY, 'all'],
    queryFn: ReferralRewardsService.getActiveRewards,
    staleTime: 1000 * 60 * 30, // 30 دقيقة
  });

  // جلب المكافآت المتاحة للمستخدم
  const {
    data: availableRewards = [],
    isLoading: isLoadingAvailable,
  } = useQuery<ReferralReward[]>({
    queryKey: [REWARDS_KEY, 'available', tierLevel, availablePoints],
    queryFn: () =>
      ReferralRewardsService.getAvailableRewards(
        tierLevel as TierLevel,
        availablePoints
      ),
    enabled: tierLevel > 0,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // تصنيف المكافآت حسب النوع
  const rewardsByType = allRewards.reduce(
    (acc, reward) => {
      if (!acc[reward.reward_type]) {
        acc[reward.reward_type] = [];
      }
      acc[reward.reward_type].push(reward);
      return acc;
    },
    {} as Record<RewardType, ReferralReward[]>
  );

  // تحديث البيانات
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
  };

  return {
    // البيانات
    allRewards,
    availableRewards,
    rewardsByType,

    // الحالة
    isLoading: isLoadingRewards || isLoadingAvailable,

    // الإجراءات
    invalidate,

    // دوال مساعدة
    getRewardTypeIcon: ReferralRewardsService.getRewardTypeIcon,
    getRewardTypeName: ReferralRewardsService.getRewardTypeName,

    // معلومات مشتقة
    canRedeemAny: availableRewards.some(
      (r) => availablePoints >= r.points_cost
    ),
    cheapestReward: availableRewards.length
      ? Math.min(...availableRewards.map((r) => r.points_cost))
      : null,
  };
}

// Hook لجلب طلبات الاستبدال
export function useReferralRedemptions(status?: RedemptionStatus) {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const {
    data: redemptions = [],
    isLoading,
    error,
  } = useQuery<ReferralRedemption[]>({
    queryKey: [REDEMPTIONS_KEY, orgId, status],
    queryFn: async () => {
      if (!orgId) return [];
      return ReferralRewardsService.getRedemptions(orgId, status);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2, // 2 دقيقة
  });

  // عدد الطلبات حسب الحالة
  const {
    data: counts,
    isLoading: isLoadingCounts,
  } = useQuery<Record<RedemptionStatus, number>>({
    queryKey: [REDEMPTIONS_KEY, orgId, 'counts'],
    queryFn: async () => {
      if (!orgId)
        return { pending: 0, approved: 0, rejected: 0, completed: 0 };
      return ReferralRewardsService.getRedemptionsCount(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // تحديث البيانات
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [REDEMPTIONS_KEY, orgId] });
    queryClient.invalidateQueries({ queryKey: ['referral-points', orgId] });
    queryClient.invalidateQueries({ queryKey: ['referral-dashboard', orgId] });
  };

  return {
    // البيانات
    redemptions,
    counts: counts || { pending: 0, approved: 0, rejected: 0, completed: 0 },

    // الحالة
    isLoading,
    isLoadingCounts,
    error,

    // الإجراءات
    invalidate,

    // دوال مساعدة
    getStatusInfo: ReferralRewardsService.getRedemptionStatusInfo,

    // معلومات مشتقة
    hasPending: (counts?.pending || 0) > 0,
    totalRedemptions: redemptions.length,
  };
}

export default useReferralRewards;
