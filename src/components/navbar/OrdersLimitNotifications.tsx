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
    return null;
  }

  // عدم عرض التنبيه إذا تم تجاهله أو لا يوجد تنبيه
  if (!alertType || dismissedAlerts.has(alertType) || !showAlerts) {
    return null;
  }

  if (!alertConfig) {
    return null;
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
};

export default OrdersLimitNotifications;
