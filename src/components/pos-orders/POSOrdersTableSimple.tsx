/**
 * ⚡ POSOrdersTableSimple - جدول طلبيات نقطة البيع
 * ============================================================
 * 🍎 Apple-Inspired Design - Elegant & Refined
 * ============================================================
 */

import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Printer,
  Trash2,
  Package,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Percent,
  Banknote,
  FileText,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { POSOrderWithDetails } from '@/api/posOrdersService';
import PrintInvoiceFromPOS, { type PrintInvoiceFromPOSRef } from '@/components/pos/PrintInvoiceFromPOS';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

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
  onOrderReturn?: (order: POSOrderWithDetails) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Column Widths - Centralized for perfect alignment
// ═══════════════════════════════════════════════════════════════════════════

const COL = {
  orderNum: 'w-[70px]',
  customer: 'w-[120px]',
  employee: 'w-[90px]',
  products: 'w-[70px]',
  status: 'w-[85px]',
  payment: 'w-[100px]',
  total: 'w-[95px]',
  paid: 'w-[85px]',
  remaining: 'w-[75px]',
  date: 'w-[70px]',
  actions: 'w-[160px]',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
};

const formatTime = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  } catch {
    return '';
  }
};

const formatDateLabel = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'اليوم';
    if (isYesterday(date)) return 'أمس';
    return format(date, 'd MMM', { locale: ar });
  } catch {
    return dateString;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Status Configuration
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  pending: {
    label: 'معلق',
    icon: Clock,
    className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400'
  },
  processing: {
    label: 'جاري',
    icon: AlertCircle,
    className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400'
  },
  completed: {
    label: 'مكتمل',
    icon: CheckCircle2,
    className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
  },
  cancelled: {
    label: 'ملغي',
    icon: XCircle,
    className: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400'
  },
  fully_returned: {
    label: 'مرتجع',
    icon: RotateCcw,
    className: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400'
  },
  partially_returned: {
    label: 'جزئي',
    icon: RotateCcw,
    className: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400'
  },
};

const PAYMENT_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  paid: {
    label: 'مدفوع',
    icon: CheckCircle2,
    className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
  },
  partial: {
    label: 'مدفوع جزئياً',
    icon: Percent,
    className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
  },
  unpaid: {
    label: 'غير مدفوع',
    icon: Banknote,
    className: 'text-red-500 bg-red-50 dark:bg-red-950/40'
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Row
// ═══════════════════════════════════════════════════════════════════════════

const SkeletonRow = () => (
  <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-100 dark:border-zinc-800/50">
    <div className={cn(COL.orderNum, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.customer, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.employee, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.products, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.status, "h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.payment, "h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.total, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.paid, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.remaining, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.date, "h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
    <div className={cn(COL.actions, "h-8 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse")} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Order Row
// ═══════════════════════════════════════════════════════════════════════════

const OrderRow = React.memo<{
  order: POSOrderWithDetails;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onInvoice: () => void;
  onReturn?: () => void;
}>(({ order, onView, onEdit, onDelete, onPrint, onInvoice, onReturn }) => {

  const orderNumber = useMemo(() => {
    if (order.customer_order_number && order.customer_order_number > 0) {
      return String(order.customer_order_number);
    }
    return order.slug?.slice(-6) || order.id?.slice(-6) || '---';
  }, [order]);

  const stocktakeSessionId = useMemo(() => {
    const meta = (order as any).metadata;
    if (!meta) return null;
    if (typeof meta === 'object') return meta.stocktake_session_id ?? null;
    if (typeof meta !== 'string') return null;
    try {
      const parsed = JSON.parse(meta);
      return parsed?.stocktake_session_id ?? null;
    } catch {
      return null;
    }
  }, [order]);

  const customerName = order.customer?.name || 'زبون عابر';
  const employeeName = (order as any).employee?.name || '—';
  const itemsCount = order.items_count || order.order_items?.length || 0;

  const productNames = useMemo(() => {
    if (!order.order_items || order.order_items.length === 0) return [];
    return order.order_items.slice(0, 5).map((item: any) =>
      `${item.product_name || 'منتج'} × ${item.quantity}`
    );
  }, [order.order_items]);

  const total = parseFloat(order.total?.toString() || '0');
  const paid = parseFloat(order.amount_paid?.toString() || '0');
  const remaining = total - paid;
  const discount = order.discount || 0;

  const paymentStatus = useMemo(() => {
    const explicit = (order as any)?.payment_status;
    if (explicit === 'paid' || explicit === 'partial' || explicit === 'unpaid') return explicit;
    if (paid >= total && total > 0) return 'paid';
    if (paid > 0 && paid < total) return 'partial';
    return 'unpaid';
  }, [order, paid, total]);

  const paymentConfig = PAYMENT_CONFIG[paymentStatus] || PAYMENT_CONFIG.unpaid;
  const PaymentIcon = paymentConfig.icon;

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5",
        "border-b border-zinc-100 dark:border-zinc-800/50",
        "transition-colors duration-150",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      )}
    >
      {/* Order Number */}
      <div className={cn(COL.orderNum, "shrink-0 text-center flex flex-col items-center gap-1")}>
        <button
          onClick={onView}
          className={cn(
            "text-sm font-semibold text-zinc-900 dark:text-zinc-100",
            "hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          )}
        >
          <span className="font-numeric">#{orderNumber}</span>
        </button>
        {stocktakeSessionId && (
          <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
            جرد
          </Badge>
        )}
      </div>

      {/* Customer */}
      <div className={cn(COL.customer, "shrink-0 truncate text-center")}>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {customerName}
        </span>
      </div>

      {/* Employee */}
      <div className={cn(COL.employee, "shrink-0 truncate flex justify-center")}>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{employeeName}</span>
        </span>
      </div>

      {/* Products */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(COL.products, "shrink-0 cursor-help flex justify-center")}>
              <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-numeric">{itemsCount}</span>
              </span>
            </div>
          </TooltipTrigger>
          {productNames.length > 0 && (
            <TooltipContent side="bottom" className="max-w-[220px] p-2">
              <div className="space-y-1 text-xs">
                {productNames.map((name, i) => (
                  <div key={i} className="text-zinc-700 dark:text-zinc-300">{name}</div>
                ))}
                {order.order_items && order.order_items.length > 5 && (
                  <div className="text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                    +{order.order_items.length - 5} أخرى
                  </div>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Order Status */}
      <div className={cn(COL.status, "shrink-0 flex justify-center")}>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
          status.className
        )}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Payment Status */}
      <div className={cn(COL.payment, "shrink-0 flex justify-center")}>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
          paymentConfig.className
        )}>
          <PaymentIcon className="w-3 h-3" />
          {paymentConfig.label}
        </span>
      </div>

      {/* Total */}
      <div className={cn(COL.total, "shrink-0 text-center")}>
        <div className="flex items-baseline gap-0.5 justify-center">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-numeric">
            {formatCurrency(total)}
          </span>
          <span className="text-[9px] text-zinc-400">د.ج</span>
        </div>
        {discount > 0 && (
          <span className="text-[10px] text-amber-600 font-numeric">-{discount}%</span>
        )}
      </div>

      {/* Paid */}
      <div className={cn(COL.paid, "shrink-0 text-center")}>
        <span className={cn(
          "text-sm font-medium font-numeric",
          paid >= total ? "text-emerald-600" : paid > 0 ? "text-amber-600" : "text-zinc-400"
        )}>
          {formatCurrency(paid)}
        </span>
      </div>

      {/* Remaining */}
      <div className={cn(COL.remaining, "shrink-0 text-center")}>
        {remaining > 0 ? (
          <span className="text-sm font-medium text-red-500 font-numeric">
            {formatCurrency(remaining)}
          </span>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        )}
      </div>

      {/* Date */}
      <div className={cn(COL.date, "shrink-0 text-center")}>
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {formatDateLabel(order.created_at)}
        </div>
        <div className="text-[10px] text-zinc-400 font-numeric">
          {formatTime(order.created_at)}
        </div>
      </div>

      {/* Actions - Direct Buttons */}
      <div className={cn(COL.actions, "shrink-0 flex items-center justify-center gap-0.5")} onClick={(e) => e.stopPropagation()}>
        <TooltipProvider delayDuration={300}>
          {/* View */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onView}
                className="h-7 w-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-400 hover:text-blue-600"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">عرض</TooltipContent>
          </Tooltip>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-7 w-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">تعديل</TooltipContent>
          </Tooltip>

          {/* Invoice */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onInvoice}
                className="h-7 w-7 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-600"
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">فاتورة</TooltipContent>
          </Tooltip>

          {/* Return */}
          {onReturn && order.status !== 'cancelled' && order.status !== 'fully_returned' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReturn}
                  className="h-7 w-7 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40 text-zinc-400 hover:text-orange-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">إرجاع</TooltipContent>
            </Tooltip>
          )}

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">حذف</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});
OrderRow.displayName = 'OrderRow';

// ═══════════════════════════════════════════════════════════════════════════
// Table Header
// ═══════════════════════════════════════════════════════════════════════════

const TableHeader = React.memo(() => (
  <div className={cn(
    "flex items-center gap-2 px-3 py-2.5",
    "bg-zinc-50 dark:bg-zinc-800/60",
    "border-b border-zinc-200 dark:border-zinc-700"
  )}>
    <span className={cn(COL.orderNum, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>رقم</span>
    <span className={cn(COL.customer, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>العميل</span>
    <span className={cn(COL.employee, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الموظف</span>
    <span className={cn(COL.products, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>المنتجات</span>
    <span className={cn(COL.status, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الحالة</span>
    <span className={cn(COL.payment, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الدفع</span>
    <span className={cn(COL.total, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الإجمالي</span>
    <span className={cn(COL.paid, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>المدفوع</span>
    <span className={cn(COL.remaining, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>المتبقي</span>
    <span className={cn(COL.date, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>التاريخ</span>
    <span className={cn(COL.actions, "shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الإجراءات</span>
  </div>
));
TableHeader.displayName = 'TableHeader';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const POSOrdersTableSimple = React.memo<POSOrdersTableProps>(({
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
  onOrderReturn,
}) => {
  const { currentOrganization } = useTenant();
  const invoicePrintRef = useRef<PrintInvoiceFromPOSRef>(null);
  const [invoiceOrder, setInvoiceOrder] = React.useState<POSOrderWithDetails | null>(null);

  // طباعة الفاتورة
  const handleInvoicePrint = React.useCallback((order: POSOrderWithDetails) => {
    setInvoiceOrder(order);
    // تأخير قصير للتأكد من تحديث الـ state
    setTimeout(() => {
      invoicePrintRef.current?.print();
    }, 100);
  }, []);

  // Empty State
  if (!loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          لا توجد طلبيات
        </h3>
        <p className="text-sm text-zinc-500">
          جرب تغيير الفلاتر للعثور على طلبيات
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // تحضير بيانات الفاتورة للطباعة
  const invoiceItems = invoiceOrder?.order_items?.map((item: any) => ({
    product: {
      id: item.product_id,
      name: item.product_name || 'منتج',
      price: item.unit_price || 0,
    },
    quantity: item.quantity || 1,
    wholesalePrice: item.is_wholesale ? item.unit_price : null,
    isWholesale: item.is_wholesale || false,
    colorName: item.color_name,
    sizeName: item.size_name,
    variantPrice: item.unit_price,
  })) || [];

  const invoiceTotal = parseFloat(invoiceOrder?.total?.toString() || '0');
  const invoicePaid = parseFloat(invoiceOrder?.amount_paid?.toString() || '0');
  const invoiceRemaining = invoiceTotal - invoicePaid;

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm"
      )}>
        {/* Header */}
        <TableHeader />

        {/* Rows */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : (
            orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onView={() => onOrderView(order)}
                onEdit={() => onOrderEdit(order)}
                onDelete={() => onOrderDelete(order)}
                onPrint={() => onOrderPrint(order)}
                onInvoice={() => handleInvoicePrint(order)}
                onReturn={onOrderReturn ? () => onOrderReturn(order) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-zinc-500">
            <span className="font-numeric">{startItem}</span>
            <span className="mx-1">-</span>
            <span className="font-numeric">{endItem}</span>
            <span className="mx-1.5">من</span>
            <span className="font-numeric font-medium text-zinc-700 dark:text-zinc-300">{totalItems}</span>
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;

                return (
                  <Button
                    key={page}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl text-sm font-medium font-numeric",
                      currentPage === page
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* مكون طباعة الفاتورة - مخفي */}
      {invoiceOrder && (
        <PrintInvoiceFromPOS
          ref={invoicePrintRef}
          orderId={invoiceOrder.customer_order_number?.toString() || invoiceOrder.slug?.slice(-6) || invoiceOrder.id.slice(-6)}
          items={invoiceItems}
          subtotal={invoiceTotal}
          total={invoiceTotal}
          customerName={invoiceOrder.customer?.name}
          discount={invoiceOrder.discount || 0}
          discountAmount={(invoiceOrder.discount || 0) > 0 ? (invoiceTotal * (invoiceOrder.discount || 0) / 100) : 0}
          amountPaid={invoicePaid}
          remainingAmount={invoiceRemaining}
          isPartialPayment={invoicePaid > 0 && invoicePaid < invoiceTotal}
          language="ar"
          organization={{
            name: currentOrganization?.name,
            logo: currentOrganization?.logo || undefined,
            phone: currentOrganization?.phone || undefined,
            email: currentOrganization?.email || undefined,
            address: currentOrganization?.address || undefined,
          }}
        />
      )}
    </div>
  );
});

POSOrdersTableSimple.displayName = 'POSOrdersTableSimple';

export default POSOrdersTableSimple;
