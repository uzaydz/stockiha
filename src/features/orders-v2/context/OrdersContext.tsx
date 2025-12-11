/**
 * OrdersContext - إدارة مركزية لحالة الطلبيات
 * يوفر:
 * - بيانات الطلبيات والإحصائيات
 * - الفلاتر والتصفح
 * - العمليات (تحديث، إرسال للشحن، إلخ)
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  useRef,
} from 'react';
import { useOptimizedOrdersDataV2 } from '@/hooks/useOptimizedOrdersDataV2';
import { useOrderOperations } from '@/hooks/useOrdersData';
import { useConfirmationAssignments } from '@/hooks/useConfirmationAssignments';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type {
  Order,
  OrderFilters,
  OrderCounts,
  OrderStats,
  OrdersSharedData,
  PaginationState,
  ViewMode,
  ActionResult,
  DEFAULT_FILTERS,
} from '../types';

// ============================================
// State Types
// ============================================

interface OrdersState {
  // View preferences
  viewMode: ViewMode;
  visibleColumns: string[];

  // Inventory settings
  autoDeductInventory: boolean;
  updatingInventorySettings: boolean;

  // Dialogs
  stopDeskDialogOpen: boolean;
  bulkAutoAssignOpen: boolean;
  pendingShipmentData: {
    orderId: string;
    providerCode: string;
    order: Order & { wilayaId?: string; communeId?: string };
  } | null;

  // Resolved assignee names cache
  assigneeNames: Record<string, string>;
  groupAssignmentsByOrderId: Record<string, { staff_id: string; status: string }>;
}

type OrdersAction =
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_VISIBLE_COLUMNS'; payload: string[] }
  | { type: 'SET_AUTO_DEDUCT_INVENTORY'; payload: boolean }
  | { type: 'SET_UPDATING_INVENTORY_SETTINGS'; payload: boolean }
  | { type: 'SET_STOP_DESK_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_BULK_AUTO_ASSIGN_OPEN'; payload: boolean }
  | { type: 'SET_PENDING_SHIPMENT_DATA'; payload: OrdersState['pendingShipmentData'] }
  | { type: 'SET_ASSIGNEE_NAMES'; payload: Record<string, string> }
  | { type: 'MERGE_ASSIGNEE_NAMES'; payload: Record<string, string> }
  | { type: 'SET_GROUP_ASSIGNMENTS'; payload: Record<string, { staff_id: string; status: string }> }
  | { type: 'MERGE_GROUP_ASSIGNMENTS'; payload: Record<string, { staff_id: string; status: string }> };

const initialState: OrdersState = {
  viewMode: 'all',
  visibleColumns: [
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact',
    'total', 'status', 'assignee', 'call_confirmation', 'shipping_provider',
    'tracking', 'actions'
  ],
  autoDeductInventory: false,
  updatingInventorySettings: false,
  stopDeskDialogOpen: false,
  bulkAutoAssignOpen: false,
  pendingShipmentData: null,
  assigneeNames: {},
  groupAssignmentsByOrderId: {},
};

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_VISIBLE_COLUMNS':
      return { ...state, visibleColumns: action.payload };
    case 'SET_AUTO_DEDUCT_INVENTORY':
      return { ...state, autoDeductInventory: action.payload };
    case 'SET_UPDATING_INVENTORY_SETTINGS':
      return { ...state, updatingInventorySettings: action.payload };
    case 'SET_STOP_DESK_DIALOG_OPEN':
      return { ...state, stopDeskDialogOpen: action.payload };
    case 'SET_BULK_AUTO_ASSIGN_OPEN':
      return { ...state, bulkAutoAssignOpen: action.payload };
    case 'SET_PENDING_SHIPMENT_DATA':
      return { ...state, pendingShipmentData: action.payload };
    case 'SET_ASSIGNEE_NAMES':
      return { ...state, assigneeNames: action.payload };
    case 'MERGE_ASSIGNEE_NAMES':
      return { ...state, assigneeNames: { ...state.assigneeNames, ...action.payload } };
    case 'SET_GROUP_ASSIGNMENTS':
      return { ...state, groupAssignmentsByOrderId: action.payload };
    case 'MERGE_GROUP_ASSIGNMENTS':
      return { ...state, groupAssignmentsByOrderId: { ...state.groupAssignmentsByOrderId, ...action.payload } };
    default:
      return state;
  }
}

// ============================================
// Context Types
// ============================================

interface OrdersContextValue {
  // Data
  orders: Order[];
  displayOrders: Order[];
  totalCount: number;
  loading: boolean;
  fetching: boolean;
  error: Error | null;

  // Stats
  orderCounts: OrderCounts;
  orderStats: OrderStats;

  // Shared Data
  sharedData: OrdersSharedData;

  // Pagination
  pagination: PaginationState;
  goToPage: (page: number) => void;

  // Filters
  filters: OrderFilters;
  applyFilters: (filters: Partial<OrderFilters>) => void;
  resetFilters: () => void;

  // View Mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;

  // Actions
  refresh: () => void;
  refreshStats: () => void;
  updateOrderLocally: (orderId: string, updates: Partial<Order>) => void;
  updateOrderStatus: (orderId: string, status: string) => Promise<ActionResult>;
  updateCallConfirmation: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  sendToProvider: (orderId: string, providerCode: string, stopdeskId?: number) => Promise<void>;

  // Inventory Settings
  autoDeductInventory: boolean;
  updatingInventorySettings: boolean;
  toggleAutoDeductInventory: (enabled: boolean) => Promise<void>;

  // Dialogs
  stopDeskDialogOpen: boolean;
  setStopDeskDialogOpen: (open: boolean) => void;
  bulkAutoAssignOpen: boolean;
  setBulkAutoAssignOpen: (open: boolean) => void;
  pendingShipmentData: OrdersState['pendingShipmentData'];
  setPendingShipmentData: (data: OrdersState['pendingShipmentData']) => void;
  handleStopDeskConfirm: (stopdeskId: number, selectedCenter: any) => Promise<void>;

  // Confirmation assignments
  confirmationAssignmentsLoading: boolean;
  confirmationAssignmentsMissing: boolean;

  // User info
  currentUserId: string | undefined;
  organizationId: string | undefined;
  userRole: string | undefined;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

// ============================================
// Provider Component
// ============================================

interface OrdersProviderProps {
  children: React.ReactNode;
  pageSize?: number;
}

export const OrdersProvider: React.FC<OrdersProviderProps> = ({
  children,
  pageSize = 20,
}) => {
  const { currentOrganization } = useTenant();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const organizationId = currentOrganization?.id;
  const currentUserId = user?.id;
  const userRole = userProfile?.role;

  // Local state with reducer
  const [state, dispatch] = useReducer(ordersReducer, {
    ...initialState,
    viewMode: userRole === 'admin' || userRole === 'owner' ? 'all' : 'mine',
  });

  // Debounce refs for call confirmation
  const callConfirmTimeoutsRef = useRef<Map<string, number>>(new Map());

  // Data hook
  const {
    orders,
    totalCount,
    currentPage,
    hasMore,
    loading,
    fetching,
    error,
    sharedData: rawSharedData,
    orderCounts: rawOrderCounts,
    orderStats: rawOrderStats,
    filters,
    goToPage,
    applyFilters: baseApplyFilters,
    resetFilters,
    refresh,
    refreshStats,
    updateOrderLocally,
    pageSize: hookPageSize,
  } = useOptimizedOrdersDataV2({
    pageSize,
    initialPage: 1,
    enableAutoRefresh: false,
  });

  // Order operations
  const { updateOrderStatus: baseUpdateOrderStatus } = useOrderOperations(updateOrderLocally);

  // Confirmation assignments
  const orderIds = useMemo(() => orders.map((o: any) => o.id), [orders]);
  const {
    assignmentsByOrderId,
    agentById: confirmationAgentsById,
    loading: confirmationAssignmentsLoading,
    missingSchema: confirmationAssignmentsMissing,
  } = useConfirmationAssignments(orderIds);

  // ============================================
  // Derived Data
  // ============================================

  // Enrich orders with assignments
  const enrichedOrders = useMemo(() => {
    if (!orders.length) return orders;
    return orders.map((order: any) => {
      const assignment = assignmentsByOrderId[order.id];
      const agent = assignment?.agent_id
        ? confirmationAgentsById[assignment.agent_id]
        : null;
      return {
        ...order,
        confirmation_assignment: assignment || null,
        confirmation_agent: agent || null,
      };
    });
  }, [orders, assignmentsByOrderId, confirmationAgentsById]);

  // Display orders with resolved names
  const displayOrders = useMemo(() => {
    return enrichedOrders.map((o: any) => {
      const fallbackAssign = state.groupAssignmentsByOrderId[o.id];
      const assignment = o?.assignment?.staff_id
        ? o.assignment
        : fallbackAssign
        ? { staff_id: fallbackAssign.staff_id, status: fallbackAssign.status }
        : null;
      const sid = assignment?.staff_id;
      const name =
        o?.assigned_staff_name ||
        (sid ? state.assigneeNames[sid] : undefined) ||
        null;
      return { ...o, assignment, assigned_staff_name_resolved: name };
    });
  }, [enrichedOrders, state.assigneeNames, state.groupAssignmentsByOrderId]);

  // Shared data with defaults
  const sharedData: OrdersSharedData = useMemo(() => ({
    callConfirmationStatuses: rawSharedData?.callConfirmationStatuses || [],
    shippingProviders: rawSharedData?.shippingProviders || [],
    provinces: rawSharedData?.provinces || [],
    municipalities: rawSharedData?.municipalities || [],
    organizationSettings: rawSharedData?.organizationSettings || null,
  }), [rawSharedData]);

  // Order counts with defaults
  const orderCounts: OrderCounts = useMemo(() => ({
    all: (rawOrderCounts as any)?.all || 0,
    pending: (rawOrderCounts as any)?.pending || 0,
    processing: (rawOrderCounts as any)?.processing || 0,
    shipped: (rawOrderCounts as any)?.shipped || 0,
    delivered: (rawOrderCounts as any)?.delivered || 0,
    cancelled: (rawOrderCounts as any)?.cancelled || 0,
  }), [rawOrderCounts]);

  // Order stats with defaults
  const orderStats: OrderStats = useMemo(() => ({
    totalSales: rawOrderStats?.totalSales || 0,
    avgOrderValue: rawOrderStats?.avgOrderValue || 0,
    totalOrders: rawOrderStats?.totalOrders || 0,
  }), [rawOrderStats]);

  // Pagination
  const pagination: PaginationState = useMemo(() => {
    const totalPages = Math.ceil((totalCount || 0) / (hookPageSize || 20));
    return {
      currentPage,
      pageSize: hookPageSize || 20,
      totalItems: totalCount || 0,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [currentPage, totalCount, hookPageSize]);

  // ============================================
  // Effects
  // ============================================

  // Sync auto deduct inventory from shared data
  useEffect(() => {
    const enabled = !!(sharedData.organizationSettings as any)?.auto_deduct_inventory;
    dispatch({ type: 'SET_AUTO_DEDUCT_INVENTORY', payload: enabled });
  }, [sharedData.organizationSettings]);

  // Apply viewMode to filters when it changes
  useEffect(() => {
    if (filters.viewMode !== state.viewMode) {
      baseApplyFilters({ viewMode: state.viewMode });
    }
  }, [state.viewMode, filters.viewMode, baseApplyFilters]);

  // Fetch group assignments for orders missing assignment info
  useEffect(() => {
    if (!organizationId || !enrichedOrders.length) return;

    const missingOrderIds = enrichedOrders
      .filter((o: any) => !o?.assignment?.staff_id)
      .map((o: any) => o.id);

    if (missingOrderIds.length === 0) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('online_order_assignments')
        .select('order_id, staff_id, status')
        .in('order_id', missingOrderIds)
        .eq('organization_id', organizationId)
        .in('status', ['assigned', 'accepted']);

      if (error || !data || cancelled) return;

      const map: Record<string, { staff_id: string; status: string }> = {};
      for (const row of data) {
        if (row?.order_id && row?.staff_id) {
          map[row.order_id] = { staff_id: row.staff_id, status: row.status || 'assigned' };
        }
      }

      if (Object.keys(map).length > 0) {
        dispatch({ type: 'MERGE_GROUP_ASSIGNMENTS', payload: map });
      }
    })();

    return () => { cancelled = true; };
  }, [organizationId, enrichedOrders]);

  // Resolve assignee names
  useEffect(() => {
    const staffIdsDirect = enrichedOrders
      .map((o: any) => o?.assignment?.staff_id)
      .filter(Boolean);
    const staffIdsFallback = enrichedOrders
      .map((o: any) => state.groupAssignmentsByOrderId[o.id]?.staff_id)
      .filter(Boolean);
    const combined = Array.from(new Set([...staffIdsDirect, ...staffIdsFallback]));

    const missingIds = combined.filter((id) => {
      const hasName = enrichedOrders.some(
        (ord: any) =>
          (ord?.assignment?.staff_id === id ||
            state.groupAssignmentsByOrderId[ord.id]?.staff_id === id) &&
          ord?.assigned_staff_name
      );
      return !hasName && !state.assigneeNames[id];
    });

    if (!missingIds.length) return;

    let cancelled = false;

    (async () => {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', missingIds);

      if (cancelled) return;

      const resolved: Record<string, string> = {};
      for (const u of users || []) {
        if (u?.id) {
          resolved[u.id] = u.name || u.email || u.id;
        }
      }

      if (Object.keys(resolved).length > 0) {
        dispatch({ type: 'MERGE_ASSIGNEE_NAMES', payload: resolved });
      }
    })();

    return () => { cancelled = true; };
  }, [enrichedOrders, state.groupAssignmentsByOrderId, state.assigneeNames]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      callConfirmTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      callConfirmTimeoutsRef.current.clear();
    };
  }, []);

  // Listen for global refresh events
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('orders:refresh', handler);
    return () => window.removeEventListener('orders:refresh', handler);
  }, [refresh]);

  // ============================================
  // Actions
  // ============================================

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const setVisibleColumns = useCallback((columns: string[]) => {
    dispatch({ type: 'SET_VISIBLE_COLUMNS', payload: columns });
  }, []);

  const applyFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    baseApplyFilters(newFilters as any);
  }, [baseApplyFilters]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string): Promise<ActionResult> => {
    const result = await baseUpdateOrderStatus(orderId, status);
    return {
      success: result.success,
      error: result.error,
    };
  }, [baseUpdateOrderStatus]);

  const updateCallConfirmation = useCallback(async (
    orderId: string,
    statusId: number,
    notes?: string
  ) => {
    // Cancel existing timeout
    const existingTimeout = callConfirmTimeoutsRef.current.get(orderId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Optimistic update
    updateOrderLocally(orderId, {
      call_confirmation_status_id: statusId,
      call_confirmation_notes: notes,
      call_confirmation_updated_by: currentUserId,
    } as any);

    // Debounced server update
    const timeoutId = window.setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('online_orders')
          .update({
            call_confirmation_status_id: statusId,
            call_confirmation_notes: notes,
            call_confirmation_updated_by: currentUserId,
            call_confirmation_updated_at: new Date().toISOString(),
          } as any)
          .eq('id', orderId)
          .eq('organization_id', organizationId);

        if (error) {
          toast({
            title: 'خطأ',
            description: 'فشل في تحديث حالة تأكيد الاتصال',
            variant: 'destructive',
          });
          // Revert optimistic update
          updateOrderLocally(orderId, {
            call_confirmation_status_id: null,
            call_confirmation_notes: null,
            call_confirmation_updated_by: null,
          } as any);
        }
      } catch {
        toast({
          title: 'خطأ',
          description: 'فشل في تحديث حالة تأكيد الاتصال',
          variant: 'destructive',
        });
      } finally {
        callConfirmTimeoutsRef.current.delete(orderId);
      }
    }, 1000);

    callConfirmTimeoutsRef.current.set(orderId, timeoutId);
  }, [currentUserId, organizationId, toast, updateOrderLocally]);

  const sendToProvider = useCallback(async (
    orderId: string,
    providerCode: string,
    stopdeskId?: number
  ) => {
    if (!organizationId) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على المنظمة', variant: 'destructive' });
      return;
    }

    const order = orders.find((o: any) => o.id === orderId);
    if (!order) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على الطلبية', variant: 'destructive' });
      return;
    }

    // Check if stop desk selection is needed for Yalidine
    if (providerCode === 'yalidine') {
      const formData = (order as any).form_data || {};
      const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
      const isStopDesk = ['office', 'stop_desk', 'stopdesk', 2, '2'].includes(deliveryType);

      if (isStopDesk && !stopdeskId) {
        const existingStopDeskId =
          formData.stopdeskId || formData.stopdesk_id || formData.centerId || formData.center_id;

        if (!existingStopDeskId) {
          const wilayaId = formData.province || formData.wilaya || formData.wilayaId;
          const communeId = formData.municipality || formData.commune || formData.communeId;

          dispatch({
            type: 'SET_PENDING_SHIPMENT_DATA',
            payload: {
              orderId,
              providerCode,
              order: { ...order, wilayaId, communeId } as any,
            },
          });
          dispatch({ type: 'SET_STOP_DESK_DIALOG_OPEN', payload: true });
          return;
        }
      }
    }

    toast({ title: 'جاري الإرسال...', description: 'يتم إرسال الطلب لشركة التوصيل' });

    try {
      const { createShippingOrderForOrder } = await import('@/utils/shippingOrderIntegration');
      const result = await createShippingOrderForOrder(organizationId, orderId, providerCode);

      if (result.success) {
        const trackingFieldName =
          providerCode === 'yalidine'
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

        toast({
          title: 'تم الإرسال بنجاح!',
          description: `رقم التتبع: ${result.trackingNumber || 'غير متوفر'}`,
        });
      } else {
        toast({
          title: 'فشل الإرسال',
          description: result.message || 'حدث خطأ أثناء إرسال الطلب',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    }
  }, [organizationId, orders, toast, updateOrderLocally]);

  const handleStopDeskConfirm = useCallback(async (
    stopdeskId: number,
    selectedCenter: any
  ) => {
    if (!state.pendingShipmentData || !organizationId) return;

    const { orderId, providerCode, order } = state.pendingShipmentData;
    const formData = (order as any).form_data || {};

    const updatedFormData = {
      ...formData,
      stopdesk_id: stopdeskId,
      stopdeskId: stopdeskId,
      commune: selectedCenter.commune_id.toString(),
      communeId: selectedCenter.commune_id.toString(),
      municipality: selectedCenter.commune_id.toString(),
      wilaya: selectedCenter.wilaya_id.toString(),
      wilayaId: selectedCenter.wilaya_id.toString(),
      province: selectedCenter.wilaya_id.toString(),
      communeName: selectedCenter.commune_name,
      wilayaName: selectedCenter.wilaya_name,
    };

    await supabase
      .from('online_orders')
      .update({ form_data: updatedFormData })
      .eq('id', orderId)
      .eq('organization_id', organizationId);

    await sendToProvider(orderId, providerCode, stopdeskId);

    dispatch({ type: 'SET_PENDING_SHIPMENT_DATA', payload: null });
    dispatch({ type: 'SET_STOP_DESK_DIALOG_OPEN', payload: false });
  }, [state.pendingShipmentData, organizationId, sendToProvider]);

  const toggleAutoDeductInventory = useCallback(async (enabled: boolean) => {
    if (!organizationId) return;

    dispatch({ type: 'SET_UPDATING_INVENTORY_SETTINGS', payload: true });

    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          organization_id: organizationId,
          custom_js: JSON.stringify({ auto_deduct_inventory: enabled }),
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      if (error) throw error;

      dispatch({ type: 'SET_AUTO_DEDUCT_INVENTORY', payload: enabled });

      toast({
        title: 'تم حفظ الإعدادات',
        description: `تم ${enabled ? 'تفعيل' : 'إلغاء تفعيل'} خصم المخزون التلقائي`,
      });
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات خصم المخزون',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_UPDATING_INVENTORY_SETTINGS', payload: false });
    }
  }, [organizationId, toast]);

  const setStopDeskDialogOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_STOP_DESK_DIALOG_OPEN', payload: open });
  }, []);

  const setBulkAutoAssignOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_BULK_AUTO_ASSIGN_OPEN', payload: open });
  }, []);

  const setPendingShipmentData = useCallback((data: OrdersState['pendingShipmentData']) => {
    dispatch({ type: 'SET_PENDING_SHIPMENT_DATA', payload: data });
  }, []);

  // ============================================
  // Context Value
  // ============================================

  const value: OrdersContextValue = useMemo(() => ({
    // Data
    orders: orders as Order[],
    displayOrders: displayOrders as Order[],
    totalCount,
    loading,
    fetching,
    error: error as Error | null,

    // Stats
    orderCounts,
    orderStats,

    // Shared Data
    sharedData,

    // Pagination
    pagination,
    goToPage,

    // Filters
    filters: filters as unknown as OrderFilters,
    applyFilters,
    resetFilters,

    // View Mode
    viewMode: state.viewMode,
    setViewMode,
    visibleColumns: state.visibleColumns,
    setVisibleColumns,

    // Actions
    refresh,
    refreshStats,
    updateOrderLocally,
    updateOrderStatus,
    updateCallConfirmation,
    sendToProvider,

    // Inventory Settings
    autoDeductInventory: state.autoDeductInventory,
    updatingInventorySettings: state.updatingInventorySettings,
    toggleAutoDeductInventory,

    // Dialogs
    stopDeskDialogOpen: state.stopDeskDialogOpen,
    setStopDeskDialogOpen,
    bulkAutoAssignOpen: state.bulkAutoAssignOpen,
    setBulkAutoAssignOpen,
    pendingShipmentData: state.pendingShipmentData,
    setPendingShipmentData,
    handleStopDeskConfirm,

    // Confirmation assignments
    confirmationAssignmentsLoading,
    confirmationAssignmentsMissing,

    // User info
    currentUserId,
    organizationId,
    userRole,
  }), [
    orders,
    displayOrders,
    totalCount,
    loading,
    fetching,
    error,
    orderCounts,
    orderStats,
    sharedData,
    pagination,
    goToPage,
    filters,
    applyFilters,
    resetFilters,
    state.viewMode,
    setViewMode,
    state.visibleColumns,
    setVisibleColumns,
    refresh,
    refreshStats,
    updateOrderLocally,
    updateOrderStatus,
    updateCallConfirmation,
    sendToProvider,
    state.autoDeductInventory,
    state.updatingInventorySettings,
    toggleAutoDeductInventory,
    state.stopDeskDialogOpen,
    setStopDeskDialogOpen,
    state.bulkAutoAssignOpen,
    setBulkAutoAssignOpen,
    state.pendingShipmentData,
    setPendingShipmentData,
    handleStopDeskConfirm,
    confirmationAssignmentsLoading,
    confirmationAssignmentsMissing,
    currentUserId,
    organizationId,
    userRole,
  ]);

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};

// ============================================
// Hook
// ============================================

export const useOrders = (): OrdersContextValue => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

export default OrdersContext;
