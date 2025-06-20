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
        console.log('🎯 [setCategories] تم استدعاء setCategories (function):', {
          caller: caller,
          prevCount: prev.length,
          newCount: result.length,
          prevIds: prev.map(c => c.id),
          newIds: result.map(c => c.id),
          timestamp: new Date().toISOString(),
          stackTrace: stackTrace
        });
        return result;
      });
    } else {
      console.log('🎯 [setCategories] تم استدعاء setCategories (direct):', {
        caller: caller,
        newCount: newCategories.length,
        newIds: newCategories.map(c => c.id),
        timestamp: new Date().toISOString(),
        stackTrace: stackTrace
      });
      setCategories(newCategories);
    }
  };
  
  const setFilteredCategoriesWithTracking = (newCategories: Category[] | ((prev: Category[]) => Category[])) => {
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
    
    if (typeof newCategories === 'function') {
      setFilteredCategories(prev => {
        const result = newCategories(prev);
        console.log('🎯 [setFilteredCategories] تم استدعاء setFilteredCategories (function):', {
          caller: caller,
          prevCount: prev.length,
          newCount: result.length,
          prevIds: prev.map(c => c.id),
          newIds: result.map(c => c.id),
          timestamp: new Date().toISOString()
        });
        return result;
      });
    } else {
      console.log('🎯 [setFilteredCategories] تم استدعاء setFilteredCategories (direct):', {
        caller: caller,
        newCount: newCategories.length,
        newIds: newCategories.map(c => c.id),
        timestamp: new Date().toISOString()
      });
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
    
    console.log('🔄 [Categories State] تغيير في categories state:', {
      count: categories.length,
      ids: categories.map(c => c.id),
      names: categories.map(c => c.name),
      timestamp: new Date().toISOString(),
      caller: caller,
      fullStack: stackTrace
    });
    
    // إذا كان العدد 10 بعد أن كان 9، فهذا هو المشكل!
    if (categories.length === 10) {
      console.error('🚨 [المشكل المكتشف] تم استبدال البيانات الجديدة (9) بالقديمة (10)!', {
        count: categories.length,
        caller: caller,
        fullStack: stackTrace,
        categoriesIds: categories.map(c => c.id),
        timestamp: new Date().toISOString()
      });
    }
  }, [categories]);

  // تتبع تغييرات filteredCategories state
  useEffect(() => {
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
    
    console.log('🔄 [Filtered State] تغيير في filteredCategories state:', {
      count: filteredCategories.length,
      ids: filteredCategories.map(c => c.id),
      names: filteredCategories.map(c => c.name),
      timestamp: new Date().toISOString(),
      caller: caller
    });
    
    // إذا كان العدد 10 بعد أن كان 9، فهذا هو المشكل!
    if (filteredCategories.length === 10) {
      console.error('🚨 [المشكل المكتشف] تم استبدال filteredCategories الجديدة (9) بالقديمة (10)!', {
        count: filteredCategories.length,
        caller: caller,
        fullStack: stackTrace,
        categoriesIds: filteredCategories.map(c => c.id),
        timestamp: new Date().toISOString()
      });
    }
  }, [filteredCategories]);

  // تطبيق فلاتر البحث والترتيب
  useEffect(() => {
    console.log('🔍 [Filter Effect] بدء تطبيق الفلاتر:', {
      categoriesCount: categories.length,
      searchQuery,
      sortOption,
      activeFilter,
      typeFilter,
      timestamp: new Date().toISOString(),
      categoriesIds: categories.map(c => c.id)
    });
    
    let result = [...categories];

    // تطبيق فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        category => 
          category.name.toLowerCase().includes(query) || 
          (category.description && category.description.toLowerCase().includes(query))
      );
      console.log('🔍 [Filter Effect] بعد فلتر البحث:', result.length);
    }

    // تطبيق فلتر الحالة
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        result = result.filter(category => category.is_active);
      } else if (activeFilter === 'inactive') {
        result = result.filter(category => !category.is_active);
      }
      console.log('🔍 [Filter Effect] بعد فلتر الحالة:', result.length);
    }
    
    // تطبيق فلتر النوع
    if (typeFilter !== 'all') {
      result = result.filter(category => category.type === typeFilter);
      console.log('🔍 [Filter Effect] بعد فلتر النوع:', result.length);
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

    console.log('🔍 [Filter Effect] النتيجة النهائية:', {
      finalCount: result.length,
      finalIds: result.map(c => c.id),
      timestamp: new Date().toISOString()
    });

    setFilteredCategoriesWithTracking(result);
  }, [categories, searchQuery, sortOption, activeFilter, typeFilter]);

  // تحديث الفئات بعد العمليات - مع تحديث شامل لـ React Query
  const refreshCategories = async () => {
    console.log('🎯 [Categories Page] بدء تحديث الفئات بعد العملية...');
    
    // منع التداخل
    if (isRefreshing) {
      console.log('⚠️ [Categories Page] تحديث قيد التنفيذ بالفعل، تم تجاهل الطلب');
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      const organizationId = currentOrganization?.id;
      if (!organizationId) {
        console.error('❌ [Categories Page] معرف المؤسسة غير موجود');
        return;
      }

      console.log('✅ [Categories Page] معرف المؤسسة:', organizationId);
      console.log('🔄 [Categories Page] تحديث شامل لـ React Query cache...');
      
      // 1. تحديث شامل لـ React Query cache
      const categoryQueryKeys = [
        'categories', 'product-categories', 'pos-product-categories', 
        'subscription-categories', `categories-${organizationId}`
      ];
      
      console.log('🚀 [Categories Page] استخدام forceDataRefresh للمفاتيح:', categoryQueryKeys);
      
      // forceDataRefresh معطل مؤقتاً
      console.log('🚫 forceDataRefresh DISABLED - Using direct invalidation instead');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      console.log('🔄 [Categories Page] إجبار invalidateQueries...');
      
      // 2. إجبار invalidateQueries مع queryKey محدد (سيسمح به UltimateRequestController)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['product-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-product-categories'] }),
        queryClient.invalidateQueries({ queryKey: [`categories-${organizationId}`] })
      ]);
      
      console.log('✅ [Categories Page] تم تحديث React Query cache');
      
      // 3. مسح cache المحلي
      if (typeof window !== 'undefined' && (window as any).requestController) {
        console.log('🧹 [Categories Page] مسح cache المحلي...');
        (window as any).requestController.invalidateDataCache('categories');
        (window as any).requestController.invalidateDataCache('product_categories');
        console.log('✅ [Categories Page] تم مسح cache المحلي');
      }
      
      console.log('📥 [Categories Page] جلب البيانات الجديدة من قاعدة البيانات...');
      
      // 4. جلب البيانات الجديدة وتحديث الـ state المحلي
      const categoriesData = await getCategories(organizationId);
      
      console.log('✅ [Categories Page] تم جلب البيانات الجديدة:', {
        count: categoriesData?.length || 0,
        categories: categoriesData?.map(c => ({ id: c.id, name: c.name })) || []
      });
      
      // تحديث state المحلي
      setCategoriesWithTracking(categoriesData);
      setFilteredCategoriesWithTracking(categoriesData || []);
      
      console.log('🎉 [Categories Page] تم تحديث قائمة الفئات بنجاح بعد العملية!');
      console.log('📊 [Categories Page] State الجديد:', {
        categoriesLength: categoriesData?.length || 0,
        filteredLength: (categoriesData || []).length,
        categoriesIds: categoriesData?.map(c => c.id) || [],
        timestamp: new Date().toISOString()
      });
      
      toast.success('تم تحديث قائمة الفئات بنجاح');
      
    } catch (error) {
      console.error('❌ [Categories Page] خطأ في تحديث الفئات:', {
        error,
        organizationId: currentOrganization?.id,
        timestamp: new Date().toISOString()
      });
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
    console.log('🎧 [Categories Page] بدء الاستماع للتحديثات الفورية...');
    
    const handleCategoryCreated = (event: CustomEvent) => {
      console.log('📢 [Categories Page] تم استلام إشعار إنشاء فئة:', event.detail);
      
      // تحديث فوري للقائمة
      if (event.detail?.category) {
        setCategoriesWithTracking(prev => {
          const newCategories = [...prev, event.detail.category];
          console.log('🔄 [Categories Page] تحديث state محلياً:', newCategories.length);
          return newCategories;
        });
        setFilteredCategoriesWithTracking(prev => {
          const newFiltered = [...prev, event.detail.category];
          console.log('🔄 [Categories Page] تحديث filtered state محلياً:', newFiltered.length);
          return newFiltered;
        });
      }
    };

    const handleCategoryDeleted = (event: CustomEvent) => {
      console.log('📢 [Categories Page] تم استلام إشعار حذف فئة:', event.detail);
      
      // تحديث فوري للقائمة - إزالة الفئة المحذوفة
      if (event.detail?.categoryId || event.detail?.data?.categoryId) {
        const categoryId = event.detail.categoryId || event.detail.data.categoryId;
        
        console.log('🗑️ [Categories Page] حذف فئة بمعرف:', categoryId);
        
        setCategoriesWithTracking(prev => {
          const updatedCategories = prev.filter(cat => cat.id !== categoryId);
          console.log('🗑️ [Categories Page] تم حذف الفئة محلياً:', {
            before: prev.length,
            after: updatedCategories.length,
            deletedId: categoryId
          });
          return updatedCategories;
        });
        
        setFilteredCategoriesWithTracking(prev => {
          const updatedFiltered = prev.filter(cat => cat.id !== categoryId);
          console.log('🗑️ [Categories Page] تم حذف الفئة من filtered state:', {
            before: prev.length,
            after: updatedFiltered.length,
            deletedId: categoryId
          });
          return updatedFiltered;
        });
        
        // عدم استدعاء refreshCategories إذا تم التحديث المحلي بنجاح
        console.log('✅ [Categories Page] تم التحديث المحلي بنجاح، لا حاجة لـ refreshCategories');
      } else {
        // إذا لم يكن لدينا categoryId، استدعي refreshCategories
        console.log('⚠️ [Categories Page] لا يوجد categoryId، استدعاء refreshCategories...');
        setTimeout(() => refreshCategories(), 200);
      }
    };

    const handleCategoriesUpdated = (event: CustomEvent) => {
      console.log('📢 [Categories Page] تم استلام إشعار تحديث فئات:', event.detail);
      
      // تحديث شامل للقائمة
      setTimeout(() => {
        console.log('🔄 [Categories Page] تحديث شامل للفئات بعد الإشعار...');
        refreshCategories();
      }, 200);
    };

    // إضافة المستمعين
    window.addEventListener('categoryCreated', handleCategoryCreated as EventListener);
    window.addEventListener('category-deleted', handleCategoryDeleted as EventListener);
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated as EventListener);
    
    console.log('✅ [Categories Page] تم تسجيل مستمعي الأحداث للفئات');

    // تنظيف المستمعين
    return () => {
      console.log('🧹 [Categories Page] إزالة مستمعي الأحداث للفئات');
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
