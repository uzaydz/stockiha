import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, AlertTriangle, CreditCard, Info, BellRing, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ToastNotificationData {
  id: string;
  type: 'new_order' | 'low_stock' | 'payment_received' | 'order_status_change' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastNotificationProps {
  notification: ToastNotificationData;
  onClose: (id: string) => void;
  onAction?: () => void;
}

export function ToastNotification({ notification, onClose, onAction }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  // الحصول على أيقونة حسب النوع
  const getIcon = (type: ToastNotificationData['type']) => {
    switch (type) {
      case 'new_order': return Package;
      case 'low_stock': return AlertTriangle;
      case 'payment_received': return CreditCard;
      case 'order_status_change': return Info;
      default: return BellRing;
    }
  };

  // الحصول على الألوان حسب الأولوية
  const getStyles = (priority: ToastNotificationData['priority']) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-pink-600',
          border: 'border-red-400',
          icon: 'text-white',
          progress: 'bg-red-300'
        };
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-orange-500 to-amber-600',
          border: 'border-orange-400',
          icon: 'text-white',
          progress: 'bg-orange-300'
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          border: 'border-blue-400',
          icon: 'text-white',
          progress: 'bg-blue-300'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
          border: 'border-emerald-400',
          icon: 'text-white',
          progress: 'bg-emerald-300'
        };
    }
  };

  // تشغيل التايمر
  useEffect(() => {
    const duration = notification.duration || 5000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = ((steps - currentStep) / steps) * 100;
      setProgress(newProgress);

      if (currentStep >= steps) {
        setIsVisible(false);
        setTimeout(() => onClose(notification.id), 300);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [notification.duration, notification.id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  const handleAction = () => {
    if (notification.action?.onClick) {
      notification.action.onClick();
    }
    if (onAction) {
      onAction();
    }
    handleClose();
  };

  const Icon = getIcon(notification.type);
  const styles = getStyles(notification.priority);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "relative min-w-80 max-w-md rounded-2xl shadow-2xl border-2 overflow-hidden",
            "backdrop-blur-xl bg-white/95 dark:bg-slate-900/95",
            styles.border
          )}
        >
          {/* شريط التقدم */}
          <div className="absolute top-0 left-0 h-1 bg-gray-200/50 dark:bg-gray-700/50 w-full">
            <motion.div
              className={cn("h-full transition-all duration-75 ease-linear", styles.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* الخلفية المتدرجة */}
          <div className={cn("absolute inset-0 opacity-10", styles.bg)} />

          {/* المحتوى */}
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              {/* الأيقونة */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 600, damping: 25 }}
                className={cn(
                  "p-2.5 rounded-xl shadow-lg flex-shrink-0",
                  styles.bg
                )}
              >
                <Icon className={cn("h-5 w-5", styles.icon)} />
              </motion.div>

              {/* النص */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {notification.title}
                  </h4>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-60 hover:opacity-100 transition-opacity ml-2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {notification.message}
                </p>

                {/* الأزرار */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-lg text-white border-0",
                        styles.bg
                      )}
                    >
                      {notification.priority === 'urgent' && '🚨 عاجل'}
                      {notification.priority === 'high' && '⚠️ مهم'}
                      {notification.priority === 'medium' && '📌 متوسط'}
                      {notification.priority === 'low' && '💬 عادي'}
                    </Badge>
                  </div>

                  {notification.action && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAction}
                        className={cn(
                          "h-7 text-xs font-semibold px-3 rounded-lg",
                          "border-2 transition-all duration-200",
                          styles.border,
                          "hover:bg-gradient-to-r hover:text-white",
                          styles.bg.replace('bg-gradient-to-r', 'hover:bg-gradient-to-r')
                        )}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {notification.action.label}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* تأثير النبضة للإشعارات العاجلة */}
          {notification.priority === 'urgent' && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-red-400"
              animate={{ 
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// مكون إدارة Toast Container
interface ToastContainerProps {
  notifications: ToastNotificationData[];
  onClose: (id: string) => void;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function ToastContainer({ 
  notifications, 
  onClose, 
  position = 'bottom-right' 
}: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'bottom-4 right-4';
    }
  };

  return (
    <div className={cn(
      "fixed z-50 pointer-events-none",
      getPositionClasses()
    )}>
      <div className="space-y-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
            >
              <ToastNotification
                notification={notification}
                onClose={onClose}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
