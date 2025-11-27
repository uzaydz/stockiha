import React, { useEffect, useState, useCallback, useMemo, Suspense, useRef } from 'react';
import Layout from '@/components/Layout';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import { Customer, CustomerFilter, CustomerStats } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useCustomerPermissions } from '@/hooks/useCustomerPermissions';
import { useCustomerDataSource } from '@/hooks/useCustomerDataSource';
import { useCustomerFiltering } from '@/hooks/useCustomerFiltering';
import UnifiedCustomersList from '@/components/customers/UnifiedCustomersList';

// Import customer-specific components with lazy loading
const CustomerMetrics = React.lazy(() => import('@/components/customers/CustomerMetrics'));
const CustomerFilters = React.lazy(() => import('@/components/customers/CustomerFilters'));
const AddCustomerDialog = React.lazy(() => import('@/components/customers/AddCustomerDialog'));
// const CustomerSegments = React.lazy(() => import('@/components/customers/CustomerSegments')); // معطل مؤقتاً

interface CustomersProps {
  useStandaloneLayout?: boolean;
  onRegisterRefresh?: (handler: RefreshHandler) => void;
  onLayoutStateChange?: (state: POSLayoutState) => void;
}

const Customers: React.FC<CustomersProps> = ({ 
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange 
}) => {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { isLoading: unifiedLoading } = useSuperUnifiedData();
  const { isOnline } = useNetworkStatus();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    try { return localStorage.getItem('customers_search') || ''; } catch { return ''; }
  });
  const [filter, setFilter] = useState<CustomerFilter>(() => {
    try {
      const saved = localStorage.getItem('customers_filter');
      return { sortBy: 'created_at', sortOrder: 'desc', ...(saved ? JSON.parse(saved) : {}) };
    } catch {
      return { sortBy: 'created_at', sortOrder: 'desc' };
    }
  });
  const [activeTab, setActiveTab] = useState('all');

  // Permissions via hook
  const { hasViewPermission, hasAddPermission, hasEditPermission, hasDeletePermission, permissionLoading } = useCustomerPermissions(user, userProfile);

  // Data source with debounce + offline pagination (offline-first)
  const { dataSource, hasMore, loadMore, isLocalLoading } = useCustomerDataSource(searchQuery);

  // Filtering + stats
  const { filtered, stats } = useCustomerFiltering(dataSource, searchQuery, filter, activeTab);
  
  // حفظ الفلاتر والبحث
  useEffect(() => {
    try { localStorage.setItem('customers_filter', JSON.stringify(filter)); } catch {}
  }, [filter]);
  useEffect(() => {
    try { localStorage.setItem('customers_search', searchQuery); } catch {}
  }, [searchQuery]);

    // البيانات تأتي من المصدر المحلي أولاً (offline-first) ثم من SuperUnifiedDataContext
  // isLocalLoading يحدد إذا كنا لا زلنا نحمل من SQLite
  const isLoading = (unifiedLoading && isLocalLoading) || permissionLoading;

  // اختصار لوحة المفاتيح للبحث Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmd = navigator.platform.toLowerCase().includes('mac') ? e.metaKey : e.ctrlKey;
      if (isCmd && (e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // القائمة بعد التصفية
  const filteredCustomers = filtered;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleFilterChange = useCallback((newFilter: CustomerFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const handleCustomerAdded = useCallback((newCustomer: Customer) => {
    // العميل سيتم إضافته تلقائياً عبر SuperUnifiedDataContext عند تحديث البيانات
    toast({
      title: 'تم إضافة العميل',
      description: `تم إضافة ${newCustomer.name} بنجاح`,
    });
  }, [toast]);

  // تسجيل دالة التحديث للـ Layout
  useEffect(() => {
    if (onRegisterRefresh) {
      const refreshHandler = async () => {
        // يمكن إضافة منطق التحديث هنا إذا لزم الأمر
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: true });
        }
        // محاكاة التحديث
        await new Promise(resolve => setTimeout(resolve, 500));
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: false });
        }
      };
      onRegisterRefresh(refreshHandler);
    }
  }, [onRegisterRefresh, onLayoutStateChange]);

  // تحديث حالة الـ Layout عند التحميل
  useEffect(() => {
    if (onLayoutStateChange) {
      onLayoutStateChange({
        connectionStatus: 'connected',
        isRefreshing: isLoading,
      });
    }
  }, [isLoading, onLayoutStateChange]);

  const content = (
    <>
      {/* رسالة تحميل أثناء التحقق من الصلاحيات */}
      {permissionLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      ) : !hasViewPermission ? (
        // رسالة عدم وجود صلاحية
        <div className="container mx-auto p-4">
          <Alert variant="destructive" className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>غير مصرح</AlertTitle>
            <AlertDescription>ليس لديك صلاحية لمشاهدة صفحة إدارة العملاء.</AlertDescription>
          </Alert>
        </div>
      ) : isLoading ? (
        // رسالة تحميل بيانات العملاء
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل بيانات العملاء...</p>
          </div>
        </div>
      ) : (
        // عرض محتوى الصفحة
        <div className="space-y-4 md:space-y-6 text-right w-full p-2 md:p-0">
          {/* Header Section with Metrics */}
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">إدارة العملاء</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">إدارة وتحليل قاعدة عملاء متجرك</p>
            </div>
            {/* إظهار زر إضافة عميل جديد فقط إذا كان لدى المستخدم صلاحية */}
            {hasAddPermission && (
              <div className="w-full md:w-auto">
                <Suspense fallback={<div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>}>
                  <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
                </Suspense>
              </div>
            )}
          </div>

          {/* Metrics Cards */}
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
          }>
            <CustomerMetrics stats={stats} />
          </Suspense>
          
          {/* Customer Segments - معطل مؤقتاً بسبب مشكلة es-toolkit */}
          {/* <Suspense fallback={<div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>}>
            <CustomerSegments customers={customers} />
          </Suspense> */}

          {/* Customer Filtering and Search */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>قائمة العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1">
                  <Input 
                    placeholder="بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..." 
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full text-sm sm:text-base"
                    ref={searchRef}
                    aria-label="بحث العملاء"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Suspense fallback={<div className="h-10 w-full sm:w-32 bg-gray-200 animate-pulse rounded"></div>}>
                    <CustomerFilters 
                      filter={filter} 
                      onFilterChange={handleFilterChange} 
                    />
                  </Suspense>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-3 sm:mb-4 grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                    <span className="hidden sm:inline">جميع العملاء ({stats.total})</span>
                    <span className="sm:hidden">الكل ({stats.total})</span>
                  </TabsTrigger>
                  <TabsTrigger value="new" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                    <span className="hidden sm:inline">عملاء جُدُد ({stats.newLast30Days})</span>
                    <span className="sm:hidden">جدد ({stats.newLast30Days})</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <UnifiedCustomersList 
                    customers={filteredCustomers}
                    isLoading={isLoading}
                    hasEditPermission={hasEditPermission}
                    hasDeletePermission={hasDeletePermission}
                    containerHeight={600}
                  />
                  {!isOnline && hasMore && !searchQuery && (
                    <div className="flex justify-center pt-3">
                      <Button variant="outline" size="sm" onClick={loadMore}>تحميل المزيد</Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="new" className="mt-0">
                  <UnifiedCustomersList 
                    customers={filteredCustomers}
                    isLoading={isLoading}
                    hasEditPermission={hasEditPermission}
                    hasDeletePermission={hasDeletePermission}
                    containerHeight={600}
                  />
                  {!isOnline && hasMore && !searchQuery && (
                    <div className="flex justify-center pt-3">
                      <Button variant="outline" size="sm" onClick={loadMore}>تحميل المزيد</Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );

  // إذا كان useStandaloneLayout = false، نعرض المحتوى مباشرة بدون Layout
  if (!useStandaloneLayout) {
    return content;
  }

  // إذا كان useStandaloneLayout = true، نستخدم Layout العادي
  return <Layout>{content}</Layout>;
};

export default Customers;
