/**
 * OnlineOrdersTableOptimized - جدول الطلبيات الإلكترونية المحسن
 *
 * تصميم مختلط يجمع بين:
 * - أعمدة مدمجة (العميل، الطلب، الشحن، المالي)
 * - أعمدة منفصلة (الحالة، التأكيد، الإجراءات)
 *
 * مستوحى من تصميم POSOrdersTableOptimized
 */

import React, { useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Eye,
  Edit,
  Trash2,
  Printer,
  MoreHorizontal,
  Package,
  AlertCircle,
  Calendar,
  Clock,
  Phone,
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Home,
  Building2,
  ExternalLink,
  Copy,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';

// Types
import type { Order } from './OrderTableTypes';

interface OnlineOrdersTableProps {
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  selectedOrders?: string[];
  onPageChange: (page: number) => void;
  onSelectOrder?: (orderId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onOrderView?: (order: Order) => void;
  onOrderEdit?: (order: Order) => void;
  onOrderDelete?: (order: Order) => void;
  onOrderPrint?: (order: Order) => void;
  onUpdateStatus?: (orderId: string, status: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  onSendToProvider?: (order: Order, providerCode: string) => void;
  hasUpdatePermission?: boolean;
  hasCancelPermission?: boolean;
  shippingProviders?: Array<{ code: string; name: string; logo?: string }>;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
}

// ============================================
// Helper Functions
// ============================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' د.ج';
};

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: {
    label: 'معلق',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
  },
  processing: {
    label: 'قيد المعالجة',
    icon: RefreshCw,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
  },
  shipped: {
    label: 'تم الشحن',
    icon: Truck,
    className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
  },
  delivered: {
    label: 'مكتمل',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
  },
  cancelled: {
    label: 'ملغي',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  },
};

const CALL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'لم يتم', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  confirmed: { label: 'مؤكد', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  no_answer: { label: 'لا يرد', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  cancelled: { label: 'ملغي', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  rescheduled: { label: 'مؤجل', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

// ============================================
// Sub-Components
// ============================================

/**
 * Status Badge Component
 */
const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };
  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm',
      config.className
    )}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

/**
 * Order Info Cell - رقم الطلب + التاريخ + عدد المنتجات
 */
const OrderInfoCell = React.memo<{ order: Order }>(({ order }) => {
  const date = order.created_at ? parseISO(order.created_at) : new Date();
  const itemsCount = order.order_items?.length || 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* رقم الطلب */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
          #{order.customer_order_number || order.id.slice(0, 8)}
        </span>
      </div>

      {/* التاريخ والوقت */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{format(date, 'd MMM', { locale: ar })}</span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{format(date, 'HH:mm')}</span>
        </div>
      </div>

      {/* عدد المنتجات */}
      <Badge variant="outline" className="w-fit text-[10px] gap-1 bg-background">
        <Package className="h-3 w-3" />
        {itemsCount} {itemsCount === 1 ? 'منتج' : 'منتجات'}
      </Badge>
    </div>
  );
});
OrderInfoCell.displayName = 'OrderInfoCell';

/**
 * Customer Cell - Avatar + الاسم + الهاتف
 */
const CustomerCell = React.memo<{ order: Order }>(({ order }) => {
  const customerName = order.customer?.name ||
    (order as any).customer_name ||
    order.form_data?.fullName ||
    'عميل غير معرف';

  const customerPhone = order.customer?.phone ||
    (order as any).customer_phone ||
    order.form_data?.phone ||
    null;

  const copyPhone = useCallback(() => {
    if (customerPhone) {
      navigator.clipboard.writeText(customerPhone);
    }
  }, [customerPhone]);

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border-2 border-border/50 shadow-sm">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
          {customerName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground line-clamp-1">
          {customerName}
        </span>
        {customerPhone ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyPhone}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Phone className="h-3 w-3 text-emerald-500" />
                  <span dir="ltr" className="font-mono">{customerPhone}</span>
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </TooltipTrigger>
              <TooltipContent>نسخ رقم الهاتف</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">بدون هاتف</span>
        )}
      </div>
    </div>
  );
});
CustomerCell.displayName = 'CustomerCell';

/**
 * Shipping Cell - المزود + نوع التوصيل + التتبع
 */
const ShippingCell = React.memo<{
  order: Order;
  shippingProviders?: Array<{ code: string; name: string; logo?: string }>;
  onSendToProvider?: (order: Order, providerCode: string) => void;
  hasUpdatePermission?: boolean;
}>(({ order, shippingProviders = [], onSendToProvider, hasUpdatePermission }) => {
  const deliveryType = order.form_data?.deliveryType || order.form_data?.delivery_type || 'home';
  const trackingNumber = order.yalidine_tracking_id || (order as any).tracking_number || null;
  const providerCode = (order as any).shipping_provider || null;

  const isHome = deliveryType === 'home';
  const canSend = order.status === 'pending' && hasUpdatePermission && !trackingNumber;

  return (
    <div className="flex flex-col gap-2">
      {/* نوع التوصيل */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
          isHome
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            : "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
        )}>
          {isHome ? <Home className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
          <span>{isHome ? 'للمنزل' : 'مكتب'}</span>
        </div>
      </div>

      {/* المزود والتتبع */}
      {trackingNumber ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            <Truck className="h-3 w-3 ml-1" />
            {trackingNumber}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>تتبع الشحنة</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : canSend ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Truck className="h-3 w-3" />
              إرسال للشحن
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>اختر مزود الشحن</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {shippingProviders.map((provider) => (
              <DropdownMenuItem
                key={provider.code}
                onClick={() => onSendToProvider?.(order, provider.code)}
              >
                {provider.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-xs text-muted-foreground">
          {order.status === 'cancelled' ? 'ملغي' : 'في الانتظار'}
        </span>
      )}
    </div>
  );
});
ShippingCell.displayName = 'ShippingCell';

/**
 * Financial Cell - الإجمالي + التفاصيل المالية + Progress
 */
const FinancialCell = React.memo<{ order: Order }>(({ order }) => {
  const total = parseFloat(order.total?.toString() || '0');
  const subtotal = parseFloat(order.subtotal?.toString() || '0');
  const shippingCost = parseFloat(order.shipping_cost?.toString() || '0');
  const discount = parseFloat(order.discount?.toString() || '0');

  // حساب نسبة الدفع (للعرض)
  const isPaid = order.status === 'delivered';
  const paymentPercentage = isPaid ? 100 : 0;

  return (
    <div className="flex flex-col gap-2 min-w-[140px]">
      {/* المبلغ الإجمالي */}
      <div className="flex items-baseline gap-1">
        <span className="font-bold text-base text-foreground">
          {formatCurrency(total)}
        </span>
      </div>

      {/* تفاصيل المبالغ */}
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        {shippingCost > 0 && (
          <div className="flex justify-between">
            <span>التوصيل:</span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>خصم:</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
      </div>

      {/* شريط الدفع */}
      <div className="w-full">
        <div className="flex justify-between text-[10px] mb-1">
          <span className={isPaid ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
            {isPaid ? 'مدفوع' : 'غير مدفوع'}
          </span>
        </div>
        <Progress
          value={paymentPercentage}
          className="h-1.5"
          indicatorClassName={isPaid ? "bg-emerald-500" : "bg-gray-300"}
        />
      </div>
    </div>
  );
});
FinancialCell.displayName = 'FinancialCell';

/**
 * Call Confirmation Cell
 */
const CallConfirmationCell = React.memo<{
  order: Order;
  statuses?: Array<{ id: number; name: string; color?: string | null }>;
  onUpdate?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  hasPermission?: boolean;
}>(({ order, statuses = [], onUpdate, hasPermission }) => {
  const currentStatusId = (order as any).call_confirmation_status_id;
  const currentStatus = statuses.find(s => s.id === currentStatusId);

  if (!statuses.length) {
    return (
      <span className="text-xs text-muted-foreground">غير متاح</span>
    );
  }

  if (!hasPermission) {
    return (
      <Badge
        variant="outline"
        className="text-xs"
        style={{
          backgroundColor: currentStatus?.color ? `${currentStatus.color}20` : undefined,
          color: currentStatus?.color || undefined,
          borderColor: currentStatus?.color ? `${currentStatus.color}40` : undefined,
        }}
      >
        <PhoneCall className="h-3 w-3 ml-1" />
        {currentStatus?.name || 'لم يتم'}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          style={{
            backgroundColor: currentStatus?.color ? `${currentStatus.color}20` : undefined,
            color: currentStatus?.color || undefined,
            borderColor: currentStatus?.color ? `${currentStatus.color}40` : undefined,
          }}
        >
          <PhoneCall className="h-3 w-3" />
          {currentStatus?.name || 'لم يتم'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>حالة التأكيد</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status.id}
            onClick={() => onUpdate?.(order.id, status.id)}
            className={currentStatusId === status.id ? 'bg-accent' : ''}
          >
            <div
              className="w-2 h-2 rounded-full ml-2"
              style={{ backgroundColor: status.color || '#gray' }}
            />
            {status.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
CallConfirmationCell.displayName = 'CallConfirmationCell';

/**
 * Actions Cell
 */
const ActionsCell = React.memo<{
  order: Order;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onUpdateStatus?: (status: string) => Promise<void>;
  hasUpdatePermission?: boolean;
  hasCancelPermission?: boolean;
}>(({ order, onView, onEdit, onDelete, onPrint, onUpdateStatus, hasUpdatePermission, hasCancelPermission }) => {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Quick Actions */}
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

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>إجراءات الطلب</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4 ml-2" />
            عرض التفاصيل
          </DropdownMenuItem>

          {hasUpdatePermission && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={onPrint}>
            <Printer className="h-4 w-4 ml-2" />
            طباعة الفاتورة
          </DropdownMenuItem>

          {hasUpdatePermission && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onUpdateStatus?.('delivered')}
                disabled={order.status === 'delivered'}
                className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
              >
                <CheckCircle2 className="h-4 w-4 ml-2" />
                تحديد كمكتمل
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onUpdateStatus?.('shipped')}
                disabled={order.status === 'shipped' || order.status === 'delivered'}
                className="text-purple-600 focus:text-purple-700 focus:bg-purple-50 dark:focus:bg-purple-900/20"
              >
                <Truck className="h-4 w-4 ml-2" />
                تم الشحن
              </DropdownMenuItem>
            </>
          )}

          {hasCancelPermission && order.status !== 'cancelled' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onUpdateStatus?.('cancelled')}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20"
              >
                <Ban className="h-4 w-4 ml-2" />
                إلغاء الطلب
              </DropdownMenuItem>
            </>
          )}

          {hasUpdatePermission && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ============================================
// Table Row Skeleton
// ============================================

const TableRowSkeleton = () => (
  <TableRow className="hover:bg-transparent">
    <TableCell className="w-[50px]"><Skeleton className="h-5 w-5 rounded" /></TableCell>
    <TableCell>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
    </TableCell>
    <TableCell><Skeleton className="h-7 w-24 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-7 w-20 rounded" /></TableCell>
    <TableCell>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-24 rounded" />
      </div>
    </TableCell>
    <TableCell>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-1.5 w-full rounded" />
      </div>
    </TableCell>
    <TableCell><Skeleton className="h-8 w-20 rounded" /></TableCell>
  </TableRow>
);

// ============================================
// Main Order Row Component
// ============================================

const OrderRow = React.memo<{
  order: Order;
  selected?: boolean;
  onSelect?: (orderId: string, selected: boolean) => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onUpdateStatus?: (status: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  onSendToProvider?: (order: Order, providerCode: string) => void;
  hasUpdatePermission?: boolean;
  hasCancelPermission?: boolean;
  shippingProviders?: Array<{ code: string; name: string; logo?: string }>;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
}>(({
  order,
  selected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  shippingProviders,
  callConfirmationStatuses,
}) => {
  return (
    <TableRow className={cn(
      "group hover:bg-muted/30 transition-colors border-b border-border/30",
      selected && "bg-primary/5 border-r-2 border-r-primary"
    )}>
      {/* Checkbox */}
      <TableCell className="w-[50px] text-center">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect?.(order.id, !!checked)}
          aria-label={`تحديد الطلب ${order.customer_order_number || order.id}`}
        />
      </TableCell>

      {/* Order Info (merged) */}
      <TableCell className="min-w-[160px]">
        <OrderInfoCell order={order} />
      </TableCell>

      {/* Customer (merged) */}
      <TableCell className="min-w-[200px]">
        <CustomerCell order={order} />
      </TableCell>

      {/* Status */}
      <TableCell className="min-w-[130px]">
        {hasUpdatePermission ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer">
                <StatusBadge status={order.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onUpdateStatus?.(key)}
                  disabled={order.status === key}
                >
                  <config.icon className="h-4 w-4 ml-2" />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <StatusBadge status={order.status} />
        )}
      </TableCell>

      {/* Call Confirmation */}
      <TableCell className="min-w-[120px]">
        <CallConfirmationCell
          order={order}
          statuses={callConfirmationStatuses}
          onUpdate={onUpdateCallConfirmation}
          hasPermission={hasUpdatePermission}
        />
      </TableCell>

      {/* Shipping (merged) */}
      <TableCell className="min-w-[160px]">
        <ShippingCell
          order={order}
          shippingProviders={shippingProviders}
          onSendToProvider={onSendToProvider}
          hasUpdatePermission={hasUpdatePermission}
        />
      </TableCell>

      {/* Financial (merged) */}
      <TableCell className="min-w-[150px]">
        <FinancialCell order={order} />
      </TableCell>

      {/* Actions */}
      <TableCell className="min-w-[120px]">
        <ActionsCell
          order={order}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrint={onPrint}
          onUpdateStatus={onUpdateStatus}
          hasUpdatePermission={hasUpdatePermission}
          hasCancelPermission={hasCancelPermission}
        />
      </TableCell>
    </TableRow>
  );
});
OrderRow.displayName = 'OrderRow';

// ============================================
// Main Table Component
// ============================================

export const OnlineOrdersTableOptimized = React.memo<OnlineOrdersTableProps>(({
  orders,
  loading = false,
  error = null,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  selectedOrders = [],
  onPageChange,
  onSelectOrder,
  onSelectAll,
  onOrderView,
  onOrderEdit,
  onOrderDelete,
  onOrderPrint,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission = false,
  hasCancelPermission = false,
  shippingProviders = [],
  callConfirmationStatuses = [],
}) => {
  // Pagination range calculation
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots: (number | string)[] = [];

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

  const allSelected = useMemo(() =>
    orders.length > 0 && selectedOrders.length === orders.length,
    [orders.length, selectedOrders.length]
  );

  // Empty state
  if (!loading && orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">لا توجد طلبيات</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            لم يتم العثور على أي طلبيات تطابق معايير البحث. جرب تغيير الفلاتر.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث الصفحة
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state
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
      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[50px] text-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => onSelectAll?.(!!checked)}
                    disabled={orders.length === 0}
                    aria-label="تحديد الكل"
                  />
                </TableHead>
                <TableHead className="text-right font-semibold">الطلب</TableHead>
                <TableHead className="text-right font-semibold">العميل</TableHead>
                <TableHead className="text-right font-semibold">الحالة</TableHead>
                <TableHead className="text-right font-semibold">التأكيد</TableHead>
                <TableHead className="text-right font-semibold">الشحن</TableHead>
                <TableHead className="text-right font-semibold">المالي</TableHead>
                <TableHead className="w-[120px]"></TableHead>
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
                    selected={selectedOrders.includes(order.id)}
                    onSelect={onSelectOrder}
                    onView={() => onOrderView?.(order)}
                    onEdit={() => onOrderEdit?.(order)}
                    onDelete={() => onOrderDelete?.(order)}
                    onPrint={() => onOrderPrint?.(order)}
                    onUpdateStatus={async (status) => {
                      await onUpdateStatus?.(order.id, status);
                    }}
                    onUpdateCallConfirmation={onUpdateCallConfirmation}
                    onSendToProvider={onSendToProvider}
                    hasUpdatePermission={hasUpdatePermission}
                    hasCancelPermission={hasCancelPermission}
                    shippingProviders={shippingProviders}
                    callConfirmationStatuses={callConfirmationStatuses}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
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

OnlineOrdersTableOptimized.displayName = 'OnlineOrdersTableOptimized';

export default OnlineOrdersTableOptimized;
