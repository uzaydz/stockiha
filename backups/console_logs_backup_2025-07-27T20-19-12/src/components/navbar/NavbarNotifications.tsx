import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRealTimeNotifications, type NotificationItem } from '@/hooks/useRealTimeNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { playTestNotificationSound } from '@/lib/notification-sounds';
import './notifications.css';

// Import sub-components
import { NotificationHeader } from './NotificationHeader';
import { NotificationSettings } from './NotificationSettings';
import { NotificationFilters } from './NotificationFilters';
import { NotificationItem as NotificationItemComponent } from './NotificationItem';
import { NotificationActions } from './NotificationActions';

interface NavbarNotificationsProps {
  className?: string;
  maxItems?: number;
}

export function NavbarNotifications({ className, maxItems = 8 }: NavbarNotificationsProps) {
  const navigate = useNavigate();
  const {
    notifications,
    stats,
    settings,
    isRealtimeConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updateSettings,
    getNotificationIcon
  } = useRealTimeNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  // 🎯 فلترة الإشعارات حسب النوع
  const filterNotifications = (type: string) => {
    switch (type) {
      case 'unread': return notifications.filter(n => !n.is_read);
      case 'urgent': return notifications.filter(n => n.priority === 'urgent');
      case 'orders': return notifications.filter(n => n.type === 'new_order');
      case 'stock': return notifications.filter(n => n.type === 'low_stock');
      default: return notifications;
    }
  };

  // 🔗 التعامل مع النقر على الإشعار مع التنقل المناسب
  const handleNotificationClick = (notification: NotificationItem) => {
    console.log('🔔 النقر على الإشعار:', notification);
    
    // وضع علامة مقروءة أولاً
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // إغلاق قائمة الإشعارات
    setIsOpen(false);

    // التنقل حسب نوع الإشعار
    switch (notification.type) {
      case 'new_order':
      case 'order_status_change':
      case 'payment_received':
        console.log('📋 التنقل إلى صفحة الطلبات');
        navigate('/dashboard/orders');
        break;
        
      case 'low_stock':
        console.log('📦 التنقل إلى صفحة المخزون');
        navigate('/dashboard/inventory');
        break;
        
      default:
        console.log('🔗 رابط مخصص أو الصفحة الرئيسية');
        // إذا كان هناك رابط مخصص في الإشعار
        if (notification.action?.link) {
          navigate(notification.action.link);
        } else {
          // العودة للوحة التحكم الرئيسية
          navigate('/dashboard');
        }
    }
  };

  // 🔊 تشغيل صوت التجربة
  const handlePlayTestSound = () => {
    try {
      playTestNotificationSound();
    } catch (error) {
      console.error('خطأ في تشغيل الصوت التجريبي:', error);
    }
  };

  // 📋 التنقل إلى صفحة عرض جميع الإشعارات
  const handleViewAllNotifications = () => {
    console.log('👁️ عرض جميع الإشعارات');
    setIsOpen(false);
    // يمكن إنشاء صفحة مخصصة للإشعارات لاحقاً
    navigate('/dashboard/notifications');
  };

  // 🎉 تأثير اهتزاز الجرس عند إشعار جديد
  useEffect(() => {
    if (stats.unread > 0 && bellRef.current) {
      bellRef.current.classList.add('animate-bounce');
      setTimeout(() => {
        bellRef.current?.classList.remove('animate-bounce');
      }, 1000);
    }
  }, [stats.unread]);

  const filteredNotifications = filterNotifications(activeTab);
  const displayedNotifications = filteredNotifications.slice(0, maxItems);
  const hasMoreNotifications = filteredNotifications.length > maxItems;

  // حساب الإحصائيات للفلاتر
  const filterCounts = {
    all: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    urgent: notifications.filter(n => n.priority === 'urgent').length,
    orders: notifications.filter(n => n.type === 'new_order').length,
    stock: notifications.filter(n => n.type === 'low_stock').length,
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={bellRef}
          variant="ghost"
          size="sm"
          className={cn(
            "relative p-3 rounded-2xl transition-all duration-500 ease-out group",
            "hover:bg-slate-100/80 dark:hover:bg-slate-800/80",
            "hover:scale-105 active:scale-95",
            "focus:ring-2 focus:ring-blue-500/30 focus:outline-none",
            "border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60",
            "backdrop-blur-sm",
            stats.unread > 0 && [
              "bg-gradient-to-r from-blue-50/60 to-purple-50/60 dark:from-blue-950/30 dark:to-purple-950/30",
              "border-blue-200/40 dark:border-blue-800/40",
              "shadow-lg shadow-blue-500/10 dark:shadow-blue-400/10"
            ],
            className
          )}
        >
          <motion.div
            whileHover={{ 
              rotate: [0, -8, 8, -4, 0],
              transition: { duration: 0.6, ease: "easeInOut" }
            }}
            className="relative"
          >
            <Bell className={cn(
              "h-5 w-5 transition-all duration-300",
              stats.unread > 0 
                ? "text-blue-600 dark:text-blue-400 drop-shadow-sm" 
                : "text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            )} />
            
            {/* تأثير النبضة للإشعارات العاجلة */}
            {stats.urgent > 0 && (
              <motion.div
                className="absolute inset-0 bg-red-500/20 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
          </motion.div>
          
          <AnimatePresence>
            {stats.unread > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 25 }}
                className="absolute -top-2 -right-2"
              >
                <Badge 
                  className={cn(
                    "h-6 w-6 p-0 flex items-center justify-center text-xs font-bold",
                    "bg-gradient-to-br from-red-500 via-red-600 to-pink-600 text-white",
                    "shadow-lg shadow-red-500/40 dark:shadow-red-400/30",
                    "ring-2 ring-white dark:ring-slate-900",
                    "border-0",
                    stats.urgent > 0 && "animate-pulse"
                  )}
                >
                  {stats.unread > 99 ? '99+' : stats.unread}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className={cn(
          "w-96 p-0 border-0 shadow-2xl",
          "bg-white/95 dark:bg-slate-900/95",
          "backdrop-blur-2xl backdrop-saturate-150",
          "ring-1 ring-slate-200/50 dark:ring-slate-700/50",
          "rounded-3xl overflow-hidden"
        )} 
        align="end"
        sideOffset={12}
      >
        {/* الرأس */}
        <NotificationHeader
          stats={stats}
          isRealtimeConnected={isRealtimeConnected}
          settings={settings}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onToggleSound={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
        />

        {/* الإعدادات المنزلقة */}
        <AnimatePresence>
          {showSettings && (
            <NotificationSettings
              settings={settings}
              onUpdateSettings={updateSettings}
              onPlayTestSound={handlePlayTestSound}
            />
          )}
        </AnimatePresence>

        {/* تبويبات الفلتر */}
        <NotificationFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={filterCounts}
        />

        {/* قائمة الإشعارات */}
        <ScrollArea className="max-h-80 overflow-auto notification-scroll-enhanced">
          <div className="px-1">
            <AnimatePresence mode="popLayout">
              {displayedNotifications.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 25 }}
                    className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center shadow-lg"
                  >
                    <Bell className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-slate-600 dark:text-slate-400 font-semibold text-base mb-2">
                      لا توجد إشعارات
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
                      {activeTab === 'all' 
                        ? 'ستظهر جميع إشعاراتك هنا' 
                        : `لا توجد إشعارات في قسم "${
                            activeTab === 'unread' ? 'الجديد' :
                            activeTab === 'urgent' ? 'العاجل' :
                            activeTab === 'orders' ? 'الطلبات' :
                            activeTab === 'stock' ? 'المخزون' : ''
                          }"`
                      }
                    </p>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="py-1">
                  {displayedNotifications.map((notification, index) => (
                    <NotificationItemComponent
                      key={notification.id}
                      notification={notification}
                      index={index}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* أزرار الإجراءات */}
        <NotificationActions
          hasNotifications={notifications.length > 0}
          hasUnread={stats.unread}
          hasMoreNotifications={hasMoreNotifications}
          totalFiltered={filteredNotifications.length}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAllNotifications}
          onViewAll={handleViewAllNotifications}
        />
      </PopoverContent>
    </Popover>
  );
}
