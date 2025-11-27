import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Package, AlertTriangle, CreditCard, FileText, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // أيقونة بسيطة حسب النوع
  const getIcon = (type: NotificationItem['type']) => {
    const icons = {
      new_order: Package,
      low_stock: AlertTriangle,
      payment_received: CreditCard,
      order_status_change: FileText,
    };
    return icons[type] || Bell;
  };

  // تنسيق الوقت
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diff < 1) return 'الآن';
    if (diff < 60) return `${diff}د`;
    if (diff < 1440) return `${Math.floor(diff / 60)}س`;
    return `${Math.floor(diff / 1440)}ي`;
  };

  const Icon = getIcon(notification.type);
  const isUrgent = notification.priority === 'urgent' || notification.priority === 'high';

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-3 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        !notification.is_read && "bg-muted/30"
      )}
      onClick={() => onClick(notification)}
    >
      {/* أيقونة */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUrgent
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      )}>
        <Icon className="w-4 h-4" />
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm leading-tight line-clamp-1",
            !notification.is_read ? "font-medium text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatTime(notification.created_at)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* مؤشر غير مقروء */}
      {!notification.is_read && (
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-primary" />
      )}

      {/* أزرار الإجراء */}
      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
