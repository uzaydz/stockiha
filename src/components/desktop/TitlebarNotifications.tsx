import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/hooks/useRealTimeNotifications';
import { useNotifications } from '@/context/NotificationsContext';

import { NotificationHeader } from '@/components/navbar/NotificationHeader';
import { NotificationFilters } from '@/components/navbar/NotificationFilters';
import { NotificationItem as NotificationItemComponent } from '@/components/navbar/NotificationItem';
import { NotificationActions } from '@/components/navbar/NotificationActions';

/**
 * Error Boundary Wrapper
 */
class NotificationsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <button
          type="button"
          disabled
          className="flex items-center justify-center h-8 w-8 rounded-lg opacity-30 cursor-not-allowed"
          title="الإشعارات غير متوفرة"
        >
          <Bell className="h-4 w-4 text-white/50" />
        </button>
      );
    }
    return this.props.children;
  }
}

interface TitlebarNotificationsProps {
  className?: string;
  maxItems?: number;
}

const TitlebarNotificationsInner = memo(({ className, maxItems = 10 }: TitlebarNotificationsProps) => {
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
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  // فلترة الإشعارات
  const filterNotifications = useCallback((type: string) => {
    switch (type) {
      case 'unread': return notifications.filter(n => !n.is_read);
      case 'urgent': return notifications.filter(n => n.priority === 'urgent');
      case 'orders': return notifications.filter(n => n.type === 'new_order');
      case 'stock': return notifications.filter(n => n.type === 'low_stock');
      default: return notifications;
    }
  }, [notifications]);

  // التعامل مع النقر على الإشعار
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

  const handleViewAllNotifications = useCallback(() => {
    setIsOpen(false);
    navigate('/dashboard/notifications');
  }, [navigate]);

  const filteredNotifications = filterNotifications(activeTab);
  const displayedNotifications = filteredNotifications.slice(0, maxItems);

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
            "relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            stats.unread > 0 && "text-white",
            className
          )}
          aria-label="الإشعارات"
        >
          <Bell className="h-4 w-4" />

          {/* Badge */}
          {stats.unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] text-white font-medium flex items-center justify-center">
              {stats.unread > 9 ? '9+' : stats.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[360px] p-0 rounded-xl border bg-popover shadow-lg overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* الرأس */}
        <NotificationHeader
          stats={stats}
          isRealtimeConnected={isRealtimeConnected}
          settings={settings}
          showSettings={false}
          onToggleSettings={() => {}}
          onToggleSound={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
        />

        {/* الفلاتر */}
        <NotificationFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={filterCounts}
        />

        {/* قائمة الإشعارات */}
        <ScrollArea className="h-[320px]">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <BellOff className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">لا توجد إشعارات</p>
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
        </ScrollArea>

        {/* الإجراءات */}
        <NotificationActions
          hasNotifications={notifications.length > 0}
          hasUnread={stats.unread}
          hasMoreNotifications={filteredNotifications.length > maxItems}
          totalFiltered={filteredNotifications.length}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAllNotifications}
          onViewAll={handleViewAllNotifications}
        />
      </PopoverContent>
    </Popover>
  );
});

TitlebarNotificationsInner.displayName = 'TitlebarNotificationsInner';

export const TitlebarNotifications: React.FC<TitlebarNotificationsProps> = (props) => {
  return (
    <NotificationsErrorBoundary>
      <TitlebarNotificationsInner {...props} />
    </NotificationsErrorBoundary>
  );
};

TitlebarNotifications.displayName = 'TitlebarNotifications';

export default TitlebarNotifications;
