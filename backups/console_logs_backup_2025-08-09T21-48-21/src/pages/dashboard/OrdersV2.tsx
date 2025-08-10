import React, { lazy, Suspense, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Loader2 } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import OrdersHeader from '@/components/orders/OrdersHeader';
import OrdersSettings from '@/components/orders/OrdersSettings';
import OrdersStatsCards from '@/components/orders/OrdersStatsCards';
import OrdersAdvancedFilters from '@/components/orders/OrdersAdvancedFilters';
import { useOptimizedOrdersData } from '@/hooks/useOptimizedOrdersData';

const ResponsiveOrdersTable = lazy(() => import('@/components/orders/ResponsiveOrdersTable'));

const Loading = () => (
  <div className="flex items-center justify-center h-40">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const OrdersV2: React.FC = () => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  // تهيئة خيارات الهوك: استدعاء واحد (يشمل البيانات المشتركة والعدّ) بدون العناصر التفصيلية
  const hookOptions = useMemo(() => ({
    pageSize: 20,
    enablePolling: false,
    enableCache: true,
    rpcOptions: {
      // لا تجلب عناصر الطلب داخل القائمة لتخفيف الحمولة؛ سنجلبها عند فتح التفاصيل فقط
      includeItems: false,
      includeShared: true,
      includeCounts: true,
      // استخدم Pagination من الخادم بدل fetchAllOnce لتجنب تحميل ضخم للذاكرة
      fetchAllOnce: false,
    },
  }), []);

  const {
    orders,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    orderCounts,
    orderStats,
    sharedData,
    metadata,
    filters,
    loadMore,
    applyFilters,
    goToPage,
    updateOrderLocally,
    refresh,
    pageSize,
  } = useOptimizedOrdersData(hookOptions);

  // حالة واجهة لزر خصم المخزون التلقائي (نقرأها من sharedData.organizationSettings إن وُجد)
  const autoDeductInventoryEnabled = !!(sharedData as any)?.organizationSettings?.auto_deduct_inventory;
  const [autoDeductInventory, setAutoDeductInventory] = useState<boolean>(autoDeductInventoryEnabled);
  useEffect(() => {
    setAutoDeductInventory(!!(sharedData as any)?.organizationSettings?.auto_deduct_inventory);
  }, [sharedData]);

  const [visibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact',
    'total', 'status', 'call_confirmation', 'shipping_provider' // إعادة عمود مزود الشحن فقط للعرض
  ]);

  // ===============================
  // Debounced, optimistic updates
  // ===============================
  const callConfirmTimeoutsRef = useRef<Map<string, number>>(new Map());
  const callConfirmPendingRef = useRef<Map<string, { statusId: number; notes?: string; userId?: string }>>(new Map());

  const statusTimeoutsRef = useRef<Map<string, number>>(new Map());
  const statusPendingRef = useRef<Map<string, { status: string }>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      callConfirmTimeoutsRef.current.forEach((id) => clearTimeout(id));
      statusTimeoutsRef.current.forEach((id) => clearTimeout(id));
      callConfirmTimeoutsRef.current.clear();
      statusTimeoutsRef.current.clear();
      callConfirmPendingRef.current.clear();
      statusPendingRef.current.clear();
    };
  }, []);

  // تحديث حالة الطلب
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    // Optimistic update immediately
    updateOrderLocally(orderId, { status: newStatus, updated_at: new Date().toISOString() } as any);

    // Debounce network call per order
    const previousTimeout = statusTimeoutsRef.current.get(orderId);
    if (previousTimeout) clearTimeout(previousTimeout);

    statusPendingRef.current.set(orderId, { status: newStatus });

    const timeoutId = window.setTimeout(async () => {
      const payload = statusPendingRef.current.get(orderId);
      statusPendingRef.current.delete(orderId);
      statusTimeoutsRef.current.delete(orderId);
      if (!payload) return;
      try {
        const { error: updateError } = await supabase
          .from('online_orders')
          .update({ status: payload.status, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('organization_id', currentOrganization?.id);
        if (updateError) throw updateError;
      } catch (e) {
        toast({ variant: 'destructive', title: 'فشل حفظ الحالة', description: 'سنعيد المحاولة لاحقاً' });
      }
    }, 600);

    statusTimeoutsRef.current.set(orderId, timeoutId);
  }, [currentOrganization?.id, toast, updateOrderLocally]);

  // تحديث حالة تأكيد الاتصال
  const handleUpdateCallConfirmation = useCallback(async (
    orderId: string,
    statusId: number,
    notes?: string,
    userId?: string,
  ) => {
    // Optimistic update immediately
    updateOrderLocally(orderId, {
      call_confirmation_status_id: statusId,
      call_confirmation_notes: notes ?? null,
      call_confirmation_updated_at: new Date().toISOString(),
      call_confirmation_updated_by: userId ?? user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as any);

    // Debounce network call per order
    const previousTimeout = callConfirmTimeoutsRef.current.get(orderId);
    if (previousTimeout) clearTimeout(previousTimeout);

    callConfirmPendingRef.current.set(orderId, { statusId, notes, userId });

    const timeoutId = window.setTimeout(async () => {
      const payload = callConfirmPendingRef.current.get(orderId);
      callConfirmPendingRef.current.delete(orderId);
      callConfirmTimeoutsRef.current.delete(orderId);
      if (!payload) return;
      try {
        const { error: updateError } = await supabase
          .from('online_orders')
          .update({
            call_confirmation_status_id: payload.statusId,
            call_confirmation_notes: payload.notes ?? null,
            call_confirmation_updated_at: new Date().toISOString(),
            call_confirmation_updated_by: payload.userId ?? user?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .eq('organization_id', currentOrganization?.id);
        if (updateError) throw updateError;
      } catch (e) {
        toast({ variant: 'destructive', title: 'فشل حفظ تأكيد الاتصال', description: 'سنعيد المحاولة لاحقاً' });
      }
    }, 600);

    callConfirmTimeoutsRef.current.set(orderId, timeoutId);
  }, [currentOrganization?.id, toast, updateOrderLocally, user?.id]);

  // إرسال الطلب لمزوّد الشحن (تحديث محلي بعد نجاح التكامل الخارجي)
  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string) => {
    try {
      // تحديث محلي مؤقت
      updateOrderLocally(orderId, { 
        shipping_provider: providerCode, 
        updated_at: new Date().toISOString() 
      } as any);

      // تحديث في قاعدة البيانات
      const { error } = await supabase
        .from('online_orders')
        .update({ 
          shipping_provider: providerCode,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization?.id);

      if (error) throw error;
      
      toast({ 
        title: 'تم الإرسال بنجاح', 
        description: `تم إرسال الطلب إلى ${providerCode}` 
      });
    } catch (e) {
      console.error('Error sending to provider:', e);
      toast({ 
        variant: 'destructive', 
        title: 'فشل الإرسال', 
        description: 'حدث خطأ أثناء إرسال الطلب لمزود الشحن' 
      });
    }
  }, [updateOrderLocally, currentOrganization?.id, toast]);

  // تغيير الصفحة
  const handlePageChange = useCallback(async (page: number) => {
    if (page >= 1) await goToPage(page - 1);
  }, [goToPage]);

  // استخدم totalPages من metadata إن وُجد لتجنب حسابات مختلفة تؤدي لإعادة جلب
  const totalPages = useMemo(() => {
    const metaPages = (metadata as any)?.pagination?.totalPages;
    if (typeof metaPages === 'number' && metaPages > 0) return metaPages;
    return Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 20)));
  }, [metadata, totalCount, pageSize]);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return (
    <Layout>
      {/* رأس الصفحة */}
      <div className="mb-4">
        <OrdersHeader
          ordersCount={orders.length}
          onRefresh={() => refresh()}
        />
        {/* إعدادات خصم المخزون التلقائي */}
        <div className="mt-3 flex justify-end">
          <OrdersSettings
            autoDeductInventory={autoDeductInventory}
            loadingSettings={false}
            updatingSettings={false}
            onToggleAutoDeductInventory={(enabled) => setAutoDeductInventory(enabled)}
          />
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="mb-4">
        <OrdersStatsCards
          orderStats={orderStats as any}
          orderCounts={{
            pending: (orderCounts as any)?.pending || 0,
            delivered: (orderCounts as any)?.delivered || 0,
          }}
        />
      </div>

      {/* المرشحات */}
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5 mb-4">
        <OrdersAdvancedFilters
          orderCounts={(orderCounts as any) || { all: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }}
          activeStatus={(filters.status as any) || 'all'}
          setActiveStatus={(status: any) => applyFilters({ status })}
          onFilterChange={({ status, searchTerm, dateRange }: any) => {
            // عند fetchAllOnce يتم تطبيق الفلاتر محلياً بلا استدعاء إضافي
            applyFilters({
              status: status ?? filters.status,
              searchTerm: searchTerm ?? filters.searchTerm,
              dateFrom: dateRange?.from ?? null,
              dateTo: dateRange?.to ?? null,
            });
          }}
        />
      </div>

      {/* جدول الطلبات - متجاوب للهاتف والكمبيوتر */}
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm">
        <Suspense fallback={<Loading />}>
          <ResponsiveOrdersTable
            orders={orders}
            loading={loading}
            onUpdateStatus={handleUpdateStatus}
            onUpdateCallConfirmation={handleUpdateCallConfirmation}
            onSendToProvider={handleSendToProvider}
            hasUpdatePermission={true}
            hasCancelPermission={true}
            visibleColumns={visibleColumns}
            currentUserId={user?.id}
            currentPage={currentPage}
            totalItems={totalCount ?? orders.length}
            pageSize={pageSize || 20}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={handlePageChange}
            hasMoreOrders={hasMore}
            shippingProviders={sharedData?.shippingProviders || []}
            onSearchTermChange={(q) => applyFilters({ searchTerm: q })}
            // إعدادات العرض المتجاوب
            forceViewMode="auto"
            defaultMobileViewMode="grid"
            autoLoadMoreOnScroll={false}
          />
        </Suspense>
      </div>
    </Layout>
  );
};

export default OrdersV2;


