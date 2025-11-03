import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/hooks/useRealTimeNotifications';
import { useNotifications } from '@/context/NotificationsContext';

// Import notification sub-components
import { NotificationHeader } from '@/components/navbar/NotificationHeader';
import { NotificationSettings } from '@/components/navbar/NotificationSettings';
import { NotificationFilters } from '@/components/navbar/NotificationFilters';
import { NotificationItem as NotificationItemComponent } from '@/components/navbar/NotificationItem';
import { NotificationActions } from '@/components/navbar/NotificationActions';
import { playTestNotificationSound } from '@/lib/notification-sounds';

interface TitlebarNotificationsProps {
  className?: string;
  maxItems?: number;
}

/**
 * مكون الإشعارات المصمم خصيصاً للتايتل بار
 * - تصميم مبسط ومتناسق مع أزرار التايتل بار
 * - badge صغير لعدد الإشعارات
 * - نفس نافذة الإشعارات الكاملة عند النقر
 */
export const TitlebarNotifications = memo(({ className, maxItems = 8 }: TitlebarNotificationsProps) => {
  const navigate = useNavigate();
  const {
    notifications,
    stats,
    settings,
    isRealtimeConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    getNotificationIcon
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  // 🎯 فلترة الإشعارات حسب النوع
  const filterNotifications = useCallback((type: string) => {
    switch (type) {
      case 'unread': return notifications.filter(n => !n.is_read);
      case 'urgent': return notifications.filter(n => n.priority === 'urgent');
      case 'orders': return notifications.filter(n => n.type === 'new_order');
      case 'stock': return notifications.filter(n => n.type === 'low_stock');
      default: return notifications;
    }
  }, [notifications]);

  // 🔗 التعامل مع النقر على الإشعار مع التنقل المناسب
  const handleNotificationClick = useCallback((notification: NotificationItem) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    setIsOpen(false);

    switch (notification.type) {
      case 'new_order':
      case 'order_status_change':
      case 'payment_received':
        navigate('/dashboard/orders-v2');
        break;
        
      case 'low_stock':
        navigate('/dashboard/inventory');
        break;
        
      default:
        navigate('/dashboard');
    }
  }, [markAsRead, navigate]);

  // 🔊 تشغيل صوت التجربة
  const handlePlayTestSound = useCallback(async () => {
    try {
      await playTestNotificationSound();
    } catch (error) {
      // Silent fail
    }
  }, []);

  // 📋 التنقل إلى صفحة عرض جميع الإشعارات
  const handleViewAllNotifications = useCallback(() => {
    setIsOpen(false);
    navigate('/dashboard/notifications');
  }, [navigate]);

  // 🎉 تأثير اهتزاز الجرس عند إشعار جديد
  useEffect(() => {
    if (stats.unread > 0 && bellRef.current) {
      bellRef.current.classList.add('animate-bounce');
      const timer = setTimeout(() => {
        bellRef.current?.classList.remove('animate-bounce');
      }, 1000);
      return () => clearTimeout(timer);
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
        <button
          ref={bellRef}
          type="button"
          className={cn(
            // مطابقة أحجام أزرار التايتل بار
            "flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8",
            "rounded transition-all duration-200",
            // ألوان مطابقة للتايتل بار
            "text-white/80 hover:text-white",
            "hover:bg-white/10 active:bg-white/15",
            "relative",
            // إضافة لون خاص عند وجود إشعارات غير مقروءة
            stats.unread > 0 && "text-blue-400 hover:text-blue-300",
            className
          )}
          aria-label="الإشعارات"
          title={stats.unread > 0 ? `${stats.unread} إشعار جديد` : 'الإشعارات'}
        >
          {/* أيقونة الجرس - مطابقة لأحجام أيقونات التايتل بار */}
          <Bell className={cn(
            "h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 transition-colors duration-200",
            stats.unread > 0 && "drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]"
          )} />
          
          {/* Badge صغير للإشعارات غير المقروءة */}
          {stats.unread > 0 && (
            <span 
              className={cn(
                "absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1",
                "flex items-center justify-center",
                "min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px]",
                "px-0.5 sm:px-1",
                "bg-gradient-to-br from-red-500 to-red-600",
                "text-white rounded-full",
                "text-[8px] sm:text-[9px] font-bold leading-none",
                "shadow-lg shadow-red-500/40",
                "border border-slate-900/20",
                "animate-pulse"
              )}
            >
              {stats.unread > 9 ? '9+' : stats.unread}
            </span>
          )}

          {/* نقطة صغيرة للإشعارات العاجلة */}
          {stats.urgent > 0 && (
            <span 
              className={cn(
                "absolute -bottom-0.5 -right-0.5",
                "w-1.5 h-1.5 sm:w-2 sm:h-2",
                "bg-gradient-to-br from-orange-500 to-red-600",
                "rounded-full",
                "animate-ping"
              )}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className={cn(
          "w-96 p-0 border border-border/20 shadow-xl",
          "bg-background/98 backdrop-blur-sm",
          "rounded-xl overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200"
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
        {showSettings && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <NotificationSettings
              settings={settings}
              onUpdateSettings={updateSettings}
              onPlayTestSound={handlePlayTestSound}
            />
          </div>
        )}

        {/* تبويبات الفلتر */}
        <NotificationFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={filterCounts}
        />

        {/* قائمة الإشعارات */}
        <ScrollArea className="max-h-80 overflow-auto">
          <div className="px-1">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center animate-in fade-in-50 duration-300">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Bell className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
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
              </div>
            ) : (
              <div className="py-1">
                {displayedNotifications.map((notification, index) => (
                  <NotificationItemComponent
                    key={notification.id}
                    notification={notification}
                    index={index}
                    onMarkAsRead={markAsRead}
                    onRemove={deleteNotification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
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
});

TitlebarNotifications.displayName = 'TitlebarNotifications';

export default TitlebarNotifications;
