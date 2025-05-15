import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  getEmployees, 
  getEmployeeStats,
  checkCurrentUserStatus 
} from '@/lib/api/employees';
import { Employee, EmployeeFilter, EmployeeStats } from '@/types/employee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, UserPlus, Filter, RefreshCw, UsersRound, UserCheck, UserMinus } from 'lucide-react';

// مكونات خاصة بإدارة الموظفين
import EmployeeList from '@/components/employees/EmployeeList';
import EmployeeMetrics from '@/components/employees/EmployeeMetrics';
import EmployeeFilters from '@/components/employees/EmployeeFilters';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';

const Employees = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [stats, setStats] = useState<EmployeeStats>({
    total: 0,
    active: 0,
    inactive: 0
  });
  const [filter, setFilter] = useState<EmployeeFilter>({
    query: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [userStatus, setUserStatus] = useState<any>(null);

  // جلب بيانات الموظفين وإحصائياتهم
  useEffect(() => {
    checkUserAndLoadEmployees();
  }, []);

  // تصفية وترتيب الموظفين
  useEffect(() => {
    filterEmployees();
  }, [employees, searchQuery, activeTab, filter]);

  const checkUserAndLoadEmployees = async () => {
    try {
      // التحقق من حالة المستخدم أولاً
      const status = await checkCurrentUserStatus();
      setUserStatus(status);
      
      
      // تحميل بيانات الموظفين
      loadEmployees();
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      
      
      // استيراد وظيفة تحديث الموظفين
      const { updateEmployeesWithMissingOrganizationId } = await import('@/lib/api/employees');
      
      // تحديث الموظفين الذين ليس لديهم معرف مؤسسة
      await updateEmployeesWithMissingOrganizationId();
      
      
      const [employeesData, statsData] = await Promise.all([
        getEmployees(),
        getEmployeeStats()
      ]);
      
      if (employeesData.length === 0) {
        
      }
      
      setEmployees(employeesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading employees data:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل بيانات الموظفين',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];
    
    // تطبيق البحث حسب الاسم أو البريد الإلكتروني أو رقم الهاتف
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.name.toLowerCase().includes(query) || 
        employee.email.toLowerCase().includes(query) ||
        (employee.phone && employee.phone.includes(query))
      );
    }
    
    // تطبيق فلتر حسب الحالة النشطة/غير النشطة
    if (activeTab === 'active') {
      filtered = filtered.filter(employee => employee.is_active);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(employee => !employee.is_active);
    }
    
    // تطبيق الترتيب
    if (filter.sortBy && filter.sortOrder) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        if (filter.sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (filter.sortBy === 'created_at') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        
        return filter.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    setFilteredEmployees(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setFilter(prev => ({ ...prev, query: e.target.value }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'all' | 'active' | 'inactive');
    setFilter(prev => ({ ...prev, status: value as 'all' | 'active' | 'inactive' }));
  };

  const handleFilterChange = (newFilter: EmployeeFilter) => {
    setFilter(newFilter);
  };

  const handleEmployeeAdded = (employee: Employee) => {
    // إضافة الموظف الجديد إلى بداية القائمة
    setEmployees(prev => [employee, ...prev]);
    
    // تحديث الإحصائيات
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      active: prev.active + 1
    }));
    
    // إظهار رسالة نجاح
    toast({
      title: 'تم إضافة الموظف',
      description: `تم إضافة ${employee.name} بنجاح`,
    });
    
    // تحديث البيانات من الخادم بعد فترة قصيرة
    setTimeout(() => {
      loadEmployees();
    }, 1000);
  };

  return (
    <Layout>
      {loading && employees.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">جاري تحميل بيانات الموظفين...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 text-right w-full">
          {/* رأس الصفحة والإحصائيات */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">إدارة الموظفين</h1>
              <p className="text-muted-foreground">إدارة وتعيين وتتبع أداء موظفي متجرك</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={loadEmployees}
                disabled={loading}
                title="تحديث البيانات"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <AddEmployeeDialog onEmployeeAdded={handleEmployeeAdded} />
            </div>
          </div>

          {/* مربعات الإحصائيات */}
          <EmployeeMetrics stats={stats} />
          
          {/* قائمة الموظفين وأدوات التصفية */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>قائمة الموظفين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..." 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-8"
                  />
                </div>
                <EmployeeFilters 
                  filter={filter} 
                  onFilterChange={handleFilterChange} 
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all" className="flex gap-1 items-center">
                    <UsersRound className="h-4 w-4" />
                    <span>جميع الموظفين</span>
                    <span className="ml-1 bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {stats.total}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="active" className="flex gap-1 items-center">
                    <UserCheck className="h-4 w-4" />
                    <span>نشطين</span>
                    <span className="ml-1 bg-green-100 text-green-700 rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {stats.active}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="flex gap-1 items-center">
                    <UserMinus className="h-4 w-4" />
                    <span>غير نشطين</span>
                    <span className="ml-1 bg-red-100 text-red-700 rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {stats.inactive}
                    </span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <EmployeeList 
                    employees={filteredEmployees} 
                    isLoading={loading} 
                    onDataChange={loadEmployees}
                  />
                </TabsContent>
                
                <TabsContent value="active" className="mt-0">
                  <EmployeeList 
                    employees={filteredEmployees}
                    isLoading={loading}
                    onDataChange={loadEmployees}
                  />
                </TabsContent>
                
                <TabsContent value="inactive" className="mt-0">
                  <EmployeeList 
                    employees={filteredEmployees}
                    isLoading={loading}
                    onDataChange={loadEmployees}
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

export default Employees; 