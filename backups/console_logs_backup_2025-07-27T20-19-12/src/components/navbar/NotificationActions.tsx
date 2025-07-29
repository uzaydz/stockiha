import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const handleMarkAllAsRead = () => {
    console.log('🔄 تحديد جميع الإشعارات كمقروءة...');
    onMarkAllAsRead();
  };

  const handleClearAll = () => {
    console.log('🗑️ حذف جميع الإشعارات...');
    if (window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
      onClearAll();
    }
  };

  const handleViewAll = () => {
    console.log('👁️ عرض جميع الإشعارات...');
    if (onViewAll) {
      onViewAll();
    }
  };

  return (
    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50">
      <div className="space-y-2">
        {/* أزرار الإجراءات الرئيسية */}
        <div className="flex items-center justify-between gap-2">
          {hasUnread > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              className={cn(
                "flex-1 h-8 px-3 text-xs font-medium",
                "border-green-300 dark:border-green-700",
                "bg-green-50 dark:bg-green-950/30",
                "text-green-700 dark:text-green-400",
                "hover:bg-green-100 dark:hover:bg-green-950/50",
                "transition-colors duration-200"
              )}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              تحديد الكل كمقروء
              <span className="ml-2 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold min-w-[1.25rem] text-center">
                {hasUnread}
              </span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearAll}
            className={cn(
              hasUnread > 0 ? "flex-1" : "w-full",
              "h-8 px-3 text-xs font-medium",
              "border-red-300 dark:border-red-700",
              "bg-red-50 dark:bg-red-950/30",
              "text-red-700 dark:text-red-400",
              "hover:bg-red-100 dark:hover:bg-red-950/50",
              "transition-colors duration-200"
            )}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            حذف الكل
          </Button>
        </div>

        {/* زر عرض المزيد */}
        {hasMoreNotifications && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleViewAll}
            className="w-full h-7 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Eye className="h-3 w-3 mr-1.5" />
            عرض جميع الإشعارات ({totalFiltered})
          </Button>
        )}

        {/* إحصائية */}
        <div className="pt-2 border-t border-slate-200/30 dark:border-slate-700/30">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            {hasUnread > 0 
              ? `${hasUnread} إشعار${hasUnread > 1 ? 'ات' : ''} جديد${hasUnread > 1 ? 'ة' : ''}` 
              : '✨ جميع الإشعارات مقروءة'
            }
            {hasMoreNotifications && (
              <span className="block mt-1">
                عرض {Math.min(8, totalFiltered)} من أصل {totalFiltered}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
} 