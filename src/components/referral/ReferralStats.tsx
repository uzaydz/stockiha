// =====================================================
// إحصائيات الإحالة - Referral Stats Component
// =====================================================

import { cn } from '@/lib/utils';
import { Users, UserCheck, Repeat, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ReferralStatsProps {
  lifetimeReferrals: number;
  activeReferrals: number;
  totalRenewals: number;
  conversionRate: number;
  className?: string;
}

export function ReferralStats({
  lifetimeReferrals,
  activeReferrals,
  totalRenewals,
  conversionRate,
  className,
}: ReferralStatsProps) {
  const stats = [
    {
      label: 'إجمالي الإحالات',
      value: lifetimeReferrals,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'الإحالات النشطة',
      value: activeReferrals,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'التجديدات',
      value: totalRenewals,
      icon: Repeat,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'معدل التحويل',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn('rounded-full p-3', stat.bgColor)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// إحصائيات مصغرة
export function ReferralStatsCompact({
  lifetimeReferrals,
  activeReferrals,
  className,
}: {
  lifetimeReferrals: number;
  activeReferrals: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <div className="flex items-center gap-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{lifetimeReferrals} إحالة</span>
      </div>
      <div className="flex items-center gap-1">
        <UserCheck className="h-4 w-4 text-green-600" />
        <span>{activeReferrals} نشطة</span>
      </div>
    </div>
  );
}

export default ReferralStats;
