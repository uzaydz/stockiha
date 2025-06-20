import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProductsPaginated } from '@/lib/api/products';
import { getCategories, Category } from '@/lib/api/unified-api';
import StoreProductGrid from '@/components/store/StoreProductGrid';
import StoreLayout from '@/components/StoreLayout';
import type { Product } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  SlidersHorizontal, 
  Grid3X3, 
  List, 
  Filter, 
  X, 
  ShoppingBag, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { debounce } from 'lodash-es';
import { useProductsCache } from '@/hooks/useProductsCache';
import PerformanceMonitor from '@/components/PerformanceMonitor';

// Types for better type safety
interface PaginationData {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface FilterState {
  searchQuery: string;
  categoryFilter: string | null;
  stockFilter: string;
  sortOption: string;
  priceRange: [number, number];
}

// Constants
const PRODUCTS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;

// Custom hooks for better performance
const useProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL params only once
  const [filters, setFilters] = useState<FilterState>(() => ({
    searchQuery: searchParams.get('search') || '',
    categoryFilter: searchParams.get('category'),
    stockFilter: searchParams.get('stock') || 'all',
    sortOption: searchParams.get('sort') || 'newest',
    priceRange: [0, 5000]
  }));

  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL params
    if (value && value !== 'all' && value !== '') {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        const paramKey = key === 'categoryFilter' ? 'category' : 
                        key === 'stockFilter' ? 'stock' :
                        key === 'sortOption' ? 'sort' : 
                        key === 'searchQuery' ? 'search' : key;
        newParams.set(paramKey, value.toString());
        return newParams;
      });
    } else {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        const paramKey = key === 'categoryFilter' ? 'category' : 
                        key === 'stockFilter' ? 'stock' :
                        key === 'sortOption' ? 'sort' : 
                        key === 'searchQuery' ? 'search' : key;
        newParams.delete(paramKey);
        return newParams;
      });
    }
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    const newFilters = {
      searchQuery: '',
      categoryFilter: null,
      stockFilter: 'all',
      sortOption: 'newest',
      priceRange: [0, 5000] as [number, number]
    };
    setFilters(newFilters);
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, updateFilter, resetFilters };
};

const useProductsData = (organizationId: string | undefined, filters: FilterState, currentPage: number) => {
  const [data, setData] = useState<PaginationData>({
    products: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced cache system
  const cache = useProductsCache();
  
  // Memoize the fetch function with stable dependencies
  const fetchProducts = useCallback(async (orgId: string, page: number, filterState: FilterState) => {
    console.log('🏪 useProductsData - fetchProducts called:', { orgId, page, filterState });
    
    if (!orgId) {
      console.log('🏪 useProductsData - No organization ID provided, skipping fetch');
      return;
    }
    
    const cacheKey = cache.generateCacheKey(orgId, page, filterState);
    console.log('🏪 useProductsData - Cache key:', cacheKey);

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('🏪 useProductsData - Using cached data:', cachedData);
      setData(cachedData);
      setIsLoading(false);
          return;
        }
          
    setIsLoading(true);
    setError(null);
    console.log('🏪 useProductsData - Fetching fresh data from API');
    
    try {
      const result = await getProductsPaginated(orgId, page, PRODUCTS_PER_PAGE, {
        searchQuery: filterState.searchQuery || undefined,
        categoryFilter: filterState.categoryFilter || undefined,
        stockFilter: filterState.stockFilter,
        sortOption: filterState.sortOption,
      });
      
      console.log('🏪 useProductsData - API result:', result);
      
      // Cache the result
      cache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      console.error('🏪 useProductsData - API error:', err);
      setError('حدث خطأ أثناء تحميل المنتجات');
      } finally {
        setIsLoading(false);
      }
  }, [cache.generateCacheKey, cache.get, cache.set]);

  // Create a stable debounced function
  const debouncedFetch = useMemo(
    () => debounce(fetchProducts, DEBOUNCE_DELAY),
    [fetchProducts]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFetch.cancel?.();
    };
  }, [debouncedFetch]);

  useEffect(() => {
    if (organizationId) {
      debouncedFetch(organizationId, currentPage, filters);
    }
    
    // Cleanup function to cancel debounced calls
    return () => {
      debouncedFetch.cancel?.();
    };
  }, [organizationId, currentPage, filters.searchQuery, filters.categoryFilter, filters.stockFilter, filters.sortOption, debouncedFetch]);

  // Clear cache when organization changes - use a separate effect
  useEffect(() => {
    if (organizationId) {
      cache.invalidate(`products_${organizationId}`);
    }
  }, [organizationId]);

  return { data, isLoading, error, cache };
};

// Pagination component
const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  hasNextPage, 
  hasPreviousPage, 
  onPageChange,
  isLoading 
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslation();
  const pageNumbers = useMemo(() => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
          }
    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage || isLoading}
        className="gap-2"
      >
        <ChevronRight className="h-4 w-4" />
        {t('storeProducts.pagination.previous')}
      </Button>
      
      <div className="flex items-center gap-1">
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className="w-10 h-10"
          >
            {page}
          </Button>
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage || isLoading}
        className="gap-2"
      >
        {t('storeProducts.pagination.next')}
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Loading skeleton component
const ProductsSkeleton = () => (
        <div className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
    <div className="text-center mb-8">
      <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
      <Skeleton className="h-8 w-64 mx-auto mb-4" />
      <Skeleton className="h-4 w-96 mx-auto mb-6" />
      <div className="flex items-center justify-center gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
          </div>
          
    {/* Filters Skeleton */}
    <Card className="mb-8">
      <CardContent className="p-6">
        <Skeleton className="h-12 w-full mb-4" />
        <div className="flex gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
            </div>
        <div className="flex justify-between pt-4 border-t">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
          
          {/* Products Grid Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
  </div>
);

const StoreProducts = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useTenant();
  const { filters, updateFilter, resetFilters } = useProductFilters();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [showFilters, setShowFilters] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(
    process.env.NODE_ENV === 'development'
  );

  // استخدام معرف المؤسسة من مصادر متعددة
  const organizationId = useMemo(() => {
    console.log('🏪 StoreProducts - Organization ID resolution started');
    console.log('🏪 Current organization from context:', currentOrganization);
    
    // 1. محاولة الحصول عليه من TenantContext
    if (currentOrganization?.id) {
      console.log('🏪 StoreProducts - Using organization ID from context:', currentOrganization.id);
      return currentOrganization.id;
    }
    
    // 2. محاولة الحصول عليه من localStorage
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      console.log('🏪 StoreProducts - Using organization ID from localStorage:', storedOrgId);
      return storedOrgId;
    }
    
    // 3. إذا كان النطاق الفرعي "asraycollection"، استخدم المعرف المعروف
    const hostname = window.location.hostname;
    if (hostname.includes('asraycollection')) {
      console.log('🏪 StoreProducts - Using hardcoded organization ID for asraycollection');
      return '560e2c06-d13c-4853-abcf-d41f017469cf';
    }
    
    console.log('🏪 StoreProducts - No organization ID found!');
    return null;
  }, [currentOrganization?.id]);

  // Use custom hook for products data
  const { data: paginationData, isLoading, error, cache } = useProductsData(
    organizationId, 
    filters, 
    currentPage
  );

  // Debug logging for products data
  useEffect(() => {
    console.log('🏪 StoreProducts - Products data updated:', {
      organizationId,
      productsCount: paginationData.products.length,
      totalCount: paginationData.totalCount,
      isLoading,
      error,
      filters
    });
  }, [organizationId, paginationData, isLoading, error, filters]);

  // Fetch categories with stable reference
  useEffect(() => {
    if (!organizationId) return;
    
    let isCancelled = false;
    
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const categoriesData = await getCategories(organizationId);
        
        if (!isCancelled) {
          const productCategories = categoriesData.filter(
            (category) => category.type === 'product'
          );
          setCategories(productCategories);
        }
      } catch (error) {
        if (!isCancelled) {
          toast.error(t('storeProducts.states.error.categoriesError'));
        }
      } finally {
        if (!isCancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    fetchCategories();
    
    return () => {
      isCancelled = true;
    };
  }, [organizationId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchQuery, filters.categoryFilter, filters.stockFilter, filters.sortOption]);

  // Memoized values for performance
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.categoryFilter) count++;
    if (filters.stockFilter !== 'all') count++;
    if (filters.sortOption !== 'newest') count++;
    return count;
  }, [filters]);

  const selectedCategoryName = useMemo(() => {
    return categories.find(c => c.id === filters.categoryFilter)?.name;
  }, [categories, filters.categoryFilter]);

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearSearch = useCallback(() => {
    updateFilter('searchQuery', '');
  }, [updateFilter]);

  // Loading state
  if (isLoading && currentPage === 1) {
    return (
      <StoreLayout>
        <ProductsSkeleton />
      </StoreLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-destructive/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="h-12 w-12 text-destructive" />
          </div>
          <h3 className="text-2xl font-semibold mb-4">{t('storeProducts.states.error.title')}</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="h-4 w-4 ml-2" />
            {t('storeProducts.states.error.retry')}
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-6">
          {/* Enhanced Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t('storeProducts.title')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('storeProducts.subtitle')}
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mt-6">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {paginationData.totalCount}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">{t('storeProducts.stats.productsAvailable')}</div>
              </div>
              <Separator orientation="vertical" className="h-6 md:h-8" />
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">{categories.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  {categories.length === 1 ? t('storeProducts.stats.category') : t('storeProducts.stats.categories')}
                </div>
              </div>
              <Separator orientation="vertical" className="h-6 md:h-8" />
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {paginationData.products.length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">{t('storeProducts.stats.currentPage')}</div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Search and Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-8 border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('storeProducts.search.placeholder')}
                    value={filters.searchQuery}
                    onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    className="pr-10 pl-10 h-12 text-lg border-primary/20 focus:border-primary"
                  />
                  {filters.searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('storeProducts.search.quickFilter')}</span>
                  </div>
                  
                  {/* Category Quick Filter */}
                  <Select 
                    value={filters.categoryFilter || 'all'} 
                    onValueChange={(value) => updateFilter('categoryFilter', value === 'all' ? null : value)}
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder={t('storeProducts.filters.category.label')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('storeProducts.filters.category.all')}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort Filter */}
                  <Select value={filters.sortOption} onValueChange={(value) => updateFilter('sortOption', value)}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder={t('storeProducts.filters.sort.label')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t('storeProducts.filters.sort.newest')}</SelectItem>
                      <SelectItem value="price-low">{t('storeProducts.filters.sort.priceLow')}</SelectItem>
                      <SelectItem value="price-high">{t('storeProducts.filters.sort.priceHigh')}</SelectItem>
                      <SelectItem value="name-asc">{t('storeProducts.filters.sort.nameAsc')}</SelectItem>
                      <SelectItem value="name-desc">{t('storeProducts.filters.sort.nameDesc')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Stock Filter */}
                  <Select value={filters.stockFilter} onValueChange={(value) => updateFilter('stockFilter', value)}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue placeholder={t('storeProducts.filters.stock.label')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('storeProducts.filters.stock.all')}</SelectItem>
                      <SelectItem value="in-stock">{t('storeProducts.filters.stock.inStock')}</SelectItem>
                      <SelectItem value="out-of-stock">{t('storeProducts.filters.stock.outOfStock')}</SelectItem>
                      <SelectItem value="low-stock">{t('storeProducts.filters.stock.lowStock')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Reset Filters */}
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" onClick={resetFilters} className="h-9 text-muted-foreground">
                      <X className="h-4 w-4 ml-2" />
                      {t('storeProducts.filters.reset', { count: activeFiltersCount })}
                    </Button>
                  )}
                </div>

                {/* Results Info and View Controls */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t('storeProducts.search.resultsInfo', { 
                        showing: paginationData.products.length, 
                        total: paginationData.totalCount 
                      })}
                      {paginationData.totalPages > 1 && (
                        <span className="mr-2">
                          {t('storeProducts.search.pageInfo', { 
                            current: paginationData.currentPage, 
                            total: paginationData.totalPages 
                          })}
                        </span>
                      )}
                    </span>
                    
                    {/* Active Filters Display */}
                    {activeFiltersCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('storeProducts.search.activeFilters')}</span>
                        <div className="flex gap-1">
                          {filters.searchQuery && (
                            <Badge variant="secondary" className="text-xs">
                              {t('storeProducts.search.searchFilter', { query: filters.searchQuery })}
                            </Badge>
                          )}
                          {filters.categoryFilter && (
                            <Badge variant="secondary" className="text-xs">
                              {t('storeProducts.search.categoryFilter', { category: selectedCategoryName })}
                            </Badge>
                          )}
                          {filters.stockFilter !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                              {filters.stockFilter === 'in-stock' ? t('storeProducts.filters.stock.inStock') : 
                               filters.stockFilter === 'out-of-stock' ? t('storeProducts.filters.stock.outOfStock') : 
                               t('storeProducts.filters.stock.lowStock')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Options */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant={view === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('grid')}
                        className="h-7 w-7 p-0"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={view === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('list')}
                        className="h-7 w-7 p-0"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>

                    {view === 'grid' && (
                      <Select value={gridColumns.toString()} onValueChange={(value) => setGridColumns(Number(value) as 2 | 3 | 4)}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Products Grid with Loading State */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            {/* Loading Overlay */}
            {isLoading && currentPage > 1 && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('storeProducts.states.loading')}</span>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {paginationData.products.length === 0 && !isLoading ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-16"
                >
                  <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{t('storeProducts.states.empty.title')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t('storeProducts.states.empty.message')}
                  </p>
                  <Button onClick={resetFilters} variant="outline">
                    <Filter className="h-4 w-4 ml-2" />
                    {t('storeProducts.states.empty.resetFilters')}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="products"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Suspense fallback={<ProductsSkeleton />}>
                  <StoreProductGrid
                      products={paginationData.products}
                    view={view}
                    gridColumns={gridColumns}
                  />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={paginationData.currentPage}
            totalPages={paginationData.totalPages}
            hasNextPage={paginationData.hasNextPage}
            hasPreviousPage={paginationData.hasPreviousPage}
            onPageChange={handlePageChange}
            isLoading={isLoading}
                     />

           {/* Performance Monitor (Development Only) */}
           {process.env.NODE_ENV === 'development' && (
             <PerformanceMonitor
               cache={cache}
               visible={showPerformanceMonitor}
               onToggle={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
             />
           )}
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreProducts;
