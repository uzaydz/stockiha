import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, BarChart3, TrendingUp, Clock, Package } from 'lucide-react';
import { useOptimizedOrdersData } from '@/hooks/useOptimizedOrdersData';
import { OrdersTable } from '@/components/orders/table/OrdersTable';
import { OrderFilters } from '@/components/orders/filters/OrderFilters';
import { OrderStats } from '@/components/orders/stats/OrderStats';
import { formatCurrency } from '@/lib/utils';

interface OptimizedOrdersPageProps {
  enablePolling?: boolean;
  pollingInterval?: number;
  pageSize?: number;
}

export const OptimizedOrdersPage: React.FC<OptimizedOrdersPageProps> = ({
  enablePolling = false,
  pollingInterval = 60000,
  pageSize = 20,
}) => {
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
    updateFilters,
    goToPage,
    updateOrderLocally,
    refresh,
    getCacheStats,
    clearCache,
  } = useOptimizedOrdersData({
    pageSize,
    enablePolling,
    pollingInterval,
    enableCache: true,
  });

  const [showPerformance, setShowPerformance] = useState(false);

  // Debug functions
  const handleClearCache = useCallback(() => {
    clearCache();
    refresh();
  }, [clearCache, refresh]);

  const handleTogglePerformance = useCallback(() => {
    setShowPerformance(prev => !prev);
  }, []);

  // Filter handlers
  const handleStatusFilter = useCallback((status: string) => {
    applyFilters({ status });
  }, [applyFilters]);

  const handleSearchFilter = useCallback((searchTerm: string) => {
    applyFilters({ searchTerm });
  }, [applyFilters]);

  const handleDateFilter = useCallback((dateFrom: Date | null, dateTo: Date | null) => {
    applyFilters({ dateFrom, dateTo });
  }, [applyFilters]);

  const handleCallConfirmationFilter = useCallback((statusId: number | null) => {
    applyFilters({ callConfirmationStatusId: statusId });
  }, [applyFilters]);

  const handleShippingProviderFilter = useCallback((provider: string | null) => {
    applyFilters({ shippingProvider: provider });
  }, [applyFilters]);

  // Performance metrics
  const performanceMetrics = metadata?.performance;
  const cacheStats = getCacheStats();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الطلبات المحسنة</h1>
          <p className="text-muted-foreground">
            إدارة الطلبات بأداء محسن - استدعاء واحد يجلب كل البيانات
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Performance Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePerformance}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            الأداء
          </Button>
          
          {/* Cache Control */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            مسح التخزين المؤقت
          </Button>
          
          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Performance Panel */}
      {showPerformance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              معلومات الأداء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Query Performance */}
              <div className="space-y-2">
                <h4 className="font-medium">أداء الاستعلام</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>الوقت الإجمالي:</span>
                    <Badge variant="secondary">
                      {performanceMetrics?.totalDurationMs?.toFixed(2) || 0}ms
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>إصدار التحسين:</span>
                    <Badge variant="outline">
                      {performanceMetrics?.optimizationVersion || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>استعلام واحد:</span>
                    <Badge variant={performanceMetrics?.singleQuery ? "default" : "destructive"}>
                      {performanceMetrics?.singleQuery ? 'نعم' : 'لا'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Cache Stats */}
              <div className="space-y-2">
                <h4 className="font-medium">إحصائيات التخزين المؤقت</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>عدد المفاتيح:</span>
                    <Badge variant="secondary">{cacheStats.cacheSize}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>نضارة البيانات:</span>
                    <Badge variant="outline">
                      {metadata?.dataFreshness?.cacheStatus || 'fresh'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>آخر تحديث:</span>
                    <span className="text-xs text-muted-foreground">
                      {metadata?.dataFreshness?.fetchedAt ? 
                        new Date(metadata.dataFreshness.fetchedAt).toLocaleTimeString('ar-EG') : 
                        'غير محدد'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Stats */}
              <div className="space-y-2">
                <h4 className="font-medium">إحصائيات البيانات</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>عدد الطلبات:</span>
                    <Badge variant="secondary">{orders.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>إجمالي العدد:</span>
                    <Badge variant="secondary">{totalCount}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>الصفحة الحالية:</span>
                    <Badge variant="outline">{currentPage}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Step Performance */}
            {performanceMetrics?.steps && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">أداء الخطوات</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {performanceMetrics.steps.map((step: any, index: number) => (
                    <div key={index} className="text-xs bg-muted p-2 rounded">
                      <div className="font-medium">{step.step}</div>
                      <div className="text-muted-foreground">{step.duration_ms?.toFixed(2)}ms</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            حدث خطأ في جلب البيانات: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(orderStats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              متوسط قيمة الطلب: {formatCurrency(orderStats.avgOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(orderStats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {orderCounts.pending || 0} طلب معلق
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCounts.all || 0}</div>
            <p className="text-xs text-muted-foreground">
              في هذه الصفحة: {orders.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحالات</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(orderCounts)
                .filter(([status]) => status !== 'all')
                .slice(0, 3)
                .map(([status, count]) => (
                  <div key={status} className="flex justify-between text-xs">
                    <span className="capitalize">{status}</span>
                    <span>{count}</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلاتر</CardTitle>
          <CardDescription>
            استخدم الفلاتر أدناه للبحث في الطلبات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderFilters
            onStatusChange={handleStatusFilter}
            onSearchChange={handleSearchFilter}
            onDateRangeChange={handleDateFilter}
            onCallConfirmationChange={handleCallConfirmationFilter}
            onShippingProviderChange={handleShippingProviderFilter}
            currentStatus={filters.status}
            currentSearch={filters.searchTerm}
            currentDateFrom={filters.dateFrom}
            currentDateTo={filters.dateTo}
            currentCallConfirmationStatusId={filters.callConfirmationStatusId}
            currentShippingProvider={filters.shippingProvider}
            callConfirmationStatuses={sharedData.callConfirmationStatuses}
            shippingProviders={sharedData.shippingProviders}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>الطلبات</CardTitle>
              <CardDescription>
                عرض {orders.length} من أصل {totalCount} طلب
              </CardDescription>
            </div>
            
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <OrdersTable
            orders={orders}
            loading={loading}
            onOrderUpdate={updateOrderLocally}
            onLoadMore={loadMore}
            hasMore={hasMore}
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / pageSize)}
            onPageChange={goToPage}
            sharedData={sharedData}
          />
        </CardContent>
      </Card>

      {/* Pagination Info */}
      {metadata?.pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من أصل {totalCount} طلب
          </div>
          <div>
            الصفحة {currentPage} من {Math.ceil(totalCount / pageSize)}
          </div>
        </div>
      )}
    </div>
  );
};
