// =====================================================
// لوحة تحكم الإحالات - Super Admin Referrals Dashboard
// =====================================================

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  Gift,
  TrendingUp,
  Star,
  Clock,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ReferralAdminService } from '@/lib/referral';
import { TIER_ICONS, TIER_COLORS, type TierLevel } from '@/types/referral';
import { Link } from 'react-router-dom';

export default function ReferralsAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: ReferralAdminService.getStats,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <ReferralsDashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">فشل في تحميل الإحصائيات</p>
      </div>
    );
  }

  const formatNumber = (n: number) => new Intl.NumberFormat('ar-DZ').format(n);

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* العنوان */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8" />
          نظام الإحالات
        </h1>
        <p className="text-muted-foreground mt-1">
          إدارة ومراقبة برنامج الإحالة
        </p>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الإحالات"
          value={formatNumber(stats.total_referrals)}
          icon={Users}
          description={`${formatNumber(stats.referrals_this_month)} هذا الشهر`}
        />
        <StatCard
          title="الإحالات الناجحة"
          value={formatNumber(stats.successful_referrals)}
          icon={UserCheck}
          description={`معدل التحويل: ${stats.conversion_rate}%`}
          trend={stats.conversion_rate}
        />
        <StatCard
          title="النقاط الموزعة"
          value={formatNumber(stats.total_points_distributed)}
          icon={Star}
          description={`مستبدل: ${formatNumber(stats.total_points_redeemed)}`}
        />
        <Link to="/super-admin/referrals/redemptions">
          <StatCard
            title="طلبات معلقة"
            value={formatNumber(stats.pending_redemptions)}
            icon={Clock}
            description="انقر للمراجعة"
            highlight={stats.pending_redemptions > 0}
          />
        </Link>
      </div>

      {/* الصف الثاني */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* توزيع المستويات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              توزيع المستويات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.tier_distribution.map((tier) => {
              const level = tier.tier_level as TierLevel;
              const totalUsers = stats.tier_distribution.reduce(
                (sum, t) => sum + t.count,
                0
              );
              const percentage =
                totalUsers > 0 ? (tier.count / totalUsers) * 100 : 0;

              return (
                <div key={tier.tier_level} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{TIER_ICONS[level]}</span>
                      <span>{tier.tier_name}</span>
                    </div>
                    <span className="font-medium">{tier.count}</span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                    style={
                      {
                        '--progress-foreground': TIER_COLORS[level],
                      } as React.CSSProperties
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* أفضل المُحيلين */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              أفضل المُحيلين
            </CardTitle>
            <Link to="/super-admin/referrals/referrers">
              <Badge variant="outline" className="cursor-pointer">
                عرض الكل
                <ArrowUpRight className="mr-1 h-3 w-3" />
              </Badge>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_referrers.slice(0, 5).map((referrer, index) => (
                <div
                  key={referrer.organization_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{referrer.organization_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {referrer.referral_count} إحالة
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant="secondary">{referrer.tier_name}</Badge>
                    <p className="text-sm font-medium text-primary mt-1">
                      {formatNumber(referrer.total_points)} نقطة
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* روابط سريعة */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          to="/super-admin/referrals/referrers"
          icon={Users}
          title="المُحيلين"
          description="إدارة المُحيلين ونقاطهم"
        />
        <QuickLink
          to="/super-admin/referrals/redemptions"
          icon={Gift}
          title="طلبات الاستبدال"
          description="مراجعة طلبات المكافآت"
          badge={stats.pending_redemptions > 0 ? stats.pending_redemptions : undefined}
        />
        <QuickLink
          to="/super-admin/referrals/rewards"
          icon={Star}
          title="المكافآت"
          description="إدارة المكافآت المتاحة"
        />
        <QuickLink
          to="/super-admin/referrals/transactions"
          icon={TrendingUp}
          title="المعاملات"
          description="سجل جميع المعاملات"
        />
      </div>
    </div>
  );
}

// مكون بطاقة الإحصائية
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  highlight,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trend?: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div
            className={`rounded-full p-3 ${
              highlight ? 'bg-primary/10' : 'bg-muted'
            }`}
          >
            <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : ''}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// مكون الرابط السريع
function QuickLink({
  to,
  icon: Icon,
  title,
  description,
  badge,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <Icon className="h-8 w-8 text-primary" />
            {badge && (
              <Badge variant="destructive" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold mt-4">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// هيكل التحميل
function ReferralsDashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
