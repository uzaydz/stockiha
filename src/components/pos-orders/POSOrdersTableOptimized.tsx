import React, { useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Eye,
  Edit,
  Trash2,
  Printer,
  MoreHorizontal,
  Package,
  AlertCircle,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Phone,
  FileText,
  Receipt
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { POSOrderWithDetails } from '@/api/posOrdersService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface POSOrdersTableProps {
  orders: POSOrderWithDetails[];
  loading?: boolean;
  error?: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onOrderView: (order: POSOrderWithDetails) => void;
  onOrderEdit: (order: POSOrderWithDetails) => void;
  onOrderDelete: (order: POSOrderWithDetails) => void;
  onOrderPrint: (order: POSOrderWithDetails) => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<boolean>;
}

// Helper for formatting currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Status Configuration مع دعم حالات المزامنة
const STATUS_CONFIG = {
  pending: { label: 'معلق', icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  processing: { label: 'قيد المعالجة', icon: Package, className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  completed: { label: 'مكتمل', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  cancelled: { label: 'ملغي', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  fully_returned: { label: 'مرجعة بالكامل', icon: ArrowUpRight, className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
  partially_returned: { label: 'مرجعة جزئياً', icon: ArrowUpRight, className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  // ⚡ حالات المزامنة
  pending_sync: { label: 'قيد المزامنة', icon: Clock, className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  synced: { label: 'مُزامَن', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  syncing: { label: 'جاري المزامنة', icon: Clock, className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  failed: { label: 'فشل المزامنة', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
};

const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    label: status,
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm', config.className)}>
      <Icon className="w-3 h-3 mr-1.5" />
      {config.label}
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

// Payment Progress Component
const PaymentProgress = React.memo<{ order: POSOrderWithDetails }>(({ order }) => {
  const total = parseFloat(order.total.toString());
  const amountPaid = parseFloat(order.amount_paid?.toString() || '0');
  const percentage = Math.min(100, Math.max(0, (amountPaid / total) * 100));
  
  let statusColor = 'bg-emerald-500';
  let statusText = 'مدفوع';
  let textColor = 'text-emerald-600';

  if (amountPaid === 0) {
    statusColor = 'bg-red-500';
    statusText = 'غير مدفوع';
    textColor = 'text-red-600';
  } else if (amountPaid < total) {
    statusColor = 'bg-amber-500';
    statusText = 'جزئي';
    textColor = 'text-amber-600';
  }

  // Override based on payment_status if needed
  if (order.payment_status === 'unpaid') {
      statusColor = 'bg-red-500';
      statusText = 'غير مدفوع';
      textColor = 'text-red-600';
  }

  return (
    <div className="w-full max-w-[140px]">
      <div className="flex justify-between text-xs mb-1.5">
        <span className={cn("font-medium", textColor)}>{statusText}</span>
        <span className="text-muted-foreground">{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-2" indicatorClassName={statusColor} />
      {amountPaid < total && amountPaid > 0 && (
        <div className="text-[10px] text-muted-foreground mt-1 text-right">
          متبقي: {formatCurrency(total - amountPaid)}
        </div>
      )}
    </div>
  );
});
PaymentProgress.displayName = 'PaymentProgress';

// Customer Cell Component
const CustomerCell = React.memo<{ order: POSOrderWithDetails }>(({ order }) => {
  const customerName = order.customer?.name || 'زائر';
  const customerPhone = order.customer?.phone;
  
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-border/50">
        <AvatarImage src={order.customer?.avatar_url || undefined} />
        <AvatarFallback className={cn(order.customer ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          {customerName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground line-clamp-1">
          {customerName}
        </span>
        {customerPhone ? (
          <div className="flex items-center text-xs text-muted-foreground gap-1">
            <Phone className="h-3 w-3" />
            <span dir="ltr">{customerPhone}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">عميل نقدي</span>
        )}
      </div>
    </div>
  );
});
CustomerCell.displayName = 'CustomerCell';

// Order ID & Date Cell
const OrderInfoCell = React.memo<{ order: POSOrderWithDetails }>(({ order }) => {
  const date = parseISO(order.created_at);
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm font-mono bg-muted/50 px-2 py-0.5 rounded text-foreground">
          #{order.slug?.slice(-8) || order.id.slice(-8)}
        </span>
      </div>
      <div className="flex items-center text-xs text-muted-foreground gap-1" title={format(date, 'PPP pp', { locale: ar })}>
        <Calendar className="h-3 w-3" />
        <span>{format(date, 'd MMM', { locale: ar })}</span>
        <span className="text-border">|</span>
        <Clock className="h-3 w-3" />
        <span>{format(date, 'HH:mm')}</span>
      </div>
    </div>
  );
});
OrderInfoCell.displayName = 'OrderInfoCell';

// Table Row Skeleton
const TableRowSkeleton = () => (
  <TableRow className="hover:bg-transparent">
    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
    <TableCell>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-2 w-24 mb-2" /><Skeleton className="h-3 w-12" /></TableCell>
    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
  </TableRow>
);

// Main Row Component
const OrderRow = React.memo<{
  order: POSOrderWithDetails;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onStatusUpdate: (status: string) => Promise<void>;
}>(({ order, onView, onEdit, onDelete, onPrint, onStatusUpdate }) => {
  
  const handleQuickStatusUpdate = useCallback((newStatus: string) => {
    onStatusUpdate(newStatus);
  }, [onStatusUpdate]);

  return (
    <TableRow className="group hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted">
      <TableCell className="w-[200px]">
        <OrderInfoCell order={order} />
      </TableCell>
      
      <TableCell className="w-[250px]">
        <CustomerCell order={order} />
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-1.5">
           <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-background font-normal gap-1">
                <Package className="h-3 w-3" />
                {order.items_count} منتجات
              </Badge>
              {order.has_returns && (
                <Badge variant="destructive" className="text-[10px] px-1.5 h-5">مرتجع</Badge>
              )}
           </div>
           {(order.notes || (order.metadata as any)?.notes) && (
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[150px] truncate cursor-help">
                     <FileText className="h-3 w-3" />
                     <span>{order.notes || (order.metadata as any)?.notes}</span>
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>{order.notes || (order.metadata as any)?.notes}</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
           )}
        </div>
      </TableCell>

      <TableCell>
        <StatusBadge status={order.status} />
      </TableCell>

      <TableCell className="min-w-[150px]">
        <PaymentProgress order={order} />
      </TableCell>

      <TableCell className="text-right">
        <div className="font-bold text-base">
          {formatCurrency(parseFloat(order.total))}
        </div>
        {order.discount && parseFloat(order.discount.toString()) > 0 && (
             <div className="text-xs text-green-600">
               خصم: {formatCurrency(parseFloat(order.discount.toString()))}
             </div>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrint}>
                   <Printer className="h-4 w-4 text-muted-foreground" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent>طباعة</TooltipContent>
             </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}>
                   <Eye className="h-4 w-4 text-muted-foreground" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent>عرض التفاصيل</TooltipContent>
             </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>إجراءات الطلب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>
                <Receipt className="h-4 w-4 ml-2" />
                طباعة الفاتورة
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleQuickStatusUpdate('completed')}
                disabled={order.status === 'completed'}
                className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
              >
                <CheckCircle2 className="h-4 w-4 ml-2" />
                تحديد كمكتمل
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleQuickStatusUpdate('cancelled')}
                disabled={order.status === 'cancelled'}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20"
              >
                <XCircle className="h-4 w-4 ml-2" />
                إلغاء الطلب
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20">
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});
OrderRow.displayName = 'OrderRow';

export const POSOrdersTableOptimized = React.memo<POSOrdersTableProps>(({
  orders,
  loading = false,
  error = null,
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
}) => {
  
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  if (!loading && orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">لا توجد طلبيات</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            لم يتم العثور على أي طلبيات تطابق معايير البحث المحددة. جرب تغيير الفلاتر أو إنشاء طلبية جديدة.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            تحديث الصفحة
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-destructive">حدث خطأ في تحميل البيانات</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {error}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            محاولة مرة أخرى
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-right font-semibold">الطلبية</TableHead>
              <TableHead className="text-right font-semibold">العميل</TableHead>
              <TableHead className="text-right font-semibold">التفاصيل</TableHead>
              <TableHead className="text-right font-semibold">الحالة</TableHead>
              <TableHead className="text-right font-semibold">الدفع</TableHead>
              <TableHead className="text-right font-semibold">الإجمالي</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRowSkeleton key={index} />
              ))
            ) : (
              orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onView={() => onOrderView(order)}
                  onEdit={() => onOrderEdit(order)}
                  onDelete={() => onOrderDelete(order)}
                  onPrint={() => onOrderPrint(order)}
                  onStatusUpdate={async (status) => {
                    await onStatusUpdate(order.id, status);
                  }}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Improved Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} من {totalItems}
          </p>
          
          <Pagination className="justify-end order-1 sm:order-2 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                  className={cn(
                    "cursor-pointer",
                    currentPage === 1 && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
              
              {paginationRange.map((page, index) => (
                <PaginationItem key={index}>
                  {page === '...' ? (
                    <span className="px-4 text-muted-foreground">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => onPageChange(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                  className={cn(
                    "cursor-pointer",
                    currentPage === totalPages && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
});

POSOrdersTableOptimized.displayName = 'POSOrdersTableOptimized';

export default POSOrdersTableOptimized;
