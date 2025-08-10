import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import Layout from '@/components/Layout';
import { useSuperUnifiedData, useCustomersData } from '@/context/SuperUnifiedDataContext';
import { Customer, CustomerFilter, CustomerStats } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';

// Import customer-specific components with lazy loading
const CustomersList = React.lazy(() => import('@/components/customers/CustomersList'));
const CustomersTableMobile = React.lazy(() => import('@/components/customers/CustomersTableMobile'));
const VirtualizedCustomersList = React.lazy(() => import('@/components/customers/VirtualizedCustomersList'));
const CustomerMetrics = React.lazy(() => import('@/components/customers/CustomerMetrics'));
const CustomerFilters = React.lazy(() => import('@/components/customers/CustomerFilters'));
const AddCustomerDialog = React.lazy(() => import('@/components/customers/AddCustomerDialog'));
const CustomerSegments = React.lazy(() => import('@/components/customers/CustomerSegments'));

const Customers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isLoading: unifiedLoading } = useSuperUnifiedData();
  const { customers } = useCustomersData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [activeTab, setActiveTab] = useState('all');

  const stats = useMemo((): CustomerStats => {
    // حساب الإحصائيات من بيانات العملاء المتاحة
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const newLast30Days = customers.filter(customer => {
      const createdAt = new Date(customer.created_at);
      return createdAt >= thirtyDaysAgo;
    }).length;

    return {
      total: customers.length,
      newLast30Days,
      activeLast30Days: newLast30Days // يمكن تحسينها لاحقاً
    };
  }, [customers]);
  
  // حالات الصلاحيات
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasAddPermission, setHasAddPermission] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // التحقق من صلاحية مشاهدة العملاء
        const canViewCustomers = await checkUserPermissions(user, 'viewCustomers' as any);
        setHasViewPermission(canViewCustomers);
        
        // التحقق من صلاحية إضافة العملاء
        const canAddCustomers = await checkUserPermissions(user, 'manageCustomers' as any);
        setHasAddPermission(canAddCustomers);
        
        // التحقق من صلاحية تعديل العملاء - نستخدم نفس الصلاحية manageCustomers
        setHasEditPermission(canAddCustomers);
        
        // التحقق من صلاحية حذف العملاء - نستخدم نفس الصلاحية manageCustomers
        setHasDeletePermission(canAddCustomers);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة"
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

    // البيانات تأتي من SuperUnifiedDataContext، لا حاجة لجلب منفصل
  const isLoading = unifiedLoading || permissionLoading;

  // Memoized filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(customer => 
        customer.name.toLowerCase().includes(query) || 
        customer.email.toLowerCase().includes(query) ||
        (customer.phone && customer.phone.includes(searchQuery))
      );
    }
    
    // Apply tab filters
    if (activeTab === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(
        customer => new Date(customer.created_at) >= thirtyDaysAgo
      );
    }
    
    // Apply sorting
    if (filter.sortBy && filter.sortOrder) {
      result.sort((a, b) => {
        let comparison = 0;
        
        if (filter.sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (filter.sortBy === 'created_at') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        
        return filter.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [customers, searchQuery, filter, activeTab]);

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

  return (
    <Layout>
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
          
          {/* Customer Segments */}
          <Suspense fallback={<div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>}>
            <CustomerSegments customers={customers} />
          </Suspense>

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
                  <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded"></div>}>
                    {filteredCustomers.length > 50 ? (
                      <VirtualizedCustomersList 
                        customers={filteredCustomers} 
                        isLoading={isLoading}
                        hasEditPermission={hasEditPermission}
                        hasDeletePermission={hasDeletePermission}
                        containerHeight={600}
                      />
                    ) : (
                      <div className="md:hidden">
                        <CustomersTableMobile 
                          customers={filteredCustomers} 
                          isLoading={isLoading}
                          hasEditPermission={hasEditPermission}
                          hasDeletePermission={hasDeletePermission}
                        />
                      </div>
                    )}
                    <CustomersList 
                      customers={filteredCustomers} 
                      isLoading={isLoading}
                      hasEditPermission={hasEditPermission}
                      hasDeletePermission={hasDeletePermission}
                    />
                  </Suspense>
                </TabsContent>
                
                <TabsContent value="new" className="mt-0">
                  <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded"></div>}>
                    {filteredCustomers.length > 50 ? (
                      <VirtualizedCustomersList 
                        customers={filteredCustomers}
                        isLoading={isLoading}
                        hasEditPermission={hasEditPermission}
                        hasDeletePermission={hasDeletePermission}
                        containerHeight={600}
                      />
                    ) : (
                      <div className="md:hidden">
                        <CustomersTableMobile 
                          customers={filteredCustomers}
                          isLoading={isLoading}
                          hasEditPermission={hasEditPermission}
                          hasDeletePermission={hasDeletePermission}
                        />
                      </div>
                    )}
                    <CustomersList 
                      customers={filteredCustomers}
                      isLoading={isLoading}
                      hasEditPermission={hasEditPermission}
                      hasDeletePermission={hasDeletePermission}
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default Customers;
