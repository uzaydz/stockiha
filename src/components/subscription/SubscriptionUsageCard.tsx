/**
 * 📊 مكون عرض استخدام الاشتراك والحدود
 * يعرض الحدود الحالية للخطة ومقدار الاستخدام
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Users,
  Store,
  Building2,
  UserCheck,
  UsersRound,
  Truck,
  Infinity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SubscriptionService, PLAN_CODES, DEFAULT_PLAN_LIMITS } from '@/lib/subscription-service';
import type { SubscriptionPlanLimits, PlanCode, LimitCheckResult } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface UsageItem {
  key: keyof SubscriptionPlanLimits;
  label: string;
  labelAr: string;
  icon: React.ElementType;
  current: number;
  limit: number | null;
  color: string;
}

interface SubscriptionUsageCardProps {
  organizationId: string;
  planCode?: PlanCode;
  planName?: string;
  status?: 'active' | 'trial' | 'expired';
  daysRemaining?: number;
  onUpgrade?: () => void;
  className?: string;
  // بيانات الاستخدام الحالي
  currentUsage?: {
    products?: number;
    users?: number;
    pos?: number;
    branches?: number;
    staff?: number;
    customers?: number;
    suppliers?: number;
  };
}

export const SubscriptionUsageCard: React.FC<SubscriptionUsageCardProps> = ({
  organizationId,
  planCode = 'trial',
  planName,
  status = 'active',
  daysRemaining,
  onUpgrade,
  className,
  currentUsage = {}
}) => {
  const [limits, setLimits] = useState<SubscriptionPlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        // محاولة جلب الحدود من الخادم
        const serverLimits = await SubscriptionService.getOrganizationLimits(organizationId);
        if (serverLimits) {
          setLimits(serverLimits);
        } else {
          // استخدام الحدود المحلية من كود الخطة
          setLimits(DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial);
        }
      } catch (error) {
        // في حالة الخطأ، استخدم الحدود المحلية
        setLimits(DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [organizationId, planCode]);

  const usageItems: UsageItem[] = [
    {
      key: 'max_products',
      label: 'Products',
      labelAr: 'المنتجات',
      icon: Package,
      current: currentUsage.products || 0,
      limit: limits?.max_products ?? null,
      color: 'blue'
    },
    {
      key: 'max_users',
      label: 'Users',
      labelAr: 'المستخدمين',
      icon: Users,
      current: currentUsage.users || 0,
      limit: limits?.max_users ?? null,
      color: 'purple'
    },
    {
      key: 'max_pos',
      label: 'POS Terminals',
      labelAr: 'نقاط البيع',
      icon: Store,
      current: currentUsage.pos || 0,
      limit: limits?.max_pos ?? null,
      color: 'green'
    },
    {
      key: 'max_branches',
      label: 'Branches',
      labelAr: 'الفروع',
      icon: Building2,
      current: currentUsage.branches || 0,
      limit: limits?.max_branches ?? null,
      color: 'orange'
    },
    {
      key: 'max_staff',
      label: 'Staff',
      labelAr: 'الموظفين',
      icon: UserCheck,
      current: currentUsage.staff || 0,
      limit: limits?.max_staff ?? null,
      color: 'pink'
    },
    {
      key: 'max_customers',
      label: 'Customers',
      labelAr: 'العملاء',
      icon: UsersRound,
      current: currentUsage.customers || 0,
      limit: limits?.max_customers ?? null,
      color: 'cyan'
    },
    {
      key: 'max_suppliers',
      label: 'Suppliers',
      labelAr: 'الموردين',
      icon: Truck,
      current: currentUsage.suppliers || 0,
      limit: limits?.max_suppliers ?? null,
      color: 'amber'
    }
  ];

  const getProgressColor = (current: number, limit: number | null): string => {
    if (limit === null) return 'bg-green-500';
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 ml-1" />
            نشط
          </Badge>
        );
      case 'trial':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <TrendingUp className="w-3 h-3 ml-1" />
            فترة تجريبية
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertTriangle className="w-3 h-3 ml-1" />
            منتهي
          </Badge>
        );
    }
  };

  const getPlanDisplayName = (): string => {
    if (planName) return planName;
    const planNames: Record<PlanCode, string> = {
      trial: 'الفترة التجريبية',
      starter_v2: 'البداية',
      growth_v2: 'النمو',
      business_v2: 'الأعمال',
      enterprise_v2: 'المؤسسات',
      unlimited_v2: 'غير محدود'
    };
    return planNames[planCode] || planCode;
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{getPlanDisplayName()}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {daysRemaining !== undefined && daysRemaining > 0
                    ? `${daysRemaining} يوم متبقي`
                    : 'حدود الاستخدام الحالية'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {onUpgrade && planCode !== 'unlimited_v2' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUpgrade}
                  className="text-xs"
                >
                  ترقية
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usageItems.map((item, index) => {
              const percentage = item.limit === null
                ? 0
                : Math.min((item.current / item.limit) * 100, 100);
              const isUnlimited = item.limit === null;
              const isNearLimit = !isUnlimited && percentage >= 80;
              const isAtLimit = !isUnlimited && item.current >= item.limit;

              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    isAtLimit ? "border-red-200 bg-red-50/50" :
                    isNearLimit ? "border-amber-200 bg-amber-50/50" :
                    "border-gray-100 bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn(
                        "w-4 h-4",
                        isAtLimit ? "text-red-500" :
                        isNearLimit ? "text-amber-500" :
                        "text-gray-500"
                      )} />
                      <span className="text-sm font-medium">{item.labelAr}</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className={cn(
                          "text-sm font-semibold",
                          isAtLimit ? "text-red-600" :
                          isNearLimit ? "text-amber-600" :
                          "text-gray-700"
                        )}>
                          {isUnlimited ? (
                            <span className="flex items-center gap-1">
                              {item.current}
                              <Infinity className="w-4 h-4 text-green-500" />
                            </span>
                          ) : (
                            `${item.current} / ${item.limit}`
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isUnlimited
                          ? `${item.labelAr}: غير محدود`
                          : `${item.labelAr}: ${item.current} من ${item.limit} (${percentage.toFixed(0)}%)`
                        }
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {!isUnlimited && (
                    <Progress
                      value={percentage}
                      className={cn(
                        "h-2",
                        isAtLimit ? "[&>div]:bg-red-500" :
                        isNearLimit ? "[&>div]:bg-amber-500" :
                        "[&>div]:bg-green-500"
                      )}
                    />
                  )}

                  {isUnlimited && (
                    <div className="h-2 bg-gradient-to-r from-green-200 to-green-400 rounded-full" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* تنبيه إذا كان قريباً من الحد */}
          {usageItems.some(item =>
            item.limit !== null && (item.current / item.limit) >= 0.9
          ) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    أنت قريب من الحد الأقصى
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    قم بترقية خطتك للحصول على المزيد من الموارد
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SubscriptionUsageCard;
