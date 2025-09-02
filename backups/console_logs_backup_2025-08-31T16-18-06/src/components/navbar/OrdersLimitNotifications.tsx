/**
 * مكون إشعارات ذكية لحدود الطلبيات
 * يظهر تنبيهات عند الاقتراب من الحد المسموح
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnlineOrdersLimit } from '@/hooks/useOnlineOrdersLimit';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OrdersLimitNotificationsProps {
  className?: string;
}

const OrdersLimitNotifications: React.FC<OrdersLimitNotificationsProps> = ({
  className
}) => {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const { limitInfo, loading } = useOnlineOrdersLimit();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAlerts, setShowAlerts] = useState(true);

  // التحقق من أن المستخدم مشترك في خطة التجار الإلكترونيين المبتدئين
  // هذا المكون يظهر فقط للمستخدمين الذين لديهم subscription_tier = 'starter'
  const isEcommerceStarterPlan = organization?.subscription_tier === 'starter';
  
  // تسجيل للتأكد من المنطق
  console.log('🔍 OrdersLimitNotifications Debug:', {
    organizationId: organization?.id,
    subscriptionTier: organization?.subscription_tier,
    subscriptionStatus: organization?.subscription_status,
    isEcommerceStarterPlan,
    limitInfo: limitInfo ? {
      maxOrders: limitInfo.maxOrders,
      currentOrders: limitInfo.currentOrders,
      remainingOrders: limitInfo.remainingOrders,
      isBlocked: limitInfo.isBlocked
    } : null
  });

  // تحديد نوع التنبيه المطلوب
  const getAlertType = () => {
    if (limitInfo?.isBlocked) {
      return 'blocked';
    }
    if (limitInfo?.remainingOrders && limitInfo.remainingOrders <= 5) {
      return 'critical';
    }
    if (limitInfo?.remainingOrders && limitInfo.remainingOrders <= 15) {
      return 'warning';
    }
    if (limitInfo?.remainingOrders && limitInfo.remainingOrders <= 30) {
      return 'info';
    }
    return null;
  };

  const alertType = getAlertType();

  const getAlertConfig = () => {
    if (!limitInfo?.maxOrders) return null;
    
    switch (alertType) {
      case 'blocked':
        return {
          variant: 'destructive' as const,
          title: 'المتجر محظور!',
          message: `لقد تجاوزت الحد المسموح من الطلبيات (${limitInfo.currentOrders}/${limitInfo.maxOrders}). المتجر متوقف مؤقتاً.`,
          actionText: 'ترقية الخطة',
          action: () => navigate('/dashboard/subscription'),
          icon: <AlertTriangle className="h-4 w-4" />,
          autoHide: false
        };

      case 'critical':
        return {
          variant: 'destructive' as const,
          title: 'تحذير عاجل!',
          message: `متبقي ${limitInfo.remainingOrders} طلبية فقط هذا الشهر. سيتوقف المتجر عند الانتهاء.`,
          actionText: 'إضافة طلبيات',
          action: () => navigate('/dashboard/subscription'),
          icon: <AlertTriangle className="h-4 w-4" />,
          autoHide: false
        };

      case 'warning':
        return {
          variant: 'default' as const,
          title: 'تحذير: الحد ينتهي قريباً',
          message: `متبقي ${limitInfo.remainingOrders} طلبية هذا الشهر. فكر في ترقية خطتك.`,
          actionText: 'عرض الخطط',
          action: () => navigate('/dashboard/subscription'),
          icon: <ShoppingCart className="h-4 w-4" />,
          autoHide: true,
          autoHideDelay: 30000 // 30 ثانية
        };

      case 'info':
        return {
          variant: 'default' as const,
          title: 'معلومة: متابعة الاستخدام',
          message: `لقد استخدمت ${limitInfo.currentOrders} من ${limitInfo.maxOrders} طلبية هذا الشهر.`,
          actionText: 'عرض التفاصيل',
          action: () => navigate('/dashboard/subscription'),
          icon: <ShoppingCart className="h-4 w-4" />,
          autoHide: true,
          autoHideDelay: 15000 // 15 ثانية
        };

      default:
        return null;
    }
  };

  const alertConfig = getAlertConfig();

  const handleDismiss = () => {
    setDismissedAlerts(prev => new Set([...prev, alertType]));
    setShowAlerts(false);
  };

  // إخفاء تلقائي للتنبيهات غير الحرجة
  useEffect(() => {
    if (alertConfig?.autoHide && alertConfig.autoHideDelay) {
      const timer = setTimeout(() => {
        setShowAlerts(false);
      }, alertConfig.autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [alertConfig?.autoHide, alertConfig?.autoHideDelay]);

  // إعادة عرض التنبيه عند تغيير البيانات
  useEffect(() => {
    setShowAlerts(true);
  }, [limitInfo?.currentOrders, limitInfo?.remainingOrders, limitInfo?.isBlocked]);

  // عدم عرض المكون إذا لم يكن المستخدم مشتركاً في الخطة المطلوبة
  if (!isEcommerceStarterPlan || !limitInfo?.maxOrders) {
    console.log('❌ OrdersLimitNotifications: إخفاء المكون - المستخدم ليس في خطة التجار المبتدئين', {
      isEcommerceStarterPlan,
      hasMaxOrders: !!limitInfo?.maxOrders
    });
    return null;
  }

  // عدم عرض التنبيه إذا تم تجاهله أو لا يوجد تنبيه
  if (!alertType || dismissedAlerts.has(alertType) || !showAlerts) {
    console.log('❌ OrdersLimitNotifications: إخفاء التنبيه - لا يوجد تنبيه أو تم تجاهله', {
      alertType,
      isDismissed: dismissedAlerts.has(alertType),
      showAlerts
    });
    return null;
  }

  if (!alertConfig) {
    console.log('❌ OrdersLimitNotifications: إخفاء التنبيه - لا يوجد تكوين للتنبيه');
    return null;
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {console.log('✅ OrdersLimitNotifications: عرض التنبيه', { alertType, alertConfig })}
      <Alert variant={alertConfig.variant} className="relative">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {alertConfig.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">
              {alertConfig.title}
            </h4>
            <AlertDescription className="text-sm">
              {alertConfig.message}
            </AlertDescription>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={alertConfig.action}
              className="h-7 text-xs"
            >
              {alertConfig.actionText}
            </Button>

            {alertConfig.autoHide && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-7 w-7 p-0 hover:bg-muted/80"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* شريط التقدم للتنبيهات غير الحرجة */}
        {alertType !== 'blocked' && alertType !== 'critical' && limitInfo.maxOrders && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  limitInfo.isBlocked ? 'bg-red-600' :
                  limitInfo.remainingOrders && limitInfo.remainingOrders <= 10 ? 'bg-orange-600' :
                  'bg-blue-600'
                )}
                style={{
                  width: `${Math.min((limitInfo.currentOrders / limitInfo.maxOrders) * 100, 100)}%`
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-center">
              {limitInfo.currentOrders} من {limitInfo.maxOrders} طلبية مستخدمة
            </div>
          </div>
        )}
      </Alert>
    </div>
  );
};

export default OrdersLimitNotifications;
