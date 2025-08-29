/**
 * مكون عرض عدد الطلبيات المتبقية في النافبار
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { useOnlineOrdersLimit } from '@/hooks/useOnlineOrdersLimit';
import { useAuth } from '@/context/AuthContext';

export const OnlineOrdersLimitBadge: React.FC = () => {
  const { organization } = useAuth();
  const { limitInfo, loading } = useOnlineOrdersLimit();

  // إذا لم تكن هناك مؤسسة أو لا توجد حدود، لا نعرض شيئاً
  if (!organization || !limitInfo || !limitInfo.maxOrders) {
    return null;
  }

  // إذا كان التحميل جارياً، نعرض مؤشر بسيط
  if (loading) {
    return (
      <div className="w-8 h-8 bg-muted animate-pulse rounded-full flex items-center justify-center">
        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  // تحديد لون البادج حسب الحالة
  const getBadgeVariant = () => {
    if (limitInfo.isBlocked) return 'destructive';
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) return 'secondary';
    return 'default';
  };

  // تحديد لون النص
  const getTextColor = () => {
    if (limitInfo.isBlocked) return 'text-red-600';
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  // تحديد الأيقونة
  const getIcon = () => {
    if (limitInfo.isBlocked) return <AlertTriangle className="w-4 h-4" />;
    return <ShoppingCart className="w-4 h-4" />;
  };

  return (
    <div className="relative">
      <Badge 
        variant={getBadgeVariant()}
        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium ${getTextColor()}`}
      >
        {getIcon()}
        <span>{limitInfo.remainingOrders || 0}</span>
      </Badge>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-foreground/90 text-background px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
          {limitInfo.isBlocked 
            ? 'تم حظر المتجر - تجاوز الحد المسموح'
            : `متبقي ${limitInfo.remainingOrders || 0} طلبية هذا الشهر`
          }
        </div>
      </div>
    </div>
  );
};
