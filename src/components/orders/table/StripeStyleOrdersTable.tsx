/**
 * StripeStyleOrdersTable - جدول الطلبيات بأسلوب Stripe
 *
 * تصميم احترافي مستوحى من Stripe Dashboard:
 * - مسافات واسعة وتنظيم واضح
 * - ألوان هادئة واحترافية
 * - كل المعلومات ظاهرة بدون ازدحام
 * - Typography محترف
 */

import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  Package,
  Phone,
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Printer,
  Home,
  Building2,
  PhoneCall,
  Ban,
  Edit,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
import type { Order } from './OrderTableTypes';

interface StripeStyleOrdersTableProps {
  orders: Order[];
  loading?: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  selectedOrders?: string[];
  onPageChange: (page: number) => void;
  onSelectOrder?: (orderId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
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
}

// ============================================
// Helpers
// ============================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' د.ج';
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('تم النسخ');
};

// ============================================
// Status Config
// ============================================

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلق', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  processing: { label: 'قيد المعالجة', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  shipped: { label: 'تم الشحن', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  delivered: { label: 'مكتمل', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'ملغي', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

// ============================================
// Table Header
// ============================================

const TableHeader: React.FC<{
  allSelected: boolean;
  onSelectAll: (selected: boolean) => void;
  ordersCount: number;
}> = ({ allSelected, onSelectAll, ordersCount }) => (
  <div className="grid grid-cols-[48px_1fr_1fr_140px_140px_180px_180px_100px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
    <div className="flex items-center justify-center">
      <Checkbox
        checked={allSelected}
        onCheckedChange={onSelectAll}
        disabled={ordersCount === 0}
      />
    </div>
    <div>الطلب</div>
    <div>العميل</div>
    <div>الحالة</div>
    <div>التأكيد</div>
    <div>الشحن والتوصيل</div>
    <div>المبلغ</div>
    <div className="text-center">إجراءات</div>
  </div>
);

// ============================================
// Order Row
// ============================================

const OrderRow: React.FC<{
  order: Order;
  selected: boolean;
  onSelect: (orderId: string, selected: boolean) => void;
  onView?: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onUpdateStatus?: (status: string) => Promise<void>;
  onUpdateCallConfirmation?: (statusId: number) => void;
  onSendToProvider?: (providerCode: string) => void;
  hasUpdatePermission?: boolean;
  hasCancelPermission?: boolean;
  shippingProviders?: Array<{ code: string; name: string }>;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
}> = ({
  order,
  selected,
  onSelect,
  onView,
  onEdit,
  onPrint,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  shippingProviders = [],
  callConfirmationStatuses = [],
}) => {
  // Extract data
  const orderNumber = order.customer_order_number || order.id.slice(0, 8);
  const createdAt = order.created_at ? parseISO(order.created_at) : new Date();
  const itemsCount = order.order_items?.length || 0;

  const customerName = order.customer?.name ||
    (order as any).customer_name ||
    order.form_data?.fullName ||
    'عميل غير معرف';

  const customerPhone = order.customer?.phone ||
    (order as any).customer_phone ||
    order.form_data?.phone;

  const deliveryType = order.form_data?.deliveryType || order.form_data?.delivery_type || 'home';
  const isHomeDelivery = deliveryType === 'home';

  const trackingNumber = order.yalidine_tracking_id || (order as any).tracking_number;
  const canSendToShipping = order.status === 'pending' && hasUpdatePermission && !trackingNumber;

  const total = parseFloat(order.total?.toString() || '0');
  const shippingCost = parseFloat(order.shipping_cost?.toString() || '0');
  const discount = parseFloat(order.discount?.toString() || '0');

  const statusConfig = ORDER_STATUS[order.status] || ORDER_STATUS.pending;

  const currentCallStatusId = (order as any).call_confirmation_status_id;
  const currentCallStatus = callConfirmationStatuses.find(s => s.id === currentCallStatusId);

  // Location info
  const wilaya = order.form_data?.wilayaName || (order as any).wilaya_name || '';
  const commune = order.form_data?.communeName || (order as any).commune_name || '';

  return (
    <div
      className={cn(
        "grid grid-cols-[48px_1fr_1fr_140px_140px_180px_180px_100px] gap-4 px-6 py-5 border-b border-slate-100 hover:bg-slate-50/50 transition-colors",
        selected && "bg-blue-50/50"
      )}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(order.id, !!checked)}
        />
      </div>

      {/* Order Info */}
      <div className="flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm">
            #{orderNumber}
          </span>
          <Badge variant="outline" className="text-[10px] font-normal bg-slate-100 border-slate-200 text-slate-600">
            {itemsCount} منتج
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{format(createdAt, 'd MMM yyyy', { locale: ar })}</span>
          <span className="text-slate-300">•</span>
          <span>{format(createdAt, 'HH:mm')}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="flex flex-col justify-center gap-1.5">
        <span className="font-medium text-slate-900 text-sm truncate max-w-[200px]">
          {customerName}
        </span>
        {customerPhone && (
          <button
            onClick={() => copyToClipboard(customerPhone)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors w-fit group"
          >
            <Phone className="h-3 w-3 text-slate-400" />
            <span dir="ltr" className="font-mono">{customerPhone}</span>
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        {(wilaya || commune) && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="h-3 w-3" />
            <span>{wilaya}{commune ? ` - ${commune}` : ''}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        {hasUpdatePermission ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                statusConfig.bg,
                statusConfig.color
              )}>
                {statusConfig.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {Object.entries(ORDER_STATUS).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onUpdateStatus?.(key)}
                  disabled={order.status === key}
                  className={cn("text-xs", order.status === key && "bg-slate-100")}
                >
                  <span className={cn("w-2 h-2 rounded-full ml-2", config.bg.replace('bg-', 'bg-').replace('-50', '-500'))} />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border",
            statusConfig.bg,
            statusConfig.color
          )}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* Call Confirmation */}
      <div className="flex items-center">
        {callConfirmationStatuses.length > 0 ? (
          hasUpdatePermission ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  style={{
                    borderColor: currentCallStatus?.color ? `${currentCallStatus.color}40` : undefined,
                    backgroundColor: currentCallStatus?.color ? `${currentCallStatus.color}10` : undefined,
                    color: currentCallStatus?.color || undefined,
                  }}
                >
                  <PhoneCall className="h-3 w-3" />
                  {currentCallStatus?.name || 'لم يتم'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {callConfirmationStatuses.map((status) => (
                  <DropdownMenuItem
                    key={status.id}
                    onClick={() => onUpdateCallConfirmation?.(status.id)}
                    className="text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-full ml-2"
                      style={{ backgroundColor: status.color || '#94a3b8' }}
                    />
                    {status.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border"
              style={{
                borderColor: currentCallStatus?.color ? `${currentCallStatus.color}40` : '#e2e8f0',
                backgroundColor: currentCallStatus?.color ? `${currentCallStatus.color}10` : '#f8fafc',
                color: currentCallStatus?.color || '#64748b',
              }}
            >
              <PhoneCall className="h-3 w-3" />
              {currentCallStatus?.name || 'لم يتم'}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </div>

      {/* Shipping & Delivery */}
      <div className="flex flex-col justify-center gap-2">
        {/* Delivery Type */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium w-fit",
          isHomeDelivery
            ? "bg-blue-50 text-blue-700"
            : "bg-violet-50 text-violet-700"
        )}>
          {isHomeDelivery ? <Home className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
          {isHomeDelivery ? 'توصيل للمنزل' : 'مكتب'}
        </div>

        {/* Tracking or Send Button */}
        {trackingNumber ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {trackingNumber}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-slate-600">
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تتبع الشحنة</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : canSendToShipping && shippingProviders.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors w-fit">
                <Truck className="h-3 w-3" />
                إرسال للشحن
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {shippingProviders.map((provider) => (
                <DropdownMenuItem
                  key={provider.code}
                  onClick={() => onSendToProvider?.(provider.code)}
                  className="text-xs"
                >
                  {provider.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-[11px] text-slate-400">
            {order.status === 'cancelled' ? 'ملغي' : 'في الانتظار'}
          </span>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col justify-center gap-1">
        <span className="font-bold text-slate-900 text-base">
          {formatCurrency(total)}
        </span>
        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
          {shippingCost > 0 && (
            <span>التوصيل: {formatCurrency(shippingCost)}</span>
          )}
          {discount > 0 && (
            <span className="text-emerald-600">خصم: -{formatCurrency(discount)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                onClick={onView}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>عرض</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onView} className="text-xs">
              <Eye className="h-4 w-4 ml-2" />
              عرض التفاصيل
            </DropdownMenuItem>
            {hasUpdatePermission && (
              <DropdownMenuItem onClick={onEdit} className="text-xs">
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onPrint} className="text-xs">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </DropdownMenuItem>

            {hasUpdatePermission && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onUpdateStatus?.('delivered')}
                  disabled={order.status === 'delivered'}
                  className="text-xs text-emerald-600"
                >
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  تحديد كمكتمل
                </DropdownMenuItem>
              </>
            )}

            {hasCancelPermission && order.status !== 'cancelled' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onUpdateStatus?.('cancelled')}
                  className="text-xs text-red-600"
                >
                  <Ban className="h-4 w-4 ml-2" />
                  إلغاء الطلب
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// ============================================
// Skeleton Row
// ============================================

const SkeletonRow = () => (
  <div className="grid grid-cols-[48px_1fr_1fr_140px_140px_180px_180px_100px] gap-4 px-6 py-5 border-b border-slate-100">
    <div className="flex items-center justify-center">
      <Skeleton className="h-4 w-4 rounded" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-7 w-20 rounded-md" />
    <Skeleton className="h-7 w-20 rounded-md" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-20" />
    </div>
    <div className="flex flex-col gap-1">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
    <Skeleton className="h-8 w-16 mx-auto" />
  </div>
);

// ============================================
// Empty State
// ============================================

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Package className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-1">لا توجد طلبيات</h3>
    <p className="text-sm text-slate-500 text-center max-w-sm">
      لم يتم العثور على طلبيات تطابق معايير البحث
    </p>
  </div>
);

// ============================================
// Pagination
// ============================================

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalItems, pageSize, onPageChange }) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
      <p className="text-sm text-slate-500">
        عرض <span className="font-medium text-slate-700">{startItem}</span> -{' '}
        <span className="font-medium text-slate-700">{endItem}</span> من{' '}
        <span className="font-medium text-slate-700">{totalItems}</span> طلب
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 px-3 text-slate-600"
        >
          <ChevronRight className="h-4 w-4 ml-1" />
          السابق
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "h-9 w-9 p-0",
                  currentPage === pageNum
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-9 px-3 text-slate-600"
        >
          التالي
          <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const StripeStyleOrdersTable: React.FC<StripeStyleOrdersTableProps> = ({
  orders,
  loading = false,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  selectedOrders = [],
  onPageChange,
  onSelectOrder,
  onSelectAll,
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
}) => {
  const allSelected = useMemo(() =>
    orders.length > 0 && selectedOrders.length === orders.length,
    [orders.length, selectedOrders.length]
  );

  const handleSelectOrder = useCallback((orderId: string, selected: boolean) => {
    onSelectOrder?.(orderId, selected);
  }, [onSelectOrder]);

  const handleSelectAll = useCallback((selected: boolean) => {
    onSelectAll?.(selected);
  }, [onSelectAll]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <TableHeader
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        ordersCount={orders.length}
      />

      {/* Body */}
      <div className="min-h-[400px]">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              selected={selectedOrders.includes(order.id)}
              onSelect={handleSelectOrder}
              onView={() => onOrderView?.(order)}
              onEdit={() => onOrderEdit?.(order)}
              onPrint={() => onOrderPrint?.(order)}
              onUpdateStatus={async (status) => {
                await onUpdateStatus?.(order.id, status);
              }}
              onUpdateCallConfirmation={(statusId) => {
                onUpdateCallConfirmation?.(order.id, statusId);
              }}
              onSendToProvider={(providerCode) => {
                onSendToProvider?.(order, providerCode);
              }}
              hasUpdatePermission={hasUpdatePermission}
              hasCancelPermission={hasCancelPermission}
              shippingProviders={shippingProviders}
              callConfirmationStatuses={callConfirmationStatuses}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};

export default StripeStyleOrdersTable;
