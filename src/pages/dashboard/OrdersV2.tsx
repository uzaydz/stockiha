import React, { lazy, Suspense, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
import { Loader2 } from 'lucide-react';
import { Shuffle } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrdersHeader from '@/components/orders/OrdersHeader';
import OrdersSettings from '@/components/orders/OrdersSettings';
import OrdersStatsCards from '@/components/orders/OrdersStatsCards';
import OrdersAdvancedFilters from '@/components/orders/OrdersAdvancedFilters';
import { useOptimizedOrdersDataV2 } from '@/hooks/useOptimizedOrdersDataV2';
import { useOrderOperations } from '@/hooks/useOrdersData';
import { StopDeskSelectionDialog } from '@/components/orders/dialogs/StopDeskSelectionDialog';
import { useConfirmationAssignments } from '@/hooks/useConfirmationAssignments';
import BulkAutoAssignDialog from '@/components/orders/dialogs/BulkAutoAssignDialog';
import { OrdersDataProvider } from '@/context/OrdersDataContext';

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
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const perms = usePermissions();

  // استخدام الـ Hook المحسّن الجديد V2
  const {
    orders,
    totalCount,
    currentPage,
    hasMore,
    loading,
    fetching,
    error,
    sharedData,
    orderCounts,
    orderStats,
    filters,
    metadata,
    goToPage,
    applyFilters,
    resetFilters,
    refresh,
    refreshStats,
    updateOrderLocally,
    getOrderDetails,
    pageSize,
  } = useOptimizedOrdersDataV2({
    pageSize: 20,
    initialPage: 1,
    enableAutoRefresh: false,
    autoRefreshInterval: 60000,
  });

  // Register refresh function for parent components
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(() => {
        refresh();
        refreshStats();
      });
    }
  }, [onRegisterRefresh, refresh, refreshStats]);

  const orderIds = useMemo(() => orders.map((order: any) => order.id), [orders]);
  const {
    assignmentsByOrderId,
    agentById: confirmationAgentsById,
    loading: confirmationAssignmentsLoading,
    missingSchema: confirmationAssignmentsMissing,
  } = useConfirmationAssignments(orderIds);

  const enrichedOrders = useMemo(() => {
    if (!orders.length) return orders;
    return orders.map((order: any) => {
      const assignment = assignmentsByOrderId[order.id];
      const agent = assignment?.agent_id ? confirmationAgentsById[assignment.agent_id] : null;
      return {
        ...order,
        confirmation_assignment: assignment || null,
        confirmation_agent: agent || null,
      };
    });
  }, [orders, assignmentsByOrderId, confirmationAgentsById]);

  // Resolve names for previously assigned orders that may miss assigned_staff_name
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  // Local fallback for group assignments when legacy RPC is used (admin view without groupId)
  const [groupAssignmentsByOrderId, setGroupAssignmentsByOrderId] = useState<Record<string, { staff_id: string; status: string }>>({});

  // Fetch group assignments for orders missing assignment info (admin/all view)
  useEffect(() => {
    if (!currentOrganization?.id || !enrichedOrders.length) return;
    const missingOrderIds = enrichedOrders
      .filter((o: any) => !o?.assignment || !o.assignment?.staff_id)
      .map((o: any) => o.id);
    if (missingOrderIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('online_order_assignments')
        .select('order_id, staff_id, status')
        .in('order_id', missingOrderIds)
        .eq('organization_id', currentOrganization.id)
        .in('status', ['assigned','accepted']);
      if (error || !data) return;
      if (cancelled) return;
      const map: Record<string, { staff_id: string; status: string }> = {};
      for (const row of data) {
        if (row?.order_id && row?.staff_id) map[row.order_id] = { staff_id: row.staff_id, status: row.status || 'assigned' };
      }
      setGroupAssignmentsByOrderId(prev => ({ ...prev, ...map }));
    })();
    return () => { cancelled = true; };
  }, [currentOrganization?.id, enrichedOrders]);
  useEffect(() => {
    const staffIdsDirect = enrichedOrders
      .map((o: any) => o?.assignment?.staff_id as string | undefined)
      .filter((id): id is string => Boolean(id));
    const staffIdsFallback = enrichedOrders
      .map((o: any) => groupAssignmentsByOrderId[o.id]?.staff_id as string | undefined)
      .filter((id): id is string => Boolean(id));
    const combined = Array.from(new Set([...staffIdsDirect, ...staffIdsFallback]));
    const missingIds = combined.filter((id) => {
      const o = enrichedOrders.find((ord: any) => (ord?.assignment?.staff_id || groupAssignmentsByOrderId[ord.id]?.staff_id) === id);
      const hasName = (o as any)?.assigned_staff_name;
      return !hasName && !assigneeNames[id];
    });
    if (!missingIds.length) return;
    let cancelled = false;
    (async () => {
      // 1) Try users table
      const usersRes = await supabase
        .from('users')
        .select('id,name,email')
        .in('id', missingIds);
      const users = usersRes.data || [];
      if (cancelled) return;
      let resolved: Record<string,string> = {};
      for (const u of users) {
        if (u?.id) resolved[u.id] = (u as any).name || (u as any).email || u.id;
      }

      // 2) For any remaining ids, try POS staff sessions fallback
      const unresolvedIds = missingIds.filter(id => !resolved[id]);
      if (unresolvedIds.length) {
        try {
          const pssRes = await supabase
            .from('pos_staff_sessions' as any)
            .select('id, staff_name')
            .in('id', unresolvedIds as any);
          const sessions = (pssRes.data || []) as any[];
          for (const s of sessions) {
            if (s?.id) resolved[s.id] = (s as any).staff_name || s.id;
          }
        } catch {}
      }

      if (Object.keys(resolved).length === 0) return;
      setAssigneeNames(prev => ({ ...prev, ...resolved }));
    })();
    return () => { cancelled = true; };
  }, [enrichedOrders, groupAssignmentsByOrderId, supabase, assigneeNames]);

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
    'total', 'status', 'assignee', 'call_confirmation', 'shipping_provider', 'tracking', 'actions'
  ]);

  // حالة لإدارة النافذة المنبثقة لاختيار المكتب
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  const [pendingShipmentData, setPendingShipmentData] = useState<{
    orderId: string;
    providerCode: string;
    order: any;
  } | null>(null);

  // التحقق من صلاحية عرض الطلبات
  if (perms.ready && !perms.anyOf(['viewOrders'])) {
    const node = (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية عرض الطلبات.</AlertDescription>
        </Alert>
      </div>
    );
    return useStandaloneLayout ? <Layout>{node}</Layout> : node;
  }

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

  // New view mode: all | mine | unassigned
  // القيمة الافتراضية تعتمد على دور المستخدم
  const defaultViewMode = useMemo(() => {
    const role = userProfile?.role;
    // المديرون يرون كل الطلبيات افتراضياً
    if (role === 'admin' || role === 'owner') {
      return 'all';
    }
    // الموظفون يرون فقط طلبياتهم افتراضياً
    return 'mine';
  }, [userProfile?.role]);
  
  const [viewMode, setViewMode] = useState<'all' | 'mine' | 'unassigned'>(defaultViewMode);
  const [viewModeInitialized, setViewModeInitialized] = useState(false);

  // تحديث viewMode عند تغيير دور المستخدم
  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [defaultViewMode]);

  // تهيئة الفلاتر بـ viewMode الافتراضي عند التحميل الأول
  useEffect(() => {
    if (!viewModeInitialized && filters) {
      applyFilters({ ...filters, viewMode: defaultViewMode });
      setViewModeInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultViewMode, viewModeInitialized]);

  // تطبيق viewMode على الفلاتر لجلب البيانات الصحيحة من السيرفر
  useEffect(() => {
    if (viewModeInitialized && filters.viewMode !== viewMode) {
      applyFilters({ ...filters, viewMode });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, viewModeInitialized]);

  // Augment orders with resolved assignee display name
  const displayOrders = useMemo(() => {
    return enrichedOrders.map((o: any) => {
      const fallbackAssign = groupAssignmentsByOrderId[o.id];
      const assignment = o?.assignment && o.assignment?.staff_id ? o.assignment : fallbackAssign ? { staff_id: fallbackAssign.staff_id, status: fallbackAssign.status } : null;
      const sid = assignment?.staff_id as string | undefined;
      const name = o?.assigned_staff_name || (sid ? assigneeNames[sid] : undefined) || null;
      return { ...o, assignment, assigned_staff_name_resolved: name };
    });
  }, [enrichedOrders, assigneeNames, groupAssignmentsByOrderId]);

  // Bulk auto-assign dialog state
  const [bulkAutoAssignOpen, setBulkAutoAssignOpen] = useState(false);

  const pageContent = (
    <>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <OrdersHeader
          ordersCount={displayOrders.length}
          onRefresh={() => refresh()}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Bulk actions toolbar */}
        {perms.anyOf(['canManageOnlineOrderGroups']) && (
          <div className="flex justify-end -mt-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setBulkAutoAssignOpen(true)}>
              <Shuffle className="h-4 w-4" />
              تعيين تلقائي للكل (غير المعين)
            </Button>
          </div>
        )}

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
        <Suspense fallback={<Loading />}>
          <ResponsiveOrdersTable
              orders={displayOrders}
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

      {/* Bulk auto-assign dialog */}
      {bulkAutoAssignOpen && (
        <BulkAutoAssignDialog
          open={bulkAutoAssignOpen}
          onOpenChange={setBulkAutoAssignOpen}
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

  // استمع لحدث تحديث عام من النوافذ الفرعية (مثل التعيين التلقائي)
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('orders:refresh', handler as any);
    return () => window.removeEventListener('orders:refresh', handler as any);
  }, [refresh]);

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

// Export with OrdersDataProvider wrapper
const OrdersV2WithProvider: React.FC<OrdersV2Props> = (props) => {
  return (
    <OrdersDataProvider>
      <OrdersV2 {...props} />
    </OrdersDataProvider>
  );
};

export default OrdersV2WithProvider;
