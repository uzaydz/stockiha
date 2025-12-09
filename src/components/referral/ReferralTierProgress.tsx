// =====================================================
// شريط التقدم للمستوى - Tier Progress Component
// =====================================================

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ReferralTierBadge } from './ReferralTierBadge';
import { TIER_COLORS, type TierLevel } from '@/types/referral';

interface ReferralTierProgressProps {
  currentLevel: TierLevel;
  currentTierName: string;
  nextTierName?: string;
  progress: number;
  pointsToNextTier: number;
  totalPoints: number;
  className?: string;
}

export function ReferralTierProgress({
  currentLevel,
  currentTierName,
  nextTierName,
  progress,
  pointsToNextTier,
  totalPoints,
  className,
}: ReferralTierProgressProps) {
  const isMaxTier = !nextTierName;
  const currentColor = TIER_COLORS[currentLevel];
  const nextLevel = Math.min(currentLevel + 1, 5) as TierLevel;
  const nextColor = TIER_COLORS[nextLevel];

  return (
    <div className={cn('space-y-3', className)}>
      {/* شريط المستويات */}
      <div className="flex items-center justify-between">
        <ReferralTierBadge level={currentLevel} name={currentTierName} size="sm" />
        {!isMaxTier && (
          <ReferralTierBadge level={nextLevel} name={nextTierName!} size="sm" />
        )}
      </div>

      {/* شريط التقدم */}
      <div className="relative">
        <Progress
          value={progress}
          className="h-3"
          style={{
            // @ts-ignore
            '--progress-background': `${currentColor}30`,
            '--progress-foreground': currentColor,
          }}
        />

        {/* نقاط العلامات */}
        <div className="absolute inset-0 flex items-center">
          <div
            className="h-4 w-4 rounded-full border-2 bg-white shadow-sm"
            style={{ borderColor: currentColor, marginRight: '-2px' }}
          />
          {!isMaxTier && (
            <div
              className="absolute left-full h-4 w-4 rounded-full border-2 bg-white shadow-sm -translate-x-full"
              style={{ borderColor: nextColor }}
            />
          )}
        </div>
      </div>

      {/* معلومات التقدم */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {new Intl.NumberFormat('ar-DZ').format(totalPoints)} نقطة
        </span>
        {!isMaxTier ? (
          <span className="text-muted-foreground">
            باقي{' '}
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat('ar-DZ').format(pointsToNextTier)}
            </span>{' '}
            نقطة للترقية
          </span>
        ) : (
          <span className="font-medium text-primary">
            وصلت للمستوى الأعلى!
          </span>
        )}
      </div>
    </div>
  );
}

// نسخة مصغرة
export function ReferralTierProgressCompact({
  currentLevel,
  progress,
  className,
}: {
  currentLevel: TierLevel;
  progress: number;
  className?: string;
}) {
  const color = TIER_COLORS[currentLevel];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress
        value={progress}
        className="h-2 flex-1"
        style={{
          // @ts-ignore
          '--progress-background': `${color}30`,
          '--progress-foreground': color,
        }}
      />
      <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
    </div>
  );
}

export default ReferralTierProgress;
