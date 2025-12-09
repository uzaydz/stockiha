import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import type { Category } from '@/lib/api/categories';
import CategoriesHeader from '@/components/category/CategoriesHeader';
import { usePermissions } from '@/hooks/usePermissions';
import CategoriesListResponsive from '@/components/category/CategoriesListResponsive';
import CategoriesFilter from '@/components/category/CategoriesFilter';
import AddCategoryDialog from '@/components/category/AddCategoryDialog';
import { useTenant } from '@/context/TenantContext';
import { useQueryClient } from '@tanstack/react-query';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
// ⚡ PowerSync Reactive Hooks - تحديث تلقائي فوري!
import { useReactiveCategories, type ReactiveCategory } from '@/hooks/powersync';

interface CategoriesProps extends POSSharedLayoutControls {}

const CategoriesComponent = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}: CategoriesProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('name-asc');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const { currentOrganization } = useTenant();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );
  const perms = usePermissions();
  const canManageCategories = perms.ready ? perms.anyOf(['manageProductCategories','manageProducts']) : false;

  // flag لمنع التداخل بين عمليات التحديث
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInProgress = useRef(false);

  // ⚡ PowerSync Reactive Hooks - تحديث تلقائي فوري!
  const {
    categories: rawCategories,
    isLoading,
    isFetching
  } = useReactiveCategories();

  // ⚡ تحويل الفئات من ReactiveCategory إلى Category مع الفلاتر
  const filteredCategories = useMemo(() => {
    // تحويل ReactiveCategory إلى Category
    let result: Category[] = rawCategories.map((c: ReactiveCategory) => ({
      id: c.id,
      name: c.name,
      slug: c.name.toLowerCase().replace(/\s+/g, '-'),
      description: c.description,
      icon: null,
      image_url: c.image_url,
      image_base64: null,
      is_active: c.is_active,
      type: 'product' as const,
      organization_id: c.organization_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      _synced: true,
      _syncStatus: 'synced',
      _pendingOperation: undefined
    }));

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

    return result;
  }, [rawCategories, searchQuery, sortOption, activeFilter, typeFilter]);

  // ⚡ PowerSync Reactive - لا حاجة لـ useEffect لجلب البيانات!
  // البيانات تأتي تلقائياً من useReactiveCategories

  // ⚡ PowerSync يدير التحديثات تلقائياً - refreshCategories للمزامنة اليدوية فقط
  const refreshCategories = useCallback(async () => {
    if (!isOnline || !currentOrganization?.id) return;

    if (refreshInProgress.current) return;
    refreshInProgress.current = true;

    setIsRefreshing(true);
    setIsSyncing(true);

    try {
      // مزامنة عبر PowerSync
      await powerSyncService.forceSync();

      // تحديث React Query cache
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });

      toast.success('تم تحديث قائمة الفئات بنجاح');
      // ⚡ PowerSync سيحدث البيانات تلقائياً!
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الفئات');
    } finally {
      refreshInProgress.current = false;
      setIsRefreshing(false);
      setIsSyncing(false);
    }
  }, [isOnline, currentOrganization?.id, queryClient]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(refreshCategories);
    return () => {
      onRegisterRefresh(null);
    };
  }, [onRegisterRefresh, refreshCategories]);

  useEffect(() => {
    if (!onLayoutStateChange) return;
    queueMicrotask(() => {
      onLayoutStateChange({
        isRefreshing: isRefreshing || isLoading,
        connectionStatus: error ? 'disconnected' : 'connected'
      });
    });
  }, [onLayoutStateChange, isRefreshing, isLoading, error]);

  // معالج إضافة فئة جديدة
  const handleAddCategory = () => {
    setIsAddCategoryOpen(true);
  };

  // ⚡ PowerSync Reactive - البيانات تتحدث تلقائياً!
  // الأحداث المخصصة للمزامنة فقط عند الاتصال
  useEffect(() => {
    const handleCategoryCreated = () => {
      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => refreshCategories(), 500);
      }
    };

    const handleCategoryDeleted = () => {
      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => refreshCategories(), 500);
      }
    };

    const handleCategoriesUpdated = () => {
      // ⚡ PowerSync سيحدث البيانات تلقائياً!
      if (isOnline) {
        setTimeout(() => refreshCategories(), 500);
      }
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
  }, [refreshCategories, isOnline]);

  if (isLoading) {
    return renderWithLayout(
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">جاري تحميل الفئات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return renderWithLayout(
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">❌ حدث خطأ في تحميل الفئات</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshCategories}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const pageContent = (
    <div className={cn(
      "space-y-4 sm:space-y-6 products-page-container",
      useStandaloneLayout ? "container mx-auto p-2 sm:p-4 lg:p-6" : "px-3 sm:px-4"
    )}>
      <CategoriesHeader 
        categoryCount={filteredCategories.length}
        onAddCategory={handleAddCategory}
        canAdd={canManageCategories}
      />

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

      <CategoriesListResponsive
        categories={filteredCategories}
        onRefreshCategories={refreshCategories}
      />

      {canManageCategories && (
        <AddCategoryDialog
          open={isAddCategoryOpen}
          onOpenChange={setIsAddCategoryOpen}
          onCategoryAdded={refreshCategories}
        />
      )}
    </div>
  );

  return renderWithLayout(pageContent);
};

const Categories = memo(CategoriesComponent);

Categories.displayName = 'Categories';

export default Categories;
