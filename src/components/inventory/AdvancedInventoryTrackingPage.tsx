import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  Users, 
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Layers,
  BarChart3,
  Activity,
  Eye,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  Shield
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';

// استيراد Layout مثل صفحات نقطة البيع
import Layout from '@/components/Layout';

import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

import {
  InventoryStatsCards,
  InventoryFilters,
  InventoryActivitiesTable,
  UserActivitiesSection,
  ProductInsightsSection,
  BatchesOverviewSection
} from './components';
import { RetentionPolicyManager } from './components/RetentionPolicyManager';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// أنواع البيانات
interface InventoryTrackingFilters {
  dateRange: {
    from: Date;
    to: Date;
  } | null;
  productIds?: string[];
  userIds?: string[];
  operationTypes?: string[];
  searchTerm?: string;
  includeBatches: boolean;
  includeStats: boolean;
}

interface InventoryTrackingData {
  recent_activities: any[];
  statistics: any;
  batches?: any[];
  user_activities: any[];
  product_insights: any[];
  total_count: number;
}

// الفلاتر الافتراضية
const defaultFilters: InventoryTrackingFilters = {
  dateRange: {
    from: (() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0);
    })(),
    to: (() => {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    })()
  },
  searchTerm: '',
  includeBatches: false,
  includeStats: true
};

// أنواع النشاط المدعومة
const operationTypeOptions = [
  { value: 'purchase', label: 'شراء', icon: '📦', color: 'bg-blue-500' },
  { value: 'sale', label: 'بيع', icon: '🛒', color: 'bg-green-500' },
  { value: 'adjustment', label: 'تعديل', icon: '⚖️', color: 'bg-purple-500' },
  { value: 'return', label: 'إرجاع', icon: '↩️', color: 'bg-orange-500' },
  { value: 'manual', label: 'يدوي', icon: '✋', color: 'bg-gray-500' },
];

// نوع البيانات المرجعة من RPC
interface RPCResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
  };
}

// دالة استدعاء API مع دعم التقسيم
const fetchInventoryTrackingData = async (
  organizationId: string, 
  filters: InventoryTrackingFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<InventoryTrackingData> => {
  const offset = (page - 1) * pageSize;
  
  const { data, error } = await supabase.rpc('get_advanced_inventory_tracking' as any, {
    p_organization_id: organizationId,
    p_start_date: filters.dateRange?.from?.toISOString(),
    p_end_date: filters.dateRange?.to?.toISOString(),
    p_product_ids: filters.productIds || null,
    p_user_ids: filters.userIds || null,
    p_operation_types: filters.operationTypes || null,
    p_search_term: filters.searchTerm || null,
    p_include_batches: filters.includeBatches,
    p_include_stats: filters.includeStats,
    p_limit: pageSize,
    p_offset: offset
  });

  if (error) {
    throw new Error(`فشل في تحميل بيانات تتبع المخزون: ${error.message}`);
  }

  // تسجيل البيانات للتنقيح

  const rpcData = data as RPCResponse;
  
  if (rpcData?.success && rpcData.data) {
  }
  
  if (!rpcData?.success) {
    throw new Error(rpcData?.error?.message || 'فشل في تحميل البيانات');
  }

  // التأكد من وجود البيانات المطلوبة
  const result = rpcData.data || {};
  
  return {
    recent_activities: result.recent_activities || [],
    statistics: result.statistics || {},
    batches: result.batches || [],
    user_activities: result.user_activities || [],
    product_insights: result.product_insights || [],
    total_count: result.total_count || 0,
  };
};

/**
 * صفحة تتبع المخزون المتقدمة
 * تعرض نظرة شاملة على حركات المخزون والإحصائيات
 */
interface AdvancedInventoryTrackingPageProps extends POSSharedLayoutControls {}

const AdvancedInventoryTrackingPageComponent: React.FC<AdvancedInventoryTrackingPageProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { currentOrganization } = useTenant();
  const [filters, setFilters] = useState<InventoryTrackingFilters>(defaultFilters);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  
  // state للتقسيم
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const renderWithLayout = (node: React.ReactNode) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  // استعلام البيانات مع React Query
  const {
    data: inventoryData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['inventory-tracking', currentOrganization?.id, filters, currentPage, pageSize, sortField, sortDirection],
    queryFn: () => fetchInventoryTrackingData(currentOrganization!.id, filters, currentPage, pageSize),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق (كان cacheTime سابقاً)
    refetchOnWindowFocus: false,
  });

  // تحديث الفلاتر وإعادة تعيين الصفحة
  const updateFilters = useCallback((newFilters: Partial<InventoryTrackingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // إعادة تعيين الصفحة عند تغيير الفلاتر
  }, []);

  // تغيير الصفحة
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // تغيير الترتيب
  const handleSortChange = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1); // إعادة تعيين الصفحة عند تغيير الترتيب
  }, []);

  // إعادة تحميل البيانات
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(() => {
      handleRefresh();
    });
    return () => {
      onRegisterRefresh(null);
    };
  }, [onRegisterRefresh, handleRefresh]);

  useEffect(() => {
    if (!onLayoutStateChange) return;
    queueMicrotask(() => {
      onLayoutStateChange({
        isRefreshing: isFetching || isLoading,
        connectionStatus: isError ? 'disconnected' : 'connected'
      });
    });
  }, [onLayoutStateChange, isFetching, isLoading, isError]);

  // تصدير البيانات
  const handleExport = useCallback(async () => {
    if (!(inventoryData as InventoryTrackingData)?.recent_activities) return;
    
    setIsExporting(true);
    try {
      // تحويل البيانات إلى CSV
      const headers = ['التاريخ', 'نوع العملية', 'المنتج', 'الكمية', 'المخزون السابق', 'المخزون الجديد', 'المستخدم', 'الملاحظات'];
      const csvData = (inventoryData as InventoryTrackingData).recent_activities.map(activity => [
        new Date(activity.created_at).toLocaleDateString('fr-DZ'),
        activity.operation_type,
        activity.product?.name || 'غير محدد',
        activity.quantity,
        activity.previous_stock,
        activity.new_stock,
        activity.user?.name || 'غير محدد',
        activity.notes || ''
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // تحميل الملف
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `inventory-tracking-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
    } catch (error) {
    } finally {
      setIsExporting(false);
    }
  }, [inventoryData]);

  // حساب إحصائيات سريعة
  const quickStats = useMemo(() => {
    if (!(inventoryData as InventoryTrackingData)?.statistics) return null;
    
    const stats = (inventoryData as InventoryTrackingData).statistics;
    return {
      totalOperations: stats.total_operations || 0,
      affectedProducts: stats.affected_products || 0,
      activeUsers: stats.active_users || 0,
      operationsToday: stats.trends?.operations_today || 0,
    };
  }, [(inventoryData as InventoryTrackingData)?.statistics]);

  // عرض حالة التحميل
  if (isLoading) {
    return renderWithLayout(
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-muted animate-pulse rounded-lg mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  // عرض حالة الخطأ
  if (isError) {
    return renderWithLayout(
      <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-destructive mb-2">
                    فشل في تحميل بيانات تتبع المخزون
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
                  </p>
                  <Button onClick={handleRefresh} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    );
  }

const pageContent = (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 products-page-container">
        {/* رأس الصفحة */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              تتبع المخزون المتقدم
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              نظرة شاملة على حركات المخزون والعمليات مع تحليلات ذكية وإحصائيات تفصيلية
            </p>
          
          {/* إحصائيات سريعة */}
          {quickStats && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {quickStats.totalOperations} عملية
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {quickStats.affectedProducts} منتج
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {quickStats.activeUsers} مستخدم
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {quickStats.operationsToday} اليوم
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting || !inventoryData?.recent_activities?.length}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'جاري التصدير...' : 'تصدير CSV'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            تحديث
          </Button>
          
          <Button 
            onClick={() => updateFilters({ includeBatches: !filters.includeBatches })}
            variant={filters.includeBatches ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            {filters.includeBatches ? 'إخفاء الدفعات' : 'عرض الدفعات'}
          </Button>
        </div>
      </motion.div>

      {/* الفلاتر */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <InventoryFilters 
          filters={filters}
          onFiltersChange={updateFilters}
          operationTypes={operationTypeOptions}
        />
      </motion.div>

      {/* بطاقات الإحصائيات */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <InventoryStatsCards 
          statistics={inventoryData?.statistics}
          isLoading={isFetching}
        />
      </motion.div>

      {/* التبويبات الرئيسية */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              الحركات
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              المستخدمين
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              المنتجات
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              سياسة الاحتفاظ
            </TabsTrigger>
            {filters.includeBatches && (
              <TabsTrigger value="batches" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                الدفعات
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2">
                <InventoryActivitiesTable 
                  activities={inventoryData?.recent_activities || []}
                  isLoading={isFetching}
                  totalCount={inventoryData?.total_count || 0}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onSortChange={handleSortChange}
                  onExport={handleExport}
                />
              </div>
              <div>
                <UserActivitiesSection 
                  userActivities={inventoryData?.user_activities || []}
                  isLoading={isFetching}
                />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="activities">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <InventoryActivitiesTable 
                activities={inventoryData?.recent_activities || []}
                isLoading={isFetching}
                totalCount={inventoryData?.total_count || 0}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                onExport={handleExport}
                detailed={true}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="users">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <UserActivitiesSection 
                userActivities={inventoryData?.user_activities || []}
                isLoading={isFetching}
                detailed={true}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="products">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProductInsightsSection 
                productInsights={inventoryData?.product_insights || []}
                isLoading={isFetching}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="retention">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RetentionPolicyManager />
            </motion.div>
          </TabsContent>

          {filters.includeBatches && (
            <TabsContent value="batches">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BatchesOverviewSection 
                  batches={inventoryData?.batches || []}
                  isLoading={isFetching}
                />
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
      </div>
  );

  return renderWithLayout(pageContent);
};

const AdvancedInventoryTrackingPage = memo(AdvancedInventoryTrackingPageComponent);

AdvancedInventoryTrackingPage.displayName = 'AdvancedInventoryTrackingPage';

export default AdvancedInventoryTrackingPage;
