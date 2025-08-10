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
        navigate('/dashboard/orders');
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
        <Button
          ref={bellRef}
          variant="ghost"
          size="sm"
          className={cn(
            "relative p-3 rounded-2xl transition-all duration-300 ease-out group",
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
          style={{ willChange: 'transform' }}
        >
          <div className="relative">
            <Bell className={cn(
              "h-5 w-5 transition-all duration-300",
              stats.unread > 0 
                ? "text-blue-600 dark:text-blue-400 drop-shadow-sm" 
                : "text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            )} />
            
            {/* تأثير النبضة للإشعارات العاجلة - محسن */}
            {stats.urgent > 0 && (
              <div
                className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"
                style={{ willChange: 'transform, opacity' }}
              />
            )}
          </div>
          
          {/* Badge - محسن بدون framer-motion */}
          {stats.unread > 0 && (
            <div
              className={cn(
                "absolute -top-2 -right-2 transition-all duration-300 ease-out",
                "animate-in fade-in-50 zoom-in-50"
              )}
              style={{ willChange: 'transform, opacity' }}
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
            </div>
          )}
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
