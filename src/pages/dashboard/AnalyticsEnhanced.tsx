/**
 * Analytics Dashboard المحسّن 100%
 * - RLS: كل مسؤول يرى بياناته فقط
 * - Real-time updates
 * - Advanced filters
 * - Export capabilities
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Download, RefreshCw } from 'lucide-react';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';

// مكونات محسّنة
import {
  KPIGrid,
  FilterBar,
  AdvancedChart
} from '@/components/analytics/enhanced';

// Hook التحليلات
import { useAnalytics, useRealtimeAnalytics } from '@/hooks/useAnalytics';

// Export System
import ExportButton from '@/components/analytics/ExportButton';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsEnhancedProps extends POSSharedLayoutControls {}

// ============================================================================
// Component
// ============================================================================

const AnalyticsEnhanced: React.FC<AnalyticsEnhancedProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const perms = usePermissions();

  // Analytics Hook مع RLS تلقائي
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
    filters,
    setFilters
  } = useAnalytics();

  // Real-time updates
  const { lastUpdate, isRealtime, setIsRealtime } = useRealtimeAnalytics(true, 30000);

  // Auto-refresh عند التحديث
  useEffect(() => {
    if (isRealtime) {
      refetch();
    }
  }, [lastUpdate, isRealtime, refetch]);

  // تحضير بيانات الرسوم البيانية
  const prepareChartData = () => {
    if (!analyticsData) return { timeSeries: [], topProducts: [], channels: [], paymentMethods: [] };

    // بيانات الإيرادات عبر الزمن
    const timeSeries = analyticsData.timeSeries.map(item => ({
      name: formatDate(item.date),
      'الإيرادات': item.revenue,
      'الأرباح': item.profit,
      'الطلبات': item.orders
    }));

    // أفضل المنتجات
    const topProducts = analyticsData.topProducts.slice(0, 10).map(p => ({
      name: p.productName.length > 20 ? p.productName.substring(0, 20) + '...' : p.productName,
      'الإيرادات': p.revenue,
      'الأرباح': p.profit
    }));

    // القنوات
    const channels = analyticsData.channels.map(c => ({
      name: c.channel === 'pos' ? 'نقاط البيع' : 'أونلاين',
      value: c.revenue,
      'عدد الطلبات': c.orders
    }));

    // طرق الدفع
    const paymentMethods = analyticsData.paymentMethods.map(p => ({
      name: p.method,
      value: p.amount,
      'العدد': p.count
    }));

    return { timeSeries, topProducts, channels, paymentMethods };
  };

  const chartData = prepareChartData();

  // تنسيق التاريخ
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-DZ', {
      month: 'short',
      day: 'numeric'
    });
  }

  // معالج التصدير
  const handleExport = () => {
    if (!analyticsData) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    // سيتم استخدام ExportButton component
    toast.info('جاري تحضير التصدير...');
  };

  // معالج التحديث
  const handleRefresh = async () => {
    toast.loading('جاري تحديث البيانات...', { id: 'refresh' });
    await refetch();
    toast.success('تم التحديث بنجاح', { id: 'refresh' });
  };

  // دالة renderWithLayout
  const renderWithLayout = (children: React.ReactNode) => {
    if (!useStandaloneLayout) {
      return children;
    }
    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        connectionStatus={error ? 'disconnected' : 'connected'}
      >
        {children}
      </POSPureLayout>
    );
  };

  // التحقق من الصلاحيات
  if (perms.ready && !perms.anyOf(['viewSalesReports', 'viewReports'])) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>
            لا تملك صلاحية الوصول إلى تحليلات المبيعات.
            <br />
            <span className="text-xs text-muted-foreground">
              يتم تطبيق RLS - كل مسؤول يرى بياناته فقط
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Register refresh
  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(() => refetch());
    return () => onRegisterRefresh(null);
  }, [onRegisterRefresh, refetch]);

  // Layout state
  useEffect(() => {
    if (!onLayoutStateChange) return;
    const state: POSLayoutState = {
      isRefreshing: isLoading,
      connectionStatus: error ? 'disconnected' : 'connected',
      executionTime: undefined,
    };
    onLayoutStateChange(state);
  }, [onLayoutStateChange, isLoading, error]);

  const pageContent = (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            تحليلات المبيعات المحسّنة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization?.name || 'مؤسستي'}
            {' • '}
            <span className="text-green-600 dark:text-green-400">
              {isRealtime ? '🟢 تحديث تلقائي' : '⚪ متوقف'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRealtime(!isRealtime)}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRealtime ? 'animate-spin' : ''}`} />
            {isRealtime ? 'إيقاف التحديث' : 'تفعيل التحديث'}
          </Button>

          {/* Export Button */}
          {analyticsData && (
            <ExportButton
              data={{
                summary: analyticsData.financial,
                salesData: analyticsData.timeSeries,
                productsData: analyticsData.topProducts,
                expensesData: []
              }}
              organizationName={currentOrganization?.name}
              period={filters.period}
              dateRange={filters.dateRange}
              variant="outline"
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && !analyticsData && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      )}

      {/* Main Content */}
      {analyticsData && (
        <>
          {/* KPI Grid */}
          <KPIGrid
            financial={analyticsData.financial}
            isLoading={isLoading}
          />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* الإيرادات والأرباح عبر الزمن */}
            <AdvancedChart
              title="الإيرادات والأرباح"
              subtitle={`${chartData.timeSeries.length} نقطة بيانات`}
              type="area"
              data={chartData.timeSeries}
              dataKeys={['الإيرادات', 'الأرباح']}
              colors={['#FC5D41', '#10B981']}
              showGrid={true}
              showLegend={true}
              trend={analyticsData.financial.revenueGrowth !== undefined ? {
                value: analyticsData.financial.revenueGrowth,
                label: 'مقارنة بالفترة السابقة'
              } : undefined}
              formatValue={(value) => `${value.toLocaleString('ar-DZ')} دج`}
            />

            {/* أفضل المنتجات */}
            <AdvancedChart
              title="أفضل 10 منتجات"
              subtitle="حسب الإيرادات"
              type="bar"
              data={chartData.topProducts}
              dataKeys={['الإيرادات', 'الأرباح']}
              colors={['#3B82F6', '#10B981']}
              showGrid={true}
              showLegend={true}
              formatValue={(value) => `${value.toLocaleString('ar-DZ')} دج`}
            />

            {/* توزيع القنوات */}
            <AdvancedChart
              title="توزيع المبيعات حسب القناة"
              subtitle={`${analyticsData.channels.length} قنوات`}
              type="donut"
              data={chartData.channels}
              colors={['#FC5D41', '#10B981']}
              showLegend={true}
              formatValue={(value) => `${value.toLocaleString('ar-DZ')} دج`}
            />

            {/* طرق الدفع */}
            <AdvancedChart
              title="طرق الدفع"
              subtitle="توزيع المدفوعات"
              type="pie"
              data={chartData.paymentMethods}
              colors={['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6']}
              showLegend={true}
              formatValue={(value) => `${value.toLocaleString('ar-DZ')} دج`}
            />
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 gap-6">
            {/* عدد الطلبات عبر الزمن */}
            <AdvancedChart
              title="عدد الطلبات عبر الزمن"
              subtitle="تتبع حجم المبيعات"
              type="line"
              data={chartData.timeSeries}
              dataKeys={['الطلبات']}
              colors={['#3B82F6']}
              height={250}
              showGrid={true}
              formatValue={(value) => value.toString()}
            />
          </div>

          {/* Metadata */}
          <div className="text-center text-xs text-muted-foreground">
            آخر تحديث: {analyticsData.metadata.lastUpdated.toLocaleString('ar-DZ')}
            {' • '}
            {analyticsData.metadata.totalOrders} طلب
            {' • '}
            {analyticsData.metadata.totalProducts} منتج
            {' • '}
            {analyticsData.metadata.totalCustomers} عميل
            {' • '}
            <span className="text-green-600 dark:text-green-400">
              RLS مفعّل ✓
            </span>
          </div>
        </>
      )}
    </div>
  );

  return renderWithLayout(pageContent);
};

export default AnalyticsEnhanced;
