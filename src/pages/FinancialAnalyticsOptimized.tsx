import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';

// المكونات المحسنة
import {
  AnalyticsHeader,
  AnalyticsCharts,
  MetricCard,
  SalesSection,
  FinancialSection,
} from '@/components/analytics';

// المكونات الجديدة للطلبات والمنتجات
import OrdersAndProductsAnalytics from '@/components/analytics/OrdersAndProductsAnalytics';

// الأدوات والأنواع
import { useFinancialData, useChartData } from '@/components/analytics/useFinancialData';
import { getDateRangePreset, formatCurrency, formatPercentage, formatLargeNumber } from '@/components/analytics/utils';
import type { DateRange, AnalyticsFilters } from '@/components/analytics/types';

interface FinancialAnalyticsProps extends POSSharedLayoutControls {}

const FinancialAnalyticsOptimized: React.FC<FinancialAnalyticsProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  // خدمات React Query
  const queryClient = useQueryClient();
  
  // حالة التطبيق
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangePreset('week'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPreset, setCurrentPreset] = useState<string>('week');

  // جلب البيانات
  const { data: financialData, isLoading, error, refetch } = useFinancialData({
    dateRange,
    selectedEmployee,
    filters,
  });

  // فرض إعادة جلب البيانات عند تغيير التاريخ (backup)
  useEffect(() => {
    // backup refetch if invalidateQueries doesn't work
    const timeoutId = setTimeout(() => refetch(), 100);
    return () => clearTimeout(timeoutId);
  }, [dateRange.from.getTime(), dateRange.to.getTime(), currentPreset, refetch]);

  // إعداد بيانات الرسوم البيانية
  const { salesData, profitData } = useChartData(financialData);

  // معالجات الأحداث
  const handleDateRangeChange = useCallback(async (preset: string, customRange?: DateRange) => {
    
    if (preset === 'custom' && customRange) {
      setCurrentPreset('custom');
      setDateRange(customRange);
    } else {
      setCurrentPreset(preset); // حفظ الـ preset الجديد
      const newRange = getDateRangePreset(preset);
      setDateRange(newRange);
    }
    
    // فرض إلغاء cache وإعادة جلب البيانات
    await queryClient.invalidateQueries({ queryKey: ['financial-analytics-optimized'] });
    
  }, [currentPreset, queryClient]);

  const handleEmployeeChange = useCallback((employeeId: string) => {
    setSelectedEmployee(employeeId);
  }, []);

  const handleFiltersChange = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetch]);

  const handleExport = useCallback(() => {
  }, []);

  // عرض الخطأ
  if (error) {
    const errorNode = (
      <div className="space-y-6 px-2 sm:px-0">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              التحليلات المالية الشاملة
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              نظرة تفصيلية على الأداء المالي والمبيعات
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
              </AlertDescription>
            </Alert>
          </motion.div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{errorNode}</Layout> : errorNode;
  }

  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  // Register refresh to titlebar
  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(() => handleRefresh());
    return () => onRegisterRefresh(null);
  }, [onRegisterRefresh, handleRefresh]);

  // Push layout state
  useEffect(() => {
    if (!onLayoutStateChange) return;
    const state: POSLayoutState = {
      isRefreshing: isRefreshing || isLoading,
      connectionStatus: error ? 'disconnected' : 'connected',
      executionTime: undefined,
    };
    onLayoutStateChange(state);
  }, [onLayoutStateChange, isRefreshing, isLoading, error]);

  const pageContent = (
    <div className="space-y-6 px-2 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            التحليلات المالية الشاملة
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            نظرة تفصيلية على الأداء المالي والمبيعات
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnalyticsHeader
            dateRange={dateRange}
            selectedEmployee={selectedEmployee}
            filters={filters}
            isRefreshing={isRefreshing}
            onDateRangeChange={handleDateRangeChange}
            onEmployeeChange={handleEmployeeChange}
            onFiltersChange={handleFiltersChange}
            onRefresh={handleRefresh}
            onExport={handleExport}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="grid w-full grid-cols-5 mb-8 h-12 p-1 bg-muted/30 rounded-lg">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 h-10 rounded-md font-medium transition-all
                          data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                          hover:bg-muted"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">نظرة عامة</span>
                <span className="sm:hidden">عامة</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sales" 
                className="flex items-center gap-2 h-10 rounded-md font-medium transition-all
                          data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                          hover:bg-muted"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">المبيعات</span>
                <span className="sm:hidden">مبيعات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="services" 
                className="flex items-center gap-2 h-10 rounded-md font-medium transition-all
                          data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                          hover:bg-muted"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">الخدمات</span>
                <span className="sm:hidden">خدمات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="flex items-center gap-2 h-10 rounded-md font-medium transition-all
                          data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                          hover:bg-muted"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">الحالة المالية</span>
                <span className="sm:hidden">مالية</span>
              </TabsTrigger>
              <TabsTrigger 
                value="orders-products" 
                className="flex items-center gap-2 h-10 rounded-md font-medium transition-all
                          data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                          hover:bg-muted"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">الطلبات والمنتجات</span>
                <span className="sm:hidden">طلبات</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* نظرة عامة على الأرقام الرئيسية */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                      title="إجمالي المبيعات"
                      value={financialData?.total_revenue || 0}
                      icon={DollarSign}
                      type="revenue"
                      isLoading={isLoading}
                      valueType="currency"
                    />
                    <MetricCard
                      title="إجمالي الطلبات"
                      value={financialData?.total_transactions_count || 0}
                      icon={Package}
                      type="success"
                      isLoading={isLoading}
                      valueType="number"
                    />
                    <MetricCard
                      title="متوسط قيمة الطلب"
                      value={financialData?.avg_order_value || 0}
                      icon={TrendingUp}
                      type="profit"
                      isLoading={isLoading}
                      valueType="currency"
                    />
                    <MetricCard
                      title="الربح الصافي"
                      value={financialData?.total_net_profit || 0}
                      icon={Users}
                      type="profit"
                      isLoading={isLoading}
                      valueType="currency"
                      size="lg"
                    />
                  </div>

                  {/* الرسوم البيانية */}
                  <AnalyticsCharts
                    salesData={salesData}
                    profitData={profitData}
                    isLoading={isLoading}
                  />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="sales" className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="sales"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SalesSection data={financialData} isLoading={isLoading} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="services" className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="services"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      تحليل الخدمات المتاحة
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      عرض إحصائيات الخدمات الأساسية المتوفرة في النظام
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* خدمة التصليح */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <MetricCard
                        title="خدمات التصليح"
                        value={financialData?.repair_services_revenue || 0}
                        subtitle={`${financialData?.repair_orders_count || 0} طلب تصليح`}
                        icon={Package}
                        type="revenue"
                        isLoading={isLoading}
                        valueType="currency"
                        size="lg"
                      />
                    </motion.div>

                    {/* خدمة الاشتراكات */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <MetricCard
                        title="خدمات الاشتراكات"
                        value={financialData?.subscription_services_revenue || 0}
                        subtitle={`${financialData?.subscription_transactions_count || 0} معاملة اشتراك`}
                        icon={Users}
                        type="revenue"
                        isLoading={isLoading}
                        valueType="currency"
                        size="lg"
                      />
                    </motion.div>

                    {/* تحميل الألعاب */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    >
                      <MetricCard
                        title="تحميل الألعاب"
                        value={financialData?.game_downloads_revenue || 0}
                        subtitle={`${financialData?.game_downloads_count || 0} عملية تحميل`}
                        icon={TrendingUp}
                        type="revenue"
                        isLoading={isLoading}
                        valueType="currency"
                        size="lg"
                      />
                    </motion.div>
                  </div>

                  {/* إحصائيات إجمالية للخدمات */}
                  <div className="mt-8 p-6 bg-card rounded-lg border">
                    <h4 className="text-lg font-bold text-foreground mb-6">
                      إجمالي الخدمات
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          إجمالي إيرادات الخدمات
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(
                            (financialData?.repair_services_revenue || 0) +
                            (financialData?.subscription_services_revenue || 0) +
                            (financialData?.game_downloads_revenue || 0)
                          )}
                        </div>
                      </div>
                      
                      <div className="p-6 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          إجمالي المعاملات
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {formatLargeNumber(
                            (financialData?.repair_orders_count || 0) +
                            (financialData?.subscription_transactions_count || 0) +
                            (financialData?.game_downloads_count || 0)
                          )}
                        </div>
                      </div>
                    </div>

                    {/* شريط التوزيع */}
                    <div className="mt-6 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">توزيع الخدمات</div>
                      <div className="flex gap-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          style={{
                            width: `${((financialData?.repair_services_revenue || 0) / 
                                     Math.max(1, (financialData?.repair_services_revenue || 0) + 
                                                 (financialData?.subscription_services_revenue || 0) + 
                                                 (financialData?.game_downloads_revenue || 0))) * 100}%`
                          }}
                          className="bg-primary/70 rounded-full"
                        />
                        <div 
                          style={{
                            width: `${((financialData?.subscription_services_revenue || 0) / 
                                     Math.max(1, (financialData?.repair_services_revenue || 0) + 
                                                 (financialData?.subscription_services_revenue || 0) + 
                                                 (financialData?.game_downloads_revenue || 0))) * 100}%`
                          }}
                          className="bg-primary rounded-full"
                        />
                        <div 
                          style={{
                            width: `${((financialData?.game_downloads_revenue || 0) / 
                                     Math.max(1, (financialData?.repair_services_revenue || 0) + 
                                                 (financialData?.subscription_services_revenue || 0) + 
                                                 (financialData?.game_downloads_revenue || 0))) * 100}%`
                          }}
                          className="bg-primary/50 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>التصليح</span>
                        <span>الاشتراكات</span>
                        <span>الألعاب</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="financial"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <FinancialSection data={financialData} isLoading={isLoading} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="orders-products" className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="orders-products"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <OrdersAndProductsAnalytics />
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
  );

  return renderWithLayout(pageContent);
};

export default FinancialAnalyticsOptimized;
