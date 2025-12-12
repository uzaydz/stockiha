/**
 * CustomerDebts - صفحة إدارة ديون العملاء
 * ============================================================
 * Apple-Inspired Design - Same as Customers page
 * Uses PowerSync Reactive Hooks for real-time updates
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { hasPermissions } from '@/lib/api/userPermissionsUnified';
import {
  AlertTriangle,
  Plus,
  ChevronRight,
  ChevronLeft,
  Search,
  Wallet,
  Users,
  FileText,
  TrendingUp,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  Package,
  CreditCard,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';

// مكونات الديون
import DebtPaymentModal from '@/components/debts/DebtPaymentModal';
import AddDebtModal from '@/components/debts/AddDebtModal';

// 📖 دليل استخدام المديونيات
import CustomerDebtsUserGuide, { CustomerDebtsHelpButton } from '@/components/debts/CustomerDebtsUserGuide';

// استيراد واجهة الـ API
import { DebtsData, DebtOrder } from '@/lib/api/debts';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ⚡ PowerSync Reactive Hooks
import {
  usePaginatedCustomerDebts,
  useReactiveDebtsGlobalStats,
  useCustomerOrdersDebts,
} from '@/hooks/powersync';

// ===============================================================================
// Types
// ===============================================================================

interface CustomerDebtsProps extends POSSharedLayoutControls {}

interface CustomerDebt {
  customerId: string;
  customerName: string;
  totalDebt: number;
  ordersCount: number;
  orders: DebtOrder[];
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
// Debt Row Component
// ===============================================================================

interface DebtRowProps {
  customer: CustomerDebt;
  isExpanded: boolean;
  onToggle: () => void;
  onPaymentClick: (order: DebtOrder) => void;
  canRecordPayment: boolean;
  isLoadingOrders: boolean;
}

// Column widths for consistency
const COL_WIDTHS = {
  expand: 'w-12 shrink-0',
  customer: 'flex-1 min-w-[120px]',
  orders: 'w-24 shrink-0',
  debt: 'w-28 shrink-0',
  status: 'w-24 shrink-0',
  actions: 'w-20 shrink-0',
};

const DebtRow = React.memo<DebtRowProps>(({
  customer,
  isExpanded,
  onToggle,
  onPaymentClick,
  canRecordPayment,
  isLoadingOrders,
}) => {
  return (
    <>
      {/* Main Row */}
      <div
        className={cn(
          "group flex items-center gap-2 px-4 py-3",
          "border-b border-zinc-100 dark:border-zinc-800/50",
          "transition-colors duration-150",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
          isExpanded && "bg-zinc-50 dark:bg-zinc-800/40"
        )}
      >
        {/* Expand Button */}
        <div className={COL_WIDTHS.expand}>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        </div>

        {/* Customer Name */}
        <div className={COL_WIDTHS.customer}>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {customer.customerName}
          </p>
        </div>

        {/* Orders Count */}
        <div className={cn(COL_WIDTHS.orders, "text-center")}>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {customer.ordersCount}
          </p>
        </div>

        {/* Total Debt */}
        <div className={cn(COL_WIDTHS.debt, "text-left")}>
          <p className="text-sm font-bold text-red-600 dark:text-red-400 font-numeric">
            {formatPrice(customer.totalDebt)}
          </p>
        </div>

        {/* Status Badge */}
        <div className={cn(COL_WIDTHS.status, "text-center")}>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            مديون
          </span>
        </div>

        {/* Action Button */}
        <div className={cn(COL_WIDTHS.actions, "text-center")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 px-2.5 rounded-lg text-xs gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            {isExpanded ? 'إخفاء' : 'عرض'}
          </Button>
        </div>
      </div>

      {/* Expanded Orders */}
      {isExpanded && (
        <div className="bg-zinc-50 dark:bg-zinc-800/20 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="p-4">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              طلبات {customer.customerName}
              {isLoadingOrders && (
                <span className="text-zinc-400">(جاري التحميل...)</span>
              )}
            </p>

            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            ) : customer.orders.length === 0 ? (
              <div className="text-center py-8 text-sm text-zinc-500">
                لا توجد طلبات مع ديون لهذا العميل
              </div>
            ) : (
              <div className="space-y-2">
                {customer.orders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {order.orderNumber}
                          </p>
                          {order._synced === false && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                              غير متزامن
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {new Date(order.date).toLocaleDateString('ar-DZ')} • {order.employee}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-zinc-400">الإجمالي</p>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-numeric">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-zinc-400">المدفوع</p>
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-numeric">
                            {formatPrice(order.amountPaid)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-zinc-400">المتبقي</p>
                          <p className="text-sm font-bold text-red-600 dark:text-red-400 font-numeric">
                            {formatPrice(order.remainingAmount)}
                          </p>
                        </div>

                        {canRecordPayment && (
                          <Button
                            size="sm"
                            onClick={() => onPaymentClick(order)}
                            className="h-8 px-3 rounded-lg text-xs gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            دفع
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
DebtRow.displayName = 'DebtRow';

// ===============================================================================
// Main Component
// ===============================================================================

const CustomerDebts: React.FC<CustomerDebtsProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { user, userProfile } = useAuth();
  const { isOnline } = useNetworkStatus();
  const perms = usePermissions();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ⚡ PowerSync Reactive Hooks
  const {
    customers,
    isLoading: loadingCustomers,
    pagination,
    goToPage,
    nextPage,
    prevPage
  } = usePaginatedCustomerDebts({
    pageSize: 10,
    searchQuery: debouncedSearch
  });

  const { stats: globalStats, isLoading: loadingStats } = useReactiveDebtsGlobalStats();

  const isLoading = loadingCustomers || loadingStats;

  // Expanded customer for lazy loading orders
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const { orders: customerOrders, isLoading: loadingOrders } = useCustomerOrdersDebts(expandedCustomerId);

  // Transform data
  const debtsData = useMemo<DebtsData | null>(() => {
    if (customers.length === 0 && !isLoading) {
      return {
        totalDebts: 0,
        totalPartialPayments: 0,
        debtsByCustomer: [],
        customerDebts: []
      };
    }

    return {
      totalDebts: globalStats.totalDebts,
      totalPartialPayments: globalStats.totalOrders,
      debtsByCustomer: customers.map(d => ({
        customerId: d.customerId,
        customerName: d.customerName,
        totalDebts: d.totalDebts,
        ordersCount: d.ordersCount
      })),
      customerDebts: customers.map(c => ({
        customerId: c.customerId,
        customerName: c.customerName,
        totalDebt: c.totalDebts,
        ordersCount: c.ordersCount,
        orders: c.customerId === expandedCustomerId ? customerOrders : []
      }))
    };
  }, [customers, globalStats, isLoading, expandedCustomerId, customerOrders]);

  // UI State
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasPaymentPermission, setHasPaymentPermission] = useState(false);
  const [hasAddDebtPermission, setHasAddDebtPermission] = useState(false);

  // Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [addDebtModalOpen, setAddDebtModalOpen] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);

  // Stats
  const customersWithDebts = debtsData?.customerDebts?.length || 0;
  const averageDebt = customersWithDebts > 0 ? (globalStats.totalDebts / customersWithDebts) : 0;

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isOnline || !currentOrganization?.id) return;

    setIsSyncing(true);
    try {
      await powerSyncService.forceSync();
      toast.success('تمت مزامنة البيانات بنجاح');
    } catch (err) {
      console.warn('[CustomerDebts] forceSync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, currentOrganization?.id]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh]);

  useEffect(() => {
    if (!onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: isLoading || isSyncing,
      connectionStatus: !isOnline ? 'disconnected' : error ? 'reconnecting' : 'connected'
    });
  }, [onLayoutStateChange, isLoading, isSyncing, error, isOnline]);

  // Permission check
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!user) {
          setHasViewPermission(false);
          setHasPaymentPermission(false);
          setHasAddDebtPermission(false);
          setPermissionsChecked(true);
          return;
        }

        const view = perms.ready ? perms.anyOf(['viewDebts', 'viewFinancialReports']) : false;
        const record = perms.ready ? perms.has('recordDebtPayments') : false;

        if (perms.ready) {
          setHasViewPermission(view);
          setHasPaymentPermission(record);
          setHasAddDebtPermission(record);
          setPermissionsChecked(true);
          return;
        }

        const permissionsResult = await hasPermissions(['viewDebts', 'recordDebtPayments'], user.id);
        setHasViewPermission(!!permissionsResult.viewDebts);
        setHasPaymentPermission(!!permissionsResult.recordDebtPayments);
        setHasAddDebtPermission(!!permissionsResult.recordDebtPayments);
        setPermissionsChecked(true);
      } catch {
        setHasViewPermission(false);
        setHasPaymentPermission(false);
        setHasAddDebtPermission(false);
        setPermissionsChecked(true);
      }
    };

    checkPermissions();
  }, [user, userProfile, perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  // Handlers
  const handlePaymentClick = (debt: any) => {
    if (!hasPaymentPermission) {
      toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
      return;
    }
    setSelectedDebt(debt);
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (paymentData: {
    orderId: string;
    amountPaid: number;
    isFullPayment: boolean;
  }) => {
    try {
      if (!hasPaymentPermission) {
        toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
        return;
      }

      unifiedOrderService.setOrganizationId(currentOrganization?.id || '');
      await unifiedOrderService.updatePayment(
        paymentData.orderId,
        paymentData.amountPaid,
        paymentData.isFullPayment ? 'paid' : 'partial'
      );

      toast.success('تم تسجيل الدفع بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
      setPaymentModalOpen(false);

      if (isOnline) {
        setTimeout(() => handleRefresh(), 1000);
      }
    } catch (err) {
      console.error('خطأ في تسجيل الدفع:', err);
      toast.error('فشل في تسجيل الدفع');
    }
  };

  const handleDebtAdded = () => {
    // ⚡ PowerSync useQuery يتحدث تلقائياً عند تغير البيانات المحلية
    // لكن نضيف refresh للتأكد من تحديث الـ UI
    console.log('[CustomerDebts] Debt added, triggering UI update...');

    // Force state update to trigger re-render
    setExpandedCustomerId(null);

    if (isOnline) {
      // في حالة الاتصال، نقوم بالمزامنة مع السيرفر
      setTimeout(() => handleRefresh(), 500);
    }
  };

  const toggleCustomerExpand = (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customerId);
    }
  };

  // Layout wrapper
  const renderWithLayout = (children: React.ReactNode) => {
    if (!useStandaloneLayout) return children;

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        connectionStatus={error ? 'disconnected' : 'connected'}
      >
        {children}
      </POSPureLayout>
    );
  };

  // Loading state
  if (!permissionsChecked) {
    return renderWithLayout(
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // No permission
  if (!hasViewPermission) {
    return renderWithLayout(
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          غير مصرح
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-sm">
          ليس لديك الصلاحيات اللازمة للوصول إلى صفحة الديون.
          يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة.
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
            <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">ديون العملاء</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {pagination.totalCustomers} عميل مديون
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* زر دليل الاستخدام */}
          <CustomerDebtsHelpButton onClick={() => setShowUserGuide(true)} />

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isSyncing || !isOnline}
            className="h-9 w-9 rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>

          {/* Add Debt Button */}
          {hasAddDebtPermission && (
            <Button
              onClick={() => setAddDebtModalOpen(true)}
              size="sm"
              className="h-9 px-3 rounded-xl gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-medium">إضافة دين</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="إجمالي الديون"
          value={formatPrice(globalStats.totalDebts)}
          subtitle="المبالغ المستحقة"
          icon={<CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950/50"
          loading={isLoading}
        />
        <StatCard
          title="عدد الطلبات"
          value={globalStats.totalOrders.toString()}
          subtitle="طلبات غير مسددة"
          icon={<FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-50 dark:bg-orange-950/50"
          loading={isLoading}
        />
        <StatCard
          title="العملاء المدينين"
          value={customersWithDebts.toString()}
          subtitle="عميل لديه دين"
          icon={<Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          loading={isLoading}
        />
        <StatCard
          title="متوسط الدين"
          value={formatPrice(averageDebt)}
          subtitle="لكل عميل"
          icon={<TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
          loading={isLoading}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="ابحث عن عميل بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
          />
        </div>
      </div>

      {/* Debts Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-sm text-zinc-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      ) : debtsData && debtsData.customerDebts.length > 0 ? (
        <>
          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700">
              <div className={COL_WIDTHS.expand}></div>
              <span className={cn(COL_WIDTHS.customer, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400")}>العميل</span>
              <span className={cn(COL_WIDTHS.orders, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الطلبات</span>
              <span className={cn(COL_WIDTHS.debt, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-left")}>الدين</span>
              <span className={cn(COL_WIDTHS.status, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الحالة</span>
              <span className={cn(COL_WIDTHS.actions, "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center")}>الإجراءات</span>
            </div>

            {/* Rows */}
            <div>
              {debtsData.customerDebts.map((customer) => (
                <DebtRow
                  key={customer.customerId}
                  customer={customer}
                  isExpanded={expandedCustomerId === customer.customerId}
                  onToggle={() => toggleCustomerExpand(customer.customerId)}
                  onPaymentClick={handlePaymentClick}
                  canRecordPayment={hasPaymentPermission}
                  isLoadingOrders={loadingOrders && expandedCustomerId === customer.customerId}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-zinc-500">
                <span className="font-numeric">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span>
                <span className="mx-1">-</span>
                <span className="font-numeric">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCustomers)}</span>
                <span className="mx-1.5">من</span>
                <span className="font-numeric font-medium text-zinc-700 dark:text-zinc-300">{pagination.totalCustomers}</span>
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={prevPage}
                  disabled={!pagination.hasPrevPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let page: number;
                    if (pagination.totalPages <= 5) page = i + 1;
                    else if (pagination.currentPage <= 3) page = i + 1;
                    else if (pagination.currentPage >= pagination.totalPages - 2) page = pagination.totalPages - 4 + i;
                    else page = pagination.currentPage - 2 + i;

                    return (
                      <Button
                        key={page}
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-xl text-sm font-medium font-numeric",
                          pagination.currentPage === page
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        onClick={() => goToPage(page)}
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
                  onClick={nextPage}
                  disabled={!pagination.hasNextPage}
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
            <Wallet className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {debouncedSearch ? 'لا توجد نتائج للبحث' : 'لا توجد ديون مسجلة'}
          </h3>
          <p className="text-sm text-zinc-500">
            {debouncedSearch
              ? 'جرب البحث باستخدام كلمات أخرى'
              : 'جميع العملاء قاموا بسداد مستحقاتهم'}
          </p>
        </div>
      )}

      {/* Payment Modal */}
      {selectedDebt && (
        <DebtPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          debt={selectedDebt}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* Add Debt Modal */}
      <AddDebtModal
        isOpen={addDebtModalOpen}
        onOpenChange={setAddDebtModalOpen}
        onDebtAdded={handleDebtAdded}
      />

      {/* 📖 دليل استخدام المديونيات */}
      <CustomerDebtsUserGuide
        open={showUserGuide}
        onOpenChange={setShowUserGuide}
      />
    </div>
  );

  return renderWithLayout(mainContent);
};

export default CustomerDebts;
