import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MoreHorizontal, 
  Eye, 
  Printer, 
  Edit, 
  Trash2,
  Users,
  Package,
  DollarSign,
  Calendar,
  CreditCard,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { POSOrderWithDetails } from '../../api/posOrdersService';

interface POSOrdersTableProps {
  orders: POSOrderWithDetails[];
  loading: boolean;
  error?: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onOrderView: (order: POSOrderWithDetails) => void;
  onOrderEdit: (order: POSOrderWithDetails) => void;
  onOrderDelete: (order: POSOrderWithDetails) => void;
  onOrderPrint: (order: POSOrderWithDetails) => void;
  onStatusUpdate: (orderId: string, status: string) => void;
  className?: string;
}

const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'مكتملة', variant: 'default' as const, color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'معلقة', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
      case 'cancelled':
        return { label: 'ملغاة', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
      case 'processing':
        return { label: 'قيد المعالجة', variant: 'outline' as const, color: 'bg-blue-100 text-blue-800' };
      default:
        return { label: status, variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  );
};

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'مدفوع', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'معلق', color: 'bg-yellow-100 text-yellow-800' };
      case 'partial':
        return { label: 'جزئي', color: 'bg-orange-100 text-orange-800' };
      case 'refunded':
        return { label: 'مُسترد', color: 'bg-purple-100 text-purple-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant="secondary" className={config.color}>
      {config.label}
    </Badge>
  );
};

const PaymentMethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const getMethodConfig = (method: string) => {
    switch (method) {
      case 'cash':
        return { label: 'نقدي', icon: '💵' };
      case 'card':
        return { label: 'بطاقة', icon: '💳' };
      case 'credit':
        return { label: 'آجل', icon: '📝' };
      case 'transfer':
        return { label: 'تحويل', icon: '🏦' };
      default:
        return { label: method, icon: '💰' };
    }
  };

  const config = getMethodConfig(method);
  return (
    <div className="flex items-center gap-1">
      <span>{config.icon}</span>
      <span className="text-sm">{config.label}</span>
    </div>
  );
};

export const POSOrdersTable: React.FC<POSOrdersTableProps> = ({
  orders,
  loading,
  error,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onOrderView,
  onOrderEdit,
  onOrderDelete,
  onOrderPrint,
  onStatusUpdate,
  className = ''
}) => {
  const [selectedOrder, setSelectedOrder] = useState<POSOrderWithDetails | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount) + ' دج';
  };

  const formatDate = (date: string): string => {
    try {
      return format(parseISO(date), 'dd/MM/yyyy HH:mm', { locale: ar });
    } catch (error) {
      // في حالة الخطأ، استخدم Date constructor كـ fallback
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedOrder) {
      onOrderDelete(selectedOrder);
      setShowDeleteDialog(false);
      setSelectedOrder(null);
    }
  };

  const TableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: itemsPerPage }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">خطأ في تحميل الطلبيات</h3>
          <p className="text-sm text-muted-foreground text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              طلبيات نقطة البيع
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                `${totalItems} طلبية`
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبيات</h3>
              <p className="text-sm text-muted-foreground text-center">
                لم يتم العثور على أي طلبيات تطابق معايير البحث الحالية.
              </p>
            </div>
          ) : (
            <>
              {/* جدول الطلبيات */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">رقم الطلبية</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>العناصر</TableHead>
                      <TableHead>المبلغ الإجمالي</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>حالة الطلبية</TableHead>
                      <TableHead>حالة الدفع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="w-[50px]">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {order.slug?.slice(-8) || order.id.slice(-8)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {order.customer?.name || 'عميل غير مسجل'}
                              </p>
                              {order.customer?.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {order.customer.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm">
                                {order.employee?.name || 'غير محدد'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{order.items_count}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-right">
                            {/* عرض المبلغ الأصلي والمبلغ بعد التخفيض */}
                            {order.discount && parseFloat(String(order.discount)) > 0 ? (
                              <div>
                                <p className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(String(parseFloat(String(order.total)) + parseFloat(String(order.discount))))}
                                </p>
                                <p className="font-medium text-green-600">
                                  {formatCurrency(String(order.total))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  خصم: {formatCurrency(String(order.discount))}
                                </p>
                              </div>
                            ) : (
                              <p className="font-medium">{formatCurrency(String(order.total))}</p>
                            )}
                            
                                                         {/* عرض معلومات الدفع الجزئي */}
                             {order.remaining_amount && parseFloat(String(order.remaining_amount)) > 0 && (
                               <div className="text-xs mt-1">
                                 {order.consider_remaining_as_partial ? (
                                   <p className="text-amber-600">
                                     متبقي: {formatCurrency(String(order.remaining_amount))}
                                   </p>
                                 ) : (
                                   <p className="text-blue-600">
                                     تخفيض إضافي: {formatCurrency(String(order.remaining_amount))}
                                   </p>
                                 )}
                               </div>
                             )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <PaymentMethodBadge method={order.payment_method} />
                        </TableCell>
                        
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        
                        <TableCell>
                          <PaymentStatusBadge status={order.payment_status} />
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(order.created_at)}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOrderView(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onOrderPrint(order)}>
                                <Printer className="h-4 w-4 mr-2" />
                                طباعة الوصل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onOrderEdit(order)}>
                                <Edit className="h-4 w-4 mr-2" />
                                تعديل الطلبية
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {order.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => onStatusUpdate(order.id, 'completed')}>
                                  تأكيد الطلبية
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => onStatusUpdate(order.id, 'cancelled')}>
                                  إلغاء الطلبية
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                حذف الطلبية
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ترقيم الصفحات */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    عرض {(currentPage - 1) * itemsPerPage + 1} إلى{' '}
                    {Math.min(currentPage * itemsPerPage, totalItems)} من {totalItems} طلبية
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-sm">صفحة</span>
                      <span className="font-medium">{currentPage}</span>
                      <span className="text-sm">من</span>
                      <span className="font-medium">{totalPages}</span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* حوار تأكيد الحذف */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف الطلبية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>هل أنت متأكد من أنك تريد حذف هذه الطلبية؟</p>
            {selectedOrder && (
              <div className="bg-muted p-3 rounded-lg">
                <p><strong>رقم الطلبية:</strong> {selectedOrder.slug?.slice(-8)}</p>
                <p><strong>المبلغ:</strong> {formatCurrency(selectedOrder.total)}</p>
                <p><strong>التاريخ:</strong> {formatDate(selectedOrder.created_at)}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                حذف الطلبية
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
