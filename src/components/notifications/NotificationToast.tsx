/**
 * Toast للإشعارات الفورية
 *
 * يعرض إشعارات popup عند وصول إشعار جديد
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  AlertTriangle,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  offlineNotificationService,
  OfflineNotification,
  NotificationType,
  NotificationPriority
} from '@/lib/notifications/offlineNotificationService';

interface NotificationToastProps {
  organizationId: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  duration?: number;
}

interface ToastItem extends OfflineNotification {
  timeoutId?: NodeJS.Timeout;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  organizationId,
  position = 'top-right',
  maxVisible = 3,
  duration = 5000
}) => {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // إضافة toast جديد
  const addToast = useCallback((notification: OfflineNotification) => {
    // تشغيل الصوت
    playNotificationSound(notification.priority);

    // إضافة للقائمة
    setToasts(prev => {
      // إزالة الزائد عن الحد
      const newToasts = prev.length >= maxVisible
        ? prev.slice(1)
        : prev;

      return [...newToasts, notification];
    });

    // إزالة تلقائية بعد المدة
    const timeoutId = setTimeout(() => {
      removeToast(notification.id);
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [maxVisible, duration]);

  // إزالة toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // الاستماع للإشعارات
  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = offlineNotificationService.subscribe((notification) => {
      if (notification.organization_id === organizationId) {
        addToast(notification);
      }
    });

    return unsubscribe;
  }, [organizationId, addToast]);

  // معالجة النقر
  const handleClick = (notification: OfflineNotification) => {
    removeToast(notification.id);
    if (!notification.is_read) {
      offlineNotificationService.markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // أيقونة النوع
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_order':
      case 'order_status_change':
        return <ShoppingCart className="w-5 h-5" />;
      case 'low_stock':
      case 'out_of_stock':
      case 'stock_restored':
        return <Package className="w-5 h-5" />;
      case 'payment_received':
      case 'debt_reminder':
      case 'debt_overdue':
        return <CreditCard className="w-5 h-5" />;
      case 'customer_inactive':
        return <Users className="w-5 h-5" />;
      case 'subscription_expiry':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  // ألوان الأولوية
  const getPriorityStyles = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return {
          border: 'border-red-500',
          icon: 'bg-red-500 text-white',
          ring: 'ring-red-500/20'
        };
      case 'high':
        return {
          border: 'border-orange-500',
          icon: 'bg-orange-500 text-white',
          ring: 'ring-orange-500/20'
        };
      case 'medium':
        return {
          border: 'border-yellow-500',
          icon: 'bg-yellow-500 text-white',
          ring: 'ring-yellow-500/20'
        };
      default:
        return {
          border: 'border-blue-500',
          icon: 'bg-blue-500 text-white',
          ring: 'ring-blue-500/20'
        };
    }
  };

  // موقع التوست
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // اتجاه الأنيميشن
  const animationVariants = {
    initial: {
      opacity: 0,
      x: position.includes('right') ? 50 : -50,
      y: 0,
      scale: 0.9
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      x: position.includes('right') ? 50 : -50,
      scale: 0.9
    }
  };

  return (
    <div className={cn('fixed z-50 flex flex-col gap-2', positionStyles[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const styles = getPriorityStyles(toast.priority);

          return (
            <motion.div
              key={toast.id}
              layout
              variants={animationVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'w-80 bg-background border-2 rounded-lg shadow-lg cursor-pointer overflow-hidden ring-2',
                styles.border,
                styles.ring
              )}
              onClick={() => handleClick(toast)}
            >
              <div className="p-3">
                <div className="flex gap-3">
                  {/* الأيقونة */}
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                    styles.icon
                  )}>
                    {getTypeIcon(toast.type)}
                  </div>

                  {/* المحتوى */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1">
                        {toast.title}
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 -mt-1 -mr-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeToast(toast.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {toast.message}
                    </p>

                    {/* رابط الإجراء */}
                    {toast.action_label && (
                      <div className="flex items-center mt-2 text-xs text-primary">
                        {toast.action_label}
                        <ChevronRight className="w-3 h-3 mr-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* شريط التقدم */}
              <motion.div
                className={cn('h-1', styles.icon.replace('text-white', ''))}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// تشغيل صوت الإشعار
function playNotificationSound(priority: NotificationPriority): void {
  try {
    const frequencies: Record<NotificationPriority, number[]> = {
      urgent: [587.33, 466.16, 587.33], // D, Bb, D
      high: [523.25, 659.25, 783.99],   // C, E, G
      medium: [440, 523.25],             // A, C
      low: [523.25]                       // C
    };

    const freqs = frequencies[priority];
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    freqs.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = priority === 'urgent' ? 'square' : 'sine';

      const volume = priority === 'urgent' ? 0.4 : priority === 'high' ? 0.3 : 0.2;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

      oscillator.start(audioContext.currentTime + index * 0.12);
      oscillator.stop(audioContext.currentTime + index * 0.12 + 0.25);
    });

    // اهتزاز للأولوية العالية
    if ((priority === 'urgent' || priority === 'high') && 'vibrate' in navigator) {
      navigator.vibrate(priority === 'urgent' ? [100, 50, 100, 50, 100] : [100, 50, 100]);
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export default NotificationToast;
