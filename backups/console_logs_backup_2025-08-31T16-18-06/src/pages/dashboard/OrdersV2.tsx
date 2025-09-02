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
import { useOrderOperations } from '@/hooks/useOrdersData';

// استيراد ملف CSS المخصص لتحسين الأداء
import '@/components/orders/orders-performance.css';

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

  // استخدام useOrderOperations للحصول على دالة updateOrderStatus التي تدعم إرجاع المخزون
  const { updateOrderStatus } = useOrderOperations(updateOrderLocally);

  // دالة حفظ إعدادات خصم المخزون التلقائي
  const handleToggleAutoDeductInventory = useCallback(async (enabled: boolean) => {
    if (!currentOrganization?.id) return;

    try {
      setUpdatingInventorySettings(true);
      
      // حفظ في قاعدة البيانات
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          organization_id: currentOrganization.id,
          custom_js: JSON.stringify({ auto_deduct_inventory: enabled }),
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', currentOrganization.id);

      if (error) {
        throw error;
      }

      // تحديث محلي بعد النجاح
      setAutoDeductInventory(enabled);

      toast({
        title: "تم حفظ الإعدادات",
        description: `تم ${enabled ? 'تفعيل' : 'إلغاء تفعيل'} خصم المخزون التلقائي بنجاح`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ إعدادات خصم المخزون",
        variant: "destructive",
      });
    } finally {
      setUpdatingInventorySettings(false);
    }
  }, [currentOrganization?.id, toast]);

  // حالة واجهة لزر خصم المخزون التلقائي (نقرأها من sharedData.organizationSettings إن وُجد)
  const autoDeductInventoryEnabled = !!(sharedData as any)?.organizationSettings?.auto_deduct_inventory;
  const [autoDeductInventory, setAutoDeductInventory] = useState<boolean>(autoDeductInventoryEnabled);
  const [updatingInventorySettings, setUpdatingInventorySettings] = useState<boolean>(false);
  
  useEffect(() => {
    setAutoDeductInventory(!!(sharedData as any)?.organizationSettings?.auto_deduct_inventory);
  }, [sharedData]);

  const [visibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact',
    'total', 'status', 'call_confirmation', 'shipping_provider', 'actions'
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
          .from('online_orders')
          .update({ 
            call_confirmation_status_id: statusId as any,
            call_confirmation_notes: notes as any,
            call_confirmation_updated_by: (userId || user?.id) as any,
            call_confirmation_updated_at: new Date().toISOString() as any
          } as any)
          .eq('id', orderId)
          .eq('organization_id', currentOrganization?.id);

        if (error) {
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
      // استخدام updateOrderStatus من useOrderOperations التي تدعم إرجاع المخزون
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (!result.success) {
        toast({
          title: "خطأ",
          description: result.error || "فشل في تحديث حالة الطلب",
          variant: "destructive",
        });
      }
      // لا حاجة لإظهار رسالة نجاح لأن updateOrderStatus تظهر رسائلها الخاصة
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء محاولة تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  }, [updateOrderStatus, toast]);

  const handleSendToProvider = useCallback(async (orderId: string, providerId: string) => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ 
          shipping_method: providerId,
          status: 'shipped' // تحديث الحالة تلقائياً إلى "تم الشحن"
        })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization?.id);

      if (error) {
        toast({
          title: "خطأ",
          description: "فشل في إرسال الطلب للمزود",
          variant: "destructive",
        });
      } else {
        // تحديث محلي
        updateOrderLocally(orderId, { 
          shipping_method: providerId,
          status: 'shipped'
        } as any);
        toast({
          title: "تم الإرسال",
          description: "تم إرسال الطلب للمزود بنجاح",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إرسال الطلب للمزود",
        variant: "destructive",
      });
    }
  }, [updateOrderLocally, toast, currentOrganization?.id]);

  // ===============================
  // Pagination handlers
  // ===============================
  const totalPages = Math.ceil((totalCount || 0) / (pageSize || 20));
  const hasNextPage = currentPage < totalPages;
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
            updatingSettings={updatingInventorySettings}
            onToggleAutoDeductInventory={handleToggleAutoDeductInventory}
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
