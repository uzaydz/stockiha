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
} from '@/components/ui/dropdown-menu';
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
  MoreVertical,
  Package,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { POSOrderWithDetails } from '@/api/posOrdersService';

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

// Status badge component
const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  const config = {
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    processing: { label: 'قيد المعالجة', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    completed: { label: 'مكتمل', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    cancelled: { label: 'ملغي', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    fully_returned: { label: 'مرجعة بالكامل', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    partially_returned: { label: 'مرجعة جزئياً', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  };

  const { label, className } = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return <Badge className={cn('font-medium', className)}>{label}</Badge>;
});

StatusBadge.displayName = 'StatusBadge';

// Payment status badge component
const PaymentStatusBadge = React.memo<{ status: string }>(({ status }) => {
  const config = {
    paid: { label: 'مدفوع', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    unpaid: { label: 'غير مدفوع', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    partial: { label: 'دفع جزئي', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  };

  const { label, className } = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return <Badge variant="outline" className={cn('font-medium text-xs', className)}>{label}</Badge>;
});

PaymentStatusBadge.displayName = 'PaymentStatusBadge';

// Table row skeleton
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
    <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
  </TableRow>
);

// Order row component
const OrderRow = React.memo<{
  order: POSOrderWithDetails;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onStatusUpdate: (status: string) => Promise<void>;
}>(({ order, onView, onEdit, onDelete, onPrint, onStatusUpdate }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleQuickStatusUpdate = useCallback(async (newStatus: string) => {
    await onStatusUpdate(newStatus);
  }, [onStatusUpdate]);

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell className="font-medium">
        #{order.slug?.slice(-8) || order.id.slice(-8)}
      </TableCell>
      <TableCell>
        {order.customer ? (
          <div className="text-sm">
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-muted-foreground">{order.customer.phone}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">عميل نقدي</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{order.items_count}</span>
          {order.has_returns && (
            <Badge variant="outline" className="text-xs ml-1 text-purple-600">
              مرتجع
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={order.status} />
      </TableCell>
      <TableCell>
        <div className="text-right">
          {formatCurrency(parseFloat(order.total))}
          {order.has_returns && order.total_returned_amount && order.total_returned_amount > 0 && (
            <div className="text-xs text-muted-foreground">
              مرتجع: {formatCurrency(order.total_returned_amount)}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {order.payment_method === 'cash' ? 'نقدي' : 
           order.payment_method === 'card' ? 'بطاقة' : 
           order.payment_method}
        </Badge>
      </TableCell>
      <TableCell>
        <PaymentStatusBadge status={order.payment_status} />
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 ml-2" />
              عرض التفاصيل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 ml-2" />
              تعديل الطلبية
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة الفاتورة
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleQuickStatusUpdate('completed')}
              disabled={order.status === 'completed'}
            >
              <span className="text-green-600">تحديد كمكتمل</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleQuickStatusUpdate('cancelled')}
              disabled={order.status === 'cancelled'}
              className="text-red-600"
            >
              <span>إلغاء الطلبية</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 ml-2" />
              حذف الطلبية
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  // Pagination helpers
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

  // Empty state
  if (!loading && orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد طلبيات</h3>
          <p className="text-sm text-muted-foreground text-center">
            لم يتم العثور على أي طلبيات تطابق معايير البحث المحددة.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-900 dark:text-red-100">
            حدث خطأ
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 text-center">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/50">
                  <TableHead className="text-right">رقم الطلبية</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المنتجات</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المجموع</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">حالة الدفع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-center w-[50px]">إجراءات</TableHead>
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
                      onStatusUpdate={(status) => onStatusUpdate(order.id, status)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                عرض {((currentPage - 1) * itemsPerPage) + 1} إلى{' '}
                {Math.min(currentPage * itemsPerPage, totalItems)} من أصل{' '}
                {totalItems} طلبية
              </p>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange(currentPage - 1)}
                      className={cn(
                        currentPage === 1 && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>
                  
                  {paginationRange.map((page, index) => (
                    <PaginationItem key={index}>
                      {page === '...' ? (
                        <span className="px-3">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => onPageChange(page as number)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => onPageChange(currentPage + 1)}
                      className={cn(
                        currentPage === totalPages && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

POSOrdersTableOptimized.displayName = 'POSOrdersTableOptimized';

export default POSOrdersTableOptimized;