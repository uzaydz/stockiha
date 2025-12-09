// =====================================================
// Hook إدارة نقاط الإحالة
// =====================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReferralPointsService } from '@/lib/referral';
import type {
  ReferralPoints,
  ReferralPointsTransaction,
  ReferralTier,
  TransactionType,
} from '@/types/referral';
import { useTenant } from '@/context/tenant';

const POINTS_KEY = 'referral-points';
const TRANSACTIONS_KEY = 'referral-transactions';
const TIERS_KEY = 'referral-tiers';

export function useReferralPoints() {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  // جلب رصيد النقاط
  const {
    data: points,
    isLoading: isLoadingPoints,
    error: pointsError,
  } = useQuery<ReferralPoints | null>({
    queryKey: [POINTS_KEY, orgId],
    queryFn: async () => {
      if (!orgId) return null;
      return ReferralPointsService.getPoints(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2, // 2 دقيقة
  });

  // جلب المستويات
  const { data: tiers = [] } = useQuery<ReferralTier[]>({
    queryKey: [TIERS_KEY],
    queryFn: ReferralPointsService.getTiers,
    staleTime: 1000 * 60 * 60, // ساعة
  });

  // حساب المستوى الحالي والتالي
  const currentTier = tiers.find((t) => t.id === points?.current_tier_id);
  const nextTier = currentTier ? tiers.find((t) => t.level === currentTier.level + 1) : null;

  // حساب التقدم
  const progress = currentTier && points
    ? ReferralPointsService.calculateProgress(
        points.total_points,
        currentTier.min_points,
        nextTier?.min_points || null
      )
    : 0;

  const pointsToNextTier = nextTier && points
    ? ReferralPointsService.calculatePointsToNextTier(points.total_points, nextTier.min_points)
    : 0;

  // تحديث البيانات
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [POINTS_KEY, orgId] });
    queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY, orgId] });
  };

  return {
    // البيانات الأساسية
    points,
    totalPoints: points?.total_points || 0,
    availablePoints: points?.available_points || 0,
    spentPoints: points?.spent_points || 0,
    lifetimeReferrals: points?.lifetime_referrals || 0,
    activeReferrals: points?.active_referrals || 0,

    // المستويات
    tiers,
    currentTier,
    nextTier,
    tierLevel: currentTier?.level || 1,
    bonusPercentage: currentTier?.bonus_percentage || 0,

    // التقدم
    progress,
    pointsToNextTier,
    isMaxTier: !nextTier,

    // الحالة
    isLoading: isLoadingPoints,
    error: pointsError,

    // الإجراءات
    invalidate,
    formatPoints: ReferralPointsService.formatPoints,
  };
}

// Hook لجلب المعاملات
export function useReferralTransactions(
  type?: TransactionType,
  limit: number = 50
) {
  const { organization } = useTenant();
  const orgId = organization?.id;

  const {
    data: transactions = [],
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  } = useQuery<ReferralPointsTransaction[]>({
    queryKey: [TRANSACTIONS_KEY, orgId, type, limit],
    queryFn: async () => {
      if (!orgId) return [];
      if (type) {
        return ReferralPointsService.getTransactionsByType(orgId, type, limit);
      }
      return ReferralPointsService.getTransactions(orgId, limit, 0);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60, // دقيقة
  });

  // تنسيق نوع المعاملة
  const formatTransactionType = (txType: TransactionType): string => {
    const types: Record<TransactionType, string> = {
      referral_signup: 'تسجيل إحالة',
      referral_subscription: 'اشتراك محال',
      renewal_bonus: 'مكافأة تجديد',
      redemption: 'استبدال',
      refund: 'إرجاع',
      admin_bonus: 'مكافأة إدارية',
      admin_deduction: 'خصم إداري',
      tier_change: 'تغيير مستوى',
    };
    return types[txType] || txType;
  };

  return {
    transactions,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    formatTransactionType,
  };
}

// Hook لإحصائيات النقاط
export function useReferralPointsStats() {
  const { organization } = useTenant();
  const orgId = organization?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['referral-points-stats', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      return ReferralPointsService.getPointsStats(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  return {
    stats,
    isLoading,
    totalEarned: stats?.total_earned || 0,
    totalSpent: stats?.total_spent || 0,
    thisMonthEarned: stats?.this_month_earned || 0,
    thisMonthSpent: stats?.this_month_spent || 0,
  };
}

export default useReferralPoints;
