import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCustomers, getCustomerStats } from '@/lib/api/customers';
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

// Import customer-specific components
import CustomersList from '@/components/customers/CustomersList';
import CustomerMetrics from '@/components/customers/CustomerMetrics';
import CustomerFilters from '@/components/customers/CustomerFilters';
import AddCustomerDialog from '@/components/customers/AddCustomerDialog';
import CustomerSegments from '@/components/customers/CustomerSegments';

const Customers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    newLast30Days: 0,
    activeLast30Days: 0
  });
  const [filter, setFilter] = useState<CustomerFilter>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [activeTab, setActiveTab] = useState('all');
  
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
        console.error('خطأ في التحقق من الصلاحيات:', error);
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

  // Fetch customers and stats
  useEffect(() => {
    const fetchData = async () => {
      // لا تقم بجلب البيانات إذا لم يكن لدى المستخدم صلاحية العرض ولم يعد التحقق جاريًا
      if (!hasViewPermission && !permissionLoading) {
        setIsLoading(false);
        return;
      }
      
      // الرجوع إذا كان التحقق من الصلاحيات جاريًا
      if (permissionLoading) {
        return;
      }
      
      setIsLoading(true);
      try {
        const [customersData, statsData] = await Promise.all([
          getCustomers(),
          getCustomerStats()
        ]);
        
        setCustomers(customersData);
        setFilteredCustomers(customersData);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل بيانات العملاء',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast, hasViewPermission, permissionLoading]);

  // Filter and sort customers
  useEffect(() => {
    let result = [...customers];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(customer => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    
    setFilteredCustomers(result);
  }, [customers, searchQuery, filter, activeTab]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleFilterChange = (newFilter: CustomerFilter) => {
    setFilter({ ...filter, ...newFilter });
  };

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    toast({
      title: 'تم إضافة العميل',
      description: `تم إضافة ${newCustomer.name} بنجاح`,
    });
  };

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
        <div className="space-y-6 text-right w-full">
          {/* Header Section with Metrics */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">إدارة العملاء</h1>
              <p className="text-muted-foreground">إدارة وتحليل قاعدة عملاء متجرك</p>
            </div>
            {/* إظهار زر إضافة عميل جديد فقط إذا كان لدى المستخدم صلاحية */}
            {hasAddPermission && (
              <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
            )}
          </div>

          {/* Metrics Cards */}
          <CustomerMetrics stats={stats} />
          
          {/* Customer Segments */}
          <CustomerSegments customers={customers} />

          {/* Customer Filtering and Search */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>قائمة العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input 
                    placeholder="بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..." 
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full"
                  />
                </div>
                <CustomerFilters 
                  filter={filter} 
                  onFilterChange={handleFilterChange} 
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">جميع العملاء ({stats.total})</TabsTrigger>
                  <TabsTrigger value="new">عملاء جُدُد ({stats.newLast30Days})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <CustomersList 
                    customers={filteredCustomers} 
                    isLoading={isLoading}
                    hasEditPermission={hasEditPermission}
                    hasDeletePermission={hasDeletePermission}
                  />
                </TabsContent>
                
                <TabsContent value="new" className="mt-0">
                  <CustomersList 
                    customers={filteredCustomers}
                    isLoading={isLoading}
                    hasEditPermission={hasEditPermission}
                    hasDeletePermission={hasDeletePermission}
                  />
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