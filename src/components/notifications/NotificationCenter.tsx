/**
 * مركز الإشعارات الموحد
 *
 * يعرض:
 * - قائمة الإشعارات
 * - فلترة حسب النوع
 * - إجراءات سريعة
 * - مؤشر غير المقروء
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  Settings,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  offlineNotificationService,
  OfflineNotification,
  NotificationType,
  NotificationPriority
} from '@/lib/notifications/offlineNotificationService';

interface NotificationCenterProps {
  organizationId: string;
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  organizationId,
  className
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OfflineNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // جلب الإشعارات
  const fetchNotifications = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const types = filter === 'all' ? undefined : [filter];
      const notifs = await offlineNotificationService.getNotifications(organizationId, {
        limit: 50,
        types
      });
      setNotifications(notifs);

      const count = await offlineNotificationService.getUnreadCount(organizationId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, filter]);

  // تحديث عند فتح القائمة
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // الاستماع للإشعارات الجديدة
  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = offlineNotificationService.subscribe((notification) => {
      if (notification.organization_id === organizationId) {
        setNotifications(prev => [notification, ...prev.slice(0, 49)]);
        setUnreadCount(prev => prev + 1);
      }
    });

    // جلب العدد الأولي
    offlineNotificationService.getUnreadCount(organizationId).then(setUnreadCount);

    return unsubscribe;
  }, [organizationId]);

  // تعليم كمقروء
  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await offlineNotificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // تعليم الكل كمقروء
  const handleMarkAllAsRead = async () => {
    await offlineNotificationService.markAllAsRead(organizationId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // حذف إشعار
  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await offlineNotificationService.deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // التنقل لصفحة الإجراء
  const handleNotificationClick = (notification: OfflineNotification) => {
    if (!notification.is_read) {
      offlineNotificationService.markAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  // أيقونة النوع
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_order':
      case 'order_status_change':
        return <ShoppingCart className="w-4 h-4" />;
      case 'low_stock':
      case 'out_of_stock':
      case 'stock_restored':
        return <Package className="w-4 h-4" />;
      case 'payment_received':
      case 'debt_reminder':
      case 'debt_overdue':
        return <CreditCard className="w-4 h-4" />;
      case 'customer_inactive':
        return <Users className="w-4 h-4" />;
      case 'subscription_expiry':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // لون الأولوية
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  // تنسيق الوقت
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days < 7) return `منذ ${days} ي`;
    return date.toLocaleDateString('ar-DZ');
  };

  // فلترة الأنواع
  const filterOptions: { value: NotificationType | 'all'; label: string }[] = [
    { value: 'all', label: 'الكل' },
    { value: 'new_order', label: 'الطلبات' },
    { value: 'low_stock', label: 'المخزون' },
    { value: 'debt_reminder', label: 'الديون' },
    { value: 'payment_received', label: 'المدفوعات' },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 p-0"
        sideOffset={8}
      >
        {/* الرأس */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">الإشعارات</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchNotifications}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                قراءة الكل
              </Button>
            )}
          </div>
        </div>

        {/* الفلتر */}
        <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
          {filterOptions.map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs whitespace-nowrap"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* قائمة الإشعارات */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <BellOff className="w-12 h-12 mb-2 opacity-50" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                    !notification.is_read && 'bg-muted/30'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    {/* الأيقونة */}
                    <div className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
                      getPriorityColor(notification.priority)
                    )}>
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* المحتوى */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          'text-sm line-clamp-1',
                          !notification.is_read && 'font-semibold'
                        )}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>

                      {/* الإجراءات */}
                      <div className="flex items-center gap-2 mt-2">
                        {notification.action_label && (
                          <span className="text-xs text-primary flex items-center">
                            {notification.action_label}
                            <ChevronRight className="w-3 h-3 mr-1" />
                          </span>
                        )}
                        <div className="flex-1" />
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => handleDelete(notification.id, e)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* مؤشر غير مقروء */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* التذييل */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => {
              navigate('/dashboard/notifications');
              setIsOpen(false);
            }}
          >
            عرض جميع الإشعارات
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;
