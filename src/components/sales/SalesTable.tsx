import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  MoreVertical, 
  Eye, 
  Printer, 
  Check, 
  X, 
  Search,
  Loader2,
  Tag
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useShop } from '@/context/ShopContext';
import OrderDetailsDialog from './OrderDetailsDialog';
import { Order } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SalesTable = () => {
  const { orders, users, isLoading } = useShop();
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // تحديث الطلبات المفلترة عند تغيير البيانات
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      let result = [...orders].filter(order => !order.isOnline);
      
      // تطبيق البحث
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(order => 
          order.id.toLowerCase().includes(term) || 
          (order.customerId && getUserName(order.customerId).toLowerCase().includes(term))
        );
      }
      
      // تطبيق فلتر الحالة
      if (statusFilter !== 'all') {
        result = result.filter(order => order.status === statusFilter);
      }
      
      // تطبيق فلتر حالة الدفع
      if (paymentStatusFilter !== 'all') {
        result = result.filter(order => order.paymentStatus === paymentStatusFilter);
      }
      
      // ترتيب الطلبات من الأحدث للأقدم
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setFilteredOrders(result);
    }
  }, [isLoading, orders, searchTerm, statusFilter, paymentStatusFilter]);
  
  // الحصول على اسم العميل من خلال المعرّف
  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? user.name : 'عميل غير مسجل';
  };
  
  // الحصول على اسم الموظف من خلال المعرّف
  const getEmployeeName = (employeeId: string | undefined) => {
    if (!employeeId) return 'غير محدد';
    const employee = users?.find(u => u.id === employeeId);
    return employee ? employee.name : 'غير محدد';
  };
  
  // عرض تفاصيل الطلب
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };
  
  // إعادة تعيين الفلاتر
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
  };
  
  // التنقل بين الصفحات
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // عرض شارة الحالة المناسبة
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">مكتمل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">قيد الانتظار</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">ملغي</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };
  
  // عرض شارة حالة الدفع المناسبة
  const renderPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">مدفوع</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">قيد الانتظار</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">فشل الدفع</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };
  
  // Función para verificar si un pedido tiene productos con precio mayorista
  const hasWholesaleItems = (order: Order) => {
    return order.items.some(item => item.isWholesale);
  };

  // Función para calcular el ahorro total de precio mayorista en un pedido
  const calculateWholesaleSavings = (order: Order) => {
    return order.items.reduce((total, item) => {
      if (item.isWholesale && item.originalPrice) {
        return total + ((item.originalPrice - item.unitPrice) * item.quantity);
      }
      return total;
    }, 0);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* أدوات الفلترة */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المبيعات</CardTitle>
          <CardDescription>
            عرض وإدارة جميع المبيعات في نظام نقاط البيع
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن رقم الطلب أو اسم العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <div className="flex flex-row gap-2">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="حالة الطلب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={paymentStatusFilter} 
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="حالة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="failed">فشل الدفع</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={resetFilters}>
                إعادة تعيين
              </Button>
            </div>
          </div>
          
          {/* جدول المبيعات */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>{getUserName(order.customerId)}</TableCell>
                      <TableCell>{getEmployeeName(order.employeeId)}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString('en')}
                        <div className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString('en')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {formatPrice(order.total)}
                          {hasWholesaleItems(order) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Tag className="h-4 w-4 text-emerald-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>يتضمن أسعار الجملة</p>
                                  <p className="text-xs">وفر: {formatPrice(calculateWholesaleSavings(order))}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderStatusBadge(order.status)}</TableCell>
                      <TableCell>{renderPaymentStatusBadge(order.paymentStatus)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">فتح القائمة</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 ml-2" />
                              طباعة الفاتورة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      لم يتم العثور على نتائج مطابقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* ترقيم الصفحات */}
          {filteredOrders.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                عرض {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredOrders.length)} من {filteredOrders.length} طلب
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => paginate(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* مربع حوار تفاصيل الطلب */}
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          users={users || []}
        />
      )}
    </div>
  );
};

export default SalesTable; 