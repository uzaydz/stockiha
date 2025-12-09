// =====================================================
// جرس إشعارات الإحالة - Notifications Bell Component
// =====================================================

import { cn } from '@/lib/utils';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReferralNotifications } from '@/hooks/useReferralNotifications';
import type { ReferralNotification } from '@/types/referral';

interface ReferralNotificationsBellProps {
  className?: string;
}

export function ReferralNotificationsBell({
  className,
}: ReferralNotificationsBellProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasUnread,
    markAsRead,
    markAllAsRead,
    getNotificationIcon,
    formatRelativeTime,
  } = useReferralNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge
              className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">إشعارات الإحالة</h4>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              قراءة الكل
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                  getIcon={getNotificationIcon}
                  formatTime={formatRelativeTime}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onRead,
  getIcon,
  formatTime,
}: {
  notification: ReferralNotification;
  onRead: () => void;
  getIcon: (type: string) => string;
  formatTime: (date: string) => string;
}) {
  const handleClick = () => {
    if (!notification.is_read) {
      onRead();
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      <span className="text-xl">{getIcon(notification.notification_type)}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
      )}
    </div>
  );
}

export default ReferralNotificationsBell;
