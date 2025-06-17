import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, RefreshCw, Download, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Layout
import Layout from '@/components/Layout';

// Performance Monitor (Development only)
const PerformanceMonitor = lazy(() => import('../components/debug/PerformanceMonitor').catch(() => ({ default: () => null })));

// Lazy load heavy components
const POSOrderStats = lazy(() => import('../components/pos-orders/POSOrderStats'));
const POSOrderFilters = lazy(() => import('../components/pos-orders/POSOrderFilters'));
const POSOrdersTable = lazy(() => import('../components/pos-orders/POSOrdersTable'));
const POSOrderDetails = lazy(() => import('../components/pos-orders/POSOrderDetails'));
const POSOrderActions = lazy(() => import('../components/pos-orders/POSOrderActions'));

// Services and types
import { 
  POSOrdersService,
  type POSOrderWithDetails,
  type POSOrderFilters as FilterType,
  type POSOrderStats as StatsType
} from '@/api/posOrdersService';

// Hooks
import { useOrganization } from '@/hooks/useOrganization';
import { useTitle } from '@/hooks/useTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptimizedQuery, triggerDataInvalidation } from '@/hooks/useOptimizedQuery';
import { optimizedSupabase } from '@/lib/supabase/OptimizedSupabaseClient';

// Constants
const ITEMS_PER_PAGE = 20;
const STATS_REFETCH_INTERVAL = 60000; // 1 minute
const ORDERS_REFETCH_INTERVAL = 30000; // 30 seconds

// Component Loader
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Error Component
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
    <CardContent className="flex flex-col items-center justify-center py-12">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2 text-red-900 dark:text-red-100">حدث خطأ</h3>
      <p className="text-sm text-red-700 dark:text-red-300 text-center mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="text-red-700 border-red-300">
        <RefreshCw className="h-4 w-4 mr-2" />
        إعادة المحاولة
      </Button>
    </CardContent>
  </Card>
);

// No Organization Component
const NoOrganization = () => (
  <div className="container mx-auto p-6">
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">لم يتم تحديد المؤسسة</h3>
        <p className="text-sm text-muted-foreground text-center">
          يرجى تسجيل الدخول أو اختيار مؤسسة صالحة للمتابعة.
        </p>
      </CardContent>
    </Card>
  </div>
);

export const POSOrdersOptimized: React.FC = () => {
  useTitle('طلبيات نقطة البيع');
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const posOrdersService = useMemo(() => POSOrdersService.getInstance(), []);

  // State management
  const [filters, setFilters] = React.useState<FilterType>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedOrder, setSelectedOrder] = React.useState<POSOrderWithDetails | null>(null);
  const [showOrderDetails, setShowOrderDetails] = React.useState(false);
  const [showOrderActions, setShowOrderActions] = React.useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(filters.search || '', 500);

  // Memoized filters with debounced search
  const memoizedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch
  }), [filters, debouncedSearch]);

  // Prefetch common data on mount
  React.useEffect(() => {
    if (organization?.id) {
      optimizedSupabase.prefetchCommonData(organization.id);
    }
  }, [organization?.id]);

  // Fetch stats with optimized query
  const { 
    data: stats, 
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useOptimizedQuery(
    ['posOrderStats', organization?.id],
    () => posOrdersService.getPOSOrderStats(organization!.id),
    {
      enabled: !!organization?.id,
      refetchInterval: STATS_REFETCH_INTERVAL,
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      invalidateOn: ['orders']
    }
  );

  // Fetch orders with optimized query
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders
  } = useOptimizedQuery(
    ['posOrders', organization?.id, memoizedFilters, currentPage],
    () => posOrdersService.getPOSOrders(
      organization!.id,
      memoizedFilters,
      currentPage,
      ITEMS_PER_PAGE
    ),
    {
      enabled: !!organization?.id,
      refetchInterval: ORDERS_REFETCH_INTERVAL,
      staleTime: 15000,
      gcTime: 5 * 60 * 1000,
      keepPreviousData: true,
      invalidateOn: ['orders', 'order_items']
    }
  );

  // Fetch employees with optimized query
  const { data: employees = [] } = useOptimizedQuery(
    ['posEmployees', organization?.id],
    () => posOrdersService.getEmployeesForFilter(organization!.id),
    {
      enabled: !!organization?.id,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      invalidateOn: ['users']
    }
  );

  // Handlers with useCallback
  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRefresh = useCallback(() => {
    Promise.all([
      refetchStats(),
      refetchOrders()
    ]);
  }, [refetchStats, refetchOrders]);

  const handleOrderView = useCallback((order: POSOrderWithDetails) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    setShowOrderActions(false);
  }, []);

  const handleOrderEdit = useCallback((order: POSOrderWithDetails) => {
    setSelectedOrder(order);
    setShowOrderActions(true);
    setShowOrderDetails(false);
  }, []);

  const handleOrderDelete = useCallback(async (order: POSOrderWithDetails) => {
    try {
      const success = await posOrdersService.deleteOrder(order.id);
      if (success) {
        toast.success('تم حذف الطلبية بنجاح');
        handleRefresh();
      } else {
        toast.error('فشل في حذف الطلبية');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الطلبية');
    }
  }, [posOrdersService, handleRefresh]);

  const handleOrderPrint = useCallback((order: POSOrderWithDetails) => {
    // TODO: Implement print functionality
    toast.success('تم إرسال الطلبية للطباعة');
  }, []);

  const handleStatusUpdate = useCallback(async (orderId: string, status: string, notes?: string) => {
    try {
      const success = await posOrdersService.updateOrderStatus(orderId, status, notes);
      if (success) {
        toast.success('تم تحديث حالة الطلبية بنجاح');
        // Trigger data invalidation
        triggerDataInvalidation('orders', organization!.id);
        return true;
      } else {
        toast.error('فشل في تحديث حالة الطلبية');
        return false;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الطلبية');
      return false;
    }
  }, [posOrdersService, queryClient]);

  const handlePaymentUpdate = useCallback(async (
    orderId: string, 
    paymentStatus: string, 
    amountPaid?: number, 
    paymentMethod?: string
  ) => {
    try {
      const success = await posOrdersService.updatePaymentStatus(
        orderId, 
        paymentStatus, 
        amountPaid, 
        paymentMethod
      );
      if (success) {
        toast.success('تم تحديث معلومات الدفع بنجاح');
        triggerDataInvalidation('orders', organization!.id);
        return true;
      } else {
        toast.error('فشل في تحديث معلومات الدفع');
        return false;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الدفع');
      return false;
    }
  }, [posOrdersService, queryClient]);

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    toast.info('ميزة التصدير قيد التطوير');
  }, []);

  const closeDialogs = useCallback(() => {
    setShowOrderDetails(false);
    setShowOrderActions(false);
    setSelectedOrder(null);
  }, []);

  // Memoized values
  const orders = useMemo(() => ordersData?.orders || [], [ordersData]);
  const totalItems = useMemo(() => ordersData?.total || 0, [ordersData]);
  const totalPages = useMemo(() => Math.ceil(totalItems / ITEMS_PER_PAGE), [totalItems]);

  // Early return for no organization
  if (!organization?.id) {
    return <NoOrganization />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              طلبيات نقطة البيع
            </h1>
            <p className="text-muted-foreground mt-2">
              إدارة ومتابعة جميع طلبيات نقطة البيع في مؤسستك
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={ordersLoading || statsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>

            <Button
              size="sm"
              onClick={() => toast.info('إنشاء طلبية جديدة قيد التطوير')}
            >
              <Plus className="h-4 w-4 mr-2" />
              طلبية جديدة
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <Suspense fallback={<ComponentLoader />}>
          <POSOrderStats
            stats={stats || null}
            loading={statsLoading}
            error={statsError ? 'فشل في تحميل الإحصائيات' : null}
          />
        </Suspense>

        {/* Filters Section */}
        <Suspense fallback={<ComponentLoader />}>
          <POSOrderFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onRefresh={handleRefresh}
            onExport={handleExport}
            loading={ordersLoading}
            employees={employees}
          />
        </Suspense>

        {/* Orders Table */}
        <Suspense fallback={<ComponentLoader />}>
          {ordersError ? (
            <ErrorState 
              message="فشل في تحميل الطلبيات. يرجى المحاولة مرة أخرى."
              onRetry={refetchOrders}
            />
          ) : (
            <POSOrdersTable
              orders={orders}
              loading={ordersLoading}
              error={null}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
              onOrderView={handleOrderView}
              onOrderEdit={handleOrderEdit}
              onOrderDelete={handleOrderDelete}
              onOrderPrint={handleOrderPrint}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </Suspense>

        {/* Order Details Dialog */}
        <Suspense fallback={<ComponentLoader />}>
          <POSOrderDetails
            order={selectedOrder}
            open={showOrderDetails}
            onClose={closeDialogs}
            onPrint={handleOrderPrint}
            onEdit={handleOrderEdit}
          />
        </Suspense>

        {/* Order Actions Dialog */}
        {showOrderActions && selectedOrder && (
          <Suspense fallback={<ComponentLoader />}>
            <POSOrderActions
              order={selectedOrder}
              open={showOrderActions}
              onClose={closeDialogs}
              onStatusUpdate={handleStatusUpdate}
              onPaymentUpdate={handlePaymentUpdate}
              onDelete={async (orderId) => {
                const success = await posOrdersService.deleteOrder(orderId);
                if (success) {
                  closeDialogs();
                  handleRefresh();
                }
                return success;
              }}
              onPrint={handleOrderPrint}
              onRefresh={handleRefresh}
            />
          </Suspense>
        )}

        {/* Summary Card */}
        {orders.length > 0 && !ordersLoading && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      تحليل سريع
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      عدد الطلبيات المعروضة: {orders.length} من أصل {totalItems}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                  صفحة {currentPage} من {totalPages}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Monitor (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <PerformanceMonitor />
        </Suspense>
      )}
    </Layout>
  );
};

export default POSOrdersOptimized;
