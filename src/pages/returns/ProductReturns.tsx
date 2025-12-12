/**
 * ProductReturns - إدارة إرجاع المنتجات
 * ============================================================
 * Apple-Inspired Design - Same as CustomerDebts page
 * Uses PowerSync Reactive Hooks for real-time updates
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileText,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Eye,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Loader2,
  ShoppingCart,
  Ruler,
  Scale,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';
import { RETURN_REASONS_ARRAY, getReturnReasonLabel } from '@/constants/returnReasons';
import {
  getAllLocalReturns,
  createLocalReturn,
  approveLocalReturn,
  rejectLocalReturn,
  type LocalProductReturn
} from '@/api/localProductReturnService';
import { syncPendingProductReturns } from '@/api/syncProductReturns';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { LocalReturnItem, LocalPOSOrder, LocalPOSOrderItem } from '@/database/localDb';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useReactiveReturns, useReactiveReturnStats, type ReturnStatus } from '@/hooks/powersync';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import ReturnsUserGuide, { ReturnsHelpButton } from '@/components/returns/ReturnsUserGuide';

// ===============================================================================
// Types
// ===============================================================================

interface ProductReturnsProps extends POSSharedLayoutControls {}

interface Return {
  id: string;
  return_number: string;
  original_order_id?: string;
  original_order_number?: string;
  customer_id?: string;
  customer_name?: string;
  return_type: string;
  return_reason: string;
  return_reason_description?: string;
  original_total: number;
  return_amount: number;
  refund_amount: number;
  status: string;
  refund_method?: string;
  notes?: string;
  organization_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_direct_return?: boolean;
  _synced?: boolean;
}

interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  return_quantity: number;
  return_unit_price: number;
  total_return_amount: number;
  color_name?: string;
  size_name?: string;
  variant_display_name?: string;
  selling_unit_type?: string;
  weight_returned?: number;
  weight_unit?: string;
  meters_returned?: number;
  boxes_returned?: number;
  condition_status?: string;
  inventory_returned?: boolean;
}

interface Order {
  id: string;
  customer_order_number: string;
  customer_name: string;
  total: number;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    color_name?: string;
    size_name?: string;
    variant_display_name?: string;
    already_returned_quantity: number;
    available_for_return: number;
  }>;
}

// ===============================================================================
// Stat Card Component - Apple Style
// ===============================================================================

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 rounded-2xl p-4",
      "border border-zinc-200 dark:border-zinc-800",
      "transition-all duration-200",
      "hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-numeric tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          iconBg
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

// ===============================================================================
// Return Row Component
// ===============================================================================

interface ReturnRowProps {
  returnItem: Return;
  onViewDetails: () => void;
  onProcess: () => void;
}

// Column widths for consistency
const COL_WIDTHS = {
  returnNumber: 'w-28 shrink-0',
  order: 'w-24 shrink-0',
  customer: 'flex-1 min-w-[120px]',
  amount: 'w-28 shrink-0',
  status: 'w-24 shrink-0',
  actions: 'w-20 shrink-0',
};

const ReturnRow = React.memo<ReturnRowProps>(({
  returnItem,
  onViewDetails,
  onProcess,
}) => {
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: 'في الانتظار', className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
      approved: { label: 'موافق عليه', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
      processing: { label: 'قيد المعالجة', className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
      completed: { label: 'مكتمل', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
      rejected: { label: 'مرفوض', className: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold",
        config.className
      )}>
        {config.label}
      </span>
    );
  };

  return (
    <div className={cn(
      "group flex items-center gap-2 px-4 py-3",
      "border-b border-zinc-100 dark:border-zinc-800/50",
      "transition-colors duration-150",
      "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
    )}>
      {/* Return Number */}
      <div className={COL_WIDTHS.returnNumber}>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {returnItem.return_number}
        </p>
        <p className="text-[10px] text-zinc-400">
          {new Date(returnItem.created_at).toLocaleDateString('ar-DZ')}
        </p>
      </div>

      {/* Order Info */}
      <div className={COL_WIDTHS.order}>
        {returnItem.is_direct_return ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
            مباشر
          </span>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
            #{returnItem.original_order_number}
          </p>
        )}
      </div>

      {/* Customer */}
      <div className={COL_WIDTHS.customer}>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {returnItem.customer_name || 'زائر'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {getReturnReasonLabel(returnItem.return_reason)}
        </p>
      </div>

      {/* Amount */}
      <div className={cn(COL_WIDTHS.amount, "text-left")}>
        <p className="text-sm font-bold text-orange-600 dark:text-orange-400 font-numeric">
          {formatPrice(returnItem.return_amount)}
        </p>
        {returnItem._synced === false && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
            غير متزامن
          </span>
        )}
      </div>

      {/* Status */}
      <div className={cn(COL_WIDTHS.status, "text-center")}>
        {getStatusBadge(returnItem.status)}
      </div>

      {/* Actions */}
      <div className={cn(COL_WIDTHS.actions, "flex items-center justify-center gap-0.5")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="h-7 w-7 p-0 rounded-lg"
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        {returnItem.status === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onProcess}
            className="h-7 w-7 p-0 rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
});
ReturnRow.displayName = 'ReturnRow';

// ===============================================================================
// Main Component
// ===============================================================================

const ProductReturns: React.FC<ProductReturnsProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { user } = useAuth();
  const perms = usePermissions();
  const { currentOrganization } = useTenant();
  const { isOnline } = useNetworkStatus();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ⚡ PowerSync Reactive Hooks
  const reactiveStatus = statusFilter !== 'all' ? statusFilter as ReturnStatus : undefined;
  const {
    returns: rawReturns,
    isLoading: loading,
  } = useReactiveReturns({
    status: reactiveStatus,
    searchTerm: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    limit: 500
  });

  const { stats: reactiveStats, isLoading: statsLoading } = useReactiveReturnStats();

  // Transform & Filter returns
  const returns = useMemo(() => {
    let filtered = rawReturns.map(r => ({
      id: r.id,
      return_number: r.return_number || '',
      original_order_id: r.original_order_id,
      original_order_number: r.original_order_number,
      customer_id: r.customer_id,
      customer_name: r.customer_name || 'زائر',
      return_type: r.return_type || 'refund',
      return_reason: r.return_reason || '',
      return_reason_description: r.return_reason_description,
      original_total: r.original_total || 0,
      return_amount: r.return_amount || 0,
      refund_amount: r.refund_amount || 0,
      status: r.status,
      refund_method: r.refund_method,
      notes: r.notes,
      organization_id: r.organization_id,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      is_direct_return: !r.original_order_id,
      _synced: true,
    } as Return));

    // Type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'direct') {
        filtered = filtered.filter(r => r.is_direct_return);
      } else {
        filtered = filtered.filter(r => r.return_type === typeFilter);
      }
    }

    return filtered;
  }, [rawReturns, typeFilter]);

  // Pagination
  const totalReturns = returns.length;
  const totalPages = Math.ceil(totalReturns / pageSize);
  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return returns.slice(start, start + pageSize);
  }, [returns, currentPage, pageSize]);

  // Stats
  const stats = useMemo(() => ({
    total: reactiveStats.totalReturns,
    pending: reactiveStats.pendingCount,
    approved: reactiveStats.byStatus.approved.count,
    completed: reactiveStats.byStatus.completed.count + reactiveStats.byStatus.processed.count,
    rejected: reactiveStats.byStatus.rejected.count,
    totalAmount: reactiveStats.totalRefunds,
  }), [reactiveStats]);

  // UI State
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loadingReturnItems, setLoadingReturnItems] = useState(false);

  // Create form
  const [searchOrderId, setSearchOrderId] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [createForm, setCreateForm] = useState({
    returnType: 'partial' as 'full' | 'partial',
    returnReason: 'customer_request',
    description: '',
    refundMethod: 'cash' as string,
    notes: '',
    selectedItems: [] as Array<{
      id: string;
      product_id: string;
      product_name: string;
      product_sku?: string;
      original_quantity: number;
      return_quantity: number;
      original_unit_price: number;
      condition_status: string;
      color_name?: string;
      size_name?: string;
      variant_display_name?: string;
    }>
  });

  // Permissions
  const canManageReturns = perms.ready ? perms.anyOf(['manageOrders']) : false;
  const isUnauthorized = perms.ready && !canManageReturns;

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isOnline || !currentOrganization?.id) return;

    setIsSyncing(true);
    try {
      const syncResult = await syncPendingProductReturns();
      if (syncResult.success > 0) {
        toast.success(`تمت مزامنة ${syncResult.success} إرجاع`);
      }
    } catch (error) {
      console.error('خطأ في المزامنة:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, currentOrganization?.id]);

  useEffect(() => {
    if (isUnauthorized || !onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh, isUnauthorized]);

  useEffect(() => {
    if (isUnauthorized || !onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: loading,
      connectionStatus: 'connected'
    });
  }, [isUnauthorized, loading, onLayoutStateChange]);

  // Search order
  const searchOrder = async () => {
    if (!searchOrderId || !currentOrganization?.id) return;

    setSearchingOrder(true);
    try {
      const localOrders = await deltaWriteService.getAll<LocalPOSOrder>('orders', currentOrganization.id);
      const isNumber = /^\d+$/.test(searchOrderId);

      let foundOrders = localOrders.filter(order => {
        if (isNumber) {
          return order.remote_customer_order_number === parseInt(searchOrderId);
        }
        return order.id === searchOrderId;
      });

      foundOrders.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (foundOrders.length > 0) {
        const firstOrder = foundOrders[0];
        const allOrderItems = await deltaWriteService.getAll<LocalPOSOrderItem>('order_items', currentOrganization.id);
        const orderItems = allOrderItems.filter(item => item.order_id === firstOrder.id);

        const orderData: Order = {
          id: firstOrder.id,
          customer_order_number: String(firstOrder.remote_customer_order_number || ''),
          customer_name: firstOrder.customer_name || 'زائر',
          total: firstOrder.total,
          created_at: firstOrder.created_at,
          order_items: orderItems.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
            already_returned_quantity: 0,
            available_for_return: item.quantity,
            color_name: item.color_name,
            size_name: item.size_name,
            variant_display_name: item.variant_display_name
          }))
        };

        setFoundOrder(orderData);
      } else {
        toast.error('لم يتم العثور على الطلبية');
        setFoundOrder(null);
      }
    } catch (error) {
      console.error('خطأ في البحث:', error);
      toast.error('حدث خطأ في البحث');
      setFoundOrder(null);
    } finally {
      setSearchingOrder(false);
    }
  };

  // Create return
  const createReturnRequest = async () => {
    if (!foundOrder || !user?.id || !currentOrganization?.id || createForm.selectedItems.length === 0) {
      toast.error('يجب اختيار عناصر للإرجاع');
      return;
    }

    try {
      const returnAmount = createForm.selectedItems.reduce((sum, item) =>
        sum + (item.return_quantity * item.original_unit_price), 0);

      const returnNumber = `RET-${Date.now()}`;

      const returnData = {
        return_number: returnNumber,
        original_order_id: foundOrder.id,
        original_order_number: foundOrder.customer_order_number,
        customer_name: foundOrder.customer_name,
        customer_id: foundOrder.id,
        customer_phone: null,
        customer_email: null,
        return_type: createForm.returnType,
        return_reason: createForm.returnReason,
        return_reason_description: createForm.description || null,
        original_total: foundOrder.total,
        return_amount: returnAmount,
        refund_amount: returnAmount,
        restocking_fee: 0,
        status: 'pending' as const,
        refund_method: createForm.refundMethod,
        notes: createForm.notes || null,
        internal_notes: null,
        requires_manager_approval: returnAmount > 10000,
        created_by: user.id,
        approved_by: null,
        approved_at: null,
        processed_by: null,
        processed_at: null,
        approval_notes: null,
        rejection_reason: null,
        rejected_by: null,
        rejected_at: null,
        organization_id: currentOrganization.id
      };

      const returnItems = createForm.selectedItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.return_quantity,
        unit_price: item.original_unit_price,
        refund_amount: item.return_quantity * item.original_unit_price,
        condition: 'good',
        restocked: true,
        inventory_returned: false,
        color_name: item.color_name,
        size_name: item.size_name,
      }));

      await createLocalReturn({ returnData, items: returnItems });

      toast.success('تم إنشاء طلب الإرجاع بنجاح');
      setIsCreateDialogOpen(false);
      resetCreateForm();

      if (isOnline) {
        setTimeout(() => handleRefresh(), 1000);
      }
    } catch (error) {
      console.error('خطأ في إنشاء الإرجاع:', error);
      toast.error('حدث خطأ في إنشاء طلب الإرجاع');
    }
  };

  // Process return
  const processReturn = async (returnId: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;

    try {
      if (action === 'approve') {
        await approveLocalReturn(returnId, user.id);
        toast.success('تم الموافقة على طلب الإرجاع');
      } else {
        await rejectLocalReturn(returnId);
        toast.success('تم رفض طلب الإرجاع');
      }

      setIsActionDialogOpen(false);

      if (isOnline) {
        setTimeout(() => handleRefresh(), 1000);
      }
    } catch (error) {
      console.error('خطأ في معالجة الإرجاع:', error);
      toast.error('حدث خطأ في معالجة طلب الإرجاع');
    }
  };

  // Fetch return items
  const fetchReturnItems = async (returnId: string) => {
    if (!currentOrganization?.id) return;

    setLoadingReturnItems(true);
    try {
      const allItems = await deltaWriteService.getAll<LocalReturnItem>('return_items' as any, currentOrganization.id);
      const items = allItems.filter(item => item.return_id === returnId);

      const returnItemsData = items.map((item: any) => ({
        id: item.id,
        return_id: item.return_id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        return_quantity: item.return_quantity,
        return_unit_price: item.return_unit_price,
        total_return_amount: item.total_return_amount,
        condition_status: item.condition_status || 'good',
        inventory_returned: item.inventory_returned,
        color_name: item.color_name,
        size_name: item.size_name,
        variant_display_name: item.color_name && item.size_name
          ? `${item.color_name} - ${item.size_name}`
          : item.color_name || item.size_name || undefined,
        selling_unit_type: item.selling_unit_type || 'piece',
        weight_returned: item.weight_returned,
        weight_unit: item.weight_unit,
        meters_returned: item.meters_returned,
        boxes_returned: item.boxes_returned,
      })) || [];

      setReturnItems(returnItemsData as ReturnItem[]);
    } catch (error) {
      console.error('Error fetching return items:', error);
      setReturnItems([]);
    } finally {
      setLoadingReturnItems(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      returnType: 'partial',
      returnReason: 'customer_request',
      description: '',
      refundMethod: 'cash',
      notes: '',
      selectedItems: []
    });
    setFoundOrder(null);
    setSearchOrderId('');
  };

  // Layout wrapper
  const renderWithLayout = (children: React.ReactNode) => {
    if (!useStandaloneLayout) return children;

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={loading}
        connectionStatus="connected"
      >
        {children}
      </POSPureLayout>
    );
  };

  // Unauthorized
  if (isUnauthorized) {
    return renderWithLayout(
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          غير مصرح
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-sm">
          ليس لديك الصلاحيات اللازمة للوصول إلى صفحة إرجاع المنتجات.
        </p>
      </div>
    );
  }

  // Main content
  const mainContent = (
    <div className="space-y-5 p-4" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
            <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">إدارة الإرجاعات</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalReturns} طلب إرجاع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ReturnsHelpButton onClick={() => setShowUserGuide(true)} />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isSyncing || !isOnline}
            className="h-9 w-9 rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>

          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            size="sm"
            className="h-9 px-3 rounded-xl gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-medium">طلب إرجاع</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="إجمالي الطلبات"
          value={stats.total.toString()}
          subtitle="طلب إرجاع"
          icon={<Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-50 dark:bg-orange-950/50"
          loading={statsLoading}
        />
        <StatCard
          title="في الانتظار"
          value={stats.pending.toString()}
          subtitle="بانتظار المراجعة"
          icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          loading={statsLoading}
        />
        <StatCard
          title="موافق عليها"
          value={stats.approved.toString()}
          subtitle="تم القبول"
          icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          loading={statsLoading}
        />
        <StatCard
          title="مكتملة"
          value={stats.completed.toString()}
          subtitle="تمت المعالجة"
          icon={<FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
          loading={statsLoading}
        />
        <StatCard
          title="مرفوضة"
          value={stats.rejected.toString()}
          subtitle="تم الرفض"
          icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950/50"
          loading={statsLoading}
        />
        <StatCard
          title="قيمة الإرجاع"
          value={formatPrice(stats.totalAmount)}
          subtitle="المبلغ الإجمالي"
          icon={<CreditCard className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
          loading={statsLoading}
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="البحث برقم الإرجاع أو العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-10 rounded-xl border-zinc-200 dark:border-zinc-700">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
              <SelectItem value="approved">موافق عليها</SelectItem>
              <SelectItem value="completed">مكتملة</SelectItem>
              <SelectItem value="rejected">مرفوضة</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-10 rounded-xl border-zinc-200 dark:border-zinc-700">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="full">إرجاع كامل</SelectItem>
              <SelectItem value="partial">إرجاع جزئي</SelectItem>
              <SelectItem value="direct">إرجاع مباشر</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Returns Table */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-sm text-zinc-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      ) : paginatedReturns.length > 0 ? (
        <>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700">
              <span className={cn(COL_WIDTHS.returnNumber, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>رقم الإرجاع</span>
              <span className={cn(COL_WIDTHS.order, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>الطلبية</span>
              <span className={cn(COL_WIDTHS.customer, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>العميل / السبب</span>
              <span className={cn(COL_WIDTHS.amount, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-left")}>المبلغ</span>
              <span className={cn(COL_WIDTHS.status, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الحالة</span>
              <span className={cn(COL_WIDTHS.actions, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الإجراءات</span>
            </div>

            {/* Rows */}
            <div>
              {paginatedReturns.map((returnItem) => (
                <ReturnRow
                  key={returnItem.id}
                  returnItem={returnItem}
                  onViewDetails={() => {
                    setSelectedReturn(returnItem);
                    fetchReturnItems(returnItem.id);
                    setIsDetailsDialogOpen(true);
                  }}
                  onProcess={() => {
                    setSelectedReturn(returnItem);
                    setIsActionDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-zinc-500">
                <span className="font-numeric">{((currentPage - 1) * pageSize) + 1}</span>
                <span className="mx-1">-</span>
                <span className="font-numeric">{Math.min(currentPage * pageSize, totalReturns)}</span>
                <span className="mx-1.5">من</span>
                <span className="font-numeric font-medium text-zinc-700 dark:text-zinc-300">{totalReturns}</span>
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(page)}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <RotateCcw className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {debouncedSearch ? 'لا توجد نتائج للبحث' : 'لا توجد طلبات إرجاع'}
          </h3>
          <p className="text-sm text-zinc-500">
            {debouncedSearch
              ? 'جرب البحث باستخدام كلمات أخرى'
              : 'لم يتم تسجيل أي طلبات إرجاع بعد'}
          </p>
        </div>
      )}

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-h-[85vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              إنشاء طلب إرجاع جديد
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              ابحث عن الطلبية واختر المنتجات للإرجاع
            </p>
          </div>

          <div className="px-5 py-3 space-y-4">
            {/* Search Order */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                البحث عن الطلبية
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="رقم الطلبية"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="flex-1 h-10 rounded-xl"
                  dir="ltr"
                />
                <Button
                  onClick={searchOrder}
                  disabled={!searchOrderId || searchingOrder}
                  className="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {searchingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Found Order */}
            {foundOrder && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      طلبية #{foundOrder.customer_order_number}
                    </p>
                    <p className="text-xs text-zinc-500">{foundOrder.customer_name}</p>
                  </div>
                  <p className="text-sm font-bold text-orange-600 font-numeric">
                    {formatPrice(foundOrder.total)}
                  </p>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500">اختر المنتجات للإرجاع:</p>
                  {foundOrder.order_items.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors",
                        createForm.selectedItems.some(si => si.id === item.id)
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={createForm.selectedItems.some(si => si.id === item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateForm(prev => ({
                              ...prev,
                              selectedItems: [...prev.selectedItems, {
                                id: item.id,
                                product_id: item.product_id,
                                product_name: item.product_name,
                                product_sku: item.product_sku,
                                original_quantity: item.quantity,
                                return_quantity: item.available_for_return,
                                original_unit_price: item.unit_price,
                                condition_status: 'good',
                                color_name: item.color_name,
                                size_name: item.size_name,
                                variant_display_name: item.variant_display_name,
                              }]
                            }));
                          } else {
                            setCreateForm(prev => ({
                              ...prev,
                              selectedItems: prev.selectedItems.filter(si => si.id !== item.id)
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded text-orange-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.product_name}
                        </p>
                        {item.variant_display_name && (
                          <p className="text-xs text-zinc-500">{item.variant_display_name}</p>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{item.quantity}x</p>
                        <p className="text-xs text-zinc-500 font-numeric">{formatPrice(item.unit_price)}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Return Details */}
                <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">سبب الإرجاع</p>
                      <Select
                        value={createForm.returnReason}
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, returnReason: value }))}
                      >
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RETURN_REASONS_ARRAY.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">طريقة الاسترداد</p>
                      <Select
                        value={createForm.refundMethod}
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, refundMethod: value }))}
                      >
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="card">بطاقة</SelectItem>
                          <SelectItem value="credit">رصيد</SelectItem>
                          <SelectItem value="exchange">استبدال</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-1">ملاحظات (اختياري)</p>
                    <Textarea
                      placeholder="أي ملاحظات إضافية..."
                      value={createForm.notes}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="rounded-lg text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setIsCreateDialogOpen(false); resetCreateForm(); }}
              className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
            >
              إلغاء
            </Button>
            <Button
              onClick={createReturnRequest}
              disabled={!foundOrder || createForm.selectedItems.length === 0}
              className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
            >
              إنشاء طلب الإرجاع
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-h-[85vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              تفاصيل طلب الإرجاع
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedReturn?.return_number}
            </p>
          </div>

          {selectedReturn && (
            <div className="px-5 py-3 space-y-4">
              {/* Basic Info */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">الطلبية الأصلية</span>
                  <span className="text-sm font-medium">
                    {selectedReturn.is_direct_return ? 'إرجاع مباشر' : `#${selectedReturn.original_order_number}`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">العميل</span>
                  <span className="text-sm font-medium">{selectedReturn.customer_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">السبب</span>
                  <span className="text-sm font-medium">{getReturnReasonLabel(selectedReturn.return_reason)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-zinc-500">مبلغ الإرجاع</span>
                  <span className="text-sm font-bold text-orange-600 font-numeric">{formatPrice(selectedReturn.return_amount)}</span>
                </div>
              </div>

              {/* Return Items */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                  المنتجات المرجعة ({returnItems.length})
                </p>
                {loadingReturnItems ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {returnItems.map((item) => {
                      // تحديد الكمية والوحدة حسب نوع البيع
                      const sellingUnit = item.selling_unit_type || 'piece';
                      let quantityDisplay = '';
                      let UnitIcon = Package;
                      let unitColorClass = 'text-zinc-600 dark:text-zinc-400';

                      switch (sellingUnit) {
                        case 'meter':
                          quantityDisplay = `${item.meters_returned || item.return_quantity} متر`;
                          UnitIcon = Ruler;
                          unitColorClass = 'text-purple-600 dark:text-purple-400';
                          break;
                        case 'weight':
                          quantityDisplay = `${item.weight_returned || item.return_quantity} ${item.weight_unit || 'كجم'}`;
                          UnitIcon = Scale;
                          unitColorClass = 'text-emerald-600 dark:text-emerald-400';
                          break;
                        case 'box':
                          quantityDisplay = `${item.boxes_returned || item.return_quantity} علبة`;
                          UnitIcon = Box;
                          unitColorClass = 'text-blue-600 dark:text-blue-400';
                          break;
                        case 'piece':
                        default:
                          quantityDisplay = `${item.return_quantity} قطعة`;
                          UnitIcon = Package;
                          unitColorClass = 'text-zinc-600 dark:text-zinc-400';
                      }

                      return (
                        <div key={item.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {item.product_name}
                              </p>
                              {item.variant_display_name && (
                                <p className="text-xs text-zinc-500">{item.variant_display_name}</p>
                              )}
                            </div>
                            <div className="text-left">
                              <p className={cn("text-sm font-medium flex items-center gap-1", unitColorClass)}>
                                <UnitIcon className="h-3.5 w-3.5" />
                                {quantityDisplay}
                              </p>
                              <p className="text-xs text-orange-600 font-numeric">{formatPrice(item.total_return_amount)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              onClick={() => setIsDetailsDialogOpen(false)}
              className="w-full h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              معالجة طلب الإرجاع
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedReturn?.return_number}
            </p>
          </div>

          {selectedReturn && (
            <div className="px-5 py-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                هل تريد الموافقة على طلب الإرجاع هذا أم رفضه؟
              </p>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-4">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-zinc-500">المبلغ</span>
                  <span className="text-sm font-bold text-orange-600 font-numeric">
                    {formatPrice(selectedReturn.return_amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => processReturn(selectedReturn.id, 'approve')}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <CheckCircle className="h-4 w-4 ml-2" />
                  موافقة
                </Button>
                <Button
                  onClick={() => processReturn(selectedReturn.id, 'reject')}
                  variant="destructive"
                  className="flex-1 h-10 rounded-xl"
                >
                  <XCircle className="h-4 w-4 ml-2" />
                  رفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Guide */}
      <ReturnsUserGuide
        isOpen={showUserGuide}
        onClose={() => setShowUserGuide(false)}
      />
    </div>
  );

  return renderWithLayout(mainContent);
};

export default ProductReturns;
