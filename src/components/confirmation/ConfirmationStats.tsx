import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface ConfirmationStat {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'slate';
}

interface ConfirmationStatsProps {
  stats: ConfirmationStat[];
  isLoading?: boolean;
}

const accentClasses: Record<NonNullable<ConfirmationStat['accent']>, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
};

export const ConfirmationStats = memo(({ stats, isLoading }: ConfirmationStatsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border border-border/40">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.id} className="border border-border/40 backdrop-blur-sm bg-background/80">
          <CardContent className="p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              {stat.icon && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full border w-10 h-10',
                    accentClasses[stat.accent || 'slate'],
                  )}
                >
                  {stat.icon}
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
            {stat.subtitle && <div className="text-xs text-muted-foreground">{stat.subtitle}</div>}
            {stat.trend && stat.trendValue && (
              <div
                className={cn(
                  'text-xs font-medium',
                  stat.trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                  stat.trend === 'down' && 'text-rose-600 dark:text-rose-400',
                  stat.trend === 'neutral' && 'text-muted-foreground',
                )}
              >
                {stat.trend === 'up' && '▲'}
                {stat.trend === 'down' && '▼'}
                {stat.trend === 'neutral' && '◼'}
                <span className="ml-1">{stat.trendValue}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

ConfirmationStats.displayName = 'ConfirmationStats';

export default ConfirmationStats;
