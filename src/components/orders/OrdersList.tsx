import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollArea,
  ScrollBar
} from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, User, ShoppingBag, Calendar, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// مكون لعرض حالة الطلب مع لون مناسب
const OrderStatusBadge = ({ status }) => {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };

  const statusTranslations = {
    pending: "قيد الانتظار",
    processing: "قيد المعالجة",
    shipped: "تم الشحن",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };

  return (
    <Badge className={`${statusColors[status] || ""} flex gap-1 items-center px-3 py-1`}>
      {statusTranslations[status] || status}
    </Badge>
  );
};

// مكون لعرض قائمة الطلبات
const OrdersList = ({ orders, loading, selectedOrderId, onSelectOrder }) => {
  // تحديد عدد العناصر المعروضة
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // اختيار الطلب
  const handleOrderSelect = (order) => {
    onSelectOrder(order);
  };

  // تنسيق التاريخ
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-DZ', {
      day: 'numeric',
      month: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // عرض رسالة التحميل
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="mr-2">جاري تحميل الطلبات...</span>
      </div>
    );
  }

  // عرض رسالة إذا لم تكن هناك طلبات
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md">
        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">لا توجد طلبات</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          لم يتم العثور على طلبات مطابقة للمعايير المحددة
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)] w-full rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[100px]">#</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>طريقة الدفع</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>الحالة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.slice(0, itemsPerPage).map((order) => (
            <TableRow 
              key={order.id}
              className={`cursor-pointer ${selectedOrderId === order.id ? 'bg-muted' : ''}`}
              onClick={() => handleOrderSelect(order)}
            >
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="underline decoration-dotted font-mono">
                        #{order.customer_order_number || '---'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">{order.id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium flex items-center">
                    <User className="w-3.5 h-3.5 inline-block ml-1 opacity-70" />
                    {order.customer?.name || 'غير معروف'}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center mt-1">
                    <Phone className="w-3.5 h-3.5 inline-block ml-1 opacity-70" />
                    {order.customer?.phone || 'بدون رقم'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono">
                {formatPrice(order.total)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {order.payment_method === 'cash' ? 'الدفع عند الاستلام' : order.payment_method}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-sm">
                  <Calendar className="w-3.5 h-3.5 inline-block ml-1 opacity-70" />
                  {formatDate(order.created_at)}
                </div>
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
      
      {/* عرض زر تحميل المزيد إذا كان عدد الطلبات أكبر من عدد العناصر المعروضة */}
      {orders.length > itemsPerPage && (
        <div className="flex justify-center p-4">
          <button
            className="px-4 py-2 text-sm text-primary hover:text-primary-600 transition-colors"
            onClick={() => setItemsPerPage(prev => prev + 10)}
          >
            عرض المزيد من الطلبات
          </button>
        </div>
      )}
    </ScrollArea>
  );
};

export default OrdersList; 