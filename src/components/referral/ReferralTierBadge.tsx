// =====================================================
// شارة المستوى - Tier Badge Component
// =====================================================

import { cn } from '@/lib/utils';
import { TIER_ICONS, TIER_COLORS, type TierLevel } from '@/types/referral';

interface ReferralTierBadgeProps {
  level: TierLevel;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function ReferralTierBadge({
  level,
  name,
  size = 'md',
  showName = true,
  className,
}: ReferralTierBadgeProps) {
  const icon = TIER_ICONS[level] || TIER_ICONS[1];
  const color = TIER_COLORS[level] || TIER_COLORS[1];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span className={iconSizes[size]}>{icon}</span>
      {showName && <span>{name}</span>}
    </div>
  );
}

// نسخة مصغرة للعرض في الأماكن الضيقة
export function ReferralTierIcon({
  level,
  size = 'md',
  className,
}: {
  level: TierLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const icon = TIER_ICONS[level] || TIER_ICONS[1];

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return <span className={cn(sizeClasses[size], className)}>{icon}</span>;
}

export default ReferralTierBadge;
