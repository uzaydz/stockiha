import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getProducts, getProductsPaginated } from '@/lib/api/products'; // Direct import from products API
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
import { Grid, List, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Define category type to help with type checking
type CategoryObject = { id: string; name: string; slug: string };

// View mode type
type ViewMode = 'grid' | 'list';

const Products = memo(() => {
  const { currentOrganization } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // استخدام URL search params لحفظ الحالة
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // استخدام URL params مع fallbacks
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(searchParams.get('category'));
  const [sortOption, setSortOption] = useState<string>(searchParams.get('sort') || 'newest');
  const [stockFilter, setStockFilter] = useState<string>(searchParams.get('stock') || 'all');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || 10);
  
  // استخدام localStorage للإعدادات الشخصية
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('products-view-mode', 'list');
  const [showFilters, setShowFilters] = useLocalStorage('products-show-filters', true);
  
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  
  // Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 150);

  // Categories optimization - cache categories
  const [allProductsForCategories, setAllProductsForCategories] = useState<Product[]>([]);
  const [categoriesCache, setCategoriesCache] = useState<string[]>([]);
  const [lastCategoriesFetch, setLastCategoriesFetch] = useState<number>(0);
  
  // Update URL params when filters change
  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Optimized categories fetching with caching
  const fetchCategories = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    // Check cache validity (5 minutes)
    const now = Date.now();
    if (categoriesCache.length > 0 && now - lastCategoriesFetch < 5 * 60 * 1000) {
      return;
    }
    
    try {
      const allProducts = await getProducts(currentOrganization.id);
      setAllProductsForCategories(allProducts);
      setLastCategoriesFetch(now);
    } catch (error) {
    }
  }, [currentOrganization?.id, categoriesCache.length, lastCategoriesFetch]);

  // Memoized categories
  const categories = useMemo(() => {
    const cats = [...new Set(
      allProductsForCategories
        .map(product => {
          if (!product.category) return '';
          
          if (typeof product.category === 'object' && product.category !== null) {
            return (product.category as CategoryObject).name || '';
          }
          
          return String(product.category);
        })
        .filter(Boolean)
    )];
    
    setCategoriesCache(cats);
    return cats;
  }, [allProductsForCategories]);

  // Optimized products fetching
  const fetchProductsPaginated = useCallback(async (
    page: number = currentPage,
    forceRefresh: boolean = false
  ) => {
    if (!currentOrganization?.id) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setLoadError(null);

    try {
      const result = await getProductsPaginated(
        currentOrganization.id,
        page,
        pageSize,
        {
          includeInactive: false,
          searchQuery: debouncedSearchQuery.trim(),
          categoryFilter: categoryFilter || '',
          stockFilter,
          sortOption,
        }
      );

      setProducts(result.products);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
      
      // Update URL params
      updateSearchParams({
        page: result.currentPage.toString(),
        pageSize: pageSize.toString(),
        search: debouncedSearchQuery,
        category: categoryFilter,
        sort: sortOption,
        stock: stockFilter,
      });
      
    } catch (error) {
      setLoadError('حدث خطأ أثناء تحميل المنتجات');
      toast.error('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    currentOrganization?.id,
    currentPage,
    pageSize,
    debouncedSearchQuery,
    categoryFilter,
    stockFilter,
    sortOption,
    updateSearchParams
  ]);

  // Effect for initial load and organization change
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchCategories();
      fetchProductsPaginated(1);
    }
  }, [currentOrganization?.id]);

  // Effect for filter changes (reset to page 1)
  useEffect(() => {
    if (currentOrganization?.id) {
      const newPage = 1;
      setCurrentPage(newPage);
      fetchProductsPaginated(newPage);
    }
  }, [debouncedSearchQuery, categoryFilter, sortOption, stockFilter, pageSize]);

  // Effect for page changes only
  useEffect(() => {
    if (currentOrganization?.id && currentPage > 1) {
      fetchProductsPaginated(currentPage);
    }
  }, [currentPage]);

  // Optimized handlers with useCallback
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const handleCategoryChange = useCallback((category: string | null) => {
    setCategoryFilter(category);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const handleSortChange = useCallback((sort: string) => {
    setSortOption(sort);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const handleStockFilterChange = useCallback((stock: string) => {
    setStockFilter(stock);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  // Product refresh after operations
  const refreshProducts = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    await fetchProductsPaginated(currentPage, true);
    await fetchCategories(); // Refresh categories too
    toast.success('تم تحديث قائمة المنتجات بنجاح');
  }, [currentOrganization?.id, currentPage, fetchProductsPaginated, fetchCategories]);

  // Handler for dummy sync
  const handleDummySync = useCallback(async (): Promise<void> => {
    toast.info('تم تعطيل المزامنة في هذه النسخة');
    return Promise.resolve();
  }, []);

  // Handler for adding a new product
  const handleAddProduct = useCallback(() => {
    setIsAddProductOpen(true);
  }, []);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    setLoadError(null);
    fetchProductsPaginated(1);
  }, [fetchProductsPaginated]);

  // Toggle view mode
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, [setViewMode]);

  // Toggle filters visibility
  const handleToggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters, setShowFilters]);

  // Optimized error state render
  const renderErrorState = useCallback(() => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-4 sm:p-8 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="text-destructive mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-base sm:text-lg font-medium text-destructive mb-2 text-center">حدث خطأ أثناء تحميل المنتجات</h3>
      <p className="text-sm text-destructive/80 mb-4 text-center px-4">{loadError || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.'}</p>
      <Button
        onClick={handleRetry}
        variant="destructive"
        className="gap-2"
      >
        <RefreshCcw className="h-4 w-4" />
        إعادة المحاولة
      </Button>
    </div>
  ), [loadError, handleRetry]);

  // Optimized empty state render
  const renderEmptyState = useCallback(() => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-4 sm:p-8 border border-border rounded-lg bg-muted/30">
      <div className="text-muted-foreground mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-2 text-center">لا توجد منتجات</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center px-4">
        {debouncedSearchQuery || categoryFilter || stockFilter !== 'all' 
          ? 'لا توجد منتجات تطابق الفلاتر المحددة. جرب تغيير الفلاتر أو إضافة منتجات جديدة.'
          : 'قم بإضافة منتجات جديدة لعرضها هنا'
        }
      </p>
      <Button
        onClick={handleAddProduct}
        className="gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        إضافة منتج جديد
      </Button>
    </div>
  ), [debouncedSearchQuery, categoryFilter, stockFilter, handleAddProduct]);

  return (
    <Layout>
      <SyncProducts
        count={unsyncedCount}
        onSync={handleDummySync}
        isSyncing={isSyncing}
      />
      
      <div className="container mx-auto py-3 sm:py-6 px-4 sm:px-6">
        {/* Header with improved responsive design */}
        <div className="space-y-4 sm:space-y-6">
          <ProductsHeader
            productCount={totalCount}
            onAddProduct={handleAddProduct}
            products={products}
            onAddProductClick={handleAddProduct}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            sortOption={sortOption}
            onSortChange={handleSortChange}
            totalProducts={totalCount}
            onShowFilter={handleToggleFilters}
            isSyncing={isSyncing}
            unsyncedCount={unsyncedCount}
            onSync={handleDummySync}
          />
          
          {/* View mode toggle and refresh - mobile optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">عرض:</span>
              <div className="flex rounded-md border border-input bg-background">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('list')}
                  className={cn(
                    "rounded-l-md rounded-r-none border-0",
                    viewMode === 'list' && "bg-primary text-primary-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">قائمة</span>
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('grid')}
                  className={cn(
                    "rounded-r-md rounded-l-none border-0",
                    viewMode === 'grid' && "bg-primary text-primary-foreground"
                  )}
                >
                  <Grid className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">شبكة</span>
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshProducts()}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFilters}
                className="gap-2 sm:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                {showFilters ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
              </Button>
            </div>
          </div>
          
          {/* Filters with mobile optimization */}
          {showFilters && (
            <div className="space-y-4">
              <ProductsFilter
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                categories={categories}
                categoryFilter={categoryFilter}
                onCategoryChange={handleCategoryChange}
                sortOption={sortOption}
                onSortChange={handleSortChange}
                stockFilter={stockFilter}
                onStockFilterChange={handleStockFilterChange}
              />
            </div>
          )}
        </div>
        
        {/* Content area with improved loading states */}
        <div className="mt-6">
          {loadError ? (
            renderErrorState()
          ) : isLoading && !isRefreshing ? (
            <ProductsSkeleton viewMode={viewMode} />
          ) : products.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="space-y-6">
              {/* Products list with loading overlay */}
              <div className="relative">
                {isRefreshing && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">جاري التحديث...</span>
                    </div>
                  </div>
                )}
                
                <ProductsList 
                  products={products} 
                  onRefreshProducts={refreshProducts}
                  viewMode={viewMode}
                  isLoading={isRefreshing}
                />
              </div>
              
              {/* Pagination with mobile optimization */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    showSizeChanger={true}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    totalItems={totalCount}
                    loading={isLoading || isRefreshing}
                  />
                </div>
              )}
            </div>
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
