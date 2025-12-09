// =====================================================
// شبكة المكافآت - Rewards Grid Component
// =====================================================

import { cn } from '@/lib/utils';
import { Gift, Loader2 } from 'lucide-react';
import { RewardCard, RewardCardCompact } from './RewardCard';
import { useReferralRewards } from '@/hooks/useReferralRewards';
import { useReferralPoints } from '@/hooks/useReferralPoints';
import type { ReferralReward, TierLevel } from '@/types/referral';

interface RewardsGridProps {
  onRedeem: (reward: ReferralReward) => void;
  compact?: boolean;
  limit?: number;
  className?: string;
}

export function RewardsGrid({
  onRedeem,
  compact = false,
  limit,
  className,
}: RewardsGridProps) {
  const { allRewards, isLoading } = useReferralRewards();
  const { tierLevel, availablePoints } = useReferralPoints();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rewards = limit ? allRewards.slice(0, limit) : allRewards;

  if (rewards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">لا توجد مكافآت متاحة حالياً</p>
        <p className="text-sm text-muted-foreground">
          تحقق لاحقاً للاطلاع على المكافآت الجديدة
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {rewards.map((reward) => (
          <RewardCardCompact
            key={reward.id}
            reward={reward}
            canRedeem={
              availablePoints >= reward.points_cost &&
              tierLevel >= reward.min_tier_level
            }
            onRedeem={onRedeem}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {rewards.map((reward) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          userTierLevel={tierLevel as TierLevel}
          availablePoints={availablePoints}
          onRedeem={onRedeem}
        />
      ))}
    </div>
  );
}

// المكافآت المتاحة فقط
export function AvailableRewardsGrid({
  onRedeem,
  className,
}: {
  onRedeem: (reward: ReferralReward) => void;
  className?: string;
}) {
  const { availableRewards, isLoading } = useReferralRewards();
  const { tierLevel, availablePoints } = useReferralPoints();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const redeemableRewards = availableRewards.filter(
    (r) => availablePoints >= r.points_cost
  );

  if (redeemableRewards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          اجمع المزيد من النقاط لفتح المكافآت
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {redeemableRewards.map((reward) => (
        <RewardCardCompact
          key={reward.id}
          reward={reward}
          canRedeem={true}
          onRedeem={onRedeem}
        />
      ))}
    </div>
  );
}

export default RewardsGrid;
