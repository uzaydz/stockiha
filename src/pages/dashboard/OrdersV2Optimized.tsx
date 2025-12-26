import React, { lazy, Suspense, useCallback, useMemo, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOptimizedOrdersDataV2 } from '@/hooks/useOptimizedOrdersDataV2';

// استيراد ملف CSS المخصص لتحسين الأداء
import '@/components/orders/orders-performance.css';

const ResponsiveOrdersTable = lazy(() => import('@/components/orders/ResponsiveOrdersTable'));

const Loading = () => (
  <div className="p-4">
    <div className="h-8 w-40 bg-muted/40 rounded-md mb-4" />
    <div className="rounded-xl border border-border/30 shadow-sm overflow-hidden">
      <div className="h-[56px] bg-muted/20" />
      <div className="divide-y divide-border/20">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-background" />
        ))}
      </div>
    </div>
    <div className="min-h-[50vh]" />
  </div>
);

interface OrdersV2OptimizedProps extends POSSharedLayoutControls {}

/**
 * صفحة الطلبات المحسنة - نسخة V2 المحسنة
 *
 * التحسينات:
 * - استخدام RPCs جديدة خفيفة (get_orders_list_optimized)
 * - فصل البيانات المشتركة عن قائمة الطلبات
 * - استخدام React Query للـ caching الذكي
 * - Materialized Views للإحصائيات
 * - تقليل Egress بنسبة 80-90%
 */
const OrdersV2Optimized: React.FC<OrdersV2OptimizedProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
}) => {
  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  const { currentOrganization } = useTenant();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const perms = usePermissions();

  // استخدام الـ Hook المحسّن الجديد
  const {
    orders,
    totalCount,
    currentPage,
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
    refresh,
    refreshStats,
    updateOrderLocally,
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
      });
    }
  }, [onRegisterRefresh, refresh]);

  // Check permissions
  const canViewOrders = perms.ready ? perms.anyOf(['viewOrders', 'canViewOnlineOrders']) : false;

  if (!perms.ready) {
    return renderWithLayout(<Loading />);
  }

  if (!canViewOrders) {
    return renderWithLayout(
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>
            ليس لديك صلاحية لعرض الطلبات. يرجى التواصل مع المدير.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return renderWithLayout(
    <div className="orders-page-container p-4" dir="rtl">
      {/* Simple Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الطلبات الإلكترونية</h1>
            <p className="text-sm text-muted-foreground mt-1">
              إجمالي الطلبات: {totalCount?.toLocaleString() || 0}
            </p>
          </div>
          <button
            onClick={() => {
              refresh();
              refreshStats();
            }}
            disabled={loading || fetching}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {fetching ? (
              <>
                <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              'تحديث'
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {orderStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">إجمالي المبيعات</div>
            <div className="text-2xl font-bold mt-1">
              {orderStats.totalSales?.toLocaleString()} دج
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">متوسط قيمة الطلب</div>
            <div className="text-2xl font-bold mt-1">
              {orderStats.avgOrderValue?.toLocaleString()} دج
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">إجمالي الطلبات</div>
            <div className="text-2xl font-bold mt-1">
              {orderStats.totalOrders?.toLocaleString()}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">قيد الانتظار</div>
            <div className="text-2xl font-bold mt-1">
              {orderCounts?.pending?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="بحث برقم الطلب أو اسم العميل أو رقم الهاتف..."
          value={filters.search || ''}
          onChange={(e) => applyFilters({ search: e.target.value })}
          className="flex-1 px-4 py-2 border rounded-md"
        />
        <select
          value={filters.status || 'all'}
          onChange={(e) => applyFilters({ status: e.target.value === 'all' ? null : e.target.value })}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="confirmed">مؤكد</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-lg border">
        {loading && !orders.length ? (
          <Loading />
        ) : error ? (
          <div className="p-8 text-center">
            <Alert variant="destructive">
              <AlertTitle>خطأ في تحميل الطلبات</AlertTitle>
              <AlertDescription>
                {error.message || 'حدث خطأ أثناء تحميل الطلبات. يرجى المحاولة مرة أخرى.'}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Suspense fallback={<Loading />}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium">رقم الطلب</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">العميل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">الهاتف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">الولاية</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">المبلغ</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">
                        #{order.customer_order_number}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.customer?.name || 'غير محدد'}
                      </td>
                      <td className="px-4 py-3 text-sm" dir="ltr">
                        {order.customer?.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.form_data?.wilaya || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {order.total?.toLocaleString()} دج
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {metadata?.pagination && (
              <div className="border-t p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  صفحة {currentPage} من {metadata.pagination.totalPages}
                  ({totalCount?.toLocaleString()} طلب)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!metadata.pagination.hasPreviousPage || fetching}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!metadata.pagination.hasNextPage || fetching}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </Suspense>
        )}
      </div>

      {/* Performance Info (Dev Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-xs">
          <div className="font-bold mb-2">معلومات الأداء (Dev Mode)</div>
          <div>Orders: {orders.length}</div>
          <div>Total Count: {totalCount}</div>
          <div>Loading: {loading ? 'نعم' : 'لا'}</div>
          <div>Fetching: {fetching ? 'نعم' : 'لا'}</div>
          <div>Current Page: {currentPage}</div>
        </div>
      )}
    </div>
  );
};

export default OrdersV2Optimized;
