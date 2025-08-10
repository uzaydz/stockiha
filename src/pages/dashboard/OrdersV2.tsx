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
import PerformanceMonitor from '@/components/PerformanceMonitor';

const ResponsiveOrdersTable = lazy(() => import('@/components/orders/ResponsiveOrdersTable'));

const Loading = () => (
  <div className="p-4">
    {/* Skeleton header */}
    <div className="h-8 w-40 bg-muted/40 rounded-md mb-4" />
    {/* Skeleton table */}
    <div className="rounded-xl border border-border/30 shadow-sm overflow-hidden">
      <div className="h-[56px] bg-muted/20" />
      <div className="divide-y divide-border/20">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-background" />
        ))}
      </div>
    </div>
    {/* Reserve space to reduce CLS */}
    <div className="min-h-[50vh]" />
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

  const handleUpdateCallConfirmation = useCallback(async (orderId: string, statusId: number, notes?: string, userId?: string) => {
    // إلغاء أي timeout سابق لهذا الطلب
    const existingTimeout = callConfirmTimeoutsRef.current.get(orderId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // تحديث محلي فوري (optimistic update)
    updateOrderLocally(orderId, { 
      call_confirmation_status_id: statusId,
      call_confirmation_notes: notes,
      call_confirmation_updated_by: userId || user?.id
    } as any);

    // تأخير الاستدعاء للخادم
    const timeoutId = window.setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ 
            call_confirmation_status_id: statusId as any,
            call_confirmation_notes: notes as any,
            call_confirmation_updated_by: (userId || user?.id) as any,
            call_confirmation_updated_at: new Date().toISOString() as any
          } as any)
          .eq('id', orderId);

        if (error) {
          console.error('خطأ في تحديث تأكيد الاتصال:', error);
          toast({
            title: "خطأ",
            description: "فشل في تحديث حالة تأكيد الاتصال",
            variant: "destructive",
          });
          // إعادة الحالة الأصلية في حالة الخطأ
          updateOrderLocally(orderId, { 
            call_confirmation_status_id: null,
            call_confirmation_notes: null,
            call_confirmation_updated_by: null
          } as any);
        }
      } catch (error) {
        console.error('خطأ في تحديث تأكيد الاتصال:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحديث حالة تأكيد الاتصال",
          variant: "destructive",
        });
        // إعادة الحالة الأصلية في حالة الخطأ
        updateOrderLocally(orderId, { 
          call_confirmation_status_id: null,
          call_confirmation_notes: null,
          call_confirmation_updated_by: null
        } as any);
      } finally {
        callConfirmTimeoutsRef.current.delete(orderId);
      }
    }, 1000); // تأخير ثانية واحدة

    callConfirmTimeoutsRef.current.set(orderId, timeoutId);
  }, [updateOrderLocally, toast, user?.id]);

  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    try {
      // تحديث محلي فوري
      updateOrderLocally(orderId, { status: newStatus as any });

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('خطأ في تحديث حالة الطلب:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحديث حالة الطلب",
          variant: "destructive",
        });
        // إعادة الحالة الأصلية في حالة الخطأ
        // يمكن إضافة منطق لإعادة الحالة الأصلية هنا
      } else {
        toast({
          title: "تم التحديث",
          description: "تم تحديث حالة الطلب بنجاح",
        });
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة الطلب:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  }, [updateOrderLocally, toast]);

  const handleSendToProvider = useCallback(async (orderId: string, providerId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          shippingMethod: providerId,
          status: 'shipped' // تحديث الحالة تلقائياً إلى "تم الشحن"
        })
        .eq('id', orderId);

      if (error) {
        console.error('خطأ في إرسال الطلب للمزود:', error);
        toast({
          title: "خطأ",
          description: "فشل في إرسال الطلب للمزود",
          variant: "destructive",
        });
      } else {
        // تحديث محلي
        updateOrderLocally(orderId, { 
          shippingMethod: providerId,
          status: 'shipped'
        } as any);
        toast({
          title: "تم الإرسال",
          description: "تم إرسال الطلب للمزود بنجاح",
        });
      }
    } catch (error) {
      console.error('خطأ في إرسال الطلب للمزود:', error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال الطلب للمزود",
        variant: "destructive",
      });
    }
  }, [updateOrderLocally, toast]);

  // ===============================
  // Pagination handlers
  // ===============================
  const hasNextPage = currentPage < Math.ceil((totalCount || 0) / (pageSize || 20));
  const hasPreviousPage = currentPage > 1;

  const handlePageChange = useCallback((newPage: number) => {
    goToPage(newPage);
  }, [goToPage]);

  // ===============================
  // Cleanup on unmount
  // ===============================
  useEffect(() => {
    return () => {
      // تنظيف جميع timeouts عند إلغاء المكون
      callConfirmTimeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      callConfirmTimeoutsRef.current.clear();
    };
  }, []);

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

      {/* مراقب الأداء */}
      <PerformanceMonitor 
        showInProduction={false}
        position="bottom-right"
        autoHide={true}
        hideDelay={8000}
      />
    </Layout>
  );
};

export default OrdersV2;
