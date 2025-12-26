import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { Loader2 } from "lucide-react";
import { OrdersDataProvider } from '@/context/OrdersDataContext';

// استيراد المكونات الجديدة
import OrdersLayout from "@/components/orders/OrdersLayout";
import OrdersHeader from "@/components/orders/OrdersHeader";
import OrdersStatsCards from "@/components/orders/OrdersStatsCards";
import OrdersSettings from "@/components/orders/OrdersSettings";

// استيراد الـ hooks المخصصة
import { useOrdersPermissions } from "@/hooks/useOrdersPermissions";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

import { useOptimizedOrdersData } from "@/hooks/useOptimizedOrdersData";
import { useOrderOperations } from "@/hooks/useOrdersData";
import { useOptimizedSharedStoreDataContext } from "@/context/OptimizedSharedStoreDataContext";
type FilterOrderStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
import { supabase } from "@/lib/supabase";
import { sendOrderToShippingProvider } from "@/utils/ecotrackShippingIntegration";
import { useEnabledShippingProviders } from "@/hooks/useEnabledShippingProviders";
import { 
  ORDER_STATUS_LABELS, 
  getOrderCustomerName,
  getTrackingField,
  SHIPPING_PROVIDER_NAMES,
  formatCurrency
} from "@/utils/ordersHelpers";
// استيراد دوال إدارة إعدادات المؤسسة
import { getOrganizationSettings, updateOrganizationSettings } from "@/lib/api/settings";
import type { OrganizationSettings } from "@/types/settings";

// Lazy load heavy components
const ResponsiveOrdersTable = lazy(() => import("@/components/orders/ResponsiveOrdersTable"));
const OrdersDashboard = lazy(() => import("@/components/orders/OrdersDashboard"));
const OrdersAdvancedFilters = lazy(() => import("@/components/orders/OrdersAdvancedFilters"));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Main component
const Orders = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // استخدام الـ hooks المخصصة
  const permissions = useOrdersPermissions();
  const {
    settings: organizationSettings,
    isLoading: loadingSettings,
    isSaving: updatingSettings,
  } = useOrganizationSettings({ organizationId: currentOrganization?.id });

  // Local state for auto deduct inventory
  const [autoDeductInventory, setAutoDeductInventory] = useState(false);

  // Handle auto deduct inventory toggle
  const handleToggleAutoDeductInventory = useCallback(async (enabled: boolean) => {
    setAutoDeductInventory(enabled);
    // You can add API call here if needed to save the setting
  }, []);

  // View preferences
  const [viewMode, setViewMode] = useState<'table' | 'mobile'>('table');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact', 
    'total', 'items', 'status', 'call_confirmation', 'shipping_provider', 
    'source', 'actions'
  ]);

  // Pagination settings
  const pageSize = 20;

  // Memoize hook options to prevent unnecessary re-renders
  const optimizedOrdersOptions = useMemo(() => ({
    pageSize: 20,
    enablePolling: false, // Disabled automatic polling
    pollingInterval: 60000, // Keep interval for manual refresh if needed
    enableCache: true,
    rpcOptions: {
      includeItems: false,   // لا نحتاج العناصر في العرض المختصر
      includeShared: false,  // نستخدم OptimizedSharedStoreDataContext
      includeCounts: true,   // الصفحة الأولى فقط؛ سيتم التحكم لاحقاً من الهوك إن لزم
    }
  }), []);

  // Use optimized hook for data management
  const {
    orders,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage: dataCurrentPage,
    orderCounts,
    orderStats,
    sharedData,
    metadata,
    filters,
    loadMore,
    applyFilters,
    updateFilters,
    goToPage,
    updateOrderLocally,
    refresh,
    getCacheStats,
    clearCache,
  } = useOptimizedOrdersData(optimizedOrdersOptions);

  const { updateOrderStatus, bulkUpdateOrderStatus } = useOrderOperations(updateOrderLocally);
  
  // استخدام البيانات المشتركة المحسنة
  const {
    shippingProviders,
    callConfirmationStatuses,
    provinces,
    municipalities,
    organizationSettings: sharedOrgSettings,
    isLoading: sharedDataLoading,
    error: sharedDataError,
  } = useOptimizedSharedStoreDataContext();

  // استخدم البيانات من OptimizedSharedStoreDataContext بدلاً من تكرارها من sharedData
  // هذا يمنع التكرار في استدعاءات البيانات
  const allShippingProviders = shippingProviders;
  const loadingProviders = loading || sharedDataLoading;
  const providersError = error || sharedDataError;

  // Check viewport size with throttling for responsive design
  useEffect(() => {
    let rafId: number | null = null;
    const onResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        setViewMode(window.innerWidth < 768 ? 'mobile' : 'table');
        rafId = null;
      });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Handle order status update with optimistic updates
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    // ✅ Optimistic update: حدّث الواجهة فوراً (ثم rollback عند الفشل)
    const previous = orders.find(o => o.id === orderId);
    const nowIso = new Date().toISOString();
    updateOrderLocally?.(orderId, { status: newStatus, updated_at: nowIso } as any);

    const result = await updateOrderStatus(orderId, newStatus);

    if (!result?.success && previous) {
      updateOrderLocally?.(orderId, {
        status: previous.status,
        updated_at: previous.updated_at,
      } as any);
    }
  }, [updateOrderStatus, orders, updateOrderLocally]);

  // Handle bulk status update
  const handleBulkUpdateStatus = useCallback(async (orderIds: string[], newStatus: string) => {
    const result = await bulkUpdateOrderStatus(orderIds, newStatus);
    // التحديث المحلي يتم تلقائياً داخل bulkUpdateOrderStatus
  }, [bulkUpdateOrderStatus]);

  // Handle sending order to shipping provider
  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string) => {
    if (!currentOrganization?.id || !permissions.update) return;
    
    const providerDisplayName = SHIPPING_PROVIDER_NAMES[providerCode] || providerCode;

    try {
      toast({
        title: "جاري الإرسال...",
        description: `جاري إرسال الطلب إلى ${providerDisplayName}`,
      });

      const result = await sendOrderToShippingProvider(
        orderId, 
        providerCode, 
        currentOrganization.id
      );

      if (result.success) {
        
        // تحديث البيانات محلياً بدلاً من إعادة الجلب
        if (updateOrderLocally && result.trackingNumber) {
          const updateData: any = {
            shipping_provider: providerCode,
            updated_at: new Date().toISOString()
          };

          // تحديث حقل التتبع المناسب حسب المزود
          if (providerCode === 'yalidine') {
            updateData.yalidine_tracking_id = result.trackingNumber;
          } else if (providerCode === 'zrexpress') {
            updateData.zrexpress_tracking_id = result.trackingNumber;
          } else if (providerCode === 'maystro_delivery') {
            updateData.maystro_tracking_id = result.trackingNumber;
          } else {
            // لجميع مزودي Ecotrack
            updateData.ecotrack_tracking_id = result.trackingNumber;
          }

          // تحديث tracking_info أيضاً لتتطابق مع RPC
          updateData.tracking_info = {
            yalidine_tracking_id: updateData.yalidine_tracking_id || null,
            zrexpress_tracking_id: updateData.zrexpress_tracking_id || null,
            ecotrack_tracking_id: updateData.ecotrack_tracking_id || null,
            maystro_tracking_id: updateData.maystro_tracking_id || null,
            tracking_data: null,
            last_status_update: null,
            delivered_at: null,
            current_location: null,
            estimated_delivery_date: null
          };

          updateOrderLocally(orderId, updateData);
          
        } else {
        }

        toast({
          title: "تم الإرسال بنجاح",
          description: `تم إرسال الطلب إلى ${providerDisplayName} برقم التتبع: ${result.trackingNumber}`,
          className: "bg-green-100 border-green-400 text-green-700",
        });
      } else {
        toast({
          variant: "destructive",
          title: "فشل في الإرسال",
          description: result.message || "حدث خطأ أثناء إرسال الطلب",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: `حدث خطأ أثناء محاولة إرسال الطلب إلى ${providerDisplayName}`,
      });
    }
  }, [currentOrganization?.id, permissions.update, toast, updateOrderLocally]);

  // Handle filter changes
  const handleFilterChange = useCallback(({ status, searchTerm, dateRange }: any) => {
    // applyFilters automatically resets to first page
    applyFilters({
      status: status || filters.status,
      searchTerm: searchTerm !== undefined ? searchTerm : filters.searchTerm,
      dateFrom: dateRange?.from || null,
      dateTo: dateRange?.to || null,
    });
  }, [applyFilters, filters]);

  // Handle page navigation with proper data fetching
  const handlePageChange = useCallback(async (page: number) => {
    if (page >= 1) {
      // goToPage uses 0-based indexing, so page - 1
      await goToPage(page - 1);
    }
  }, [goToPage]);

  // Memoized values using correct total count
  const totalPages = useMemo(() => {
    const totalItems = totalCount || 0;
    return Math.ceil(totalItems / pageSize);
  }, [totalCount, pageSize]);
  
  const hasPreviousPage = dataCurrentPage > 1;
  const hasNextPage = dataCurrentPage < totalPages;

  return (
    <OrdersLayout permissions={permissions} error={error}>
      {/* Header - Following Dashboard Design Pattern */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <OrdersHeader
            ordersCount={orders.length}
            onRefresh={() => {
              clearCache();
              refresh();
            }}
          />
          
          {/* إعدادات خصم المخزون */}
          <OrdersSettings
            autoDeductInventory={autoDeductInventory}
            loadingSettings={loadingSettings}
            updatingSettings={updatingSettings}
            onToggleAutoDeductInventory={handleToggleAutoDeductInventory}
          />
        </div>
        
        {/* Stats Grid - Using Component */}
        <OrdersStatsCards 
          orderStats={orderStats} 
          orderCounts={{
            pending: orderCounts.pending || 0,
            delivered: orderCounts.delivered || 0
          }} 
        />
      </div>

      {/* Enhanced Filters Section - Following Dashboard Pattern */}
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <Suspense fallback={<LoadingFallback />}>
          <OrdersAdvancedFilters
            orderCounts={orderCounts as any}
            onFilterChange={handleFilterChange}
            activeStatus={filters.status as any}
            setActiveStatus={(status: any) => {
              applyFilters({ status });
            }}
          />
        </Suspense>
      </div>

      {/* Main Orders Content */}
      <div className="space-y-4">
        {/* Orders Table/List */}
        <Suspense fallback={<LoadingFallback />}>
          {viewMode === 'mobile' ? (
            <OrdersTableMobile
              orders={orders}
              loading={loading}
              onUpdateStatus={handleUpdateStatus}
              onSendToProvider={handleSendToProvider}
              hasUpdatePermission={permissions.update}
              hasCancelPermission={permissions.cancel}
              onLoadMore={loadMore}
              hasMore={hasMore}
            />
          ) : (
            <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm">
              <OrdersTable
                orders={orders}
                loading={loading}
                onUpdateStatus={handleUpdateStatus}
                onUpdateCallConfirmation={async (orderId, statusId, notes, userId) => {
                  try {
                    // ✅ Optimistic update: حدّث الواجهة فوراً مع كائن الحالة (Badge يعتمد عليه)
                    const nowIso = new Date().toISOString();
                    const statusObj = (callConfirmationStatuses || []).find((s: any) => s.id === statusId) || null;
                    updateOrderLocally?.(orderId, {
                      call_confirmation_status_id: statusId,
                      call_confirmation_notes: notes,
                      call_confirmation_status: statusObj,
                      call_confirmation_updated_at: nowIso,
                      call_confirmation_updated_by: userId,
                      updated_at: nowIso,
                    } as any);

                    // Update in database only - no fetch required
                    const { error } = await supabase
                      .from('online_orders')
                      .update({
                        call_confirmation_status_id: statusId,
                        call_confirmation_notes: notes,
                        call_confirmation_updated_at: new Date().toISOString(),
                        call_confirmation_updated_by: userId,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', orderId)
                      .eq('organization_id', currentOrganization?.id);

                    if (error) throw error;

                    toast({
                      title: "تم التحديث",
                      description: "تم تحديث حالة تأكيد الاتصال بنجاح"
                    });
                  } catch (error) {
                    // Rollback optimistic update
                    const previous = orders.find(o => o.id === orderId) as any;
                    if (previous) {
                      updateOrderLocally?.(orderId, {
                        call_confirmation_status_id: previous.call_confirmation_status_id ?? null,
                        call_confirmation_notes: previous.call_confirmation_notes ?? null,
                        call_confirmation_status: previous.call_confirmation_status ?? null,
                        call_confirmation_updated_at: previous.call_confirmation_updated_at ?? null,
                        call_confirmation_updated_by: previous.call_confirmation_updated_by ?? null,
                        updated_at: previous.updated_at,
                      } as any);
                    }
                    toast({
                      variant: "destructive",
                      title: "خطأ في التحديث",
                      description: "حدث خطأ أثناء تحديث حالة تأكيد الاتصال"
                    });
                  }
                }}
                onSendToProvider={handleSendToProvider}
                onBulkUpdateStatus={handleBulkUpdateStatus}
                hasUpdatePermission={permissions.update}
                hasCancelPermission={permissions.cancel}
                visibleColumns={visibleColumns}
                currentUserId={user?.id}
                currentPage={dataCurrentPage}
                totalItems={totalCount ?? orders.length}
                pageSize={pageSize}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={handlePageChange}
                hasMoreOrders={hasMore}
                shippingProviders={allShippingProviders}
                onSearchTermChange={(q) => {
                  applyFilters({ searchTerm: q });
                }}
              />
            </div>
          )}
        </Suspense>
      </div>
    </OrdersLayout>
  );
};

// Export with provider
const OrdersWithProvider = () => {
  return (
    <OrdersDataProvider>
      <Orders />
    </OrdersDataProvider>
  );
};

export default OrdersWithProvider;
