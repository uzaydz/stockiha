import React, { lazy, Suspense, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
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
import { StopDeskSelectionDialog } from '@/components/orders/dialogs/StopDeskSelectionDialog';
import { useConfirmationAssignments } from '@/hooks/useConfirmationAssignments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

interface OrdersV2Props extends POSSharedLayoutControls {}

const OrdersV2: React.FC<OrdersV2Props> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  // Render with layout function (supports POS center embedding)
  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  // تهيئة خيارات الهوك: استدعاء واحد (يشمل البيانات المشتركة والعدّ) مع العناصر التفصيلية
  const hookOptions = useMemo(() => ({
    pageSize: 20,
    enablePolling: false,
    enableCache: true,
    rpcOptions: {
      // جلب عناصر الطلب داخل القائمة لعرضها في البطاقات
      includeItems: true,
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

  const orderIds = useMemo(() => orders.map(order => order.id), [orders]);
  const {
    assignmentsByOrderId,
    agentById: confirmationAgentsById,
    loading: confirmationAssignmentsLoading,
    missingSchema: confirmationAssignmentsMissing,
  } = useConfirmationAssignments(orderIds);

  const enrichedOrders = useMemo(() => {
    if (!orders.length) return orders;
    return orders.map(order => {
      const assignment = assignmentsByOrderId[order.id];
      const agent = assignment?.agent_id ? confirmationAgentsById[assignment.agent_id] : null;
      return {
        ...order,
        confirmation_assignment: assignment || null,
        confirmation_agent: agent || null,
      };
    });
  }, [orders, assignmentsByOrderId, confirmationAgentsById]);

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
    'total', 'status', 'confirmation', 'call_confirmation', 'shipping_provider', 'actions'
  ]);

  // حالة لإدارة النافذة المنبثقة لاختيار المكتب
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  const [pendingShipmentData, setPendingShipmentData] = useState<{
    orderId: string;
    providerCode: string;
    order: any;
  } | null>(null);

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

  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string, stopdeskId?: number) => {
    // 1. التحقق من المعلومات الأساسية
    if (!currentOrganization?.id) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على المنظمة",
        variant: "destructive",
      });
      return;
    }

    // 2. الحصول على معلومات الطلبية
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على الطلبية",
        variant: "destructive",
      });
      return;
    }

    // 3. التحقق من نوع التوصيل للمكتب (خاص بياليدين)
    if (providerCode === 'yalidine') {
      const formData = (order.form_data as any) || {};
      const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
      const isStopDesk = deliveryType === 'office' || 
                         deliveryType === 'stop_desk' || 
                         deliveryType === 'stopdesk' || 
                         deliveryType === 2 ||
                         deliveryType === '2';

      // إذا كان التوصيل للمكتب ولا يوجد stopdesk_id، نفتح النافذة المنبثقة
      if (isStopDesk && !stopdeskId) {
        const existingStopDeskId = formData.stopdeskId || 
                                   formData.stopdesk_id || 
                                   formData.stopDeskId ||
                                   formData.centerId ||
                                   formData.center_id;
        
        if (!existingStopDeskId) {
          // استخراج الولاية والبلدية من form_data
          const wilayaId = formData.province || formData.wilaya || formData.wilayaId || 
                          (order as any).shipping_wilaya || (order as any).wilaya;
          const communeId = formData.municipality || formData.commune || formData.communeId || 
                           (order as any).shipping_commune || (order as any).commune;
          
          console.log('Opening stop desk dialog for order:', {
            orderId,
            wilayaId,
            communeId,
            deliveryType,
            formData
          });
          
          setPendingShipmentData({
            orderId,
            providerCode,
            order: {
              ...order,
              wilayaId,
              communeId
            }
          });
          setStopDeskDialogOpen(true);
          return;
        }
      }
    }

    // 4. عرض مؤشر تحميل
    toast({
      title: "جاري الإرسال...",
      description: "يتم إرسال الطلب لشركة التوصيل، قد يستغرق هذا بضع ثوان",
    });

    try {
      // 5. استيراد الدالة الفعلية لإنشاء طلب الشحن
      const { createShippingOrderForOrder } = await import('@/utils/shippingOrderIntegration');
      
      // 6. استدعاء دالة إنشاء طلب الشحن الفعلية
      // ملاحظة: stopdesk_id وبيانات البلدية تم حفظهم مسبقاً في handleStopDeskConfirm
      const result = await createShippingOrderForOrder(
        currentOrganization.id,
        orderId,
        providerCode  // تمرير رمز الشركة المختارة
      );

      // 7. معالجة النتيجة
      if (result.success) {
        // تحديث محلي مع رقم التتبع
        const trackingFieldName = providerCode === 'yalidine' 
          ? 'yalidine_tracking_id' 
          : providerCode === 'zrexpress'
          ? 'zrexpress_tracking_id'
          : 'ecotrack_tracking_id';

        updateOrderLocally(orderId, {
          shipping_method: providerCode,
          shipping_provider: providerCode,
          status: 'shipped',
          [trackingFieldName]: result.trackingNumber,
        } as any);

        // إظهار رسالة نجاح مع رقم التتبع
        toast({
          title: "تم الإرسال بنجاح! ✓",
          description: `رقم التتبع: ${result.trackingNumber || 'غير متوفر'}`,
        });
      } else {
        // معالجة الفشل
        toast({
          title: "فشل الإرسال",
          description: result.message || "حدث خطأ أثناء إرسال الطلب",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('خطأ في إرسال الطلب:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ غير متوقع أثناء إرسال الطلب",
        variant: "destructive",
      });
    }
  }, [updateOrderLocally, toast, currentOrganization?.id, orders, supabase]);

  // دالة للتعامل مع تأكيد اختيار المكتب
  const handleStopDeskConfirm = useCallback(async (stopdeskId: number, selectedCenter: any) => {
    if (pendingShipmentData) {
      console.log('OrdersV2 - Updating order with selected center:', {
        stopdeskId,
        selectedCenter,
        orderId: pendingShipmentData.orderId
      });
      
      // حفظ معلومات المكتب المختار في form_data
      const order = pendingShipmentData.order;
      const formData = (order.form_data as any) || {};
      const updatedFormData = {
        ...formData,
        stopdesk_id: stopdeskId,
        stopdeskId: stopdeskId,
        // تحديث البلدية والولاية لتطابق المكتب المختار - كـ strings
        commune: selectedCenter.commune_id.toString(),
        communeId: selectedCenter.commune_id.toString(),
        municipality: selectedCenter.commune_id.toString(),
        wilaya: selectedCenter.wilaya_id.toString(),
        wilayaId: selectedCenter.wilaya_id.toString(),
        province: selectedCenter.wilaya_id.toString(),
        // حفظ الأسماء أيضاً للمرجعية
        communeName: selectedCenter.commune_name,
        wilayaName: selectedCenter.wilaya_name,
      };
      
      console.log('OrdersV2 - Updated form_data:', updatedFormData);
      
      // تحديث form_data في قاعدة البيانات
      await supabase
        .from('online_orders')
        .update({ form_data: updatedFormData })
        .eq('id', pendingShipmentData.orderId)
        .eq('organization_id', currentOrganization?.id);
      
      await handleSendToProvider(
        pendingShipmentData.orderId,
        pendingShipmentData.providerCode,
        stopdeskId
      );
      setPendingShipmentData(null);
    }
  }, [pendingShipmentData, handleSendToProvider, currentOrganization?.id]);

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

  const pageContent = (
    <>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <OrdersHeader
          ordersCount={orders.length}
          onRefresh={() => refresh()}
        />

        {/* إعدادات خصم المخزون التلقائي */}
        <div className="flex justify-end">
          <OrdersSettings
            autoDeductInventory={autoDeductInventory}
            loadingSettings={false}
            updatingSettings={updatingInventorySettings}
            onToggleAutoDeductInventory={handleToggleAutoDeductInventory}
          />
        </div>

        {/* الإحصائيات */}
        <OrdersStatsCards
          orderStats={orderStats as any}
          orderCounts={{
            pending: (orderCounts as any)?.pending || 0,
            delivered: (orderCounts as any)?.delivered || 0,
          }}
        />

        {/* المرشحات */}
        <div className="bg-card border border-border/20 rounded-lg p-6">
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

        {confirmationAssignmentsMissing && (
          <Alert variant="destructive" className="border border-destructive/30">
            <AlertTitle>نظام التأكيد غير مهيأ</AlertTitle>
            <AlertDescription>
              قم بتنفيذ ملف <code className="font-mono text-xs">supabase/confirmation_system.sql</code> لتفعيل توزيع فريق التأكيد وربط الطلبيات بالموظفين.
            </AlertDescription>
          </Alert>
        )}

        {/* جدول الطلبات - متجاوب للهاتف والكمبيوتر */}
        <div className="bg-card border border-border/20 rounded-lg overflow-hidden">
          <Suspense fallback={<Loading />}>
            <ResponsiveOrdersTable
              orders={enrichedOrders}
              loading={loading || confirmationAssignmentsLoading}
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
              callConfirmationStatuses={sharedData?.callConfirmationStatuses || []}
              onSearchTermChange={(q) => applyFilters({ searchTerm: q })}
              // إعدادات العرض المتجاوب
              autoLoadMoreOnScroll={false}
            />
          </Suspense>
        </div>
      </div>

      {/* نافذة اختيار المكتب */}
      {pendingShipmentData && (
        <StopDeskSelectionDialog
          open={stopDeskDialogOpen}
          onOpenChange={setStopDeskDialogOpen}
          onConfirm={handleStopDeskConfirm}
          wilayaId={(pendingShipmentData.order as any).wilayaId}
          communeId={(pendingShipmentData.order as any).communeId}
          organizationId={currentOrganization?.id || ''}
        />
      )}
    </>
  );

  // Register refresh and layout state updates
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(() => refresh());
      return () => onRegisterRefresh(null);
    }
  }, [onRegisterRefresh, refresh]);

  useEffect(() => {
    const state: POSLayoutState = {
      isRefreshing: Boolean(loading || confirmationAssignmentsLoading),
      connectionStatus: error ? 'disconnected' : 'connected',
      executionTime: undefined
    };
    if (onLayoutStateChange) onLayoutStateChange(state);
  }, [onLayoutStateChange, loading, confirmationAssignmentsLoading, error]);

  return renderWithLayout(pageContent);
};

export default OrdersV2;
