import { useState, useEffect } from 'react';
import { BellIcon, BellRing, Check, Clock, Eye, LayoutList, MoreHorizontal, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'order' | 'system' | 'comment' | 'payment';
  link?: string;
}

interface NavbarNotificationsProps {
  className?: string;
  initialNotifications?: Notification[];
  maxItems?: number;
}

export function NavbarNotifications({ className, initialNotifications = [], maxItems = 5 }: NavbarNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [bellRinging, setBellRinging] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // محاكاة إشعار جديد بعد قليل من التحميل الأولي
  useEffect(() => {
    // فقط للعرض التوضيحي - في التطبيق الحقيقي ستأتي الإشعارات من الخادم
    const timer = setTimeout(() => {
      const newNotification: Notification = {
        id: `${Date.now()}`,
        title: 'طلب جديد',
        message: 'تم استلام طلب جديد برقم #33245',
        time: 'الآن',
        read: false,
        type: 'order',
        link: '/dashboard/orders/33245'
      };
      setNotifications(prev => [newNotification, ...prev]);
      triggerBellAnimation();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // تشغيل حركة جرس الإشعارات
  const triggerBellAnimation = () => {
    setBellRinging(true);
    setTimeout(() => setBellRinging(false), 2000);
  };
  
  // طريقة عرض وقت الإشعار بشكل أفضل
  const formatTime = (timeString: string) => {
    if (timeString === 'الآن') return timeString;
    if (timeString.includes('دقيقة') || timeString.includes('دقائق')) return timeString;
    
    // يمكن إضافة منطق خاص بتنسيق التواريخ هنا
    return timeString;
  };
  
  // ضبط وسم الإشعار حسب نوعه
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'order':
        return <LayoutList className="h-3.5 w-3.5 mr-1.5 text-blue-500" />;
      case 'payment':
        return <BellRing className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />;
      case 'comment':
        return <BellRing className="h-3.5 w-3.5 mr-1.5 text-amber-500" />;
      default:
        return <BellRing className="h-3.5 w-3.5 mr-1.5 text-primary" />;
    }
  };
  
  // وضع علامة على جميع الإشعارات كمقروءة
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };
  
  // وضع علامة على إشعار واحد كمقروء
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };
  
  // حذف إشعار محدد
  const removeNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };
  
  // تصفية الإشعارات حسب علامة التبويب النشطة
  const filteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.read);
    return notifications;
  };
  
  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative rounded-full bg-background/40 backdrop-blur-sm border border-border/20 shadow-sm hover:shadow-md hover:bg-primary/10 transition-all duration-300 group"
          >
            <div className={cn(
              "transition-all duration-300 relative",
              bellRinging && "animate-wiggle"
            )}>
              <BellIcon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            </div>
            
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className={cn(
                  "absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 text-[10px] px-0.5 py-0",
                  "bg-rose-500 border-white dark:border-background border-2",
                  bellRinging && "animate-pulse"
                )}
              >
                {unreadCount}
              </Badge>
            )}
            
            {/* تأثير خلفية التفاعل */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent -z-10 rounded-full"></div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80 p-0 border-border/40 shadow-lg rounded-xl overflow-hidden bg-card/95 backdrop-blur-sm">
          <div className="p-2 border-b border-border/20 flex items-center justify-between">
            <DropdownMenuLabel className="flex items-center text-foreground font-medium">
              <BellRing className="h-4 w-4 mr-2 text-primary" />
              الإشعارات
              {unreadCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="mr-2 h-5 px-1.5 text-xs bg-primary/10 text-primary"
                >
                  {unreadCount}
                </Badge>
              )}
            </DropdownMenuLabel>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full hover:bg-primary/10 transition-all duration-300" 
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full hover:bg-primary/10 transition-all duration-300"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px] p-1.5 bg-card/95 backdrop-blur-sm rounded-lg">
                  <DropdownMenuItem 
                    className="text-sm cursor-pointer rounded-md px-2.5 py-1.5 flex items-center transition-colors duration-200 text-foreground focus:text-primary"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    <Check className="h-3.5 w-3.5 mr-2 opacity-70" /> تعليم الكل كمقروء
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-sm cursor-pointer rounded-md px-2.5 py-1.5 flex items-center transition-colors duration-200 text-foreground focus:text-primary"
                  >
                    <Eye className="h-3.5 w-3.5 mr-2 opacity-70" /> عرض كل الإشعارات
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between border-b border-border/20 px-2 py-1">
              <TabsList className="h-8 p-0.5 rounded-lg bg-muted/60 w-auto">
                <TabsTrigger 
                  value="all" 
                  className="rounded-md h-7 px-3 py-1 text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  الكل
                </TabsTrigger>
                <TabsTrigger 
                  value="unread" 
                  className="rounded-md h-7 px-3 py-1 text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  غير المقروءة {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="m-0">
              <ScrollArea className="max-h-[300px]">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-border/10">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "p-3 relative transition-colors duration-200 hover:bg-muted/60 group",
                          notification.read ? "opacity-80" : "bg-primary/5 dark:bg-primary/10",
                          "border-l-2 border-transparent hover:border-l-2",
                          notification.read ? "hover:border-l-primary/30" : "border-l-primary"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center">
                              {getNotificationIcon(notification.type)}
                              <h4 className={cn(
                                "text-sm font-medium leading-none",
                                notification.read ? "text-foreground/90" : "text-foreground"
                              )}>
                                {notification.title}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                            <div className="flex items-center pt-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(notification.time)}
                            </div>
                          </div>
                          
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full hover:bg-primary/10" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                              >
                                <Check className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* شعاع ضوئي متحرك عند التحويم */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center">
                    <div className="rounded-full size-12 mx-auto mb-3 flex items-center justify-center bg-muted/40">
                      <BellIcon className="h-6 w-6 text-muted-foreground opacity-40" />
                    </div>
                    <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="unread" className="m-0">
              <ScrollArea className="max-h-[300px]">
                {filteredNotifications().length > 0 ? (
                  <div className="divide-y divide-border/10">
                    {filteredNotifications().map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "p-3 relative transition-colors duration-200 hover:bg-muted/60 group",
                          "bg-primary/5 dark:bg-primary/10",
                          "border-l-2 border-l-primary"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center">
                              {getNotificationIcon(notification.type)}
                              <h4 className="text-sm font-medium leading-none text-foreground">
                                {notification.title}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                            <div className="flex items-center pt-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(notification.time)}
                            </div>
                          </div>
                          
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full hover:bg-primary/10" 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* شعاع ضوئي متحرك عند التحويم */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center">
                    <div className="rounded-full size-12 mx-auto mb-3 flex items-center justify-center bg-muted/40">
                      <Check className="h-6 w-6 text-muted-foreground opacity-40" />
                    </div>
                    <p className="text-sm text-muted-foreground">لا توجد إشعارات غير مقروءة</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <div className="p-2 border-t border-border/20">
            <Button 
              variant="ghost" 
              className="w-full text-xs justify-center rounded-lg h-8 hover:bg-primary/5 hover:text-primary transition-colors duration-200"
            >
              عرض كل الإشعارات
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// إضافة هذه القاعدة إلى ملف index.css
// @keyframes wiggle {
//   0%, 100% { transform: rotate(0deg); }
//   25% { transform: rotate(-8deg); }
//   50% { transform: rotate(0deg); }
//   75% { transform: rotate(8deg); }
// }
// 
// .animate-wiggle {
//   animation: wiggle 0.5s ease-in-out infinite;
// }
