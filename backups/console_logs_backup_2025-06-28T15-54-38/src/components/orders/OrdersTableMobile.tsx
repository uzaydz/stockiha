import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  MapPin, 
  Package, 
  Truck,
  MoreVertical,
  Edit,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Order } from './table/OrderTableTypes';
import { 
  formatCurrency, 
  formatDate, 
  getOrderItemsCount,
  getOrderCustomerName,
  getOrderCustomerContact,
  getOrderAddress,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  SHIPPING_PROVIDER_NAMES,
  canEditOrder,
  canCancelOrder,
  canShipOrder
} from '@/utils/ordersHelpers';
import { cn } from '@/lib/utils';

interface OrdersTableMobileProps {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (orderId: string, status: string) => void;
  onSendToProvider: (orderId: string, provider: string) => void;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

// Enhanced loading skeleton for order card
const OrderCardSkeleton = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-4"
  >
    <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-3 w-36 rounded-full" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));

OrderCardSkeleton.displayName = 'OrderCardSkeleton';

// Individual order card component
const OrderCard = memo(({ 
  order, 
  onUpdateStatus, 
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission 
}: {
  order: Order;
  onUpdateStatus: (orderId: string, status: string) => void;
  onSendToProvider: (orderId: string, provider: string) => void;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const customerName = getOrderCustomerName(order);
  const customerContact = getOrderCustomerContact(order);
  const address = getOrderAddress(order);
  const itemsCount = getOrderItemsCount(order);
  
  const statusIcon = {
    pending: Clock,
    processing: RefreshCw,
    shipped: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
  }[order.status] || Package;
  
  const StatusIcon = statusIcon;

  const handleStatusChange = useCallback((status: string) => {
    onUpdateStatus(order.id, status);
  }, [order.id, onUpdateStatus]);

  const handleSendToProvider = useCallback((provider: string) => {
    onSendToProvider(order.id, provider);
  }, [order.id, onSendToProvider]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <Card className="mb-4 overflow-hidden border-0 bg-gradient-to-br from-white via-gray-50/30 to-white dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
        <CardContent className="p-5">
          {/* Enhanced Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-sm font-semibold text-foreground">
                    #{order.customer_order_number || order.id.slice(0, 8)}
                  </span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full",
                    ORDER_STATUS_COLORS[order.status]
                  )}
                >
                  <StatusIcon className="w-3 h-3 mr-1.5" />
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(order.created_at, 'short')}</span>
                <span>•</span>
                <span>{itemsCount} منتج</span>
              </div>
            </div>
            
            {/* Enhanced Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  عرض التفاصيل
                </DropdownMenuItem>
                
                {hasUpdatePermission && canEditOrder(order) && (
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    تعديل الطلب
                  </DropdownMenuItem>
                )}
                
                {hasUpdatePermission && order.status === 'pending' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs">تحديث الحالة</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange('processing')}
                      className="text-blue-600"
                    >
                      قيد المعالجة
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange('shipped')}
                      className="text-purple-600"
                    >
                      تم الشحن
                    </DropdownMenuItem>
                  </>
                )}
                
                {hasUpdatePermission && canShipOrder(order) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs">إرسال للشحن</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleSendToProvider('yalidine')}>
                      <Send className="h-4 w-4 mr-2" />
                      ياليدين
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendToProvider('zrexpress')}>
                      <Send className="h-4 w-4 mr-2" />
                      زر إكسبرس
                    </DropdownMenuItem>
                  </>
                )}
                
                {hasCancelPermission && canCancelOrder(order) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange('cancelled')}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      إلغاء الطلب
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Enhanced Customer info */}
          <div className="space-y-3 mb-4 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {customerName.charAt(0)}
                </span>
              </div>
              <span className="font-medium text-sm">{customerName}</span>
            </div>
            
            {customerContact !== 'لا توجد بيانات اتصال' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <a 
                  href={`tel:${customerContact}`} 
                  className="hover:text-foreground transition-colors font-medium"
                >
                  {customerContact}
                </a>
              </div>
            )}
            
            {address !== 'لا يوجد عنوان' && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                  <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="line-clamp-2 leading-relaxed">{address}</span>
              </div>
            )}
          </div>

          {/* Enhanced Order summary */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(order.total || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {itemsCount} منتج • {order.payment_method || 'غير محدد'}
                  </p>
                </div>
                
                {/* Enhanced Shipping info */}
                <div className="flex gap-1">
                  {order.yalidine_tracking_id && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      <Truck className="h-3 w-3 mr-1" />
                      ياليدين
                    </Badge>
                  )}
                  {order.zrexpress_tracking_id && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <Truck className="h-3 w-3 mr-1" />
                      زر إكسبرس
                    </Badge>
                  )}
                </div>
              </div>

              {/* Enhanced Expand button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full h-9 rounded-lg border-dashed hover:border-solid transition-all"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    إخفاء التفاصيل
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    عرض التفاصيل
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t mt-3 pt-3 space-y-3">
                  {/* Order items */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">المنتجات</h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-start text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                              {item.color_name && ` • ${item.color_name}`}
                              {item.size_name && ` • ${item.size_name}`}
                            </p>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(item.total_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment summary */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المجموع الفرعي</span>
                      <span>{formatCurrency(order.subtotal || 0)}</span>
                    </div>
                    {order.shipping_cost && order.shipping_cost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الشحن</span>
                        <span>{formatCurrency(order.shipping_cost)}</span>
                      </div>
                    )}
                    {order.discount && order.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>الخصم</span>
                        <span>-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>الإجمالي</span>
                      <span>{formatCurrency(order.total || 0)}</span>
                    </div>
                  </div>

                  {/* Additional info */}
                  {order.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">ملاحظات</h4>
                      <p className="text-sm text-muted-foreground">{order.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
});

OrderCard.displayName = 'OrderCard';

// Main component
const OrdersTableMobile: React.FC<OrdersTableMobileProps> = ({
  orders,
  loading,
  onUpdateStatus,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  onLoadMore,
  hasMore,
}) => {
  const handleScroll = useCallback(() => {
    if (!onLoadMore || !hasMore || loading) return;
    
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  React.useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <AnimatePresence mode="popLayout">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onUpdateStatus={onUpdateStatus}
            onSendToProvider={onSendToProvider}
            hasUpdatePermission={hasUpdatePermission}
            hasCancelPermission={hasCancelPermission}
          />
        ))}
      </AnimatePresence>
      
      {/* Enhanced Load more indicator */}
      {loading && orders.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-8"
        >
          <div className="flex items-center gap-3 text-muted-foreground bg-gray-50 dark:bg-gray-900 px-4 py-3 rounded-full">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">جاري تحميل المزيد...</span>
          </div>
        </motion.div>
      )}
      
      {!hasMore && orders.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>تم عرض جميع الطلبات ({orders.length})</span>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground text-sm">
              لم يتم العثور على أي طلبات تطابق المرشحات المحددة
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default memo(OrdersTableMobile);
