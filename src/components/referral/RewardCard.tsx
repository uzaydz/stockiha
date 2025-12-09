// =====================================================
// بطاقة المكافأة - Reward Card Component
// =====================================================

import { cn } from '@/lib/utils';
import { Star, Lock, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReferralTierBadge } from './ReferralTierBadge';
import { ReferralRewardsService } from '@/lib/referral';
import type { ReferralReward, TierLevel } from '@/types/referral';
import { TIER_NAMES } from '@/types/referral';

interface RewardCardProps {
  reward: ReferralReward;
  userTierLevel: TierLevel;
  availablePoints: number;
  onRedeem: (reward: ReferralReward) => void;
  className?: string;
}

export function RewardCard({
  reward,
  userTierLevel,
  availablePoints,
  onRedeem,
  className,
}: RewardCardProps) {
  const canAfford = availablePoints >= reward.points_cost;
  const hasRequiredTier = userTierLevel >= reward.min_tier_level;
  const canRedeem = canAfford && hasRequiredTier;

  const typeIcon = ReferralRewardsService.getRewardTypeIcon(reward.reward_type);
  const typeName = ReferralRewardsService.getRewardTypeName(reward.reward_type);

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        canRedeem && 'hover:shadow-md',
        !canRedeem && 'opacity-75',
        className
      )}
    >
      {/* شارة النوع */}
      <div className="absolute left-3 top-3">
        <Badge variant="secondary" className="text-xs">
          {typeIcon} {typeName}
        </Badge>
      </div>

      <CardContent className="pt-12 pb-4">
        {/* أيقونة المكافأة */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
            {reward.icon || typeIcon}
          </div>
        </div>

        {/* اسم المكافأة */}
        <h3 className="mb-2 text-center text-lg font-semibold">
          {reward.name_ar}
        </h3>

        {/* الوصف */}
        {reward.description_ar && (
          <p className="mb-4 text-center text-sm text-muted-foreground line-clamp-2">
            {reward.description_ar}
          </p>
        )}

        {/* تكلفة النقاط */}
        <div className="mb-4 flex items-center justify-center gap-1">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="text-2xl font-bold">
            {new Intl.NumberFormat('ar-DZ').format(reward.points_cost)}
          </span>
          <span className="text-sm text-muted-foreground">نقطة</span>
        </div>

        {/* المستوى المطلوب */}
        {reward.min_tier_level > 1 && (
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {!hasRequiredTier && <Lock className="h-4 w-4" />}
              <span>يتطلب:</span>
              <ReferralTierBadge
                level={reward.min_tier_level as TierLevel}
                name={TIER_NAMES[reward.min_tier_level as TierLevel].ar}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* زر الاستبدال */}
        <Button
          className="w-full"
          disabled={!canRedeem}
          onClick={() => onRedeem(reward)}
        >
          {!hasRequiredTier ? (
            <>
              <Lock className="ml-2 h-4 w-4" />
              غير متاح لمستواك
            </>
          ) : !canAfford ? (
            <>نقاط غير كافية ({availablePoints}/{reward.points_cost})</>
          ) : (
            <>
              استبدال الآن
              <ChevronLeft className="mr-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* المدة إن وجدت */}
        {reward.duration_days && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            صالح لمدة {reward.duration_days} يوم
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// بطاقة مصغرة
export function RewardCardCompact({
  reward,
  canRedeem,
  onRedeem,
  className,
}: {
  reward: ReferralReward;
  canRedeem: boolean;
  onRedeem: (reward: ReferralReward) => void;
  className?: string;
}) {
  const typeIcon = ReferralRewardsService.getRewardTypeIcon(reward.reward_type);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3 transition-colors',
        canRedeem && 'cursor-pointer hover:bg-muted/50',
        !canRedeem && 'opacity-60',
        className
      )}
      onClick={() => canRedeem && onRedeem(reward)}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{reward.icon || typeIcon}</span>
        <div>
          <p className="font-medium">{reward.name_ar}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3 w-3 text-yellow-500" />
            {new Intl.NumberFormat('ar-DZ').format(reward.points_cost)} نقطة
          </div>
        </div>
      </div>
      {canRedeem && <ChevronLeft className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
}

export default RewardCard;
