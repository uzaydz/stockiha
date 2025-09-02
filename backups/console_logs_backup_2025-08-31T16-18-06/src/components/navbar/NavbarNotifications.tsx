import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/context/NotificationsContext';
import type { NotificationItem } from '@/hooks/useRealTimeNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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
        navigate('/dashboard/orders-v2');
        break;
        
      case 'low_stock':
        navigate('/dashboard/inventory');
        break;
        
      default:
        // العودة للوحة التحكم الرئيسية
        navigate('/dashboard');
    }
  }, [markAsRead, navigate]);

  // 🔊 تشغيل صوت التجربة
  const handlePlayTestSound = useCallback(async () => {
    try {
      await playTestNotificationSound();
    } catch (error) {
    }
  }, []);

  // 📋 التنقل إلى صفحة عرض جميع الإشعارات
  const handleViewAllNotifications = useCallback(() => {
    setIsOpen(false);
    // يمكن إنشاء صفحة مخصصة للإشعارات لاحقاً
    navigate('/dashboard/notifications');
  }, [navigate]);

  // 🎉 تأثير اهتزاز الجرس عند إشعار جديد - محسن
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
          className={cn(
            "relative w-full h-full flex items-center justify-center",
            "rounded-lg transition-all duration-200 ease-out",
            "hover:scale-105 active:scale-95",
            "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
            className
          )}
        >
          {/* أيقونة الجرس */}
          <Bell className={cn(
            "h-4 w-4 transition-colors duration-200",
            stats.unread > 0 
              ? "text-blue-500 dark:text-blue-400" 
              : "text-muted-foreground hover:text-foreground"
          )} />
          
          {/* Badge للإشعارات غير المقروءة - محسن وواضح */}
          {stats.unread > 0 && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className={cn(
                "flex items-center justify-center min-w-[18px] h-[18px] px-1",
                "bg-red-500 text-white rounded-full",
                "text-[10px] font-bold leading-none",
                "shadow-md border-2 border-background",
                "transition-transform duration-200",
                "hover:scale-110"
              )}>
                {stats.unread > 99 ? '99+' : stats.unread}
              </div>
            </div>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className={cn(
          "w-96 p-0 border border-border/20 shadow-lg",
          "bg-background/98 backdrop-blur-sm",
          "rounded-xl overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )} 
        align="end"
        sideOffset={8}
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
        <ScrollArea className="max-h-80 overflow-auto notification-scroll-enhanced">
          <div className="px-1">
            {displayedNotifications.length === 0 ? (
              <div
                className="p-8 text-center animate-in fade-in-50 duration-300"
              >
                <div
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300"
                >
                  <Bell className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="animate-in fade-in-50 duration-300 delay-100">
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
              </div>
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

// Optimize with React.memo to prevent unnecessary re-renders
export default memo(NavbarNotifications);
