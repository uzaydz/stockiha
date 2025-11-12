/**
 * زر الاشتراك في شريط العنوان - تصميم مبسط
 * يعرض معلومات الاشتراك الحالي والأيام المتبقية وعدد الطلبات
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, 
  ShoppingCart, 
  ArrowRight,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export const SubscriptionButton: React.FC = () => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    planName,
    daysRemaining,
    subscriptionStatus,
    hasOrdersLimit,
    currentOrders,
    maxOrders,
    remainingOrders,
    isLoading,
  } = useSubscriptionStatus();
  const { isOffline } = useOfflineStatus();

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDetails]);

  const handleNavigateToSubscription = () => {
    setShowDetails(false);
    navigate('/dashboard/subscription');
  };

  if (isLoading) {
    return null;
  }

  const needsInitialCheck = isOffline && (!subscriptionStatus || subscriptionStatus === null) && (daysRemaining <= 0);
  const getIconColor = () => {
    if (needsInitialCheck) return 'text-red-400';
    if (subscriptionStatus === 'expired') return 'text-red-400';
    if (daysRemaining <= 7) return 'text-orange-400';
    if (subscriptionStatus === 'trial') return 'text-blue-400';
    return 'text-emerald-400';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* الزر الرئيسي - متناسق مع باقي المكونات */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          "flex items-center gap-1.5 h-7 px-2 rounded-md",
          "transition-all duration-200 active:scale-95",
          "hover:bg-white/15",
          showDetails && "bg-white/15"
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        title={needsInitialCheck ? 'يتطلب اتصال للتحقق الأولي' : `${planName || 'لا يوجد اشتراك'} - ${daysRemaining} يوم`}
        aria-label="معلومات الاشتراك"
      >
        <Crown className={cn("h-4 w-4 shrink-0", getIconColor())} />
        <span className="hidden lg:inline text-xs text-white/90 font-medium">
          {daysRemaining > 0 ? `${daysRemaining} يوم` : 'منتهي'}
        </span>
      </button>

      {/* القائمة المنسدلة - متناسقة مع باقي المكونات */}
      {showDetails && (
        <div 
          className="absolute left-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {/* رأس المعلومات */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={cn("h-4 w-4", getIconColor())} />
                <span className="text-sm font-medium text-white">
                  {planName || 'لا يوجد اشتراك'}
                </span>
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded font-medium",
                subscriptionStatus === 'expired' ? 'bg-red-500/20 text-red-300' :
                daysRemaining <= 7 ? 'bg-orange-500/20 text-orange-300' :
                subscriptionStatus === 'trial' ? 'bg-blue-500/20 text-blue-300' :
                'bg-emerald-500/20 text-emerald-300'
              )}>
                {subscriptionStatus === 'active' ? 'نشط' :
                 subscriptionStatus === 'trial' ? 'تجريبي' : 'منتهي'}
              </span>
            </div>
          </div>

          <div className="py-2">
            {needsInitialCheck && (
              <div className="px-4 py-2.5">
                <div className="text-sm text-red-300 font-medium">يتطلب اتصال للتحقق الأولي</div>
              </div>
            )}
            {/* الأيام المتبقية */}
            <div className="px-4 py-2.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="h-4 w-4 text-white/70" />
                  <span>الأيام المتبقية</span>
                </div>
                <span className={cn(
                  "font-semibold",
                  daysRemaining <= 7 ? 'text-orange-300' : 'text-emerald-300'
                )}>
                  {daysRemaining > 0 ? `${daysRemaining} يوم` : 'منتهي'}
                </span>
              </div>
            </div>

            {/* معلومات الطلبات */}
            {hasOrdersLimit && maxOrders !== null && (
              <div className="px-4 py-2.5">
                <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                  <ShoppingCart className="h-4 w-4 text-white/70" />
                  <span>الطلبات الإلكترونية</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">المستخدم</span>
                    <span className="text-white/90 font-medium">{currentOrders} / {maxOrders}</span>
                  </div>
                  
                  {/* شريط التقدم */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300",
                        (remainingOrders || 0) <= 10 ? 'bg-red-400' : 
                        (remainingOrders || 0) <= 30 ? 'bg-orange-400' : 'bg-emerald-400'
                      )}
                      style={{ 
                        width: `${maxOrders > 0 ? (currentOrders / maxOrders) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  
                  <div className="text-[10px] text-white/50">
                    {remainingOrders || 0} طلبية متبقية
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* زر الإجراء */}
          <div className="border-t border-white/10 py-2">
            <div className="px-4">
              <button
                onClick={handleNavigateToSubscription}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors rounded-md"
              >
                <span>تفاصيل الاشتراك</span>
                <ArrowRight className="h-4 w-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
