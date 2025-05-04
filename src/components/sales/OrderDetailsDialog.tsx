import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Order, User as AppUser } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Printer, ArrowLeft } from 'lucide-react';

interface OrderDetailsDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppUser[];
}

const OrderDetailsDialog = ({ 
  order, 
  open, 
  onOpenChange,
  users,
}: OrderDetailsDialogProps) => {
  // الحصول على اسم العميل
  const getCustomerName = () => {
    if (order.customerId === 'walk-in') return 'عميل عابر';
    const customer = users.find(u => u.id === order.customerId);
    return customer ? customer.name : 'عميل غير مسجل';
  };
  
  // الحصول على اسم الموظف
  const getEmployeeName = () => {
    if (!order.employeeId) return 'غير محدد';
    const employee = users.find(u => u.id === order.employeeId);
    return employee ? employee.name : 'غير محدد';
  };
  
  // تنسيق التاريخ
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <div>تفاصيل الطلب #{order.id.substring(0, 8)}</div>
            <Button variant="outline" size="icon" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            جميع المعلومات المتعلقة بهذا الطلب ومنتجاته وخدماته
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* معلومات الطلب الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تفاصيل الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">الرقم المرجعي:</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">تاريخ الطلب:</span>
                  <span className="font-medium">{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">حالة الطلب:</span>
                  <Badge 
                    className={
                      order.status === 'completed' ? "bg-green-100 text-green-700" : 
                      order.status === 'pending' ? "bg-yellow-100 text-yellow-700" : 
                      "bg-red-100 text-red-700"
                    }
                  >
                    {order.status === 'completed' ? 'مكتمل' : 
                     order.status === 'pending' ? 'قيد الانتظار' : 
                     'ملغي'}
                  </Badge>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">طريقة الدفع:</span>
                  <span className="font-medium">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">حالة الدفع:</span>
                  <Badge 
                    className={
                      order.paymentStatus === 'paid' ? "bg-green-100 text-green-700" : 
                      order.paymentStatus === 'pending' ? "bg-yellow-100 text-yellow-700" : 
                      "bg-red-100 text-red-700"
                    }
                  >
                    {order.paymentStatus === 'paid' ? 'مدفوع' : 
                     order.paymentStatus === 'pending' ? 'قيد الانتظار' : 
                     'فشل الدفع'}
                  </Badge>
                </div>
                {order.notes && (
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-muted-foreground">ملاحظات:</span>
                    <span className="font-medium">{order.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">معلومات العميل والموظف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-medium">{getCustomerName()}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">معرف العميل:</span>
                  <span className="font-medium">{order.customerId}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">تم البيع بواسطة:</span>
                  <span className="font-medium">{getEmployeeName()}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">نوع الطلب:</span>
                  <Badge variant="outline">
                    {order.isOnline ? 'عبر الإنترنت' : 'نقطة بيع'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* تفاصيل المنتجات */}
          {order.items && order.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المنتجات</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>سعر الوحدة</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>المجموع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productName}
                          {item.isWholesale && (
                            <div className="text-xs text-emerald-600">
                              (سعر الجملة مطبق)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatPrice(item.unitPrice)}
                          {item.isWholesale && item.originalPrice && (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatPrice(item.originalPrice)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatPrice(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          
          {/* تفاصيل الخدمات */}
          {order.services && order.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الخدمات</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الخدمة</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>تاريخ الموعد</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.serviceName}</TableCell>
                        <TableCell>{formatPrice(service.price)}</TableCell>
                        <TableCell>
                          {service.scheduledDate 
                            ? formatDate(service.scheduledDate) 
                            : 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              service.status === 'completed' ? "bg-green-100 text-green-700" : 
                              service.status === 'pending' ? "bg-yellow-100 text-yellow-700" : 
                              "bg-red-100 text-red-700"
                            }
                          >
                            {service.status === 'completed' ? 'مكتمل' : 
                             service.status === 'pending' ? 'قيد الانتظار' : 
                             service.status === 'cancelled' ? 'ملغي' : service.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          
          {/* ملخص الطلب */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الخصم:</span>
                    <span>- {formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الضريبة:</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>الإجمالي:</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button>
            <Printer className="ml-2 h-4 w-4" />
            طباعة الفاتورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog; 