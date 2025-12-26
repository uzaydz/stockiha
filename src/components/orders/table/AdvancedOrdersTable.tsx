/**
 * AdvancedOrdersTable - جدول الطلبيات المتقدم
 *
 * يستخدم TanStack Table مع:
 * - صفوف قابلة للتوسيع (Expandable Rows)
 * - أعمدة قابلة للتحريك وتغيير الحجم
 * - فرز وفلترة
 * - تحديد متعدد
 * - تصميم shadcn ui احترافي
 */

import React, { useState, useMemo, useCallback, Fragment, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type ExpandedState,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  MoreHorizontal,
  Eye,
  Edit,
  Printer,
  Trash2,
  Phone,
  MapPin,
  Package,
  Truck,
  Home,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  SlidersHorizontal,
  Copy,
  PhoneCall,
  Ban,
  ExternalLink,
  Calendar,
  DollarSign,
  Settings2,
  ArrowUpDown,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getProvinceName, getMunicipalityName } from '@/utils/addressHelpers';
import { useOrderDetails, prefetchOrderDetails } from '@/hooks/useOrderDetails';
import CallConfirmationDropdown from '@/components/orders/CallConfirmationDropdown';

import type { Order } from './OrderTableTypes';

// ============================================
// Types
// ============================================

interface AdvancedOrdersTableProps {
  orders: Order[];
  loading?: boolean;
  onOrderView?: (order: Order) => void;
  onOrderEdit?: (order: Order) => void;
  onOrderPrint?: (order: Order) => void;
  onUpdateStatus?: (orderId: string, status: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  onSendToProvider?: (order: Order, providerCode: string) => void;
  hasUpdatePermission?: boolean;
  hasCancelPermission?: boolean;
  shippingProviders?: Array<{ code: string; name: string }>;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
  onAddCallConfirmationStatus?: (name: string, color: string, icon?: string) => Promise<number>;
  onDeleteCallConfirmationStatus?: (id: number) => Promise<void>;
  showManageCallConfirmationStatuses?: boolean;
}

// ============================================
// Helpers
// ============================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(amount) + ' د.ج';
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const raw = value.trim();
    if (raw === '') return 0;

    // Normalize formatted amounts like "8.500", "8,500", "8 500", "8.500 د.ج"
    // - Treat "." as thousand separator when pattern matches groups of 3.
    // - Treat "," as decimal separator when no thousand-grouping pattern.
    const cleaned = raw
      .replace(/[^\d.,\-]/g, '') // keep digits, dot, comma, minus
      .replace(/\s+/g, '');

    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === ',') return 0;

    let normalized = cleaned;

    const hasDot = normalized.includes('.');
    const hasComma = normalized.includes(',');

    if (hasDot && !hasComma) {
      // "8.500" or "1.234.567"
      if (/^\-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
        normalized = normalized.replace(/\./g, '');
      }
    } else if (hasComma && !hasDot) {
      // "8,500" (could be thousand grouping) OR "12,5" (decimal)
      if (/^\-?\d{1,3}(,\d{3})+$/.test(normalized)) {
        normalized = normalized.replace(/,/g, '');
      } else {
        normalized = normalized.replace(',', '.');
      }
    } else if (hasDot && hasComma) {
      // Decide which is decimal separator by the last occurrence.
      const lastDot = normalized.lastIndexOf('.');
      const lastComma = normalized.lastIndexOf(',');
      if (lastComma > lastDot) {
        // "1.234,56" => "1234.56"
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else {
        // "1,234.56" => "1234.56"
        normalized = normalized.replace(/,/g, '');
      }
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const getFormDataNumber = (formData: any, keys: string[]): number => {
  if (!formData || typeof formData !== 'object') return 0;
  for (const key of keys) {
    const n = toNumber((formData as any)[key]);
    if (n > 0) return n;
  }
  return 0;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('تم النسخ');
};

// ============================================
// Status Configs
// ============================================

const ORDER_STATUS: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'معلق', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
  processing: { label: 'قيد المعالجة', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Package },
  shipped: { label: 'تم الشحن', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: Truck },
  delivered: { label: 'مكتمل', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
};

// ============================================
// Expanded Row Content Component
// ============================================

const ExpandedRowContent: React.FC<{
  order: Order;
  onUpdateStatus?: (status: string) => Promise<void>;
  onSendToProvider?: (providerCode: string) => void;
  shippingProviders?: Array<{ code: string; name: string }>;
  hasUpdatePermission?: boolean;
}> = ({ order, onUpdateStatus, onSendToProvider, shippingProviders = [], hasUpdatePermission }) => {
  // استخدام useOrderDetails لتحميل عناصر الطلب
  const { data: detailsData, status: detailsStatus, refetch } = useOrderDetails(order.id);

  // تحميل العناصر تلقائياً عند فتح التفاصيل
  useEffect(() => {
    if (detailsStatus === 'idle') {
      refetch();
    }
  }, [detailsStatus, refetch]);

  // استخدام العناصر من الطلب أو من البيانات المحمّلة
  const items = useMemo(() => {
    // أولوية: العناصر المحملة مع الطلب
    if (order.order_items && order.order_items.length > 0) {
      return order.order_items;
    }
    // ثانياً: العناصر المحملة من useOrderDetails
    if (detailsData?.order_items && detailsData.order_items.length > 0) {
      return detailsData.order_items;
    }
    return [];
  }, [order.order_items, detailsData?.order_items]);

  const isLoadingItems = detailsStatus === 'loading' && items.length === 0;
  const formData = order.form_data || {};

  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum: number, it: any) => {
      const lineTotal =
        toNumber(it.total_price) ||
        (toNumber(it.quantity) * (toNumber(it.unit_price) || toNumber(it.price)));
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    const explicit = toNumber((order as any).subtotal);
    return explicit > 0 ? explicit : itemsSubtotal;
  }, [itemsSubtotal, order]);

  const discount = useMemo(() => toNumber((order as any).discount), [order]);
  const tax = useMemo(() => toNumber((order as any).tax), [order]);

  const shippingCost = useMemo(() => {
    const explicit = toNumber((order as any).shipping_cost);
    if (explicit > 0) return explicit;

    const fromFormData = getFormDataNumber(formData, [
      'shipping_cost',
      'shippingFee',
      'shipping_fee',
      'deliveryFee',
      'delivery_fee',
      'calculated_delivery_fee',
      'deliveryPrice',
      'delivery_price',
      'home_delivery_fee',
      'desk_delivery_fee',
    ]);
    if (fromFormData > 0) return fromFormData;

    const total = toNumber((order as any).total);
    const inferred = total - subtotal - tax + discount;
    return inferred > 0 ? inferred : 0;
  }, [discount, formData, order, subtotal, tax]);

  // استخراج معلومات العميل من مصادر متعددة
  const customerName = order.customer?.name || formData.fullName || formData.full_name || '-';
  const customerPhone = order.customer?.phone || formData.phone || '-';
  const customerEmail = order.customer?.email || formData.email || null;

  // استخراج معلومات العنوان مع تحويل الأكواد إلى أسماء
  const provinceName = formData.province
    ? (typeof getProvinceName === 'function' ? getProvinceName(formData.province) : formData.province)
    : (order.shipping_address?.state || '-');

  const municipalityName = formData.municipality
    ? (typeof getMunicipalityName === 'function'
        ? getMunicipalityName(formData.municipality, formData.province)
        : formData.municipality)
    : (order.shipping_address?.municipality || '-');

  const address = formData.address || order.shipping_address?.street_address || '-';

  // نوع التوصيل
  const deliveryType = order.shipping_option || formData.deliveryOption || formData.delivery_type || 'home';
  const isDesk = deliveryType === 'desk';

  return (
    <div className="bg-muted/30 p-6 border-t">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* معلومات العميل */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            معلومات العميل
          </h4>
          <div className="bg-background rounded-lg p-4 space-y-2.5 border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">الاسم:</span>
              <span className="font-medium text-sm">{customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">الهاتف:</span>
              <button
                onClick={() => copyToClipboard(customerPhone)}
                className="font-mono text-sm font-medium hover:text-primary flex items-center gap-1 transition-colors"
                dir="ltr"
              >
                {customerPhone}
                <Copy className="h-3 w-3" />
              </button>
            </div>
            {customerEmail && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">البريد:</span>
                <span className="text-sm" dir="ltr">{customerEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* معلومات العنوان */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            عنوان التوصيل
          </h4>
          <div className="bg-background rounded-lg p-4 space-y-2.5 border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">الولاية:</span>
              <span className="font-medium text-sm">{provinceName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">البلدية:</span>
              <span className="font-medium text-sm">{municipalityName}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground text-sm">العنوان:</span>
              <span className="font-medium text-sm text-left max-w-[180px] line-clamp-2">{address}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t">
              <span className="text-muted-foreground text-sm">نوع التوصيل:</span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                isDesk ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                       : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              )}>
                {isDesk ? <Building2 className="h-3 w-3" /> : <Home className="h-3 w-3" />}
                {isDesk ? 'مكتب استلام' : 'للمنزل'}
              </span>
            </div>
            {isDesk && (order.stop_desk_id || formData.stopDeskId) && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">رقم المكتب:</span>
                <span className="font-mono text-sm">{order.stop_desk_id || formData.stopDeskId}</span>
              </div>
            )}
          </div>
        </div>

        {/* المنتجات */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            المنتجات {items.length > 0 ? `(${items.length})` : ''}
          </h4>
          <div className="bg-background rounded-lg border divide-y max-h-[220px] overflow-y-auto">
            {isLoadingItems ? (
              // حالة التحميل
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                <span className="text-sm text-muted-foreground">جاري تحميل المنتجات...</span>
              </div>
            ) : items.length > 0 ? (
              items.map((item: any, idx: number) => (
                <div key={item.id || idx} className="p-3 flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.product_name || item.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{item.quantity} × {formatCurrency(item.unit_price || item.price || 0)}</span>
                      {item.color_name && (
                        <span className="flex items-center gap-1">
                          {item.color_code && (
                            <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: item.color_code }} />
                          )}
                          {item.color_name}
                        </span>
                      )}
                      {item.size_name && <span>• {item.size_name}</span>}
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(item.total_price || (item.quantity * (item.unit_price || item.price || 0)))}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد منتجات</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-1 text-xs"
                >
                  إعادة المحاولة
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ملخص مالي */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            الملخص المالي
          </h4>
          <div className="bg-background rounded-lg p-4 space-y-2.5 border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">تكلفة التوصيل:</span>
              <span className="font-medium">{formatCurrency(shippingCost)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الضريبة:</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span>الخصم:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">الإجمالي:</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(order.total || 0)}</span>
            </div>

            {/* طريقة الدفع */}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">طريقة الدفع:</span>
              <span className="font-medium">
                {order.payment_method === 'cash_on_delivery' ? 'الدفع عند الاستلام' :
                 order.payment_method === 'credit_card' ? 'بطاقة ائتمان' :
                 order.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                 order.payment_method || 'غير محدد'}
              </span>
            </div>
          </div>

          {/* إجراءات سريعة */}
          {hasUpdatePermission && (
            <div className="flex flex-col gap-2 pt-2">
              {order.status !== 'delivered' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                  onClick={() => onUpdateStatus?.('delivered')}
                >
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                  تأكيد التسليم
                </Button>
              )}
              {order.status === 'pending' && shippingProviders.length > 0 && !order.yalidine_tracking_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full">
                      <Truck className="h-4 w-4 ml-1" />
                      إرسال للشحن
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {shippingProviders.map((p) => (
                      <DropdownMenuItem key={p.code} onClick={() => onSendToProvider?.(p.code)}>
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ملاحظات الطلب إن وجدت */}
      {order.notes && (
        <div className="mt-4 p-4 bg-background rounded-lg border">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            ملاحظات الطلب
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const AdvancedOrdersTable: React.FC<AdvancedOrdersTableProps> = ({
  orders,
  loading = false,
  onOrderView,
  onOrderEdit,
  onOrderPrint,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission = false,
  hasCancelPermission = false,
  shippingProviders = [],
  callConfirmationStatuses = [],
  onAddCallConfirmationStatus,
  onDeleteCallConfirmationStatus,
  showManageCallConfirmationStatuses = false,
}) => {
  // States
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Column Definitions
  const columns = useMemo<ColumnDef<Order>[]>(() => [
    // Select
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="تحديد الكل"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="تحديد الصف"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },

    // Expand
    {
      id: 'expand',
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={row.getToggleExpandedHandler()}
          className={cn(
            "p-1 rounded hover:bg-muted transition-colors",
            row.getIsExpanded() && "bg-muted"
          )}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },

    // Order Number
    {
      id: 'orderNumber',
      accessorFn: (row) => row.customer_order_number || row.id,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 font-semibold"
        >
          رقم الطلب
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const order = row.original;
        const date = order.created_at ? parseISO(order.created_at) : new Date();
        return (
          <div className="space-y-1">
            <span className="font-bold text-sm">
              #{order.customer_order_number || order.id.slice(0, 8)}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(date, 'd MMM', { locale: ar })} - {format(date, 'HH:mm')}
            </div>
          </div>
        );
      },
      size: 150,
    },

    // Customer
    {
      id: 'customer',
      accessorFn: (row) => row.customer?.name || (row as any).customer_name || row.form_data?.fullName,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 font-semibold"
        >
          العميل
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const order = row.original;
        const name = order.customer?.name || (order as any).customer_name || order.form_data?.fullName || 'غير معرف';
        const phone = order.customer?.phone || (order as any).customer_phone || order.form_data?.phone;
        const wilaya = order.form_data?.wilayaName || '';

        return (
          <div className="space-y-1">
            <span className="font-medium text-sm block truncate max-w-[240px]">{name}</span>
            {phone && (
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(phone); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-3 w-3" />
                <span dir="ltr" className="font-mono">{phone}</span>
              </button>
            )}
            {wilaya && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {wilaya}
              </div>
            )}
          </div>
        );
      },
      size: 260,
    },

    // Status
    {
      id: 'status',
      accessorKey: 'status',
      header: 'الحالة',
      cell: ({ row }) => {
        const status = row.original.status;
        const config = ORDER_STATUS[status] || ORDER_STATUS.pending;
        const Icon = config.icon;

        if (hasUpdatePermission) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                  config.bgColor,
                  config.color
                )}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.entries(ORDER_STATUS).map(([key, cfg]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onUpdateStatus?.(row.original.id, key)}
                    disabled={status === key}
                  >
                    <cfg.icon className="h-4 w-4 ml-2" />
                    {cfg.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
            config.bgColor,
            config.color
          )}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        );
      },
      size: 140,
    },

    // Call Confirmation
    {
      id: 'callConfirmation',
      accessorFn: (row) => (row as any).call_confirmation_status_id,
      header: 'التأكيد',
      cell: ({ row }) => {
        const order = row.original;
        const statusId = (order as any).call_confirmation_status_id;
        if (!callConfirmationStatuses.length) return <span className="text-xs text-muted-foreground">-</span>;

        return (
          <CallConfirmationDropdown
            orderId={order.id}
            currentStatusId={statusId ?? null}
            onUpdateStatus={async (oid, sid, notes) => {
              await onUpdateCallConfirmation?.(oid, sid, notes);
            }}
            statuses={callConfirmationStatuses.map((s) => ({
              id: s.id,
              name: s.name,
              color: s.color || '#6366F1',
              icon: null,
              is_default: false,
            }))}
            disabled={!hasUpdatePermission}
            showAddNew={showManageCallConfirmationStatuses}
            onAddCallConfirmationStatus={onAddCallConfirmationStatus}
            onDeleteCallConfirmationStatus={onDeleteCallConfirmationStatus}
          />
        );
      },
      size: 160,
    },

    // Delivery Type
    {
      id: 'deliveryType',
      accessorFn: (row) => row.form_data?.deliveryType || row.form_data?.delivery_type || 'home',
      header: 'التوصيل',
      cell: ({ row }) => {
        const type = row.original.form_data?.deliveryType || row.original.form_data?.delivery_type || 'home';
        const isHome = type === 'home';
        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
            isHome ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
          )}>
            {isHome ? <Home className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
            {isHome ? 'للمنزل' : 'مكتب'}
          </span>
        );
      },
      size: 110,
    },

    // Shipping/Tracking
    {
      id: 'shipping',
      accessorFn: (row) => row.yalidine_tracking_id || (row as any).tracking_number,
      header: 'الشحن',
      cell: ({ row }) => {
        const order = row.original;
        const tracking = order.yalidine_tracking_id || (order as any).tracking_number;

        if (tracking) {
          return (
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                {tracking}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>تتبع الشحنة</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        }

        if (order.status === 'pending' && hasUpdatePermission && shippingProviders.length > 0) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Truck className="h-3 w-3 ml-1" />
                  إرسال
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {shippingProviders.map((p) => (
                  <DropdownMenuItem key={p.code} onClick={() => onSendToProvider?.(order, p.code)}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        // إذا لم تكن هناك شركات توصيل مفعّلة، نظهر قائمة مع رسالة واضحة بدل قائمة فارغة.
        if (order.status === 'pending' && hasUpdatePermission && shippingProviders.length === 0) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Truck className="h-3 w-3 ml-1" />
                  إرسال
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem disabled>
                  لا توجد شركات توصيل مفعّلة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return <span className="text-xs text-muted-foreground">-</span>;
      },
      size: 160,
    },

    // Total
    {
      id: 'total',
      accessorKey: 'total',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 font-semibold"
        >
          الإجمالي
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const total = parseFloat(row.original.total?.toString() || '0');
        const shipping = parseFloat(row.original.shipping_cost?.toString() || '0');
        const discount = parseFloat(row.original.discount?.toString() || '0');

        return (
          <div className="space-y-0.5">
            <span className="font-bold text-sm block">{formatCurrency(total)}</span>
            {shipping > 0 && (
              <span className="text-[10px] text-muted-foreground block">
                + {formatCurrency(shipping)} توصيل
              </span>
            )}
            {discount > 0 && (
              <span className="text-[10px] text-emerald-600 block">
                - {formatCurrency(discount)} خصم
              </span>
            )}
          </div>
        );
      },
      size: 150,
    },

    // Actions
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOrderView?.(order)}>
                <Eye className="h-4 w-4 ml-2" />
                عرض التفاصيل
              </DropdownMenuItem>
              {hasUpdatePermission && (
                <DropdownMenuItem onClick={() => onOrderEdit?.(order)}>
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onOrderPrint?.(order)}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </DropdownMenuItem>
              {hasUpdatePermission && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus?.(order.id, 'delivered')}
                    disabled={order.status === 'delivered'}
                    className="text-emerald-600"
                  >
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                    تأكيد التسليم
                  </DropdownMenuItem>
                </>
              )}
              {hasCancelPermission && order.status !== 'cancelled' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus?.(order.id, 'cancelled')}
                    className="text-red-600"
                  >
                    <Ban className="h-4 w-4 ml-2" />
                    إلغاء
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 70,
    },
  ], [
    hasUpdatePermission,
    hasCancelPermission,
    shippingProviders,
    callConfirmationStatuses,
    onAddCallConfirmationStatus,
    onDeleteCallConfirmationStatus,
    showManageCallConfirmationStatuses,
    onUpdateStatus,
    onUpdateCallConfirmation,
    onSendToProvider,
    onOrderView,
    onOrderEdit,
    onOrderPrint,
  ]);

  // Table Instance
  const table = useReactTable({
    data: orders,
    columns,
    state: {
      expanded,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowCanExpand: () => true,
  });

  // Loading Skeleton
  if (loading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الطلبات..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="flex gap-2">
          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="h-4 w-4 ml-2" />
                الأعمدة
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table.getAllLeafColumns()
                .filter(col => col.getCanHide())
                .map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id === 'orderNumber' ? 'رقم الطلب' :
                     column.id === 'customer' ? 'العميل' :
                     column.id === 'status' ? 'الحالة' :
                     column.id === 'callConfirmation' ? 'التأكيد' :
                     column.id === 'deliveryType' ? 'التوصيل' :
                     column.id === 'shipping' ? 'الشحن' :
                     column.id === 'total' ? 'الإجمالي' :
                     column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                  {headerGroup.headers.map(header => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="text-xs font-semibold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        row.getIsSelected() && "bg-primary/5",
                        row.getIsExpanded() && "border-b-0"
                      )}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="py-3"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Expanded Row */}
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                          <ExpandedRowContent
                            order={row.original}
                            onUpdateStatus={(status) => onUpdateStatus?.(row.original.id, status)}
                            onSendToProvider={(code) => onSendToProvider?.(row.original, code)}
                            shippingProviders={shippingProviders}
                            hasUpdatePermission={hasUpdatePermission}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-muted-foreground" />
                      <span className="text-muted-foreground">لا توجد طلبات</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <span className="font-medium">
                {table.getFilteredSelectedRowModel().rows.length} من {table.getFilteredRowModel().rows.length} محدد
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground px-2">
              صفحة {table.getState().pagination.pageIndex + 1} من {table.getPageCount()}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOrdersTable;
