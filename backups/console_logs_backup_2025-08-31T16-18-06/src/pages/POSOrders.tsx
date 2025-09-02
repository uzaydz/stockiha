import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  RefreshCw, 
  Download, 
  Plus,
  Filter,
  BarChart3,
  AlertTriangle,
  Zap,
  TrendingUp
} from 'lucide-react';

// Layout component
import POSPureLayout from '@/components/pos-layout/POSPureLayout';

// Components - استخدام النسخ المحسنة
import { POSOrderStatsOptimized as POSOrderStats } from '../components/pos-orders/POSOrderStatsOptimized';
import { POSOrderFiltersOptimized as POSOrderFilters } from '../components/pos-orders/POSOrderFiltersOptimized';
import { POSOrdersTableOptimized as POSOrdersTable } from '../components/pos-orders/POSOrdersTableOptimized';
import { POSOrderDetails } from '../components/pos-orders/POSOrderDetails';
import { POSOrderActions } from '../components/pos-orders/POSOrderActions';

// Services
import { 
  POSOrdersService,
  type POSOrderWithDetails,
  type POSOrderFilters as FilterType,
  type POSOrderStats as StatsType
} from '../api/posOrdersService';

// Contexts
import { useOrganization } from '../hooks/useOrganization';
import { useTitle } from '../hooks/useTitle';

interface POSOrdersPageState {
  orders: POSOrderWithDetails[];
  stats: StatsType | null;
  employees: Array<{ id: string; name: string; email: string }>;
  filters: FilterType;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  selectedOrder: POSOrderWithDetails | null;
  showOrderDetails: boolean;
  showOrderActions: boolean;
}

const ITEMS_PER_PAGE = 20;

export const POSOrders: React.FC = () => {
  useTitle('طلبيات نقطة البيع');
  const { organization } = useOrganization();
  const posOrdersService = POSOrdersService.getInstance();

  const [state, setState] = useState<POSOrdersPageState>({
    orders: [],
    stats: null,
    employees: [],
    filters: {},
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    loading: true,
    statsLoading: true,
    error: null,
    selectedOrder: null,
    showOrderDetails: false,
    showOrderActions: false
  });

  // تحديث جزء من الحالة
  const updateState = useCallback((updates: Partial<POSOrdersPageState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // جلب الإحصائيات
  const fetchStats = useCallback(async () => {
    if (!organization?.id) return;

    updateState({ statsLoading: true });
    try {
      const stats = await posOrdersService.getPOSOrderStats(organization.id);
      updateState({ stats, statsLoading: false });
    } catch (error) {
      updateState({ statsLoading: false });
      toast.error('فشل في تحميل الإحصائيات');
    }
  }, [organization?.id, posOrdersService, updateState]);

  // جلب الطلبيات
  const fetchOrders = useCallback(async (page = 1, filters: FilterType = {}) => {
    if (!organization?.id) return;

    updateState({ loading: true, error: null });
    try {
      const result = await posOrdersService.getPOSOrders(
        organization.id,
        filters,
        page,
        ITEMS_PER_PAGE
      );

      // إضافة debugging للتحقق من البيانات

      updateState({
        orders: result.orders,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / ITEMS_PER_PAGE),
        currentPage: page,
        loading: false
      });
    } catch (error) {
      updateState({ 
        loading: false, 
        error: 'فشل في تحميل الطلبيات. يرجى المحاولة مرة أخرى.' 
      });
      toast.error('فشل في تحميل الطلبيات');
    }
  }, [organization?.id, posOrdersService, updateState]);

  // جلب الموظفين للفلترة
  const fetchEmployees = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const employees = await posOrdersService.getEmployeesForFilter(organization.id);
      updateState({ employees });
    } catch (error) {
    }
  }, [organization?.id, posOrdersService, updateState]);

  // التحميل الأولي
  useEffect(() => {
    if (organization?.id) {
      // مسح الكاش لضمان جلب البيانات المحدثة
      posOrdersService.clearCache(); // مسح جميع الكاش
      fetchStats();
      fetchOrders(1, {});
      fetchEmployees();
    }
  }, [organization?.id, fetchStats, fetchOrders, fetchEmployees, posOrdersService]);

  // معالج تغيير الفلاتر
  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    updateState({ filters: newFilters });
    fetchOrders(1, newFilters);
  }, [fetchOrders, updateState]);

  // معالج تغيير الصفحة
  const handlePageChange = useCallback((page: number) => {
    fetchOrders(page, state.filters);
  }, [fetchOrders, state.filters]);

  // تحديث البيانات
  const handleRefresh = useCallback(() => {
    Promise.all([
      fetchStats(),
      fetchOrders(state.currentPage, state.filters)
    ]);
  }, [fetchStats, fetchOrders, state.currentPage, state.filters]);

  // عرض تفاصيل الطلبية
  const handleOrderView = useCallback((order: POSOrderWithDetails) => {
    updateState({ 
      selectedOrder: order, 
      showOrderDetails: true,
      showOrderActions: false 
    });
  }, [updateState]);

  // تعديل الطلبية (فتح صفحة الإجراءات)
  const handleOrderEdit = useCallback((order: POSOrderWithDetails) => {
    updateState({ 
      selectedOrder: order, 
      showOrderActions: true,
      showOrderDetails: false 
    });
  }, [updateState]);

  // حذف الطلبية
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

  // طباعة الطلبية
  const handleOrderPrint = useCallback((order: POSOrderWithDetails) => {
    // هنا يمكن إضافة منطق الطباعة
    // مثلاً فتح نافذة جديدة مع قالب الطباعة
    toast.success('تم إرسال الطلبية للطباعة');
  }, []);

  // تحديث حالة الطلبية
  const handleStatusUpdate = useCallback(async (orderId: string, status: string, notes?: string) => {
    try {
      const success = await posOrdersService.updateOrderStatus(orderId, status, notes);
      if (success) {
        toast.success('تم تحديث حالة الطلبية بنجاح');
        handleRefresh();
        return true;
      } else {
        toast.error('فشل في تحديث حالة الطلبية');
        return false;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الطلبية');
      return false;
    }
  }, [posOrdersService, handleRefresh]);

  // تحديث حالة الدفع
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
        handleRefresh();
        return true;
      } else {
        toast.error('فشل في تحديث معلومات الدفع');
        return false;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الدفع');
      return false;
    }
  }, [posOrdersService, handleRefresh]);

  // تصدير البيانات
  const handleExport = useCallback(() => {
    // هنا يمكن إضافة منطق التصدير
    toast.info('ميزة التصدير قيد التطوير');
  }, []);

  // إغلاق النوافذ المنبثقة
  const closeDialogs = useCallback(() => {
    updateState({ 
      showOrderDetails: false, 
      showOrderActions: false, 
      selectedOrder: null 
    });
  }, [updateState]);

  if (!organization?.id) {
    return (
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
  }

  return (
    <POSPureLayout
      onRefresh={handleRefresh}
      isRefreshing={state.loading || state.statsLoading}
    >
      <div className="container mx-auto p-6 space-y-6">
      {/* رأس الصفحة */}
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
            disabled={state.loading || state.statsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
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
            onClick={() => {
              // هنا يمكن إضافة رابط لصفحة إنشاء طلبية جديدة
              toast.info('إنشاء طلبية جديدة قيد التطوير');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            طلبية جديدة
          </Button>
        </div>
      </div>

      {/* الإحصائيات */}
      <POSOrderStats
        stats={state.stats}
        loading={state.statsLoading}
        error={state.error}
      />

      {/* الفلاتر */}
      <POSOrderFilters
        filters={state.filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        loading={state.loading}
        employees={state.employees}
      />

      {/* جدول الطلبيات */}
      <POSOrdersTable
        orders={state.orders}
        loading={state.loading}
        error={state.error}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        totalItems={state.totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        onOrderView={handleOrderView}
        onOrderEdit={handleOrderEdit}
        onOrderDelete={handleOrderDelete}
        onOrderPrint={handleOrderPrint}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* تفاصيل الطلبية */}
      <POSOrderDetails
        order={state.selectedOrder}
        open={state.showOrderDetails}
        onClose={closeDialogs}
        onPrint={handleOrderPrint}
        onEdit={handleOrderEdit}
      />

      {/* إجراءات الطلبية */}
      {state.selectedOrder && (
        <Dialog 
          open={state.showOrderActions} 
          onOpenChange={(open) => !open && closeDialogs()}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                إجراءات الطلبية #{state.selectedOrder.slug?.slice(-8) || state.selectedOrder.id.slice(-8)}
              </DialogTitle>
            </DialogHeader>
            <POSOrderActions
              order={state.selectedOrder}
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
          </DialogContent>
        </Dialog>
      )}

      {/* معلومات إضافية */}
      {state.orders.length > 0 && !state.loading && (
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
                    عدد الطلبيات المعروضة: {state.orders.length} من أصل {state.totalItems}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                صفحة {state.currentPage} من {state.totalPages}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </POSPureLayout>
  );
};

export default POSOrders;
