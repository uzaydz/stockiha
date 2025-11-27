/**
 * شريط إشعارات انتهاء الاشتراك
 *
 * يعرض تنبيهات عندما يقترب الاشتراك من الانتهاء
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionExpiry } from '@/lib/subscription/expiryNotifier';
import { useTenant } from '@/context/TenantContext';
import { X, AlertTriangle, Clock, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubscriptionExpiryBannerProps {
  className?: string;
}

const SubscriptionExpiryBanner: React.FC<SubscriptionExpiryBannerProps> = ({ className }) => {
  const { organization } = useTenant();
  const { notification, isLoading, dismiss } = useSubscriptionExpiry(organization?.id);
  const navigate = useNavigate();

  if (isLoading || !notification) {
    return null;
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'expired':
        return <AlertCircle className="w-5 h-5" />;
      case 'urgent':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <Clock className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'expired':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'urgent':
        return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
    }
  };

  const getButtonColors = () => {
    switch (notification.type) {
      case 'expired':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'urgent':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const handleAction = () => {
    if (notification.action?.href) {
      navigate(notification.action.href);
    }
  };

  return (
    <div
      className={cn(
        'relative border rounded-lg p-4 shadow-sm',
        getColors(),
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* الأيقونة */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* المحتوى */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">
            {notification.title}
          </h4>
          <p className="text-sm opacity-90">
            {notification.message}
          </p>

          {/* الأيام المتبقية */}
          {notification.daysLeft > 0 && (
            <div className="mt-2 text-xs opacity-75">
              متبقي: {notification.daysLeft} {notification.daysLeft === 1 ? 'يوم' : 'أيام'}
            </div>
          )}
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {notification.action && (
            <Button
              size="sm"
              className={cn('text-xs px-3 py-1 h-auto', getButtonColors())}
              onClick={handleAction}
            >
              {notification.action.label}
            </Button>
          )}

          {/* زر الإغلاق */}
          <button
            onClick={dismiss}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpiryBanner;

// ====== نسخة مصغرة للشريط العلوي ======

export const SubscriptionExpiryChip: React.FC<{ className?: string }> = ({ className }) => {
  const { organization } = useTenant();
  const { notification } = useSubscriptionExpiry(organization?.id);
  const navigate = useNavigate();

  if (!notification || notification.daysLeft > 14) {
    return null;
  }

  const getColors = () => {
    if (notification.type === 'expired') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    }
    if (notification.type === 'urgent') {
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    }
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  };

  return (
    <button
      onClick={() => navigate('/dashboard/subscription')}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80',
        getColors(),
        className
      )}
    >
      <Clock className="w-3 h-3" />
      {notification.daysLeft <= 0 ? (
        'منتهي'
      ) : (
        `${notification.daysLeft} ${notification.daysLeft === 1 ? 'يوم' : 'أيام'}`
      )}
    </button>
  );
};
