import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCheck, Trash2, ExternalLink } from 'lucide-react';

interface NotificationActionsProps {
  hasNotifications: boolean;
  hasUnread: number;
  hasMoreNotifications: boolean;
  totalFiltered: number;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onViewAll?: () => void;
}

export function NotificationActions({
  hasNotifications,
  hasUnread,
  hasMoreNotifications,
  totalFiltered,
  onMarkAllAsRead,
  onClearAll,
  onViewAll
}: NotificationActionsProps) {
  if (!hasNotifications) return null;

  return (
    <div className="p-3 border-t bg-background">
      <div className="flex items-center gap-2">
        {hasUnread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="w-3.5 h-3.5 ml-1.5" />
            قراءة الكل
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-8 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (window.confirm('هل تريد حذف جميع الإشعارات؟')) {
              onClearAll();
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5 ml-1.5" />
          حذف الكل
        </Button>

        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onViewAll}
          >
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            عرض الكل
          </Button>
        )}
      </div>
    </div>
  );
}
