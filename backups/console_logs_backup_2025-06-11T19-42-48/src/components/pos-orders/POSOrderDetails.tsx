import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { POSOrderWithDetails } from '../../api/posOrdersService';

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

  if (!order) return null;

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
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
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  
                  {parseFloat(order.tax) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الضريبة:</span>
                      <span>{formatCurrency(order.tax)}</span>
                    </div>
                  )}
                  
                  {order.discount && parseFloat(order.discount) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الخصم:</span>
                      <span className="text-red-600">-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>المجموع الإجمالي:</span>
                    <span className="text-primary">{formatCurrency(order.total)}</span>
                  </div>
                  
                  {order.amount_paid && parseFloat(order.amount_paid) > 0 && (
                    <>
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">المبلغ المدفوع:</span>
                        <span>{formatCurrency(order.amount_paid)}</span>
                      </div>
                      
                      {order.remaining_amount && parseFloat(order.remaining_amount) > 0 && (
                        <div className="flex justify-between items-center text-orange-600">
                          <span className="text-sm">المبلغ المتبقي:</span>
                          <span>{formatCurrency(order.remaining_amount)}</span>
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

            {/* عناصر الطلبية */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  عناصر الطلبية ({order.order_items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {order.order_items && order.order_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>المنتج</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-right">السعر الوحدة</TableHead>
                        <TableHead className="text-right">المجموع</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.order_items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name || item.name}</p>
                              {item.slug && (
                                <p className="text-xs text-muted-foreground">كود: {item.slug}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price)}
                            {item.original_price && parseFloat(item.original_price) !== parseFloat(item.unit_price) && (
                              <div className="text-xs text-muted-foreground line-through">
                                {formatCurrency(item.original_price)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_price)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.is_wholesale ? (
                              <Badge variant="outline" className="text-xs">جملة</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">تجزئة</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد عناصر في هذه الطلبية</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ملاحظات */}
            {order.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ملاحظات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};