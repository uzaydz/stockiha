/**
 * LossDeclarations - إدارة تصاريح الخسائر
 * ============================================================
 * Apple-Inspired Design - Same as ProductReturns page
 * Uses PowerSync Reactive Hooks for real-time updates
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileText,
  CreditCard,
  TrendingDown,
  RefreshCw,
  Eye,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Loader2,
  Flame,
  Droplets,
  Bug,
  Calendar,
  Trash2,
  Ruler,
  Scale,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllLocalLossDeclarations,
  createLocalLossDeclaration,
  approveLocalLossDeclaration,
  rejectLocalLossDeclaration,
  calculateLossTotals,
  type LocalLossDeclaration
} from '@/api/localLossDeclarationService';
import { syncPendingLossDeclarations } from '@/api/syncLossDeclarations';
import type { LocalLossItem } from '@/database/localDb';
import type { Loss, LossItem, Product, ProductVariant } from '@/types/losses';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { formatCurrency, convertLossType, getCategoryLabel, getCategoryBadgeVariant } from '@/lib/losses/utils';
import { useLossCreateForm } from '@/hooks/useLossCreateForm';
import { useLossProductSearch } from '@/hooks/useLossProductSearch';
import { useReactiveLosses, useReactiveLossStats, type LossStatus } from '@/hooks/powersync';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ===============================================================================
// Types
// ===============================================================================

interface LossDeclarationsProps extends POSSharedLayoutControls { }

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
        <div className="flex flex-col gap-0.5">
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
// Loss Row Component (Restored & Enhanced)
// ===============================================================================

interface LossRowProps {
  loss: Loss;
  onViewDetails: () => void;
  onProcess: () => void;
  onDelete: () => void;
}

// Column widths for consistency
const COL_WIDTHS = {
  lossNumber: 'w-28 shrink-0',
  type: 'w-32 shrink-0', // Widen for Category
  description: 'flex-1 min-w-[150px]',
  items: 'w-24 shrink-0 text-center', // New separate column
  cost: 'w-28 shrink-0',
  status: 'w-24 shrink-0',
  actions: 'w-24 shrink-0', // Reduced slightly
};

const LossRow = React.memo<LossRowProps>(({
  loss,
  onViewDetails,
  onProcess,
  onDelete,
}) => {
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: 'في الانتظار', className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
      approved: { label: 'معتمد', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
      rejected: { label: 'مرفوض', className: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' },
      investigating: { label: 'قيد التحقيق', className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
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

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      damage: 'تلف',
      damaged: 'تلف',
      theft: 'سرقة',
      expiry: 'انتهاء صلاحية',
      expired: 'انتهاء صلاحية',
      fire_damage: 'حريق',
      water_damage: 'فيضان',
      spoilage: 'تلف طبيعي',
      breakage: 'كسر',
      defective: 'معيب',
      shortage: 'نقص',
      other: 'أخرى',
    };
    return types[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire_damage': return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case 'water_damage': return <Droplets className="w-3.5 h-3.5 text-blue-500" />;
      case 'theft': return <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />;
      case 'expiry':
      case 'expired': return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'damage':
      case 'damaged': return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
      default: return <Bug className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  return (
    <div className={cn(
      "group flex items-center gap-4 px-4 py-3.5",
      "border-b border-zinc-100 dark:border-zinc-800/50",
      "transition-all duration-200",
      "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
    )}>
      {/* Loss Number */}
      <div className={COL_WIDTHS.lossNumber}>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
            {loss.loss_number}
          </span>
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(loss.incident_date).toLocaleDateString('ar-DZ')}
          </span>
        </div>
      </div>

      {/* Type & Category */}
      <div className={COL_WIDTHS.type}>
        <div className="flex flex-col gap-1.5 items-start">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800">
            {getTypeIcon(loss.loss_type)}
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {getTypeLabel(loss.loss_type)}
            </span>
          </div>
          {loss.loss_category && (
            <span className="text-[10px] text-zinc-500 px-1">
              {getCategoryLabel(loss.loss_category)}
            </span>
          )}
        </div>
      </div>

      {/* Description & Location */}
      <div className={COL_WIDTHS.description}>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1" title={loss.loss_description}>
            {loss.loss_description || 'بدون وصف'}
          </p>
          {loss.location_description && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              {loss.location_description}
            </p>
          )}

          {loss._synced === false && (
            <span className="mt-1 w-fit text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              جاري المزامنة
            </span>
          )}
        </div>
      </div>

      {/* Items Count (New Separate Column) */}
      <div className={cn(COL_WIDTHS.items, "flex items-center justify-center")}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50">
          <Package className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-numeric">
            {loss.total_items_count || loss.items_count || 0}
          </span>
        </div>
      </div>

      {/* Cost Value */}
      <div className={cn(COL_WIDTHS.cost, "text-left")}>
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-numeric">
            {formatPrice(loss.total_cost_value || 0)}
          </span>
          <span className="text-[10px] text-zinc-400">التكلفة</span>
        </div>
      </div>

      {/* Status */}
      <div className={cn(COL_WIDTHS.status, "text-center")}>
        {getStatusBadge(loss.status)}
      </div>

      {/* Actions */}
      <div className={cn(COL_WIDTHS.actions, "flex items-center justify-end gap-1")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="h-8 w-8 p-0 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Eye className="w-4 h-4 text-zinc-500" />
        </Button>
        {loss.status === 'pending' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onProcess}
            className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 text-emerald-600"
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
        ) : (
          <div className="w-8" />
        )}
        {loss.status === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
LossRow.displayName = 'LossRow';

// ===============================================================================
// Main Component
// ===============================================================================

const LossDeclarations: React.FC<LossDeclarationsProps> = ({
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

  // PowerSync Reactive Hooks
  const reactiveStatus = statusFilter !== 'all' ? statusFilter as LossStatus : undefined;
  const {
    losses: rawLosses,
    isLoading: loading,
  } = useReactiveLosses({
    status: reactiveStatus,
    searchTerm: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    limit: 500
  });

  const { stats: reactiveStats, isLoading: statsLoading } = useReactiveLossStats();

  // Transform & Filter losses
  const losses = useMemo(() => {
    let filtered = rawLosses.map(l => ({
      id: l.id,
      loss_number: l.loss_number || '',
      loss_type: (l.loss_type as any) || 'other',
      loss_description: l.loss_description || '',
      incident_date: l.incident_date || l.created_at,
      status: l.status as any,
      total_cost_value: l.total_cost_value || 0,
      total_selling_value: l.total_selling_value || 0,
      total_items_count: l.total_items_count || 0,
      items_count: l.total_items_count || 0,
      reported_by: l.reported_by || '',
      notes: l.notes,
      organization_id: l.organization_id,
      created_at: l.created_at,
      updated_at: l.updated_at,
      _synced: true,
    } as Loss));

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(l => l.loss_type === typeFilter);
    }

    return filtered;
  }, [rawLosses, typeFilter]);

  // Pagination
  const totalLosses = losses.length;
  const totalPages = Math.ceil(totalLosses / pageSize);
  const paginatedLosses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return losses.slice(start, start + pageSize);
  }, [losses, currentPage, pageSize]);

  // Stats
  const stats = useMemo(() => ({
    total: reactiveStats.totalLosses,
    pending: reactiveStats.pendingCount,
    approved: reactiveStats.byStatus.approved.count,
    rejected: reactiveStats.byStatus.rejected.count,
    totalCostValue: reactiveStats.totalCostValue,
    totalSellingValue: reactiveStats.totalSellingValue,
  }), [reactiveStats]);

  // UI State
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState<Loss | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lossToDelete, setLossToDelete] = useState<Loss | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLossItems, setSelectedLossItems] = useState<LossItem[]>([]);
  const [loadingLossItems, setLoadingLossItems] = useState(false);

  // Create form hooks
  const {
    createForm,
    setCreateForm,
    resetCreateForm,
    updateLossItem,
    removeProductFromLoss
  } = useLossCreateForm();

  const {
    products,
    searchingProducts,
    productSearchQuery,
    setProductSearchQuery,
    selectedProduct,
    productVariants,
    loadingVariants,
    isVariantDialogOpen,
    setIsVariantDialogOpen,
    searchProducts,
    resetSelection: resetProductSelection,
    startVariantSelection
  } = useLossProductSearch();

  // Permissions
  const canManageLosses = perms.ready ? perms.anyOf(['manageInventory']) : false;
  const isUnauthorized = perms.ready && !canManageLosses;

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isOnline || !currentOrganization?.id) return;

    setIsSyncing(true);
    try {
      const syncResult = await syncPendingLossDeclarations();
      if (syncResult.success > 0) {
        toast.success(`تمت مزامنة ${syncResult.success} تصريح خسارة`);
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

  // Search products
  useEffect(() => {
    if (isUnauthorized) {
      resetProductSelection();
      return;
    }
    if (productSearchQuery) {
      const timeoutId = setTimeout(() => {
        searchProducts(productSearchQuery, currentOrganization?.id);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      resetProductSelection();
    }
  }, [productSearchQuery, isUnauthorized, resetProductSelection, searchProducts, currentOrganization?.id]);

  // Handle product selection
  const handleProductSelect = async (product: Product) => {
    if (product.has_colors || product.has_sizes) {
      await startVariantSelection(product);
    } else {
      addProductToLoss(product);
      resetProductSelection();
    }
  };

  // Add product to loss
  const addProductToLoss = (product: Product, variant?: ProductVariant) => {
    if (createForm.lossItems.find(item =>
      item.product_id === product.id &&
      item.color_id === variant?.color_id &&
      item.size_id === variant?.size_id
    )) {
      toast.error('هذا المنتج موجود بالفعل في قائمة الخسائر');
      return;
    }

    const currentStock = variant ? (variant.current_stock || 0) : (product.stock_quantity || 0);
    const initialQuantity = 1;

    if (currentStock <= 0) {
      toast.error('لا يوجد مخزون متاح لهذا المنتج');
      return;
    }

    const stockAfterLoss = Math.max(0, currentStock - initialQuantity);

    setCreateForm(prev => ({
      ...prev,
      lossItems: [
        ...prev.lossItems,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity_lost: initialQuantity,
          unit_cost: variant?.product_purchase_price || product.purchase_price,
          unit_selling_price: variant?.product_price || product.price,
          loss_condition: 'completely_damaged',
          stock_before_loss: currentStock,
          stock_after_loss: stockAfterLoss,
          color_id: variant?.color_id,
          size_id: variant?.size_id,
          color_name: variant?.color_name,
          size_name: variant?.size_name,
          variant_display_name: variant?.variant_display_name,
          variant_stock_before: variant?.current_stock || currentStock,
          variant_stock_after: variant?.current_stock ? Math.max(0, variant.current_stock - initialQuantity) : stockAfterLoss
        }
      ]
    }));

    resetProductSelection();
  };

  // Create loss declaration
  const createLossDeclaration = async () => {
    if (!user?.id || !currentOrganization?.id || createForm.lossItems.length === 0) {
      toast.error('يجب إضافة عنصر واحد على الأقل');
      return;
    }

    if (!createForm.lossDescription.trim()) {
      toast.error('يجب إدخال وصف الخسارة');
      return;
    }

    try {
      const { totalCostValue, totalSellingValue, totalItemsCount } = calculateLossTotals(
        createForm.lossItems.map(item => ({
          lost_quantity: item.quantity_lost,
          unit_cost_price: item.unit_cost,
          unit_selling_price: item.unit_selling_price,
          total_cost_value: item.quantity_lost * item.unit_cost,
          total_selling_value: item.quantity_lost * item.unit_selling_price
        } as any))
      );

      const lossNumber = `LOSS-${Date.now()}`;

      const lossData: Omit<LocalLossDeclaration, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'> = {
        loss_number: lossNumber,
        loss_type: convertLossType(createForm.lossType),
        loss_category: createForm.lossCategory,
        loss_description: createForm.lossDescription,
        incident_date: new Date(createForm.incidentDate).toISOString(),
        notes: createForm.notes || undefined,
        reported_by: user.id,
        organization_id: currentOrganization.id,
        status: 'pending',
        total_cost_value: totalCostValue,
        total_selling_value: totalSellingValue,
        total_items_count: totalItemsCount
      };

      const items = createForm.lossItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        lost_quantity: item.quantity_lost,
        unit_cost_price: item.unit_cost,
        unit_selling_price: item.unit_selling_price,
        total_cost_value: item.quantity_lost * item.unit_cost,
        total_selling_value: item.quantity_lost * item.unit_selling_price,
        loss_condition: item.loss_condition,
        loss_percentage: 100,
        stock_before_loss: item.stock_before_loss,
        stock_after_loss: item.stock_after_loss,
        inventory_adjusted: false,
        color_id: item.color_id,
        color_name: item.color_name,
        size_id: item.size_id,
        size_name: item.size_name
      } as Omit<LocalLossItem, 'id' | 'loss_id' | 'created_at' | 'synced'>));

      await createLocalLossDeclaration({ lossData, items });

      toast.success('تم إنشاء تصريح الخسارة بنجاح');
      setIsCreateDialogOpen(false);
      resetCreateForm();
      resetProductSelection();

      if (isOnline) {
        setTimeout(() => handleRefresh(), 1000);
      }
    } catch (error) {
      console.error('خطأ في إنشاء تصريح الخسارة:', error);
      toast.error('حدث خطأ في إنشاء تصريح الخسارة');
    }
  };

  // Process loss
  const processLoss = async (lossId: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;

    try {
      if (action === 'approve') {
        await approveLocalLossDeclaration(lossId, user.id);
        toast.success('تم اعتماد تصريح الخسارة');
      } else {
        await rejectLocalLossDeclaration(lossId);
        toast.success('تم رفض تصريح الخسارة');
      }

      setIsActionDialogOpen(false);

      if (isOnline) {
        setTimeout(() => handleRefresh(), 1000);
      }
    } catch (error) {
      console.error('خطأ في معالجة الخسارة:', error);
      toast.error('حدث خطأ في معالجة تصريح الخسارة');
    }
  };

  // Delete loss
  const deleteLoss = async (lossId: string) => {
    setIsDeleting(true);
    try {
      // Delete loss items first
      await (supabase as any).from('loss_items').delete().eq('loss_id', lossId);
      // Delete loss
      await (supabase as any).from('losses').delete().eq('id', lossId);

      toast.success('تم حذف تصريح الخسارة بنجاح');
      setIsDeleteDialogOpen(false);
      setLossToDelete(null);

      if (isOnline) {
        setTimeout(() => handleRefresh(), 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch loss items
  const fetchLossItems = async (lossId: string) => {
    setLoadingLossItems(true);
    try {
      const { data, error } = await (supabase as any)
        .from('loss_items')
        .select('*')
        .eq('loss_id', lossId);

      if (error) throw error;

      const formattedItems: LossItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity_lost: item.lost_quantity,
        unit_cost: item.unit_cost_price,
        unit_selling_price: item.unit_selling_price,
        total_cost_value: item.total_cost_value,
        total_selling_value: item.total_selling_value,
        loss_condition: item.loss_condition,
        color_name: item.color_name,
        size_name: item.size_name,
      }));

      setSelectedLossItems(formattedItems);
    } catch (error: any) {
      toast.error('حدث خطأ في جلب عناصر الخسارة');
      setSelectedLossItems([]);
    } finally {
      setLoadingLossItems(false);
    }
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
          ليس لديك الصلاحيات اللازمة للوصول إلى صفحة تصاريح الخسائر.
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
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">تصاريح الخسائر</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalLosses} تصريح خسارة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <span className="text-xs font-medium">تصريح جديد</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="إجمالي التصاريح"
          value={stats.total.toString()}
          subtitle="تصريح خسارة"
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
          title="معتمدة"
          value={stats.approved.toString()}
          subtitle="تم الاعتماد"
          icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
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
          title="قيمة التكلفة"
          value={formatPrice(stats.totalCostValue)}
          subtitle="إجمالي الخسائر"
          icon={<TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
          loading={statsLoading}
        />
        <StatCard
          title="قيمة البيع"
          value={formatPrice(stats.totalSellingValue)}
          subtitle="المبيعات المفقودة"
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
              placeholder="البحث برقم التصريح أو الوصف..."
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
              <SelectItem value="approved">معتمدة</SelectItem>
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
              <SelectItem value="damage">تلف</SelectItem>
              <SelectItem value="theft">سرقة</SelectItem>
              <SelectItem value="expiry">انتهاء صلاحية</SelectItem>
              <SelectItem value="fire_damage">حريق</SelectItem>
              <SelectItem value="water_damage">فيضان</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Losses Table */}
      <div className="mt-6">
        {/* Losses Table */}
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-sm text-zinc-500">جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : paginatedLosses.length > 0 ? (
          <>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              {/* Header */}
              <div className="flex items-center gap-4 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700">
                <span className={cn(COL_WIDTHS.lossNumber, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>رقم التصريح</span>
                <span className={cn(COL_WIDTHS.type, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>النوع</span>
                <span className={cn(COL_WIDTHS.description, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>الوصف / المنتجات</span>
                <span className={cn(COL_WIDTHS.items, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>عناصر</span>
                <span className={cn(COL_WIDTHS.cost, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-left")}>التكلفة</span>
                <span className={cn(COL_WIDTHS.status, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الحالة</span>
                <span className={cn(COL_WIDTHS.actions, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الإجراءات</span>
              </div>

              {/* Rows */}
              <div>
                {paginatedLosses.map((loss) => (
                  <LossRow
                    key={loss.id}
                    loss={loss}
                    onViewDetails={() => {
                      setSelectedLoss(loss);
                      fetchLossItems(loss.id);
                      setIsDetailsDialogOpen(true);
                    }}
                    onProcess={() => {
                      setSelectedLoss(loss);
                      setIsActionDialogOpen(true);
                    }}
                    onDelete={() => {
                      setLossToDelete(loss);
                      setIsDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1 mt-4">
                <p className="text-sm text-zinc-500">
                  <span className="font-numeric">{((currentPage - 1) * pageSize) + 1}</span>
                  <span className="mx-1">-</span>
                  <span className="font-numeric">{Math.min(currentPage * pageSize, totalLosses)}</span>
                  <span className="mx-1.5">من</span>
                  <span className="font-numeric font-medium text-zinc-700 dark:text-zinc-300">{totalLosses}</span>
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
              <AlertTriangle className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {debouncedSearch ? 'لا توجد نتائج للبحث' : 'لا توجد تصاريح خسائر'}
            </h3>
            <p className="text-sm text-zinc-500">
              {debouncedSearch
                ? 'جرب البحث باستخدام كلمات أخرى'
                : 'لم يتم تسجيل أي تصاريح خسائر بعد'}
            </p>
          </div>
        )}
      </div>

      {/* Create Loss Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-h-[85vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              إنشاء تصريح خسارة جديد
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              سجل خسارة في المخزون
            </p>
          </div>

          <div className="px-5 py-3 space-y-4">
            {/* Loss Type */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                نوع الخسارة <span className="text-orange-500">*</span>
              </p>
              <Select
                value={createForm.lossType}
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, lossType: value as any }))}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">تلف</SelectItem>
                  <SelectItem value="theft">سرقة</SelectItem>
                  <SelectItem value="expiry">انتهاء صلاحية</SelectItem>
                  <SelectItem value="fire">حريق</SelectItem>
                  <SelectItem value="flood">فيضان</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                وصف الخسارة <span className="text-orange-500">*</span>
              </p>
              <Textarea
                value={createForm.lossDescription}
                onChange={(e) => setCreateForm(prev => ({ ...prev, lossDescription: e.target.value }))}
                placeholder="اكتب وصفاً مختصراً للخسارة..."
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>

            {/* Date */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                تاريخ الحادث
              </p>
              <Input
                type="date"
                value={createForm.incidentDate}
                onChange={(e) => setCreateForm(prev => ({ ...prev, incidentDate: e.target.value }))}
                className="h-10 rounded-xl"
                dir="ltr"
              />
            </div>

            {/* Product Search */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                إضافة منتجات
              </p>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="ابحث عن منتج..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="pr-10 h-10 rounded-xl"
                />
              </div>

              {/* Search Results */}
              {searchingProducts ? (
                <div className="mt-2 flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                </div>
              ) : products.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-right"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{product.name}</p>
                        <p className="text-xs text-zinc-500">{product.sku} | المخزون: {product.stock_quantity}</p>
                      </div>
                      <Plus className="w-4 h-4 text-orange-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Products */}
            {createForm.lossItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                  المنتجات المضافة ({createForm.lossItems.length})
                </p>
                <div className="space-y-2">
                  {createForm.lossItems.map((item, index) => (
                    <div key={index} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.product_name}</p>
                          {item.variant_display_name && (
                            <p className="text-xs text-zinc-500">{item.variant_display_name}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductFromLoss(item.product_id)}
                          className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={item.stock_before_loss}
                          value={item.quantity_lost}
                          onChange={(e) => updateLossItem(item.product_id, 'quantity_lost', parseInt(e.target.value) || 1)}
                          className="w-20 h-8 rounded-lg text-center text-sm"
                        />
                        <span className="text-xs text-zinc-500">
                          من {item.stock_before_loss}
                        </span>
                        <span className="text-xs font-medium text-red-600 mr-auto font-numeric">
                          {formatPrice(item.quantity_lost * item.unit_cost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                ملاحظات (اختياري)
              </p>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
          </div>

          <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setIsCreateDialogOpen(false); resetCreateForm(); resetProductSelection(); }}
              className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
            >
              إلغاء
            </Button>
            <Button
              onClick={createLossDeclaration}
              disabled={createForm.lossItems.length === 0 || !createForm.lossDescription.trim()}
              className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
            >
              إنشاء التصريح
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              اختر المتغير
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedProduct?.name}
            </p>
          </div>

          <div className="px-5 py-3 max-h-[50vh] overflow-y-auto">
            {loadingVariants ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {productVariants.map((variant, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (selectedProduct) {
                        addProductToLoss(selectedProduct, variant);
                        setIsVariantDialogOpen(false);
                      }
                    }}
                    disabled={!variant.current_stock || variant.current_stock <= 0}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border-2 text-right transition-colors",
                      variant.current_stock && variant.current_stock > 0
                        ? "border-zinc-200 dark:border-zinc-700 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                        : "border-zinc-100 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {variant.variant_display_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        المخزون: {variant.current_stock || 0}
                      </p>
                    </div>
                    {variant.current_stock && variant.current_stock > 0 && (
                      <Plus className="w-4 h-4 text-orange-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loss Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-h-[85vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              تفاصيل تصريح الخسارة
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedLoss?.loss_number}
            </p>
          </div>

          {selectedLoss && (
            <div className="px-5 py-3 space-y-4">
              {/* Basic Info */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">النوع</span>
                  <span className="text-sm font-medium">
                    {selectedLoss.loss_type === 'damage' || selectedLoss.loss_type === 'damaged' ? 'تلف' :
                      selectedLoss.loss_type === 'theft' ? 'سرقة' :
                        selectedLoss.loss_type === 'expiry' || selectedLoss.loss_type === 'expired' ? 'انتهاء صلاحية' :
                          selectedLoss.loss_type === 'fire_damage' ? 'حريق' :
                            selectedLoss.loss_type === 'water_damage' ? 'فيضان' : 'أخرى'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">الوصف</span>
                  <span className="text-sm font-medium text-left max-w-[200px] truncate">
                    {selectedLoss.loss_description}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">عدد المنتجات</span>
                  <span className="text-sm font-medium">{selectedLoss.total_items_count || selectedLoss.items_count || 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-zinc-500">قيمة التكلفة</span>
                  <span className="text-sm font-bold text-red-600 font-numeric">{formatPrice(selectedLoss.total_cost_value || 0)}</span>
                </div>
              </div>

              {/* Loss Items */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                  المنتجات ({selectedLossItems.length})
                </p>
                {loadingLossItems ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedLossItems.map((item) => {
                      // تحديد الكمية والوحدة حسب نوع البيع
                      const sellingUnit = (item as any).selling_unit_type || 'piece';
                      let quantityDisplay = '';
                      let UnitIcon = Package;
                      let unitColorClass = 'text-zinc-600 dark:text-zinc-400';

                      switch (sellingUnit) {
                        case 'meter':
                          quantityDisplay = `${(item as any).meters_lost || item.quantity_lost} متر`;
                          UnitIcon = Ruler;
                          unitColorClass = 'text-purple-600 dark:text-purple-400';
                          break;
                        case 'weight':
                          quantityDisplay = `${(item as any).weight_lost || item.quantity_lost} ${(item as any).weight_unit || 'كجم'}`;
                          UnitIcon = Scale;
                          unitColorClass = 'text-emerald-600 dark:text-emerald-400';
                          break;
                        case 'box':
                          const boxQty = (item as any).boxes_lost || item.quantity_lost;
                          const unitsInfo = (item as any).units_per_box ? ` (${(item as any).units_per_box} وحدة)` : '';
                          quantityDisplay = `${boxQty} علبة${unitsInfo}`;
                          UnitIcon = Box;
                          unitColorClass = 'text-blue-600 dark:text-blue-400';
                          break;
                        case 'piece':
                        default:
                          quantityDisplay = `${item.quantity_lost} قطعة`;
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
                              {(item.color_name || item.size_name) && (
                                <p className="text-xs text-zinc-500">
                                  {[item.color_name, item.size_name].filter(Boolean).join(' - ')}
                                </p>
                              )}
                            </div>
                            <div className="text-left">
                              <p className={cn("text-sm font-medium flex items-center gap-1", unitColorClass)}>
                                <UnitIcon className="h-3.5 w-3.5" />
                                {quantityDisplay}
                              </p>
                              <p className="text-xs text-red-600 font-numeric">{formatPrice(item.total_cost_value || 0)}</p>
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
              معالجة تصريح الخسارة
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedLoss?.loss_number}
            </p>
          </div>

          {selectedLoss && (
            <div className="px-5 py-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                هل تريد اعتماد تصريح الخسارة هذا أم رفضه؟
              </p>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-4">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-zinc-500">قيمة التكلفة</span>
                  <span className="text-sm font-bold text-red-600 font-numeric">
                    {formatPrice(selectedLoss.total_cost_value || 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => processLoss(selectedLoss.id, 'approve')}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <CheckCircle className="h-4 w-4 ml-2" />
                  اعتماد
                </Button>
                <Button
                  onClick={() => processLoss(selectedLoss.id, 'reject')}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              حذف تصريح الخسارة
            </DialogTitle>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  هل أنت متأكد من حذف هذا التصريح؟
                </p>
                <p className="text-xs text-zinc-500">
                  {lossToDelete?.loss_number}
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              لا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setIsDeleteDialogOpen(false); setLossToDelete(null); }}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => lossToDelete && deleteLoss(lossToDelete.id)}
                disabled={isDeleting}
                variant="destructive"
                className="flex-1 h-10 rounded-xl"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  'حذف'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return renderWithLayout(mainContent);
};

export default LossDeclarations;
