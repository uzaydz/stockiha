import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getProductsPaginated } from '@/lib/api/products';
import ProductsHeader from '@/components/product/ProductsHeader';
import ProductsList from '@/components/product/ProductsList';
import ProductsFilter from '@/components/product/ProductsFilter';
import AddProductDialog from '@/components/product/AddProductDialog';
import { CustomPagination as Pagination } from '@/components/ui/pagination';
import type { Product } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';
import SyncProducts from '@/components/product/SyncProducts';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import ProductsSkeleton from '@/components/product/ProductsSkeleton';
import { Grid, List, RefreshCcw, Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Define category type
type CategoryObject = { id: string; name: string; slug: string };

// View mode type
type ViewMode = 'grid' | 'list';

// Enhanced filter interface
interface FilterState {
  searchQuery: string;
  categoryFilter: string | null;
  stockFilter: string;
  sortOption: string;
}

// Constants for better performance
const DEBOUNCE_DELAY = 300; // زيادة debounce لتحسين الأداء
const DEFAULT_PAGE_SIZE = 12; // زيادة عدد المنتجات في الصفحة
const MAX_CACHE_SIZE = 20; // تقليل حجم cache

const Products = memo(() => {
  const { currentOrganization } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Enhanced request management
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const lastRequestIdRef = useRef<string>('');
  const currentPageRef = useRef(1);
  
  // Core state management
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Filter state with URL sync
  const [filters, setFilters] = useState<FilterState>(() => ({
    searchQuery: searchParams.get('search') || '',
    categoryFilter: searchParams.get('category'),
    stockFilter: searchParams.get('stock') || 'all',
    sortOption: searchParams.get('sort') || 'newest',
  }));

  // Refs for stable references
  const filtersRef = useRef<FilterState>(filters);
  const debouncedSearchQueryRef = useRef('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  // UI preferences
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('products-view-mode', 'grid');
  const [showFilters, setShowFilters] = useLocalStorage('products-show-filters', true);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Categories cache with optimized loading
  const [categories, setCategories] = useState<CategoryObject[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Enhanced debounced search - زيادة التأخير لتحسين الأداء
  const debouncedSearchQuery = useDebounce(filters.searchQuery, DEBOUNCE_DELAY);

  // تحديث refs عند تغيير القيم
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    debouncedSearchQueryRef.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  // Memoized filter for URL updates
  const activeFilters = useMemo(() => ({
    search: debouncedSearchQuery || undefined,
    category: filters.categoryFilter || undefined,
    stock: filters.stockFilter !== 'all' ? filters.stockFilter : undefined,
    sort: filters.sortOption !== 'newest' ? filters.sortOption : undefined,
    page: currentPage > 1 ? currentPage.toString() : undefined,
    pageSize: pageSize !== DEFAULT_PAGE_SIZE ? pageSize.toString() : undefined,
  }), [debouncedSearchQuery, filters.categoryFilter, filters.stockFilter, filters.sortOption, currentPage, pageSize]);

  // Optimized URL params update
  const updateURL = useCallback((newFilters: Partial<FilterState> = {}, newPage?: number) => {
    const updatedFilters = { ...filters, ...newFilters };
    const page = newPage || currentPage;
    
    const params = new URLSearchParams();
    
    // Add only non-default values
    if (updatedFilters.searchQuery) params.set('search', updatedFilters.searchQuery);
    if (updatedFilters.categoryFilter) params.set('category', updatedFilters.categoryFilter);
    if (updatedFilters.stockFilter !== 'all') params.set('stock', updatedFilters.stockFilter);
    if (updatedFilters.sortOption !== 'newest') params.set('sort', updatedFilters.sortOption);
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', pageSize.toString());

    // Navigate without causing unnecessary re-renders
    navigate({ search: params.toString() }, { replace: true });
  }, [filters, currentPage, pageSize, navigate]);

  // Enhanced filter handlers (defined after updateURL)
  const handleFilterChange = useCallback((
    filterType: keyof FilterState,
    value: string | null
  ) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    // إعادة تعيين للصفحة الأولى عند تغيير الفلاتر
    const newPage = 1;
    setCurrentPage(newPage);
    
    // تحديث URL مباشرة
    updateURL(newFilters, newPage);
  }, [filters, updateURL]);

  // Enhanced products fetching with better error handling
  const fetchProducts = useCallback(async (
    page?: number,
    filterOverrides: Partial<FilterState> = {},
    forceRefresh: boolean = false
  ) => {
    // منع الطلبات المتكررة
    if (loadingRef.current && !forceRefresh) {
      return;
    }

    if (!currentOrganization?.id) {
      setProducts([]);
      setIsLoading(false);
      loadingRef.current = false;
      return;
    }

    // إلغاء الطلب السابق
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // إنشاء طلب جديد
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const requestId = `${Date.now()}-${Math.random()}`;
    lastRequestIdRef.current = requestId;

    // تعيين حالة التحميل
    loadingRef.current = true;
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      // 🚀 تحسين الأداء: تجهيز البيانات بشكل متدرج
      
      // الخطوة 1: تحضير المعاملات
      const currentPageValue = page || currentPageRef.current;
      const currentFilters = filtersRef.current;
      const currentDebouncedQuery = debouncedSearchQueryRef.current;
      
      const searchFilters = { ...currentFilters, ...filterOverrides };

      // الخطوة 2: تنفيذ الطلب مع تحسين الأداء
      const { getProductsPaginatedOptimized } = await import('@/lib/api/products');
      const result = await getProductsPaginatedOptimized(
        currentOrganization.id,
        currentPageValue,
        pageSize,
        {
          includeInactive: false,
          searchQuery: currentDebouncedQuery.trim(),
          categoryFilter: searchFilters.categoryFilter || '',
          stockFilter: searchFilters.stockFilter,
          sortOption: searchFilters.sortOption,
        }
      );

      // التحقق من عدم إلغاء الطلب أو تغيير الطلب
      if (signal.aborted || lastRequestIdRef.current !== requestId) {
        loadingRef.current = false;
        return;
      }

      // 🚀 تحديث الحالة بشكل متدرج لتجنب حجب الواجهة
      
      // تحديث البيانات الأساسية أولاً
      setProducts(result.products);
      setTotalCount(result.totalCount);
      
      // تأخير قصير لتجنب حجب الواجهة
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // تحديث بيانات التصفح
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);

    } catch (error: any) {
      if (error.name === 'AbortError' || signal.aborted) {
        loadingRef.current = false;
        return;
      }

      setLoadError('حدث خطأ أثناء تحميل المنتجات');
      toast.error('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      // تنظيف الحالة فقط إذا كان هذا هو آخر طلب
      if (lastRequestIdRef.current === requestId) {
        loadingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [currentOrganization?.id]);

  // Load categories optimized
  const loadCategories = useCallback(async () => {
    if (!currentOrganization?.id || categoriesLoading) return;

    setCategoriesLoading(true);
    try {
      // 🚀 تحسين الأداء: تحميل الفئات بشكل محسن
      
      // استخدام الـ API البسيط لجلب الفئات
      const { getCategories } = await import('@/lib/api/products');
      const categoriesData = await getCategories(currentOrganization.id);
      
      // تأخير قصير لتجنب حجب الواجهة
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // معالجة البيانات بشكل متدرج
      const processedCategories = categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug || ''
      }));
      
      setCategories(processedCategories);
      
    } catch (error) {
    } finally {
      setCategoriesLoading(false);
    }
  }, [currentOrganization?.id, categoriesLoading]);

  // Main effect for data loading
  useEffect(() => {
    if (!currentOrganization?.id) return;

    // منع تنشيط الـ effect أكثر من مرة في وقت قصير
    if (loadingRef.current) {
      return;
    }

    // 🚀 تحميل البيانات الأساسية بشكل متدرج لتجنب المهام الطويلة
    const loadData = async () => {
      try {
        // الخطوة 1: تحميل الفئات أولاً (أسرع)
        const categoriesPromise = loadCategories();
        
        // تأخير قصير لتجنب حجب الواجهة
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // الخطوة 2: تحميل المنتجات بشكل متدرج
        const productsPromise = fetchProducts(currentPage);
        
        // انتظار اكتمال التحميل
        await Promise.all([categoriesPromise, productsPromise]);
        
      } catch (error) {
      }
    };

    // استخدام requestIdleCallback لتجنب حجب الواجهة
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loadData();
      }, { timeout: 1000 });
    } else {
      // fallback للمتصفحات التي لا تدعم requestIdleCallback
      setTimeout(() => {
        loadData();
      }, 100);
    }
  }, [currentOrganization?.id, currentPage, debouncedSearchQuery, filters.categoryFilter, filters.stockFilter, filters.sortOption, pageSize]);

  // Page navigation handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    updateURL({}, page);
    // scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateURL]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    updateURL({}, 1);
  }, [updateURL]);

  // Reset filters
  const resetFilters = useCallback(() => {
    const defaultFilters: FilterState = {
      searchQuery: '',
      categoryFilter: null,
      stockFilter: 'all',
      sortOption: 'newest'
    };
    
    setFilters(defaultFilters);
    setCurrentPage(1);
    
    // مسح URL params
    navigate({ search: '' }, { replace: true });
  }, [navigate]);

  // Enhanced refresh handler
  const refreshProducts = useCallback(async () => {
    await fetchProducts(currentPage, {}, true);
    toast.success('تم تحديث قائمة المنتجات بنجاح');
  }, [fetchProducts, currentPage]);

  // Navigation state effect for refresh
  useEffect(() => {
    const locationState = location.state as { refreshData?: boolean; timestamp?: number } | null;
    
    if (locationState?.refreshData && locationState?.timestamp) {
      fetchProducts(currentPage, {}, true);
      
      // مسح state
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [location.state]); // إزالة fetchProducts و currentPage من dependencies

  // Product operation events listener
  useEffect(() => {
    const handleProductUpdated = (event: CustomEvent) => {
      // استخدام ref للحصول على أحدث قيمة للصفحة الحالية
      const currentPageValue = currentPageRef.current || 1;
      fetchProducts(currentPageValue, {}, true);
    };

    window.addEventListener('products-updated', handleProductUpdated);
    window.addEventListener('product-operation-completed', handleProductUpdated);

    return () => {
      window.removeEventListener('products-updated', handleProductUpdated);
      window.removeEventListener('product-operation-completed', handleProductUpdated);
    };
  }, []); // إزالة جميع dependencies

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
  }, []);

  // Render states
  const renderErrorState = useCallback(() => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="text-destructive mb-4">
        <RefreshCcw className="h-12 w-12" />
      </div>
      <h3 className="text-lg font-medium text-destructive mb-2">حدث خطأ أثناء تحميل المنتجات</h3>
      <p className="text-sm text-destructive/80 mb-4 text-center">{loadError}</p>
      <Button onClick={refreshProducts} variant="destructive" className="gap-2">
        <RefreshCcw className="h-4 w-4" />
        إعادة المحاولة
      </Button>
    </div>
  ), [loadError, refreshProducts]);

  const renderEmptyState = useCallback(() => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border border-border rounded-lg bg-muted/30">
      <div className="text-muted-foreground mb-4">
        <Search className="h-12 w-12" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {debouncedSearchQuery || filters.categoryFilter || filters.stockFilter !== 'all' 
          ? 'لا توجد منتجات تطابق البحث' 
          : 'لا توجد منتجات'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 text-center">
        {debouncedSearchQuery || filters.categoryFilter || filters.stockFilter !== 'all'
          ? 'جرب تغيير كلمات البحث أو الفلاتر المحددة'
          : 'قم بإضافة منتجات جديدة لعرضها هنا'
        }
      </p>
      <div className="flex gap-2">
        {(debouncedSearchQuery || filters.categoryFilter || filters.stockFilter !== 'all') && (
          <Button onClick={resetFilters} variant="outline" className="gap-2">
            <X className="h-4 w-4" />
            مسح الفلاتر
          </Button>
        )}
        <Button onClick={() => setIsAddProductOpen(true)} className="gap-2">
          <Search className="h-4 w-4" />
          إضافة منتج جديد
        </Button>
      </div>
    </div>
  ), [debouncedSearchQuery, filters.categoryFilter, filters.stockFilter, resetFilters]);

  // Loading state
  if (isLoading && !isRefreshing && (!Array.isArray(products) || products.length === 0)) {
    return (
      <Layout>
        <ProductsSkeleton />
      </Layout>
    );
  }

  // Error state
  if (loadError && (!Array.isArray(products) || products.length === 0)) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          {renderErrorState()}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Products Header with all buttons */}
        <ProductsHeader
          productCount={Array.isArray(products) ? products.length : 0}
          onAddProduct={() => setIsAddProductOpen(true)}
          products={products}
          onAddProductClick={() => {}}
          onSearchChange={(value) => handleFilterChange('searchQuery', value)}
          searchQuery={filters.searchQuery}
          onSortChange={(value) => handleFilterChange('sortOption', value)}
          sortOption={filters.sortOption}
          totalProducts={totalCount}
          onShowFilter={() => setShowFilters(!showFilters)}
          isSyncing={isRefreshing}
          unsyncedCount={0}
          onSync={refreshProducts}
        />

        {/* Enhanced Filters */}
        {showFilters && (
          <div className="bg-card border rounded-lg p-4 space-y-4">
            {/* Filter Row */}
            <div className="flex flex-wrap gap-3">
              {/* Category Filter */}
                             <Select
                 value={filters.categoryFilter || 'all'}
                 onValueChange={(value) => handleFilterChange('categoryFilter', value === 'all' ? null : value)}
               >
                 <SelectTrigger className="w-48">
                   <SelectValue placeholder="جميع الفئات" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">جميع الفئات</SelectItem>
                   {categories.map((category) => (
                     <SelectItem key={category.id} value={category.id}>
                       {category.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>

              {/* Stock Filter */}
              <Select
                value={filters.stockFilter}
                onValueChange={(value) => handleFilterChange('stockFilter', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المنتجات</SelectItem>
                  <SelectItem value="in-stock">متوفر</SelectItem>
                  <SelectItem value="low-stock">مخزون منخفض</SelectItem>
                  <SelectItem value="out-of-stock">نفد المخزون</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Filter */}
              <Select
                value={filters.sortOption}
                onValueChange={(value) => handleFilterChange('sortOption', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="oldest">الأقدم</SelectItem>
                  <SelectItem value="name-asc">الاسم (أ-ي)</SelectItem>
                  <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
                  <SelectItem value="price-low">السعر (منخفض)</SelectItem>
                  <SelectItem value="price-high">السعر (مرتفع)</SelectItem>
                  <SelectItem value="stock-high">المخزون (مرتفع)</SelectItem>
                  <SelectItem value="stock-low">المخزون (منخفض)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none border-l"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Reset Filters */}
              {(filters.searchQuery || filters.categoryFilter || filters.stockFilter !== 'all' || filters.sortOption !== 'newest') && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Products Content */}
        <div className="space-y-4">
          {/* Loading overlay for refresh */}
          {isRefreshing && (
            <div className="text-center text-sm text-muted-foreground">
              جاري تحديث المنتجات...
            </div>
          )}

          {/* Products List */}
          {!Array.isArray(products) || products.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
                             <ProductsList 
                 products={products} 
                 viewMode={viewMode}
                 isLoading={isRefreshing}
                 onRefreshProducts={refreshProducts}
               />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-6">
                                     <Pagination
                     currentPage={currentPage}
                     totalPages={totalPages}
                     onPageChange={handlePageChange}
                   />
                  
                  {/* Page Size Selector */}
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(Number(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Product Dialog */}
                 <AddProductDialog
           open={isAddProductOpen}
           onOpenChange={setIsAddProductOpen}
           onProductAdded={refreshProducts}
         />
      </div>
    </Layout>
  );
});

Products.displayName = 'Products';

export default Products;
