// =====================================================
// لوحة تحكم الإحالة الرئيسية - Referral Dashboard Component
// =====================================================

import { cn } from '@/lib/utils';
import { Loader2, Gift, TrendingUp, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ReferralCodeCard } from './ReferralCodeCard';
import { ReferralPointsDisplay } from './ReferralPointsDisplay';
import { ReferralTierProgress } from './ReferralTierProgress';
import { ReferralStats } from './ReferralStats';
import { RewardsGrid, AvailableRewardsGrid } from './RewardsGrid';
import { ReferralHistory } from './ReferralHistory';
import { TransactionsHistory } from './TransactionsHistory';
import { RedemptionDialog } from './RedemptionDialog';

import { useReferralDashboard } from '@/hooks/useReferralDashboard';
import { useReferralPoints, useReferralTransactions } from '@/hooks/useReferralPoints';
import { useReferralRedemption } from '@/hooks/useReferralRedemption';
import { ReferralService } from '@/lib/referral';
import type { Referral, TierLevel, ReferralReward } from '@/types/referral';

interface ReferralDashboardProps {
  className?: string;
}

export function ReferralDashboard({ className }: ReferralDashboardProps) {
  const { dashboard, isLoading } = useReferralDashboard();
  const { tierLevel, availablePoints, tiers } = useReferralPoints();
  const { transactions } = useReferralTransactions();
  const {
    selectedReward,
    isDialogOpen,
    openRedemptionDialog,
    handleClose,
  } = useReferralRedemption();

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-20', className)}>
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">جاري تحميل لوحة الإحالة...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={cn('text-center py-20', className)}>
        <Gift className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">برنامج الإحالة</h2>
        <p className="mt-2 text-muted-foreground">
          ابدأ بمشاركة كود الإحالة الخاص بك لكسب النقاط والمكافآت
        </p>
      </div>
    );
  }

  // تحويل البيانات
  const referrals: Referral[] = (dashboard.recent_referrals || []).map((r: any) => ({
    id: r.id,
    referrer_org_id: '',
    referred_org_id: '',
    referral_code_id: '',
    status: r.status,
    signup_date: null,
    first_subscription_date: null,
    points_awarded: r.points_awarded || 0,
    bonus_points: 0,
    total_renewals: 0,
    total_points_from_renewals: 0,
    created_at: r.created_at,
    updated_at: r.created_at,
  }));

  const currentTier = tiers.find((t) => t.level === dashboard.tier?.level);
  const nextTier = dashboard.next_tier;

  return (
    <div className={cn('space-y-6', className)}>
      {/* القسم العلوي: الكود والنقاط */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* بطاقة كود الإحالة */}
        <ReferralCodeCard />

        {/* المستوى والتقدم */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              مستواك الحالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferralTierProgress
              currentLevel={(dashboard.tier?.level || 1) as TierLevel}
              currentTierName={dashboard.tier?.name_ar || 'برونزي'}
              nextTierName={nextTier?.name_ar}
              progress={
                nextTier
                  ? ((dashboard.points?.total || 0) / nextTier.points_needed) * 100
                  : 100
              }
              pointsToNextTier={nextTier?.points_needed || 0}
              totalPoints={dashboard.points?.total || 0}
            />

            {/* المزايا الحالية */}
            {currentTier?.perks && currentTier.perks.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">مزايا مستواك:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {currentTier.perks.slice(0, 3).map((perk, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* عرض النقاط */}
      <ReferralPointsDisplay
        totalPoints={dashboard.points?.total || 0}
        availablePoints={dashboard.points?.available || 0}
        spentPoints={dashboard.points?.spent || 0}
        bonusPercentage={dashboard.tier?.bonus_percentage || 0}
      />

      {/* الإحصائيات */}
      <ReferralStats
        lifetimeReferrals={dashboard.points?.lifetime_referrals || 0}
        activeReferrals={dashboard.points?.active_referrals || 0}
        totalRenewals={0}
        conversionRate={
          dashboard.code?.total_clicks && dashboard.code?.total_subscriptions
            ? Math.round(
                (dashboard.code.total_subscriptions / dashboard.code.total_clicks) * 100
              )
            : 0
        }
      />

      {/* التبويبات: المكافآت، الإحالات، المعاملات */}
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            المكافآت
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الإحالات
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            المعاملات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-6">
          <RewardsGrid onRedeem={openRedemptionDialog} />
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <ReferralHistory referrals={referrals} showTitle={false} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsHistory
            transactions={transactions}
            showTitle={false}
            showFilter
          />
        </TabsContent>
      </Tabs>

      {/* حوار الاستبدال */}
      <RedemptionDialog
        reward={selectedReward}
        isOpen={isDialogOpen}
        onClose={handleClose}
        availablePoints={availablePoints}
      />
    </div>
  );
}

export default ReferralDashboard;
