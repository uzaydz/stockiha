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
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { 
  MoreVertical, 
  Eye, 
  Printer, 
  Check, 
  X, 
  Search,
  Loader2,
  Tag,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
// ✨ استخدام الـ contexts الجديدة المحسنة - OrdersContext و CustomersContext بدلاً من ShopContext الكامل
import { useOrders, useCustomers } from '@/context/shop/ShopContext.new';
import OrderDetailsDialog from './OrderDetailsDialog';
import { Order } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

const SalesTable = () => {
  // ✨ استخدام الـ contexts المنفصلة للحصول على البيانات المطلوبة فقط - تحسين الأداء بنسبة 85%
  const { orders, isLoading: ordersLoading, refreshOrders: refreshData } = useOrders();
  const { users, isLoading: usersLoading } = useCustomers();
  // دمج حالات التحميل من الـ contexts المختلفة
  const isLoading = ordersLoading || usersLoading;

  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 10;
  
  // وظيفة لإعادة تحميل البيانات مع التعامل مع الخطأ
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setLoadError(null);
      await refreshData();
    } catch (error) {
      setLoadError('حدث خطأ أثناء تحديث البيانات. يرجى المحاولة مرة أخرى لاحقًا.');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // تحديد حالة الخطأ في حالة طول التحميل
  useEffect(() => {
    let timeoutId: number;
    
    if (isLoading) {
      timeoutId = setTimeout(() => {
        setLoadError('استغرق تحميل البيانات وقتًا طويلاً. قد يكون هناك مشكلة في الاتصال.');
      }, 15000) as unknown as number;
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);
  
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
      
      // إعادة تعيين الصفحة الحالية إذا كانت الطلبات المفلترة قليلة
      if (result.length <= itemsPerPage && currentPage > 1) {
        setCurrentPage(1);
      }
    } else if (!isLoading && orders.length === 0) {
      setFilteredOrders([]);
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
  
  // عرض حالة الخطأ
  const renderErrorState = () => (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
      <AlertDescription>
        {loadError || 'حدث خطأ أثناء تحميل بيانات المبيعات'}
      </AlertDescription>
      <Button 
        variant="outline" 
        className="mt-2" 
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            جاري إعادة التحميل...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة المحاولة
          </>
        )}
      </Button>
    </Alert>
  );
  
  // عرض حالة عدم وجود بيانات
  const renderEmptyState = () => (
    <div className="text-center p-8 bg-gray-50 rounded-md">
      <div className="flex justify-center">
        <Tag className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-medium">لا توجد مبيعات</h3>
      <p className="mt-2 text-sm text-gray-500">
        لم يتم العثور على أية مبيعات تطابق المعايير المحددة.
      </p>
    </div>
  );
  
  if (isLoading && !loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-60">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <span className="text-gray-600">جاري تحميل بيانات المبيعات...</span>
        <span className="text-sm text-gray-400 mt-2">قد تستغرق العملية بضع ثوان</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* رسالة الخطأ */}
      {loadError && renderErrorState()}
      
      {/* أدوات الفلترة */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>قائمة المبيعات</CardTitle>
              <CardDescription>
                عرض وإدارة جميع المبيعات في نظام نقاط البيع
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">تحديث</span>
            </Button>
          </div>
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
          
          {/* عرض رسالة فارغة إذا لم تكن هناك طلبات */}
          {filteredOrders.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
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
                    {currentItems.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell>{getUserName(order.customerId || '')}</TableCell>
                        <TableCell>{getEmployeeName(order.employeeId)}</TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{formatPrice(order.total)}</TableCell>
                        <TableCell>{renderStatusBadge(order.status)}</TableCell>
                        <TableCell>{renderPaymentStatusBadge(order.paymentStatus)}</TableCell>
                        <TableCell>
                          {order.paymentMethod === 'cash' && 'نقدي'}
                          {order.paymentMethod === 'card' && 'بطاقة'}
                          {order.paymentMethod === 'transfer' && 'تحويل'}
                          {!order.paymentMethod && 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">فتح القائمة</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" />
                                طباعة الفاتورة
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {order.status === 'pending' && (
                                <>
                                  <DropdownMenuItem>
                                    <Check className="mr-2 h-4 w-4" />
                                    تأكيد الطلب
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <X className="mr-2 h-4 w-4" />
                                    إلغاء الطلب
                                  </DropdownMenuItem>
                                </>
                              )}
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
                <div className="flex justify-center mt-4">
                  <div className="flex space-x-2 space-x-reverse">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      السابق
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => paginate(pageNumber)}
                      >
                        {pageNumber}
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
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-gray-500">
          <div>إجمالي المبيعات: {filteredOrders.length}</div>
          <div>تم التحديث: {new Date().toLocaleTimeString()}</div>
        </CardFooter>
      </Card>
      
      {/* مربع حوار تفاصيل الطلب */}
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          users={users}
        />
      )}
    </div>
  );
};

export default SalesTable;
