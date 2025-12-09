// =====================================================
// عرض النقاط - Points Display Component
// =====================================================

import { cn } from '@/lib/utils';
import { Star, TrendingUp, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ReferralPointsDisplayProps {
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  bonusPercentage?: number;
  className?: string;
}

export function ReferralPointsDisplay({
  totalPoints,
  availablePoints,
  spentPoints,
  bonusPercentage = 0,
  className,
}: ReferralPointsDisplayProps) {
  const formatNumber = (n: number) => new Intl.NumberFormat('ar-DZ').format(n);

  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {/* النقاط المتاحة */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">النقاط المتاحة</p>
              <p className="text-3xl font-bold text-primary">
                {formatNumber(availablePoints)}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <Star className="h-5 w-5 text-primary" />
            </div>
          </div>
          {bonusPercentage > 0 && (
            <p className="mt-2 text-xs text-primary">
              +{bonusPercentage}% مكافأة على الإحالات الجديدة
            </p>
          )}
        </CardContent>
      </Card>

      {/* إجمالي النقاط المكتسبة */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المكتسب</p>
              <p className="text-3xl font-bold">{formatNumber(totalPoints)}</p>
            </div>
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* النقاط المستخدمة */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">النقاط المستخدمة</p>
              <p className="text-3xl font-bold">{formatNumber(spentPoints)}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// عرض مصغر للنقاط
export function ReferralPointsBadge({
  points,
  size = 'md',
  className,
}: {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary/10 font-medium text-primary',
        sizeClasses[size],
        className
      )}
    >
      <Star className="h-3 w-3" />
      {new Intl.NumberFormat('ar-DZ').format(points)}
    </span>
  );
}

export default ReferralPointsDisplay;
