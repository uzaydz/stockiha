/**
 * صفحة الإشعارات الكاملة
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Settings,
  RefreshCw,
  Search,
  Calendar,
  ChevronRight,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/context/TenantContext';
import {
  useNotifications,
  NotificationType,
  NotificationPriority,
  formatRelativeTime,
  translateNotificationType,
  getPriorityColor
} from '@/lib/notifications';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { organization } = useTenant();
  const organizationId = organization?.id;

  const {
    notifications,
    unreadCount,
    isLoading,
    isInitialized,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getStats
  } = useNotifications(organizationId);

  const [filter, setFilter] = useState<NotificationType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // الإحصائيات
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    byType: {} as Record<string, number>,
    byPriority: {} as Record<string, number>
  });

  useEffect(() => {
    getStats().then(setStats);
  }, [notifications, getStats]);

  // الفلترة
  const filteredNotifications = notifications.filter(n => {
    // فلتر القراءة
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab === 'read' && !n.is_read) return false;

    // فلتر النوع
    if (filter !== 'all' && n.type !== filter) return false;

    // فلتر الأولوية
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;

    // البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // أيقونة النوع
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_order':
      case 'order_status_change':
        return <ShoppingCart className="w-5 h-5" />;
      case 'low_stock':
      case 'out_of_stock':
      case 'stock_restored':
        return <Package className="w-5 h-5" />;
      case 'payment_received':
      case 'debt_reminder':
      case 'debt_overdue':
        return <CreditCard className="w-5 h-5" />;
      case 'customer_inactive':
        return <Users className="w-5 h-5" />;
      case 'subscription_expiry':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  // لون الأولوية
  const getPriorityBadge = (priority: NotificationPriority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels = {
      urgent: 'عاجل',
      high: 'مرتفع',
      medium: 'متوسط',
      low: 'منخفض'
    };
    return (
      <Badge variant="outline" className={cn('text-xs', styles[priority])}>
        {labels[priority]}
      </Badge>
    );
  };

  // معالجة النقر
  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* الرأس */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 ml-2', isLoading && 'animate-spin')} />
            تحديث
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 ml-2" />
              قراءة الكل
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/settings/notifications')}>
            <Settings className="w-4 h-4 ml-2" />
            الإعدادات
          </Button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">غير مقروء</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عاجل</p>
                <p className="text-2xl font-bold">{stats.byPriority?.urgent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">طلبات</p>
                <p className="text-2xl font-bold">
                  {(stats.byType?.new_order || 0) + (stats.byType?.order_status_change || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التصفية */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الإشعارات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع الإشعار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="new_order">طلبات جديدة</SelectItem>
                <SelectItem value="low_stock">مخزون منخفض</SelectItem>
                <SelectItem value="debt_reminder">تذكيرات الديون</SelectItem>
                <SelectItem value="payment_received">المدفوعات</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">مرتفع</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* القائمة */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
          <TabsTrigger value="unread">غير مقروء ({stats.unread})</TabsTrigger>
          <TabsTrigger value="read">مقروء ({stats.total - stats.unread})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <BellOff className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">لا توجد إشعارات</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 hover:bg-muted/50 cursor-pointer transition-colors',
                        !notification.is_read && 'bg-muted/30'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-4">
                        {/* الأيقونة */}
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: getPriorityColor(notification.priority) }}
                        >
                          {getTypeIcon(notification.type)}
                        </div>

                        {/* المحتوى */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                'text-base',
                                !notification.is_read && 'font-semibold'
                              )}>
                                {notification.title}
                              </h4>
                              {getPriorityBadge(notification.priority)}
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {translateNotificationType(notification.type)}
                            </Badge>
                            {notification.action_label && (
                              <span className="text-xs text-primary flex items-center">
                                {notification.action_label}
                                <ChevronRight className="w-3 h-3 mr-1" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* الأزرار */}
                        <div className="flex flex-col gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* مؤشر غير مقروء */}
                        {!notification.is_read && (
                          <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
