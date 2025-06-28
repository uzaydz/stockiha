import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getCategories } from '@/lib/api/unified-api';
import type { Category } from '@/lib/api/categories';
import CategoriesHeader from '@/components/category/CategoriesHeader';
import CategoriesList from '@/components/category/CategoriesList';
import CategoriesFilter from '@/components/category/CategoriesFilter';
import AddCategoryDialog from '@/components/category/AddCategoryDialog';
import { useTenant } from '@/context/TenantContext';
import { useQueryClient } from '@tanstack/react-query';
// import { forceDataRefresh } from '@/lib/ultimateRequestController'; // تعطيل مؤقت

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('name-asc');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const { currentOrganization } = useTenant();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // flag لمنع التداخل بين عمليات التحديث
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Wrapper functions مع تتبع شامل
  const setCategoriesWithTracking = (newCategories: Category[] | ((prev: Category[]) => Category[])) => {
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
    
    if (typeof newCategories === 'function') {
      setCategories(prev => {
        const result = newCategories(prev);
        return result;
      });
    } else {
      setCategories(newCategories);
    }
  };
  
  const setFilteredCategoriesWithTracking = (newCategories: Category[] | ((prev: Category[]) => Category[])) => {
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
    
    if (typeof newCategories === 'function') {
      setFilteredCategories(prev => {
        const result = newCategories(prev);
        return result;
      });
    } else {
      setFilteredCategories(newCategories);
    }
  };

  // جلب بيانات الفئات
  const fetchCategories = async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Timeout للحماية من التعليق
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 30000); // 30 ثانية
    
    try {
      
      // استخدام getCategories مع النظام المحسن
      const categoriesData = await getCategories(currentOrganization.id);
      
      // إلغاء timeout إذا نجح الطلب
      clearTimeout(timeoutId);
      
      setCategoriesWithTracking(categoriesData || []);
      setFilteredCategoriesWithTracking(categoriesData || []);
    } catch (error) {
      
      // إلغاء timeout في حالة الخطأ
      clearTimeout(timeoutId);
      
      setError(error instanceof Error ? error.message : 'حدث خطأ في جلب الفئات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentOrganization]);

  // تتبع تغييرات categories state
  useEffect(() => {
    // إنشاء stack trace لمعرفة من استدعى التغيير
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';

    // إذا كان العدد 10 بعد أن كان 9، فهذا هو المشكل!
    if (categories.length === 10) {
    }
  }, [categories]);

  // تتبع تغييرات filteredCategories state
  useEffect(() => {
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';

    // إذا كان العدد 10 بعد أن كان 9، فهذا هو المشكل!
    if (filteredCategories.length === 10) {
    }
  }, [filteredCategories]);

  // تطبيق فلاتر البحث والترتيب
  useEffect(() => {
    
    let result = [...categories];

    // تطبيق فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        category => 
          category.name.toLowerCase().includes(query) || 
          (category.description && category.description.toLowerCase().includes(query))
      );
    }

    // تطبيق فلتر الحالة
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        result = result.filter(category => category.is_active);
      } else if (activeFilter === 'inactive') {
        result = result.filter(category => !category.is_active);
      }
    }
    
    // تطبيق فلتر النوع
    if (typeFilter !== 'all') {
      result = result.filter(category => category.type === typeFilter);
    }

    // تطبيق الترتيب
    if (sortOption === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    setFilteredCategoriesWithTracking(result);
  }, [categories, searchQuery, sortOption, activeFilter, typeFilter]);

  // تحديث الفئات بعد العمليات - مع تحديث شامل لـ React Query
  const refreshCategories = async () => {
    
    // منع التداخل
    if (isRefreshing) {
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      const organizationId = currentOrganization?.id;
      if (!organizationId) {
        return;
      }

      // 1. تحديث شامل لـ React Query cache
      const categoryQueryKeys = [
        'categories', 'product-categories', 'pos-product-categories', 
        'subscription-categories', `categories-${organizationId}`
      ];

      // forceDataRefresh معطل مؤقتاً
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // 2. إجبار invalidateQueries مع queryKey محدد (سيسمح به UltimateRequestController)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['product-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-product-categories'] }),
        queryClient.invalidateQueries({ queryKey: [`categories-${organizationId}`] })
      ]);

      // 3. مسح cache المحلي
      if (typeof window !== 'undefined' && (window as any).requestController) {
        (window as any).requestController.invalidateDataCache('categories');
        (window as any).requestController.invalidateDataCache('product_categories');
      }

      // 4. جلب البيانات الجديدة وتحديث الـ state المحلي
      const categoriesData = await getCategories(organizationId);

      // تحديث state المحلي
      setCategoriesWithTracking(categoriesData);
      setFilteredCategoriesWithTracking(categoriesData || []);

      toast.success('تم تحديث قائمة الفئات بنجاح');
      
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الفئات');
    } finally {
      setIsRefreshing(false);
    }
  };

  // معالج إضافة فئة جديدة
  const handleAddCategory = () => {
    setIsAddCategoryOpen(true);
  };

  // استمع للتحديثات الفورية للفئات
  useEffect(() => {
    
    const handleCategoryCreated = (event: CustomEvent) => {
      
      // تحديث فوري للقائمة
      if (event.detail?.category) {
        setCategoriesWithTracking(prev => {
          const newCategories = [...prev, event.detail.category];
          return newCategories;
        });
        setFilteredCategoriesWithTracking(prev => {
          const newFiltered = [...prev, event.detail.category];
          return newFiltered;
        });
      }
    };

    const handleCategoryDeleted = (event: CustomEvent) => {
      
      // تحديث فوري للقائمة - إزالة الفئة المحذوفة
      if (event.detail?.categoryId || event.detail?.data?.categoryId) {
        const categoryId = event.detail.categoryId || event.detail.data.categoryId;

        setCategoriesWithTracking(prev => {
          const updatedCategories = prev.filter(cat => cat.id !== categoryId);
          return updatedCategories;
        });
        
        setFilteredCategoriesWithTracking(prev => {
          const updatedFiltered = prev.filter(cat => cat.id !== categoryId);
          return updatedFiltered;
        });
        
        // عدم استدعاء refreshCategories إذا تم التحديث المحلي بنجاح
      } else {
        // إذا لم يكن لدينا categoryId، استدعي refreshCategories
        setTimeout(() => refreshCategories(), 200);
      }
    };

    const handleCategoriesUpdated = (event: CustomEvent) => {
      
      // تحديث شامل للقائمة
      setTimeout(() => {
        refreshCategories();
      }, 200);
    };

    // إضافة المستمعين
    window.addEventListener('categoryCreated', handleCategoryCreated as EventListener);
    window.addEventListener('category-deleted', handleCategoryDeleted as EventListener);
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated as EventListener);

    // تنظيف المستمعين
    return () => {
      window.removeEventListener('categoryCreated', handleCategoryCreated as EventListener);
      window.removeEventListener('category-deleted', handleCategoryDeleted as EventListener);
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated as EventListener);
    };
  }, []);

  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل الفئات...</p>
          </div>
        </div>
      ) : error ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">❌ حدث خطأ في تحميل الفئات</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchCategories}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {/* رأس صفحة الفئات مع العنوان وزر الإضافة */}
          <CategoriesHeader 
            categoryCount={filteredCategories.length}
            onAddCategory={handleAddCategory}
          />
          
          {/* صف الفلاتر */}
          <CategoriesFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={setSortOption}
            activeFilter={activeFilter}
            onActiveFilterChange={setActiveFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
          
          {/* قائمة الفئات */}
          <CategoriesList 
            categories={filteredCategories}
            onRefreshCategories={refreshCategories}
          />
          
          {/* مربع حوار إضافة فئة */}
          <AddCategoryDialog
            open={isAddCategoryOpen}
            onOpenChange={setIsAddCategoryOpen}
            onCategoryAdded={refreshCategories}
          />
        </div>
      )}
    </Layout>
  );
};

export default Categories;
