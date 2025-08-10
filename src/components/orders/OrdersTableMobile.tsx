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
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { Order } from './table/OrderTableTypes';
import OrderStatusDropdown from './OrderStatusDropdown';
import CallConfirmationDropdown from './CallConfirmationDropdown';
import ShippingProviderColumn from './table/ShippingProviderColumn';
import OrderStatusBadge from './table/OrderStatusBadge';
import CallConfirmationBadge from './CallConfirmationBadge';
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
import { getProvinceName, getMunicipalityName } from '@/utils/addressHelpers';
import { cn } from '@/lib/utils';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface OrdersTableMobileProps {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  onSendToProvider: (orderId: string, provider: string) => void;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  currentUserId?: string;
  shippingProviders?: any[];
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
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  currentUserId,
  shippingProviders = []
}: {
  order: Order;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  onSendToProvider: (orderId: string, provider: string) => void;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  currentUserId?: string;
  shippingProviders?: any[];
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
                {/* معلومات إضافية عن الشحن */}
                {(order.yalidine_tracking_id || order.zrexpress_tracking_id) && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-green-600" />
                      <span className="text-green-600 font-medium">تم الشحن</span>
                    </div>
                  </>
                )}
                {order.call_confirmation_status && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-blue-600" />
                      <span className="text-blue-600 font-medium">تم التأكيد</span>
                    </div>
                  </>
                )}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {customerName.charAt(0)}
                  </span>
                </div>
                <span className="font-medium text-sm">{customerName}</span>
              </div>
              
              {/* زر اتصال سريع */}
              {customerContact !== 'لا توجد بيانات اتصال' && !customerContact.includes('@') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`tel:${customerContact}`, '_self')}
                  className="h-8 px-3 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  اتصال
                </Button>
              )}
            </div>
            
            {customerContact !== 'لا توجد بيانات اتصال' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium font-mono" dir="ltr">{customerContact}</span>
                {customerContact.includes('@') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`mailto:${customerContact}`, '_self')}
                    className="h-6 px-2 text-xs ml-auto"
                  >
                    إرسال بريد
                  </Button>
                )}
              </div>
            )}
            
            {/* عنوان التوصيل مع البلدية */}
            {address !== 'لا يوجد عنوان' && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                    <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="line-clamp-2 leading-relaxed">{address}</span>
                </div>
                
                {/* البلدية والولاية */}
                <div className="flex items-center gap-2 mr-7 text-xs">
                  {order.form_data?.municipality && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      {typeof getMunicipalityName === 'function' ? getMunicipalityName(order.form_data.municipality, order.form_data.province) : order.form_data.municipality}
                    </span>
                  )}
                  {order.form_data?.province && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                      {typeof getProvinceName === 'function' ? getProvinceName(order.form_data.province) : order.form_data.province}
                    </span>
                  )}
                  {order.shipping_address?.municipality && !order.form_data?.municipality && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      {typeof getMunicipalityName === 'function' ? getMunicipalityName(order.shipping_address.municipality, order.shipping_address.state) : order.shipping_address.municipality}
                    </span>
                  )}
                </div>
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

                  {/* إدارة سريعة للطلب */}
                  {hasUpdatePermission && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="text-sm font-medium text-foreground">إدارة سريعة</h4>
                      
                      {/* حالة الطلب */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">حالة الطلب:</label>
                        <OrderStatusDropdown
                          currentStatus={order.status}
                          orderId={order.id}
                          onUpdateStatus={onUpdateStatus}
                          canCancel={hasCancelPermission}
                        />
                      </div>

                      {/* تأكيد الإتصال */}
                      {onUpdateCallConfirmation && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">تأكيد الإتصال:</label>
                          <div className="flex items-center gap-2">
                            {order.call_confirmation_status && (
                              <CallConfirmationBadge 
                                status={order.call_confirmation_status} 
                                showTooltip={false}
                              />
                            )}
                            <CallConfirmationDropdown
                              currentStatusId={order.call_confirmation_status_id || null}
                              orderId={order.id}
                              onUpdateStatus={(orderId, statusId, notes) => onUpdateCallConfirmation(orderId, statusId, notes)}
                              userId={currentUserId}
                            />
                          </div>
                        </div>
                      )}

                      {/* مزود الشحن */}
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground">حالة الشحن:</label>
                        
                        {/* حالة الشحن الحالية */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.yalidine_tracking_id && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs">
                              <Truck className="h-3 w-3" />
                              <span>ياليدين: {order.yalidine_tracking_id}</span>
                            </div>
                          )}
                          {order.zrexpress_tracking_id && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs">
                              <Truck className="h-3 w-3" />
                              <span>زر إكسبرس: {order.zrexpress_tracking_id}</span>
                            </div>
                          )}
                          {!order.yalidine_tracking_id && !order.zrexpress_tracking_id && (
                            <span className="text-xs text-muted-foreground">لم يتم الإرسال لشركة شحن</span>
                          )}
                        </div>

                        {/* أزرار إرسال للشحن */}
                        {hasUpdatePermission && !order.yalidine_tracking_id && !order.zrexpress_tracking_id && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">إرسال للشحن:</label>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSendToProvider(order.id, 'yalidine')}
                                className="flex-1 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                ياليدين
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSendToProvider(order.id, 'zrexpress')}
                                className="flex-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                زر إكسبرس
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* استخدام المكون الأصلي كـ fallback */}
                        {shippingProviders.length > 0 && (
                          <div className="border-t pt-2">
                            <ShippingProviderColumn
                              order={order}
                              onSendToProvider={onSendToProvider}
                              hasUpdatePermission={hasUpdatePermission}
                              enabledProviders={shippingProviders}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* إجراءات سريعة */}
                      <div className="flex gap-2 pt-2">
                        {order.status === 'pending' && (
                          <>
                            <Button
                              size="sm" 
                              variant="outline"
                              onClick={() => onUpdateStatus(order.id, 'processing')}
                              className="flex-1 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              قيد المعالجة
                            </Button>
                            <Button
                              size="sm" 
                              variant="outline"
                              onClick={() => onUpdateStatus(order.id, 'shipped')}
                              className="flex-1 text-xs"
                            >
                              <Truck className="h-3 w-3 mr-1" />
                              شحن
                            </Button>
                          </>
                        )}
                        
                        {order.status === 'processing' && (
                          <Button
                            size="sm" 
                            variant="outline"
                            onClick={() => onUpdateStatus(order.id, 'shipped')}
                            className="flex-1 text-xs"
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            تم الشحن
                          </Button>
                        )}
                        
                        {hasCancelPermission && canCancelOrder(order) && (
                          <Button
                            size="sm" 
                            variant="destructive"
                            onClick={() => onUpdateStatus(order.id, 'cancelled')}
                            className="flex-1 text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            إلغاء
                          </Button>
                        )}
                      </div>
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
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  currentUserId,
  shippingProviders = [],
  onLoadMore,
  hasMore,
}) => {
  const handleScroll = useCallback(() => {
    if (!onLoadMore || !hasMore || loading) return;
    // اجعل الحساب داخل rAF لتجنب forced reflow في أحداث scroll مكثفة
    requestAnimationFrame(() => {
      const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        onLoadMore();
      }
    });
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
            onUpdateCallConfirmation={onUpdateCallConfirmation}
            onSendToProvider={onSendToProvider}
            hasUpdatePermission={hasUpdatePermission}
            hasCancelPermission={hasCancelPermission}
            currentUserId={currentUserId}
            shippingProviders={shippingProviders}
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
