// =====================================================
// سجل الإحالات - Referral History Component
// =====================================================

import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  UserPlus,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Referral, ReferralStatus } from '@/types/referral';

interface ReferralHistoryProps {
  referrals: Referral[];
  isLoading?: boolean;
  showTitle?: boolean;
  maxHeight?: string;
  className?: string;
}

const statusConfig: Record<
  ReferralStatus,
  { label: string; icon: React.ComponentType<any>; color: string }
> = {
  pending: {
    label: 'في الانتظار',
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  },
  signed_up: {
    label: 'مسجل',
    icon: UserPlus,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  subscribed: {
    label: 'مشترك',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  },
  churned: {
    label: 'ملغي',
    icon: XCircle,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  },
};

export function ReferralHistory({
  referrals,
  isLoading = false,
  showTitle = true,
  maxHeight = '400px',
  className,
}: ReferralHistoryProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              سجل الإحالات
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (referrals.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              سجل الإحالات
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="text-center py-8">
          <UserPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">لا توجد إحالات بعد</p>
          <p className="text-sm text-muted-foreground">
            شارك كود الإحالة الخاص بك لبدء كسب النقاط
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            سجل الإحالات
            <Badge variant="secondary">{referrals.length}</Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="divide-y">
            {referrals.map((referral) => (
              <ReferralHistoryItem key={referral.id} referral={referral} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ReferralHistoryItem({ referral }: { referral: Referral }) {
  const config = statusConfig[referral.status];
  const StatusIcon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(referral.created_at), {
    addSuffix: true,
    locale: ar,
  });

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-full p-2', config.color.split(' ').slice(1).join(' '))}>
          <StatusIcon className={cn('h-4 w-4', config.color.split(' ')[0])} />
        </div>
        <div>
          <p className="font-medium">إحالة جديدة</p>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
        </div>
      </div>

      <div className="text-left">
        <Badge
          variant="outline"
          className={cn('mb-1', config.color.split(' ')[0])}
        >
          {config.label}
        </Badge>
        {referral.points_awarded > 0 && (
          <p className="text-sm font-medium text-primary">
            +{referral.points_awarded + referral.bonus_points} نقطة
          </p>
        )}
      </div>
    </div>
  );
}

// سجل مصغر للعرض السريع
export function ReferralHistoryCompact({
  referrals,
  limit = 5,
  className,
}: {
  referrals: Referral[];
  limit?: number;
  className?: string;
}) {
  const displayedReferrals = referrals.slice(0, limit);

  if (displayedReferrals.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        لا توجد إحالات حديثة
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayedReferrals.map((referral) => {
        const config = statusConfig[referral.status];
        const timeAgo = formatDistanceToNow(new Date(referral.created_at), {
          addSuffix: true,
          locale: ar,
        });

        return (
          <div
            key={referral.id}
            className="flex items-center justify-between rounded-lg border p-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
              <span className="text-muted-foreground">{timeAgo}</span>
            </div>
            {referral.points_awarded > 0 && (
              <span className="font-medium text-primary">
                +{referral.points_awarded}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ReferralHistory;
