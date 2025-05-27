import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import ServicesHeader from '@/components/service/ServicesHeader';
import ServicesFilter from '@/components/service/ServicesFilter';
import ServicesList from '@/components/service/ServicesList';
import AddServiceDialog from '@/components/service/AddServiceDialog';
import { getServices } from '@/lib/api/services';
import type { Service } from '@/lib/api/services';
import { Separator } from '@/components/ui/separator';
import { useTenant } from '@/context/TenantContext';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Services() {
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useTenant();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasAddPermission, setHasAddPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<{
    categories: string[];
    status: 'all' | 'active' | 'inactive';
    sortBy: 'name' | 'price' | 'newest' | 'oldest';
  }>({
    categories: [],
    status: 'all',
    sortBy: 'newest'
  });

  // استخراج الفئات الفريدة للخدمات
  const uniqueCategories = Array.from(new Set(services.map(service => service.category)))
    .filter(Boolean) // إزالة القيم الفارغة
    .sort() as string[];

  // التحقق من الصلاحيات
  useEffect(() => {
    const checkPermissions = async () => {
      if (user) {
        setPermissionLoading(true);
        try {
          const [viewAccess, addAccess] = await Promise.all([
            checkUserPermissions(user, 'viewServices'),
            checkUserPermissions(user, 'addServices')
          ]);
          
          setHasViewPermission(viewAccess);
          setHasAddPermission(addAccess);
        } catch (error) {
          setHasViewPermission(false);
          setHasAddPermission(false);
        } finally {
          setPermissionLoading(false);
        }
      } else {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user]);

  // جلب الخدمات
  const fetchServices = async (forceRefresh = false) => {
    setIsLoading(true);
    
    try {
      if (!currentOrganization) {
        const errMsg = 'لم يتم العثور على بيانات المؤسسة';
        
        toast({
          title: 'خطأ',
          description: errMsg,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // احصل على الخدمات من قاعدة البيانات
      const data = await getServices(currentOrganization.id);

      setServices(data);
      setFilteredServices(data);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الخدمات';
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب الخدمات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // التأثير الأولي لجلب الخدمات
  useEffect(() => {

    if (currentOrganization && hasViewPermission) {
      // إضافة تأخير بسيط للتأكد من أن حالة المنظمة تم تحديثها بشكل كامل
      const timer = setTimeout(() => {
        fetchServices();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentOrganization, hasViewPermission]);

  // تصفية وفلترة الخدمات
  useEffect(() => {
    if (!services.length) return;

    let results = [...services];

    // تطبيق فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        service => 
          service.name.toLowerCase().includes(query) || 
          service.description.toLowerCase().includes(query) ||
          (service.category && service.category.toLowerCase().includes(query))
      );
    }

    // تطبيق فلتر الفئات
    if (activeFilters.categories.length > 0) {
      results = results.filter(
        service => service.category && activeFilters.categories.includes(service.category)
      );
    }

    // تطبيق فلتر الحالة
    if (activeFilters.status !== 'all') {
      const isActive = activeFilters.status === 'active';
      results = results.filter(service => service.is_available === isActive);
    }

    // تطبيق الترتيب
    switch (activeFilters.sortBy) {
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default:
        break;
    }

    setFilteredServices(results);
  }, [services, searchQuery, activeFilters]);

  // التعامل مع تغييرات الفلتر
  const setSortBy = (sortBy: 'name' | 'price' | 'newest' | 'oldest') => {
    setActiveFilters(prev => ({ ...prev, sortBy }));
  };

  const toggleCategoryFilter = (category: string) => {
    setActiveFilters(prev => {
      const isActive = prev.categories.includes(category);
      return {
        ...prev,
        categories: isActive
          ? prev.categories.filter(c => c !== category)
          : [...prev.categories, category]
      };
    });
  };

  const setStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setActiveFilters(prev => ({ ...prev, status }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setActiveFilters({
      categories: [],
      status: 'all',
      sortBy: 'newest'
    });
  };

  // رسالة عدم وجود صلاحية
  if (permissionLoading || orgLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg font-medium">جاري التحميل...</span>
        </div>
      </Layout>
    );
  }

  if (!hasViewPermission) {
    return (
      <Layout>
        <Alert variant="destructive" className="my-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>لا توجد صلاحية كافية</AlertTitle>
          <AlertDescription>
            ليس لديك الصلاحيات اللازمة لعرض صفحة الخدمات. الرجاء التواصل مع مدير النظام للحصول على الصلاحيات المطلوبة.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <ServicesHeader 
          serviceCount={filteredServices.length} 
          totalCount={services.length}
          onAddService={() => {
            if (hasAddPermission) {
              setIsAddDialogOpen(true);
            } else {
              toast({
                title: "ليس لديك صلاحية",
                description: "ليس لديك صلاحية إضافة خدمات جديدة",
                variant: "destructive"
              });
            }
          }}
        />
        
        <Separator />
        
        <div className="flex justify-between items-center mb-4">
          <Button 
            onClick={() => fetchServices(true)} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث الخدمات
          </Button>
        </div>
        
        <ServicesFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          sortBy={activeFilters.sortBy}
          categories={uniqueCategories}
          activeCategories={activeFilters.categories}
          onCategoryToggle={toggleCategoryFilter}
          statusFilter={activeFilters.status}
          onStatusChange={setStatusFilter}
          onResetFilters={resetFilters}
          activeFilterCount={
            (searchQuery ? 1 : 0) + 
            activeFilters.categories.length + 
            (activeFilters.status !== 'all' ? 1 : 0)
          }
        />

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg font-medium">جاري تحميل الخدمات...</span>
          </div>
        ) : (
          <ServicesList 
            services={filteredServices} 
            onRefreshServices={fetchServices}
          />
        )}

        {hasAddPermission && (
          <AddServiceDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onServiceAdded={fetchServices}
          />
        )}
      </div>
    </Layout>
  );
}
