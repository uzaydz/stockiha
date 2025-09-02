/**
 * مكون عداد الطلبيات الإلكترونية في النافبار
 * يظهر فقط للمشتركين في خطة "تجار إلكترونيين مبتدئين"
 */

import React, { useEffect, useState } from 'react';
import { ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnlineOrdersLimit } from '@/hooks/useOnlineOrdersLimit';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OnlineOrdersCounterProps {
  className?: string;
  variant?: 'default' | 'compact';
}

const OnlineOrdersCounter: React.FC<OnlineOrdersCounterProps> = ({
  className,
  variant = 'default'
}) => {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const { limitInfo, loading, error, refreshLimit } = useOnlineOrdersLimit();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // التحقق من أن المستخدم مشترك في خطة التجار الإلكترونيين المبتدئين
  // هذا المكون يظهر فقط للمستخدمين الذين لديهم subscription_tier = 'starter'
  const isEcommerceStarterPlan = organization?.subscription_tier === 'starter';

  // عدم عرض المكون إذا لم يكن المستخدم مشتركاً في الخطة المطلوبة
  if (!isEcommerceStarterPlan || !limitInfo?.maxOrders) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLimit();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getCounterColor = () => {
    if (limitInfo.isBlocked) return 'text-red-600';
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  const getCounterBgColor = () => {
    if (limitInfo.isBlocked) return 'bg-red-100 hover:bg-red-200';
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) return 'bg-orange-100 hover:bg-orange-200';
    return 'bg-green-100 hover:bg-green-200';
  };

  const getIconColor = () => {
    if (limitInfo.isBlocked) return 'text-red-600';
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusMessage = () => {
    if (limitInfo.isBlocked) {
      return `محظور - تجاوز الحد (${limitInfo.currentOrders}/${limitInfo.maxOrders})`;
    }
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) {
      return `ينتهي قريباً - ${limitInfo.remainingOrders} متبقي`;
    }
    if (limitInfo.remainingOrders) {
      return `${limitInfo.remainingOrders} طلب متبقي هذا الشهر`;
    }
    return 'حد الطلبيات الشهري';
  };

  const displayValue = limitInfo.isBlocked ? 'محظور' :
    limitInfo.remainingOrders !== null ? limitInfo.remainingOrders.toString() : '0';

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 rounded-lg transition-colors",
                getCounterBgColor(),
                className
              )}
              onClick={() => navigate('/dashboard/subscription')}
            >
              <ShoppingCart className={cn("w-3 h-3", getIconColor())} />
              <span className={cn("text-xs font-medium ml-1", getCounterColor())}>
                {displayValue}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-center">
            <p className="font-medium">{getStatusMessage()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              انقر لإدارة الاشتراك
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* العداد الرئيسي */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 px-3 rounded-lg transition-colors relative",
                getCounterBgColor()
              )}
              onClick={() => navigate('/dashboard/subscription')}
            >
              <ShoppingCart className={cn("w-4 h-4", getIconColor())} />
              <span className={cn("text-sm font-medium ml-2", getCounterColor())}>
                {displayValue}
              </span>

              {/* مؤشر الحالة */}
              <div className={cn(
                "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                limitInfo.isBlocked ? 'bg-red-500' :
                limitInfo.remainingOrders && limitInfo.remainingOrders <= 10 ? 'bg-orange-500' :
                'bg-green-500'
              )} />

              {/* تحذير إذا كان الحد ينتهي قريباً */}
              {limitInfo.remainingOrders && limitInfo.remainingOrders <= 10 && !limitInfo.isBlocked && (
                <AlertTriangle className="w-3 h-3 text-orange-600 ml-1" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-center">
            <p className="font-medium">{getStatusMessage()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              انقر لإدارة الاشتراك والترقية
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* زر التحديث */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw className={cn(
                "w-4 h-4 transition-transform",
                (isRefreshing || loading) && "animate-spin"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>تحديث بيانات الطلبيات</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* رسالة الخطأ إذا وجدت */}
      {error && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-red-600">خطأ في تحديث البيانات</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default OnlineOrdersCounter;
