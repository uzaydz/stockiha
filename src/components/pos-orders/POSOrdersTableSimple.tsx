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
  MoreVertical,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

// Status badge - مبسط
const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  const config = {
    pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' },
    processing: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
    fully_returned: { label: 'مرجعة', color: 'bg-purple-100 text-purple-700' },
    partially_returned: { label: 'مرجعة جزئياً', color: 'bg-orange-100 text-orange-700' },
  };

  const { label, color } = config[status as keyof typeof config] || {
    label: status,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', color)}>
      {label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Payment badge - مبسط ومدمج
const PaymentBadge = React.memo<{ order: POSOrderWithDetails }>(({ order }) => {
  const total = parseFloat(order.total.toString());
  const paid = parseFloat(order.amount_paid?.toString() || '0');
  const remaining = total - paid;

  let label = '';
  let color = '';

  if (paid === 0) {
    label = 'غير مدفوع';
    color = 'bg-red-100 text-red-700';
  } else if (remaining > 0 && order.consider_remaining_as_partial) {
    label = `متبقي ${remaining.toFixed(0)} دج`;
    color = 'bg-orange-100 text-orange-700';
  } else if (paid >= total) {
    label = 'مدفوع';
    color = 'bg-green-100 text-green-700';
  } else {
    label = 'جزئي';
    color = 'bg-yellow-100 text-yellow-700';
  }

  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', color)}>
      {label}
    </span>
  );
});

PaymentBadge.displayName = 'PaymentBadge';

// Table row skeleton - مبسط
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
    <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
  </TableRow>
);

// Order row - مبسط مع 6 أعمدة فقط
const OrderRow = React.memo<{
  order: POSOrderWithDetails;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
}>(({ order, onView, onEdit, onDelete, onPrint }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' دج';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd/MM HH:mm', { locale: ar });
    } catch {
      return format(new Date(dateString), 'dd/MM HH:mm', { locale: ar });
    }
  };

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      {/* رقم الطلبية */}
      <TableCell className="font-mono text-sm font-medium">
        #{order.slug?.slice(-8) || order.id.slice(-8)}
      </TableCell>

      {/* العميل + المنتجات */}
      <TableCell>
        <div className="space-y-0.5">
          <div className="text-sm font-medium">
            {order.customer?.name || 'زائر'}
          </div>
          <div className="text-xs text-muted-foreground">
            {order.items_count} منتج
            {order.has_returns && (
              <span className="text-purple-600 mr-1">(مرتجع)</span>
            )}
          </div>
        </div>
      </TableCell>

      {/* المبلغ + الحالات */}
      <TableCell>
        <div className="space-y-1.5">
          <div className="text-sm font-semibold">
            {formatCurrency(parseFloat(order.total.toString()))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={order.status} />
            <PaymentBadge order={order} />
          </div>
        </div>
      </TableCell>

      {/* وسيلة الدفع */}
      <TableCell>
        <span className="text-sm">
          {order.payment_method === 'cash' && 'نقدي'}
          {order.payment_method === 'card' && 'بطاقة'}
          {order.payment_method === 'bank_transfer' && 'تحويل بنكي'}
          {order.payment_method === 'check' && 'شيك'}
          {!['cash', 'card', 'bank_transfer', 'check'].includes(order.payment_method) && order.payment_method}
        </span>
      </TableCell>

      {/* التاريخ */}
      <TableCell>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(order.created_at)}
        </span>
      </TableCell>

      {/* الإجراءات */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onView}>
              عرض التفاصيل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              تعديل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint}>
              طباعة
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

OrderRow.displayName = 'OrderRow';

// Main component
export const POSOrdersTableSimple = React.memo<POSOrdersTableProps>(
  ({
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
  }) => {
    // Pagination range
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
            <h3 className="text-base font-semibold mb-1">لا توجد طلبيات</h3>
            <p className="text-sm text-muted-foreground">
              لم يتم العثور على أي طلبيات تطابق معايير البحث.
            </p>
          </CardContent>
        </Card>
      );
    }

    // Error state
    if (error) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
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
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-right font-medium w-[110px]">
                      رقم الطلبية
                    </TableHead>
                    <TableHead className="text-right font-medium min-w-[170px]">
                      العميل والمنتجات
                    </TableHead>
                    <TableHead className="text-right font-medium min-w-[150px]">
                      المبلغ والحالة
                    </TableHead>
                    <TableHead className="text-right font-medium w-[110px]">
                      وسيلة الدفع
                    </TableHead>
                    <TableHead className="text-right font-medium w-[120px]">
                      التاريخ
                    </TableHead>
                    <TableHead className="text-center font-medium w-[60px]">
                      إجراءات
                    </TableHead>
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
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination - مبسط */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  عرض {(currentPage - 1) * itemsPerPage + 1} إلى{' '}
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
                          currentPage === totalPages &&
                            'pointer-events-none opacity-50'
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
  }
);

POSOrdersTableSimple.displayName = 'POSOrdersTableSimple';

export default POSOrdersTableSimple;
