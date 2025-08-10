import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, Package, AlertTriangle, CreditCard, Info, BellRing, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { NotificationItem } from '@/hooks/useRealTimeNotifications';

interface NotificationItemProps {
  notification: NotificationItem;
  index: number;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClick: (notification: NotificationItem) => void;
}

export function NotificationItem({ 
  notification, 
  index, 
  onMarkAsRead, 
  onRemove, 
  onClick 
}: NotificationItemProps) {
  
  // الحصول على أيقونة حسب نوع الإشعار
  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'new_order': return Package;
      case 'low_stock': return AlertTriangle;
      case 'payment_received': return CreditCard;
      case 'order_status_change': return Info;
      default: return BellRing;
    }
  };

  // الحصول على الألوان والأنماط حسب الأولوية
  const getPriorityStyles = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'urgent': 
        return {
          border: 'border-l-red-500 dark:border-l-red-400',
          bg: 'bg-gradient-to-r from-red-50/90 via-red-25/50 to-transparent dark:from-red-950/40 dark:via-red-950/20 dark:to-transparent',
          icon: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30',
          badge: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm',
          glow: 'shadow-red-500/20 dark:shadow-red-400/20',
          ring: 'ring-red-200/50 dark:ring-red-800/30'
        };
      case 'high': 
        return {
          border: 'border-l-orange-500 dark:border-l-orange-400',
          bg: 'bg-gradient-to-r from-orange-50/90 via-orange-25/50 to-transparent dark:from-orange-950/40 dark:via-orange-950/20 dark:to-transparent',
          icon: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30',
          badge: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm',
          glow: 'shadow-orange-500/20 dark:shadow-orange-400/20',
          ring: 'ring-orange-200/50 dark:ring-orange-800/30'
        };
      case 'medium': 
        return {
          border: 'border-l-amber-500 dark:border-l-amber-400',
          bg: 'bg-gradient-to-r from-amber-50/90 via-amber-25/50 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent',
          icon: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30',
          badge: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm',
          glow: 'shadow-amber-500/20 dark:shadow-amber-400/20',
          ring: 'ring-amber-200/50 dark:ring-amber-800/30'
        };
      default: 
        return {
          border: 'border-l-blue-500 dark:border-l-blue-400',
          bg: 'bg-gradient-to-r from-blue-50/90 via-blue-25/50 to-transparent dark:from-blue-950/40 dark:via-blue-950/20 dark:to-transparent',
          icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
          badge: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm',
          glow: 'shadow-blue-500/20 dark:shadow-blue-400/20',
          ring: 'ring-blue-200/50 dark:ring-blue-800/30'
        };
    }
  };

  // تنسيق وقت الإشعار
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `${diffInMinutes}د`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}س`;
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  };

  // الحصول على نص الأولوية
  const getPriorityText = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'urgent': return '🚨 عاجل';
      case 'high': return '⚠️ مهم';
      case 'medium': return '📌 متوسط';
      default: return '💬 عادي';
    }
  };

  const Icon = getNotificationIcon(notification.type);
  const styles = getPriorityStyles(notification.priority);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ 
        delay: index * 0.04,
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      layout
      className="group relative"
    >
      <div
        className={cn(
          "relative p-3 mx-2 my-1.5 rounded-xl border-l-3 transition-all duration-300 cursor-pointer",
          "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm",
          "hover:bg-white dark:hover:bg-slate-800",
          "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/30",
          "hover:scale-[1.01] active:scale-[0.99]",
          "border border-slate-200/60 dark:border-slate-700/60",
          "hover:border-slate-300/80 dark:hover:border-slate-600/80",
          styles.border,
          styles.bg,
          !notification.is_read && `ring-1 ${styles.ring}`,
          notification.priority === 'urgent' && "animate-pulse-slow"
        )}
        onClick={() => onClick(notification)}
      >
        {/* خلفية متدرجة للإشعارات العاجلة */}
        {notification.priority === 'urgent' && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 rounded-xl animate-pulse" />
        )}

        <div className="relative flex items-start gap-3">
          {/* الأيقونة */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "p-2 rounded-lg transition-all duration-300 relative flex-shrink-0",
              "group-hover:shadow-md",
              styles.icon
            )}
          >
            <Icon className="h-4 w-4" />
            {notification.priority === 'urgent' && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/30 to-red-600/30 rounded-lg animate-ping" />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            {/* الرأس */}
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1",
                  "group-hover:text-slate-800 dark:group-hover:text-slate-100",
                  !notification.is_read && "text-slate-900 dark:text-white"
                )}>
                  {notification.title}
                </h4>
                
                <div className="flex items-center gap-1.5">
                  <Badge 
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md border-0",
                      styles.badge
                    )}
                  >
                    {getPriorityText(notification.priority)}
                  </Badge>
                  
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="font-medium">{formatTime(notification.created_at)}</span>
                  </div>
                </div>
              </div>
              
              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-5 w-5 p-0 rounded-md",
                      "hover:bg-red-100 dark:hover:bg-red-950/50",
                      "hover:text-red-600 dark:hover:text-red-400",
                      "transition-all duration-200"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(notification.id);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </motion.div>
              </div>
            </div>
            
            {/* الرسالة */}
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed line-clamp-2">
              {notification.message}
            </p>
            
            {/* الأسفل */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {!notification.is_read && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"
                  />
                )}
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {notification.is_read ? 'مقروء' : 'جديد'}
                </span>
              </div>
              
              {!notification.is_read && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-5 text-[10px] font-semibold px-2 rounded-md",
                      "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
                      "hover:from-blue-500/20 hover:to-purple-500/20",
                      "text-blue-600 dark:text-blue-400",
                      "border border-blue-200/50 dark:border-blue-800/50",
                      "transition-all duration-200"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                    تم
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* تأثير التوهج للإشعارات العاجلة */}
        {notification.priority === 'urgent' && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 pointer-events-none animate-pulse" />
        )}

        {/* مؤشر عدم القراءة */}
        {!notification.is_read && (
          <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
    </motion.div>
  );
}
