import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ShoppingCart,
  RefreshCw,
  Download,
  Plus,
  AlertTriangle,
  Zap,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

// PDF Export Utility
import { exportAndSavePdf, type POSOrderForExport, type ExportFilters } from '@/lib/pdf/arabicPdfExport';

// Layout component
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// Context
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

// Services
import { unifiedOrderService, type OrderStatus, type PaymentStatus } from '@/services/UnifiedOrderService';
import { supabase } from '@/lib/supabase';
import { powerSyncService } from '@/lib/powersync';

// ⚡ PowerSync Reactive Hooks - تحديث تلقائي فوري!
import {
  useReactivePOSOrders,
  useReactivePOSOrdersItems,
  type ReactivePOSOrder,
  type POSOrderStatus,
  type POSPaymentStatus
} from '@/hooks/powersync';

// Types
interface OptimizedPOSOrder {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  items_count: number;
  total_qty: number;
  effective_status?: string;
  effective_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
  order_items?: any[];
  admin_notes?: string;
  customer_notes?: string;
  is_online: boolean;
  metadata?: any;
  pos_order_type?: string;
  shipping_address_id?: string;
  shipping_cost?: number;
  shipping_method?: string;
}

interface POSOrderFilters {
  status?: OrderStatus;
  payment_method?: string;
  payment_status?: PaymentStatus;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  statuses?: OrderStatus[];
  payment_statuses?: PaymentStatus[];
}

interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  pending_payment_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  total_returned_amount?: number;
  orders_with_returns?: number;
  fully_returned_orders?: number;
  effective_revenue?: number;
  return_rate?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface POSOrdersOptimizedProps extends POSSharedLayoutControls {}

// Components
import { POSOrderStatsSimple as POSOrderStatsComponent } from '../components/pos-orders/POSOrderStatsSimple';
import { POSOrderFiltersOptimized as POSOrderFiltersComponent } from '../components/pos-orders/POSOrderFiltersOptimized';
import { POSOrdersTableSimple as POSOrdersTable } from '../components/pos-orders/POSOrdersTableSimple';
import { POSOrderDetails } from '../components/pos-orders/POSOrderDetails';
import { POSOrderActions } from '../components/pos-orders/POSOrderActions';
import { EditOrderItemsDialog } from '../components/pos-orders/EditOrderItemsDialog';
import EditOrderDialog from '../components/pos-orders/EditOrderDialog';
// ⚡ حوار الإرجاع السريع
import QuickReturnDialog from '../components/pos/QuickReturnDialog';

// 📖 دليل استخدام الطلبيات
import POSOrdersUserGuide, { POSOrdersHelpButton } from '../components/pos-orders/POSOrdersUserGuide';

// Hooks
import { useTitle } from '../hooks/useTitle';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// =================================================================
// 🎯 POSOrdersOptimized - النسخة المحسنة مع PowerSync Reactive
// =================================================================

interface DialogState {
  selectedOrder: OptimizedPOSOrder | null;
  showOrderDetails: boolean;
  showOrderActions: boolean;
  showEditItems: boolean;
  showEditOrder: boolean;
  showQuickReturn: boolean;
  showUserGuide: boolean;
}

export const POSOrdersOptimized: React.FC<POSOrdersOptimizedProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange,
}) => {
  useTitle('طلبيات نقطة البيع');

  const { tenant, currentOrganization } = useTenant();
  const { user, userProfile } = useAuth();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { isOffline } = useOfflineStatus();

  // الحالات المحلية
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<POSOrderFilters>({});
  const [dialogState, setDialogState] = useState<DialogState>({
    selectedOrder: null,
    showOrderDetails: false,
    showOrderActions: false,
    showEditItems: false,
    showEditOrder: false,
    showQuickReturn: false,
    showUserGuide: false
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const canViewOrders = perms.ready ? perms.anyOf(['accessPOS', 'canViewPosOrders', 'canManagePosOrders', 'manageOrders']) : false;
  const isUnauthorized = perms.ready && !canViewOrders;

  // صلاحيات الطلبيات
  const canUpdateStatus = useMemo(
    () => perms.anyOf(["updateOrderStatus", "manageOrders"]),
    [perms]
  );
  const canCancelOrder = useMemo(
    () => perms.anyOf(["cancelOrders", "manageOrders"]),
    [perms]
  );
  const canEditOrder = useMemo(
    () => perms.anyOf(["updateOrderStatus", "manageOrders"]),
    [perms]
  );
  const canDeleteOrder = useMemo(
    () => perms.anyOf(["cancelOrders", "manageOrders"]),
    [perms]
  );
  const canUpdatePayment = useMemo(
    () => perms.anyOf(["processPayments", "manageOrders"]),
    [perms]
  );

  // ⚡ PowerSync Reactive Hooks - تحديث تلقائي فوري!
  const {
    orders: rawOrders,
    isLoading,
    isFetching,
    error,
    total,
    pagination,
    stats: reactiveStats
  } = useReactivePOSOrders({
    status: filters.statuses?.[0] as POSOrderStatus || filters.status as POSOrderStatus,
    paymentStatus: filters.payment_statuses?.[0] as POSPaymentStatus || filters.payment_status as POSPaymentStatus,
    employeeId: filters.employee_id,
    fromDate: filters.date_from,
    toDate: filters.date_to,
    search: filters.search,
    page: currentPage,
    pageSize,
    enabled: !isUnauthorized && !!currentOrganization?.id
  });

  // جلب عناصر الطلبيات دفعة واحدة
  const orderIds = useMemo(() => rawOrders.map(o => o.id), [rawOrders]);
  const { itemsByOrder, isLoading: itemsLoading } = useReactivePOSOrdersItems(orderIds);

  // ⚡ تحويل الطلبيات من ReactivePOSOrder إلى OptimizedPOSOrder
  const orders = useMemo(() => {
    return rawOrders.map((o: ReactivePOSOrder): OptimizedPOSOrder => {
      const items = itemsByOrder.get(o.id) || [];
      return {
        id: o.id,
        organization_id: o.organization_id,
        customer_id: o.customer_id || undefined,
        employee_id: o.employee_id || undefined,
        slug: o.order_number || o.id.slice(-8),
        status: o.status,
        payment_status: o.payment_status,
        payment_method: o.payment_method || 'cash',
        total: o.total,
        subtotal: o.subtotal,
        tax: o.tax,
        discount: o.discount || undefined,
        amount_paid: o.amount_paid,
        remaining_amount: o.remaining_amount,
        notes: o.notes || undefined,
        created_at: o.created_at,
        updated_at: o.updated_at,
        customer: o.customer_name ? {
          id: o.customer_id || '',
          name: o.customer_name
        } : undefined,
        employee: o.employee_name ? {
          id: o.employee_id || '',
          name: o.employee_name,
          email: ''
        } : undefined,
        items_count: o.items_count || items.length,
        total_qty: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        is_online: o.is_online,
        order_items: items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_wholesale: item.is_wholesale,
          original_price: item.original_price,
          color_id: item.color_id,
          color_name: item.color_name,
          size_id: item.size_id,
          size_name: item.size_name,
          // ⚡ حقول نوع البيع ووحدة البيع
          sale_type: item.sale_type,
          selling_unit_type: item.selling_unit_type,
          // بيع الوزن
          weight_sold: item.weight_sold,
          weight_unit: item.weight_unit,
          price_per_weight_unit: item.price_per_weight_unit,
          // بيع المتر
          meters_sold: item.meters_sold,
          price_per_meter: item.price_per_meter,
          // بيع العلبة/الصندوق
          boxes_sold: item.boxes_sold,
          units_per_box: item.units_per_box,
          box_price: item.box_price,
          // معلومات المتغيرات
          variant_display_name: item.variant_display_name,
          variant_info: item.variant_info
        }))
      };
    });
  }, [rawOrders, itemsByOrder]);

  // ⚡ تحويل الإحصائيات
  const stats: POSOrderStats = useMemo(() => ({
    total_orders: reactiveStats.totalOrders,
    total_revenue: reactiveStats.totalRevenue,
    completed_orders: reactiveStats.completedOrders,
    pending_orders: reactiveStats.pendingOrders,
    pending_payment_orders: reactiveStats.unpaidOrders + reactiveStats.partialOrders,
    cancelled_orders: reactiveStats.cancelledOrders,
    cash_orders: reactiveStats.cashOrders,
    card_orders: reactiveStats.cardOrders,
    avg_order_value: reactiveStats.avgOrderValue,
    today_orders: reactiveStats.todayOrders,
    today_revenue: reactiveStats.todayRevenue
  }), [reactiveStats]);

  // ⚡ PowerSync يدير التحديثات تلقائياً - handleRefresh للمزامنة اليدوية فقط
  const handleRefresh = useCallback(async () => {
    if (!isOnline || !currentOrganization?.id) return;

    setIsSyncing(true);
    try {
      // مزامنة عبر PowerSync
      await powerSyncService.forceSync();

      // إبطال cache React Query
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });

      toast.success('تم تحديث البيانات بنجاح');
      // ⚡ PowerSync سيحدث البيانات تلقائياً!
    } catch (err) {
      console.warn('[POSOrdersOptimized] forceSync error:', err);
      toast.error('فشل في تحديث البيانات');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, currentOrganization?.id, queryClient]);

  useEffect(() => {
    if (isUnauthorized || !onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh, isUnauthorized]);

  useEffect(() => {
    if (isUnauthorized || !onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: isFetching || isSyncing,
      connectionStatus: isOffline ? 'disconnected' : isFetching ? 'reconnecting' : 'connected'
    });
  }, [onLayoutStateChange, isFetching, isSyncing, isOffline, isUnauthorized]);

  // ⚡ الاستماع لحدث إنشاء طلبية جديدة
  useEffect(() => {
    if (isUnauthorized) return;

    const handleOrderCreated = () => {
      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => handleRefresh(), 500);
      }
    };

    window.addEventListener('pos-order-created', handleOrderCreated as EventListener);
    return () => {
      window.removeEventListener('pos-order-created', handleOrderCreated as EventListener);
    };
  }, [handleRefresh, isOnline, isUnauthorized]);

  const renderWithLayout = (
    children: React.ReactNode,
    overrides?: {
      isRefreshing?: boolean;
      connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
    }
  ) => {
    if (!useStandaloneLayout) {
      return children;
    }

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={overrides?.isRefreshing ?? (isFetching && isOnline)}
        connectionStatus={overrides?.connectionStatus ?? (isOffline ? 'disconnected' : 'connected')}
      >
        {children}
      </POSPureLayout>
    );
  };

  // معالج تغيير الفلاتر
  const handleFiltersChange = useCallback((newFilters: POSOrderFilters) => {
    const filtersChanged = JSON.stringify(newFilters) !== JSON.stringify(filters);
    if (filtersChanged) {
      setFilters(newFilters);
      setCurrentPage(1);
    }
  }, [filters]);

  // معالج تغيير الصفحة
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  // عرض تفاصيل الطلبية
  const handleOrderView = useCallback((order: OptimizedPOSOrder) => {
    setDialogState({
      selectedOrder: order,
      showOrderDetails: true,
      showOrderActions: false,
      showEditItems: false,
      showEditOrder: false
    });
  }, []);

  // تعديل الطلبية
  const handleOrderEdit = useCallback((order: OptimizedPOSOrder) => {
    if (!canEditOrder) {
      toast.error('ليس لديك صلاحية لتعديل الطلبية');
      return;
    }
    setDialogState({
      selectedOrder: order,
      showOrderActions: false,
      showOrderDetails: false,
      showEditItems: false,
      showEditOrder: true
    });
  }, [canEditOrder]);

  // حذف الطلبية
  const handleOrderDelete = useCallback(async (order: OptimizedPOSOrder) => {
    if (!canDeleteOrder) {
      toast.error('ليس لديك صلاحية لحذف الطلبية');
      return false;
    }
    try {
      unifiedOrderService.setOrganizationId(currentOrganization?.id || '');
      await unifiedOrderService.deleteOrder(order.id);

      toast.success('تم حذف الطلبية بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));

      if (dialogState.selectedOrder?.id === order.id) {
        closeDialogs();
      }

      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => handleRefresh(), 500);
      }

      return true;
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الطلبية');
      return false;
    }
  }, [handleRefresh, dialogState.selectedOrder, canDeleteOrder, currentOrganization?.id, isOnline]);

  // طباعة الطلبية
  const handleOrderPrint = useCallback((order: OptimizedPOSOrder) => {
    toast.success('تم إرسال الطلبية للطباعة');
  }, []);

  // تحديث حالة الطلبية
  const handleStatusUpdate = useCallback(async (orderId: string, status: string, notes?: string) => {
    if (status === 'cancelled') {
      if (!canCancelOrder) {
        toast.error('ليس لديك صلاحية لإلغاء الطلبية');
        return false;
      }
    } else if (!canUpdateStatus) {
      toast.error('ليس لديك صلاحية لتحديث حالة الطلبية');
      return false;
    }

    try {
      unifiedOrderService.setOrganizationId(currentOrganization?.id || '');
      await unifiedOrderService.updateOrderStatus(orderId, status as OrderStatus);

      toast.success('تم تحديث حالة الطلبية بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));

      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => handleRefresh(), 500);
      }

      return true;
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الطلبية');
      return false;
    }
  }, [canUpdateStatus, canCancelOrder, currentOrganization?.id, isOnline, handleRefresh]);

  // تحديث حالة الدفع
  const handlePaymentUpdate = useCallback(async (
    orderId: string,
    paymentStatus: string,
    amountPaid?: number,
    paymentMethod?: string
  ) => {
    if (!canUpdatePayment) {
      toast.error('ليس لديك صلاحية لتحديث الدفع');
      return false;
    }

    try {
      unifiedOrderService.setOrganizationId(currentOrganization?.id || '');
      await unifiedOrderService.updatePayment(orderId, amountPaid || 0, paymentStatus as PaymentStatus);

      toast.success('تم تحديث معلومات الدفع بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));

      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => handleRefresh(), 500);
      }

      return true;
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الدفع');
      return false;
    }
  }, [canUpdatePayment, currentOrganization?.id, isOnline, handleRefresh]);

  // تصدير البيانات - PDF أو Excel مع دعم Tauri
  const handleExport = useCallback(async (type: 'pdf' | 'excel') => {
    if (orders.length === 0) {
      toast.error('لا توجد طلبيات للتصدير');
      return;
    }

    const loadingToast = toast.loading(`جاري تحضير ملف ${type === 'pdf' ? 'PDF' : 'Excel'}...`);

    try {
      // معلومات الفلترة الحالية
      const getFilterInfo = () => {
        const parts: string[] = [];
        if (filters.status) {
          const statusMap: Record<string, string> = {
            completed: 'مكتمل', pending: 'معلق', cancelled: 'ملغي', processing: 'قيد المعالجة'
          };
          parts.push(`الحالة: ${statusMap[filters.status] || filters.status}`);
        }
        if (filters.payment_status) {
          const paymentMap: Record<string, string> = {
            paid: 'مدفوع', unpaid: 'غير مدفوع', partial: 'مدفوع جزئياً'
          };
          parts.push(`الدفع: ${paymentMap[filters.payment_status] || filters.payment_status}`);
        }
        if (filters.date_from && filters.date_to) {
          parts.push(`الفترة: ${filters.date_from} إلى ${filters.date_to}`);
        } else if (filters.date_from) {
          parts.push(`من: ${filters.date_from}`);
        } else if (filters.date_to) {
          parts.push(`حتى: ${filters.date_to}`);
        }
        if (filters.search) {
          parts.push(`بحث: ${filters.search}`);
        }
        return parts.length > 0 ? parts.join(' | ') : 'جميع الطلبيات';
      };

      // تحضير بيانات التصدير من الطلبيات المفلترة الحالية
      const exportData = orders.map(order => ({
        'رقم الطلبية': order.customer_order_number || order.slug?.slice(-6) || order.id.slice(-6),
        'العميل': order.customer?.name || 'زبون عابر',
        'الموظف': order.employee?.name || '—',
        'عدد المنتجات': order.items_count || 0,
        'الحالة': order.status === 'completed' ? 'مكتمل' :
                 order.status === 'pending' ? 'معلق' :
                 order.status === 'cancelled' ? 'ملغي' :
                 order.status === 'processing' ? 'قيد المعالجة' : order.status,
        'حالة الدفع': order.payment_status === 'paid' ? 'مدفوع' :
                      order.payment_status === 'unpaid' ? 'غير مدفوع' :
                      order.payment_status === 'partial' ? 'مدفوع جزئياً' : order.payment_status,
        'الإجمالي': order.total,
        'المدفوع': order.amount_paid || 0,
        'المتبقي': (order.total || 0) - (order.amount_paid || 0),
        'التاريخ': format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')
      }));

      // حساب الإجماليات
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalPaid = orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
      const totalRemaining = totalRevenue - totalPaid;

      if (type === 'excel') {
        // تصدير Excel باستخدام xlsx - يدعم العربية بشكل ممتاز
        const XLSX = await import('xlsx');

        // إنشاء ورقة العمل مع البيانات
        const wsData = [
          // عنوان التقرير
          ['تقرير طلبيات نقطة البيع'],
          [`تاريخ التقرير: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
          [`الفلترة: ${getFilterInfo()}`],
          [`عدد الطلبيات: ${orders.length}`],
          [], // صف فارغ
          // رؤوس الأعمدة
          ['رقم الطلبية', 'العميل', 'الموظف', 'عدد المنتجات', 'الحالة', 'حالة الدفع', 'الإجمالي (د.ج)', 'المدفوع (د.ج)', 'المتبقي (د.ج)', 'التاريخ'],
          // البيانات
          ...exportData.map(row => [
            row['رقم الطلبية'],
            row['العميل'],
            row['الموظف'],
            row['عدد المنتجات'],
            row['الحالة'],
            row['حالة الدفع'],
            row['الإجمالي'],
            row['المدفوع'],
            row['المتبقي'],
            row['التاريخ']
          ]),
          [], // صف فارغ
          // الإجماليات
          ['', '', '', '', '', 'الإجمالي:', totalRevenue, totalPaid, totalRemaining, '']
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(wsData);

        // تنسيق عرض الأعمدة
        worksheet['!cols'] = [
          { wch: 14 }, // رقم الطلبية
          { wch: 22 }, // العميل
          { wch: 18 }, // الموظف
          { wch: 14 }, // عدد المنتجات
          { wch: 14 }, // الحالة
          { wch: 14 }, // حالة الدفع
          { wch: 14 }, // الإجمالي
          { wch: 14 }, // المدفوع
          { wch: 14 }, // المتبقي
          { wch: 18 }, // التاريخ
        ];

        // دمج خلايا العنوان
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // عنوان التقرير
          { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // تاريخ التقرير
          { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, // الفلترة
          { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } }, // عدد الطلبيات
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلبيات');

        // إنشاء الملف
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // التحقق من Electron
        const w = window as any;
        const isElectron = !!w.electronAPI;

        if (isElectron && w.electronAPI?.saveFile) {
          // حفظ في Electron
          const fileName = `POS_Orders_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
          const arrayBuffer = await blob.arrayBuffer();
          const result = await w.electronAPI.saveFile({
            defaultPath: fileName,
            filters: [{ name: 'Excel', extensions: ['xlsx'] }],
            data: new Uint8Array(arrayBuffer)
          });

          if (result.success) {
            toast.dismiss(loadingToast);
            toast.success('تم حفظ ملف Excel بنجاح');
          } else {
            toast.dismiss(loadingToast);
          }
        } else {
          // تحميل عادي في المتصفح
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `POS_Orders_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
          toast.dismiss(loadingToast);
          toast.success('تم تحميل ملف Excel بنجاح');
        }
      } else {
        // ⚡ تصدير PDF بالعربية باستخدام خط Amiri
        toast.dismiss(loadingToast);

        // تحضير البيانات للتصدير
        const ordersForExport: POSOrderForExport[] = orders.map(order => ({
          id: order.id,
          customer_order_number: order.customer_order_number,
          slug: order.slug,
          customer: order.customer,
          employee: order.employee,
          items_count: order.items_count,
          status: order.status,
          payment_status: order.payment_status,
          total: order.total,
          amount_paid: order.amount_paid,
          created_at: order.created_at
        }));

        const exportFilters: ExportFilters = {
          status: filters.status,
          payment_status: filters.payment_status,
          date_from: filters.date_from,
          date_to: filters.date_to,
          search: filters.search
        };

        // استخدام وظيفة التصدير العربية
        const result = await exportAndSavePdf(
          ordersForExport,
          exportFilters,
          (message) => toast.loading(message, { id: 'pdf-progress' })
        );

        toast.dismiss('pdf-progress');

        if (result.success) {
          toast.success('تم حفظ ملف PDF بنجاح');
        } else if (result.error && result.error !== 'تم إلغاء الحفظ') {
          toast.error(result.error || 'حدث خطأ أثناء التصدير');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss(loadingToast);
      toast.error('حدث خطأ أثناء التصدير');
    }
  }, [orders, filters]);

  // إغلاق النوافذ المنبثقة
  const closeDialogs = useCallback(() => {
    setDialogState({
      showOrderDetails: false,
      showOrderActions: false,
      showEditItems: false,
      showEditOrder: false,
      showQuickReturn: false,
      showUserGuide: false,
      selectedOrder: null
    });
  }, []);

  // فتح دليل الاستخدام
  const handleOpenUserGuide = useCallback(() => {
    setDialogState(prev => ({ ...prev, showUserGuide: true }));
  }, []);

  // ⚡ فتح حوار الإرجاع السريع
  const handleQuickReturn = useCallback((order: OptimizedPOSOrder) => {
    // لا يمكن إرجاع الطلبيات الملغاة
    if (order.status === 'cancelled') {
      toast.error('لا يمكن إرجاع طلبية ملغاة');
      return;
    }
    setDialogState({
      selectedOrder: order,
      showOrderDetails: false,
      showOrderActions: false,
      showEditItems: false,
      showEditOrder: false,
      showQuickReturn: true
    });
  }, []);

  // فتح نافذة تعديل العناصر
  const handleEditItems = useCallback((order: OptimizedPOSOrder) => {
    if (!canEditOrder) {
      toast.error('ليس لديك صلاحية لتعديل عناصر الطلبية');
      return;
    }
    setDialogState({
      selectedOrder: order,
      showEditItems: true,
      showOrderDetails: false,
      showOrderActions: false,
      showEditOrder: false
    });
  }, [canEditOrder]);

  // حفظ عناصر الطلبية المحدثة
  const handleSaveItems = useCallback(async (orderId: string, updatedItems: any[]) => {
    try {
      toast.success('تم تحديث عناصر الطلبية بنجاح');

      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => handleRefresh(), 500);
      }

      return true;
    } catch (error) {
      toast.error('فشل في تحديث عناصر الطلبية');
      return false;
    }
  }, [isOnline, handleRefresh]);

  // عدم الصلاحية
  if (isUnauthorized) {
    return renderWithLayout(
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-10 w-10 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold mb-1">غير مصرح</h3>
            <p className="text-sm text-muted-foreground text-center">
              لا تملك صلاحية الوصول إلى طلبيات نقطة البيع.
            </p>
          </CardContent>
        </Card>
      </div>,
      {
        isRefreshing: false,
        connectionStatus: isOffline ? 'disconnected' : 'connected'
      }
    );
  }

  // معالجة حالات التحميل والأخطاء
  if (error && !isOffline) {
    return renderWithLayout(
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error?.message || 'حدث خطأ أثناء تحميل بيانات طلبيات نقطة البيع'}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>,
      {
        isRefreshing: isLoading,
        connectionStatus: 'disconnected'
      }
    );
  }

  // حالة التحميل
  if (isLoading && orders.length === 0) {
    return renderWithLayout(
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">جاري تحميل طلبيات نقطة البيع</h3>
          <p className="text-sm text-muted-foreground">يرجى الانتظار...</p>
        </div>
      </div>,
      {
        isRefreshing: true,
        connectionStatus: 'reconnecting'
      }
    );
  }

  const mainContent = (
    <div className="space-y-4" dir="rtl">
      {/* مؤشر حالة الأوفلاين */}
      {isOffline && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            وضع الأوفلاين - البيانات المحلية
          </p>
        </div>
      )}

      {/* رأس الصفحة - Apple Style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">الطلبيات</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-numeric">{total}</span> طلبية
            </p>
          </div>
        </div>

        {/* زر دليل الاستخدام */}
        <POSOrdersHelpButton onClick={handleOpenUserGuide} />
      </div>

      {/* الإحصائيات */}
      <POSOrderStatsComponent
        stats={stats}
        loading={isFetching}
        error={null}
      />

      {/* الفلاتر */}
      <POSOrderFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        loading={isFetching}
        employees={[]}
      />

      {/* جدول الطلبيات */}
      <POSOrdersTable
        orders={orders}
        loading={isFetching || itemsLoading}
        error={null}
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={handlePageChange}
        onOrderView={handleOrderView as any}
        onOrderEdit={handleOrderEdit as any}
        onOrderDelete={handleOrderDelete as any}
        onOrderPrint={handleOrderPrint as any}
        onStatusUpdate={handleStatusUpdate}
        onOrderReturn={handleQuickReturn as any}
      />

      {/* تفاصيل الطلبية */}
      <POSOrderDetails
        order={dialogState.selectedOrder as any}
        open={dialogState.showOrderDetails}
        onClose={closeDialogs}
        onPrint={handleOrderPrint as any}
        onEdit={handleOrderEdit as any}
      />

      {/* إجراءات الطلبية */}
      {dialogState.selectedOrder && (
        <Dialog
          open={dialogState.showOrderActions}
          onOpenChange={(open) => !open && closeDialogs()}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                إجراءات الطلبية #{dialogState.selectedOrder.slug?.slice(-8) || dialogState.selectedOrder.id.slice(-8)}
              </DialogTitle>
            </DialogHeader>
            <POSOrderActions
              order={dialogState.selectedOrder as any}
              onStatusUpdate={handleStatusUpdate}
              onPaymentUpdate={handlePaymentUpdate}
              onDelete={async (orderId) => {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                  return await handleOrderDelete(order);
                }
                return false;
              }}
              onPrint={handleOrderPrint as any}
              onRefresh={handleRefresh}
              onEditItems={handleEditItems as any}
              permissions={{
                updateStatus: canUpdateStatus,
                cancel: canCancelOrder,
                updatePayment: canUpdatePayment,
                delete: canDeleteOrder,
                editItems: canEditOrder,
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* رسالة عدم وجود بيانات */}
      {orders.length === 0 && !isFetching && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد طلبيات</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              لم يتم العثور على أي طلبيات نقطة بيع تطابق الفلاتر المحددة.
            </p>
            <Button onClick={() => setFilters({})}>
              <RefreshCw className="h-4 w-4 mr-2" />
              إزالة الفلاتر
            </Button>
          </CardContent>
        </Card>
      )}

      {/* نافذة تعديل عناصر الطلبية */}
      <EditOrderItemsDialog
        order={dialogState.selectedOrder as any}
        open={dialogState.showEditItems}
        onClose={closeDialogs}
        onSave={handleSaveItems}
        onRefresh={handleRefresh}
      />

      {/* نافذة تعديل الطلبية الشاملة */}
      <EditOrderDialog
        isOpen={dialogState.showEditOrder}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(prev => ({ ...prev, showEditOrder: false }));
          }
        }}
        order={dialogState.selectedOrder as any}
        onOrderUpdated={async () => {
          // ⚡ PowerSync سيحدث البيانات تلقائياً!
          if (isOnline) {
            await handleRefresh();
          }
          setDialogState(prev => ({ ...prev, showEditOrder: false, selectedOrder: null }));
        }}
      />

      {/* ⚡ حوار الإرجاع السريع */}
      <QuickReturnDialog
        isOpen={dialogState.showQuickReturn}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(prev => ({ ...prev, showQuickReturn: false, selectedOrder: null }));
          }
        }}
        preselectedOrder={dialogState.selectedOrder ? {
          id: dialogState.selectedOrder.id,
          customer_order_number: dialogState.selectedOrder.customer_order_number || dialogState.selectedOrder.slug,
          customer_id: dialogState.selectedOrder.customer_id,
          customer_name: dialogState.selectedOrder.customer?.name,
          total: dialogState.selectedOrder.total,
          created_at: dialogState.selectedOrder.created_at,
          order_items: dialogState.selectedOrder.order_items?.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            color_id: item.color_id,
            color_name: item.color_name,
            size_id: item.size_id,
            size_name: item.size_name,
            selling_unit_type: item.selling_unit_type,
            weight_sold: item.weight_sold,
            weight_unit: item.weight_unit,
            price_per_weight_unit: item.price_per_weight_unit,
            meters_sold: item.meters_sold,
            price_per_meter: item.price_per_meter,
            boxes_sold: item.boxes_sold,
            units_per_box: item.units_per_box,
            box_price: item.box_price,
            is_wholesale: item.is_wholesale,
            sale_type: item.sale_type
          }))
        } : null}
        onReturnCreated={() => {
          toast.success('تم إنشاء طلب الإرجاع بنجاح');
          setDialogState(prev => ({ ...prev, showQuickReturn: false, selectedOrder: null }));
          // ⚡ PowerSync سيحدث البيانات تلقائياً!
          if (isOnline) {
            setTimeout(() => handleRefresh(), 500);
          }
        }}
      />

      {/* 📖 دليل استخدام الطلبيات */}
      <POSOrdersUserGuide
        open={dialogState.showUserGuide}
        onOpenChange={(open) => {
          setDialogState(prev => ({ ...prev, showUserGuide: open }));
        }}
      />
    </div>
  );

  return renderWithLayout(mainContent);
};

export default POSOrdersOptimized;
