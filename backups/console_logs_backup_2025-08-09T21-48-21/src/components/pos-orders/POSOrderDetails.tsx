import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  X,
  Users,
  Calendar,
  Package,
  DollarSign,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  Printer,
  Edit,
  Receipt,
  Hash,
  ShoppingCart,
  Banknote,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { POSOrderWithDetails } from '../../api/posOrdersService';
import { supabase } from '../../lib/supabase';

interface POSOrderDetailsProps {
  order: POSOrderWithDetails | null;
  open: boolean;
  onClose: () => void;
  onPrint?: (order: POSOrderWithDetails) => void;
  onEdit?: (order: POSOrderWithDetails) => void;
  className?: string;
}

const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          label: 'مكتملة', 
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-200' 
        };
      case 'pending':
        return { 
          label: 'معلقة', 
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
        };
      case 'cancelled':
        return { 
          label: 'ملغاة', 
          icon: X,
          color: 'bg-red-100 text-red-800 border-red-200' 
        };
      case 'processing':
        return { 
          label: 'قيد المعالجة', 
          icon: AlertCircle,
          color: 'bg-blue-100 text-blue-800 border-blue-200' 
        };
      default:
        return { 
          label: status, 
          icon: AlertCircle,
          color: 'bg-gray-100 text-gray-800 border-gray-200' 
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge variant="secondary" className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const POSOrderDetails: React.FC<POSOrderDetailsProps> = ({
  order,
  open,
  onClose,
  onPrint,
  onEdit,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'payment'>('details');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // جلب عناصر الطلبية عند فتح النافذة
  useEffect(() => {
    if (open && order && order.id) {
      const loadOrderItems = async () => {
        setIsLoadingItems(true);
        setItemsError(null);
        
        try {
          // استخدام supabase مباشرة
          const { data, error } = await supabase
            .from('order_items')
            .select(`
              *,
              product:product_id(id, name, price, thumbnail_image)
            `)
            .eq('order_id', order.id);

          if (error) {
            throw error;
          }

          setOrderItems(data || []);
        } catch (error) {
          setOrderItems([]);
          setItemsError(error instanceof Error ? error.message : 'حدث خطأ في تحميل العناصر');
        } finally {
          setIsLoadingItems(false);
        }
      };

      loadOrderItems();
    }
  }, [open, order]);

  // إعادة تعيين البيانات عند إغلاق النافذة
  useEffect(() => {
    if (!open) {
      setOrderItems([]);
      setIsLoadingItems(false);
      setItemsError(null);
    }
  }, [open]);

  if (!order) return null;

  const formatCurrency = (amount: number | string | undefined): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount) + ' دج';
  };

  const formatDate = (date: string): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'credit': return '📝';
      case 'transfer': return '🏦';
      default: return '💰';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة';
      case 'credit': return 'آجل';
      case 'transfer': return 'تحويل';
      default: return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] ${className}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تفاصيل الطلبية #{order.slug?.slice(-8) || order.id.slice(-8)}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
                  <Edit className="h-4 w-4 mr-2" />
                  تعديل
                </Button>
              )}
              {onPrint && (
                <Button variant="outline" size="sm" onClick={() => onPrint(order)}>
                  <Printer className="h-4 w-4 mr-2" />
                  طباعة
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* معلومات أساسية */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* معلومات الطلبية */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    معلومات الطلبية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">رقم الطلبية:</span>
                    <span className="font-mono">{order.slug?.slice(-8) || order.id.slice(-8)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">الحالة:</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">التاريخ:</span>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">عدد العناصر:</span>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{order.items_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* معلومات الدفع */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    معلومات الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">طريقة الدفع:</span>
                    <div className="flex items-center gap-2">
                      <span>{getPaymentMethodIcon(order.payment_method)}</span>
                      <span>{getPaymentMethodLabel(order.payment_method)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">حالة الدفع:</span>
                    <Badge variant="secondary" className={
                      order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {order.payment_status === 'paid' ? 'مدفوع' :
                       order.payment_status === 'pending' ? 'معلق' :
                       order.payment_status === 'partial' ? 'جزئي' : 'مرفوض'}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">المجموع الفرعي:</span>
                    <span>{formatCurrency(String(order.subtotal))}</span>
                  </div>
                  
                  {parseFloat(String(order.tax)) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الضريبة:</span>
                      <span>{formatCurrency(String(order.tax))}</span>
                    </div>
                  )}
                  
                  {/* عرض الخصم */}
                  {order.discount && parseFloat(String(order.discount)) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الخصم:</span>
                      <span className="text-red-600">-{formatCurrency(String(order.discount))}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* المجموع الإجمالي (بعد الخصم) */}
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>المجموع الإجمالي:</span>
                    <span className="text-primary">{formatCurrency(String(order.total))}</span>
                  </div>
                  
                  {/* المبلغ الأصلي قبل الخصم */}
                  {order.discount && parseFloat(String(order.discount)) > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>المبلغ قبل الخصم:</span>
                      <span className="line-through">{formatCurrency(String(parseFloat(String(order.total)) + parseFloat(String(order.discount))))}</span>
                    </div>
                  )}
                  
                  {/* معلومات الدفع */}
                  {order.amount_paid && parseFloat(order.amount_paid) > 0 && (
                    <>
                      <Separator />
                      
                      {/* إذا كان دفع جزئي */}
                      {order.consider_remaining_as_partial && order.remaining_amount && parseFloat(order.remaining_amount) > 0 ? (
                        <div className="space-y-3">
                          {/* عنوان الدفع الجزئي */}
                          <div className="flex items-center justify-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">دفعة جزئية (سلف)</span>
                          </div>
                          
                          {/* المبلغ المدفوع */}
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">المبلغ المدفوع:</span>
                            <span className="text-green-600 font-medium">{formatCurrency(order.amount_paid)}</span>
                          </div>
                          
                          {/* المبلغ المتبقي */}
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">المبلغ المتبقي:</span>
                            <span className="text-amber-600 font-medium">{formatCurrency(String(order.remaining_amount))}</span>
                          </div>
                          
                          {/* شريط التقدم */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>نسبة الدفع</span>
                              <span>{Math.round((parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, (parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* حالة الدفع */}
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-amber-600" />
                              <span className="text-sm font-medium text-amber-800">حالة الدفع: معلق</span>
                            </div>
                            <p className="text-xs text-amber-700">
                              تم دفع {formatCurrency(String(order.amount_paid))} من أصل {formatCurrency(String(order.total))}
                              <br />
                              المبلغ المتبقي: {formatCurrency(String(order.remaining_amount))}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* الدفع العادي أو التخفيض */
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-green-600">
                            <span className="text-sm">المبلغ المدفوع:</span>
                            <span className="font-medium">{formatCurrency(String(order.amount_paid))}</span>
                          </div>
                          
                          {order.remaining_amount && parseFloat(String(order.remaining_amount)) > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">تخفيض إضافي:</span>
                              <span className="text-blue-600 font-medium">{formatCurrency(String(order.remaining_amount))}</span>
                            </div>
                          )}
                          
                          {/* حالة الدفع */}
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                {order.remaining_amount && parseFloat(String(order.remaining_amount)) > 0 ? 
                                  'تخفيض على العميل - الطلب مكتمل' : 
                                  'تم الدفع بالكامل'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* معلومات العميل والموظف */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* معلومات العميل */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    معلومات العميل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.customer ? (
                    <>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{order.customer.name}</span>
                      </div>
                      
                      {order.customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.customer.phone}</span>
                        </div>
                      )}
                      
                      {order.customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.customer.email}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>عميل غير مسجل</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* معلومات الموظف */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    معلومات الموظف
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.employee ? (
                    <>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{order.employee.name}</span>
                      </div>
                      
                      {order.employee.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.employee.email}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>غير محدد</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* معلومات حساب الاشتراك */}
            {order.metadata && 
             typeof order.metadata === 'object' &&
             order.metadata !== null &&
             'subscriptionAccountInfo' in order.metadata &&
             order.metadata.subscriptionAccountInfo &&
             typeof order.metadata.subscriptionAccountInfo === 'object' && (
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <CreditCard className="h-4 w-4" />
                    معلومات حساب الاشتراك
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const accountInfo = order.metadata.subscriptionAccountInfo as any;
                    return (
                      <>
                        {accountInfo.username && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">اسم المستخدم:</span>
                            <span className="font-mono bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-purple-800 dark:text-purple-200">
                              {accountInfo.username}
                            </span>
                          </div>
                        )}
                        
                        {accountInfo.email && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">البريد الإلكتروني:</span>
                            <span className="font-mono bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                              {accountInfo.email}
                            </span>
                          </div>
                        )}
                        
                        {accountInfo.password && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">كلمة المرور:</span>
                            <span className="font-mono bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-green-800 dark:text-green-200">
                              {accountInfo.password}
                            </span>
                          </div>
                        )}
                        
                        {accountInfo.notes && (
                          <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">ملاحظات:</span>
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                              {accountInfo.notes}
                            </div>
                          </div>
                        )}
                        
                        {!Object.values(accountInfo).some(val => val) && (
                          <div className="text-muted-foreground text-center py-4">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>لا توجد معلومات حساب اشتراك</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* عناصر الطلبية */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  عناصر الطلبية ({isLoadingItems ? '...' : orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingItems ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="mr-2 text-muted-foreground">جاري تحميل عناصر الطلبية...</span>
                  </div>
                ) : orderItems && orderItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>المنتج/الخدمة</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-right">السعر الوحدة</TableHead>
                        <TableHead className="text-right">المجموع</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => {
                        // تحديد نوع العنصر
                        const itemType = (item as any).item_type || 'product';
                        const isSubscription = itemType === 'subscription';
                        const isDigitalService = itemType === 'digital_service';
                        const isProduct = itemType === 'product';

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product_name || item.name}</p>
                                {item.slug && (
                                  <p className="text-xs text-muted-foreground">كود: {item.slug}</p>
                                )}
                                
                                {/* شارة نوع العنصر */}
                                <div className="flex items-center gap-2 mt-1">
                                  {isSubscription && (
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                      🔔 اشتراك
                                    </Badge>
                                  )}
                                  {isDigitalService && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      💻 خدمة رقمية
                                    </Badge>
                                  )}
                                  {isProduct && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      📦 منتج
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* عرض معلومات الألوان والمقاسات للمنتجات فقط */}
                                {isProduct && ((item as any).color_name || (item as any).size_name) && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(item as any).color_name && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                                        <span className="w-2 h-2 rounded-full bg-blue-600 mr-1"></span>
                                        {(item as any).color_name}
                                      </span>
                                    )}
                                    {(item as any).size_name && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
                                        <span className="text-green-600 mr-1">📏</span>
                                        {(item as any).size_name}
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* عرض معلومات إضافية من variant_info إذا كانت متوفرة */}
                                {isProduct && item.variant_info && typeof item.variant_info === 'object' && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {(item.variant_info as any).colorCode && (
                                      <span className="mr-2">
                                        كود اللون: {(item.variant_info as any).colorCode}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(String(item.unit_price))}
                              {item.original_price && parseFloat(item.original_price) !== parseFloat(item.unit_price) && (
                                <div className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(String(item.original_price))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(String(item.total_price))}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.is_wholesale ? (
                                <Badge variant="outline" className="text-xs">جملة</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">تجزئة</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد عناصر في هذه الطلبية</p>
                    <p className="text-xs mt-2">
                      قد تكون هذه طلبية خاصة أو تحتاج إلى مراجعة البيانات
                    </p>
                    
                    {/* معلومات تشخيصية */}
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                      <p className="text-xs text-amber-800 font-medium mb-2">معلومات تشخيصية:</p>
                      <div className="text-xs text-amber-700 space-y-1">
                        <p>• رقم الطلبية: {order.id}</p>
                        <p>• إجمالي المبلغ: {formatCurrency(String(order.total))}</p>
                        <p>• عدد العناصر المسجل: {order.items_count || 0}</p>
                        <p>• نوع الطلبية: {order.is_online ? 'أونلاين' : 'نقطة البيع'}</p>
                        {(order as any).sale_type && (
                          <p>• نوع البيع: {(order as any).sale_type === 'subscription' ? 'اشتراك' : 'منتج'}</p>
                        )}
                        {order.metadata && (
                          <p>• يحتوي على بيانات إضافية: نعم</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ملاحظات ومعلومات إضافية */}
            {(order.notes || (order.consider_remaining_as_partial && order.remaining_amount && parseFloat(order.remaining_amount) > 0)) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {order.consider_remaining_as_partial ? 'تفاصيل الدفع الجزئي' : 'ملاحظات'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* معلومات الدفع الجزئي المحسنة */}
                  {order.consider_remaining_as_partial && order.remaining_amount && parseFloat(order.remaining_amount) > 0 && (
                    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h4 className="font-bold text-amber-900 dark:text-amber-100 text-lg">تفاصيل الدفع الجزئي (السلف)</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* المعلومات المالية */}
                        <div className="space-y-4">
                          <div className="p-4 bg-white/60 dark:bg-gray-900/60 rounded-lg border border-amber-100 dark:border-amber-800/50 backdrop-blur-sm">
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between items-center py-2 border-b border-amber-100 dark:border-amber-800/50">
                                <span className="text-muted-foreground font-medium">إجمالي الطلبية:</span>
                                                                <span className="font-bold text-lg text-foreground">{formatCurrency(order.total)}</span>
                               </div>
                               <div className="flex justify-between items-center py-2 border-b border-amber-100 dark:border-amber-800/50">
                                 <span className="text-emerald-700 dark:text-emerald-400 font-medium">المبلغ المدفوع:</span>
                                 <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(order.amount_paid || 0)}</span>
                               </div>
                               <div className="flex justify-between items-center py-2">
                                 <span className="text-amber-700 dark:text-amber-400 font-medium">المبلغ المتبقي:</span>
                                 <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(order.remaining_amount || 0)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* النسب والحالة */}
                        <div className="space-y-4">
                          <div className="p-4 bg-white/60 dark:bg-gray-900/60 rounded-lg border border-amber-100 dark:border-amber-800/50 backdrop-blur-sm">
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between items-center py-2 border-b border-amber-100 dark:border-amber-800/50">
                                <span className="text-muted-foreground font-medium">نسبة الدفع:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {Math.round((parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%
                                  </span>
                                  <div className="w-8 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-300"
                                      style={{ width: `${Math.min(100, (parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-amber-100 dark:border-amber-800/50">
                                <span className="text-muted-foreground font-medium">نسبة المتبقي:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    {Math.round((parseFloat(String(order.remaining_amount)) / parseFloat(String(order.total))) * 100)}%
                                  </span>
                                  <div className="w-8 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-500 transition-all duration-300"
                                      style={{ width: `${Math.round((parseFloat(String(order.remaining_amount)) / parseFloat(String(order.total))) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-muted-foreground font-medium">حالة الدفع:</span>
                                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                                  <Clock className="h-3 w-3 mr-1" />
                                  معلق
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* شريط التقدم المحسن */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-muted-foreground">تقدم الدفع</span>
                                                     <span className="font-bold text-foreground">
                             {formatCurrency(order.amount_paid || 0)} / {formatCurrency(order.total)}
                           </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-amber-100 dark:bg-amber-900/30 rounded-full h-4 border border-amber-200 dark:border-amber-800 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-center relative"
                              style={{ 
                                width: `${Math.min(100, (parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%` 
                              }}
                            >
                              {parseFloat(String(order.amount_paid)) / parseFloat(String(order.total)) > 0.15 && (
                                <span className="text-xs text-white font-bold drop-shadow-sm">
                                  {Math.round((parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {parseFloat(String(order.amount_paid)) / parseFloat(String(order.total)) <= 0.15 && (
                            <div className="absolute left-2 top-0 h-full flex items-center">
                              <span className="text-xs text-muted-foreground font-medium">
                                {Math.round((parseFloat(String(order.amount_paid)) / parseFloat(String(order.total))) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* ملاحظة محسنة */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-1 bg-amber-200 dark:bg-amber-800 rounded-full mt-0.5">
                            <AlertCircle className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                          </div>
                                                     <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                             <strong className="font-semibold">ملاحظة مهمة:</strong> هذه طلبية دفع جزئي (سلف). العميل دفع {formatCurrency(order.amount_paid || 0)} 
                             ويتبقى عليه دفع <strong className="font-semibold text-amber-900 dark:text-amber-100">{formatCurrency(order.remaining_amount || 0)}</strong> لإكمال الطلبية.
                           </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* الملاحظات العادية */}
                  {order.notes && (
                    <div className={order.consider_remaining_as_partial ? 'mt-4 pt-4 border-t border-gray-200' : ''}>
                      {order.consider_remaining_as_partial && (
                        <h5 className="font-medium text-gray-700 mb-2">ملاحظات إضافية:</h5>
                      )}
                      <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border">{order.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
