// =====================================================
// Hook لوحة تحكم الإحالة
// =====================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReferralService } from '@/lib/referral';
import type { ReferralDashboard } from '@/types/referral';
import { useTenant } from '@/context/tenant';

const QUERY_KEY = 'referral-dashboard';

export function useReferralDashboard() {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery<ReferralDashboard | null>({
    queryKey: [QUERY_KEY, orgId],
    queryFn: async () => {
      if (!orgId) return null;
      return ReferralService.getDashboard(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 دقائق
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
  };

  return {
    // البيانات
    dashboard,
    code: dashboard?.code,
    points: dashboard?.points,
    tier: dashboard?.tier,
    nextTier: dashboard?.next_tier,
    recentReferrals: dashboard?.recent_referrals || [],
    recentTransactions: dashboard?.recent_transactions || [],
    availableRewards: dashboard?.available_rewards || [],

    // الحالة
    isLoading,
    error,

    // الإجراءات
    refetch,
    invalidate,

    // معلومات مشتقة
    hasCode: !!dashboard?.code?.code,
    isMaxTier: !dashboard?.next_tier,
    pointsToNextTier: dashboard?.next_tier?.points_needed || 0,
    canRedeemAny: (dashboard?.available_rewards || []).some((r) => r.can_redeem),
  };
}

export default useReferralDashboard;
