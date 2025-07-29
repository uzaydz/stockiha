import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';

// المكونات المحسنة
import {
  AnalyticsHeader,
  AnalyticsCharts,
  MetricCard,
  SalesSection,
  FinancialSection,
} from '@/components/analytics';

// الأدوات والأنواع
import { useFinancialData, useChartData } from '@/components/analytics/useFinancialData';
import { getDateRangePreset, formatCurrency, formatPercentage, formatLargeNumber } from '@/components/analytics/utils';
import type { DateRange, AnalyticsFilters } from '@/components/analytics/types';

const FinancialAnalyticsOptimized: React.FC = () => {
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
    return (
      <Layout>
        <div className="space-y-6 px-2 sm:px-0">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              💰 التحليلات المالية الشاملة
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              نظرة تفصيلية وشاملة على الأداء المالي والمبيعات مع تحليلات متقدمة ورؤى ذكية
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>تحديث مباشر</span>
              <div className="w-px h-4 bg-border"></div>
              <span>دقة عالية</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            💰 التحليلات المالية الشاملة
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            نظرة تفصيلية وشاملة على الأداء المالي والمبيعات مع تحليلات متقدمة ورؤى ذكية
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>تحديث مباشر</span>
            <div className="w-px h-4 bg-border"></div>
            <span>دقة عالية</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
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
            <TabsList className="grid w-full grid-cols-4 mb-8 h-14 p-1 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 h-12 rounded-lg font-medium transition-all duration-300
                          data-[state=active]:bg-background data-[state=active]:text-foreground 
                          data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                          hover:bg-background/50 hover:text-foreground"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">نظرة عامة</span>
                <span className="sm:hidden">عامة</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sales" 
                className="flex items-center gap-2 h-12 rounded-lg font-medium transition-all duration-300
                          data-[state=active]:bg-background data-[state=active]:text-foreground 
                          data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                          hover:bg-background/50 hover:text-foreground"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">المبيعات</span>
                <span className="sm:hidden">مبيعات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="services" 
                className="flex items-center gap-2 h-12 rounded-lg font-medium transition-all duration-300
                          data-[state=active]:bg-background data-[state=active]:text-foreground 
                          data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                          hover:bg-background/50 hover:text-foreground"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">الخدمات</span>
                <span className="sm:hidden">خدمات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="flex items-center gap-2 h-12 rounded-lg font-medium transition-all duration-300
                          data-[state=active]:bg-background data-[state=active]:text-foreground 
                          data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                          hover:bg-background/50 hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">الحالة المالية</span>
                <span className="sm:hidden">مالية</span>
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
                  <div className="text-center mb-8">
                    <motion.h3 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3"
                    >
                      📋 تحليل الخدمات المتاحة
                    </motion.h3>
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-muted-foreground text-lg"
                    >
                      عرض إحصائيات الخدمات الأساسية المتوفرة في النظام
                    </motion.p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* خدمة التصليح */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <MetricCard
                        title="🔧 خدمات التصليح"
                        value={financialData?.repair_services_revenue || 0}
                        subtitle={`${financialData?.repair_orders_count || 0} طلب تصليح`}
                        icon={Package}
                        type="success"
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
                        title="🔒 خدمات الاشتراكات"
                        value={financialData?.subscription_services_revenue || 0}
                        subtitle={`${financialData?.subscription_transactions_count || 0} معاملة اشتراك`}
                        icon={Users}
                        type="profit"
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
                        title="🎮 تحميل الألعاب"
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

                  {/* إحصائيات إجمالية للخدمات - محسنة للدارك مود */}
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-8 p-6 bg-gradient-to-br from-primary/5 via-blue-50/50 to-purple-50/50 
                               dark:from-primary/10 dark:via-blue-950/20 dark:to-purple-950/20 
                               rounded-xl border border-primary/20 dark:border-primary/30 
                               backdrop-blur-sm shadow-lg dark:shadow-2xl"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-blue-600 
                                    flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        📊
                      </div>
                      <h4 className="text-xl font-bold text-primary dark:text-primary-foreground">
                        إجمالي الخدمات
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group relative overflow-hidden bg-gradient-to-br from-white/80 to-white/60 
                                    dark:from-gray-800/80 dark:to-gray-900/60 
                                    p-6 rounded-xl border border-white/50 dark:border-gray-700/50 
                                    backdrop-blur-sm hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 
                                      dark:from-green-400/20 dark:to-emerald-400/20 opacity-0 group-hover:opacity-100 
                                      transition-opacity duration-300"></div>
                        <div className="relative z-10">
                          <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 
                                        flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            إجمالي إيرادات الخدمات
                          </div>
                          <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                            {formatCurrency(
                              (financialData?.repair_services_revenue || 0) +
                              (financialData?.subscription_services_revenue || 0) +
                              (financialData?.game_downloads_revenue || 0)
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="group relative overflow-hidden bg-gradient-to-br from-white/80 to-white/60 
                                    dark:from-gray-800/80 dark:to-gray-900/60 
                                    p-6 rounded-xl border border-white/50 dark:border-gray-700/50 
                                    backdrop-blur-sm hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                      dark:from-blue-400/20 dark:to-purple-400/20 opacity-0 group-hover:opacity-100 
                                      transition-opacity duration-300"></div>
                        <div className="relative z-10">
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 
                                        flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            إجمالي المعاملات
                          </div>
                          <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                            {formatLargeNumber(
                              (financialData?.repair_orders_count || 0) +
                              (financialData?.subscription_transactions_count || 0) +
                              (financialData?.game_downloads_count || 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* شريط تقدم ديناميكي */}
                    <div className="mt-6 space-y-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">توزيع الخدمات</div>
                      <div className="flex gap-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${((financialData?.repair_services_revenue || 0) / 
                                     Math.max(1, (financialData?.repair_services_revenue || 0) + 
                                                 (financialData?.subscription_services_revenue || 0) + 
                                                 (financialData?.game_downloads_revenue || 0))) * 100}%` 
                          }}
                          transition={{ duration: 1, delay: 0.8 }}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${((financialData?.subscription_services_revenue || 0) / 
                                     Math.max(1, (financialData?.repair_services_revenue || 0) + 
                                                 (financialData?.subscription_services_revenue || 0) + 
                                                 (financialData?.game_downloads_revenue || 0))) * 100}%` 
                          }}
                          transition={{ duration: 1, delay: 0.9 }}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${((financialData?.game_downloads_revenue || 0) / 
                                     Math.max(1, (financialData?.repair_services_revenue || 0) + 
                                                 (financialData?.subscription_services_revenue || 0) + 
                                                 (financialData?.game_downloads_revenue || 0))) * 100}%` 
                          }}
                          transition={{ duration: 1, delay: 1.0 }}
                          className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>🔧 التصليح</span>
                        <span>🔒 الاشتراكات</span>
                        <span>🎮 الألعاب</span>
                      </div>
                    </div>
                  </motion.div>
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
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
};

export default FinancialAnalyticsOptimized;
