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
import { useDebounce } from '@/hooks/useDebounce';

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
}

// Unified constants with Dashboard
const PRODUCTS_PER_PAGE = 12;
const DEBOUNCE_DELAY = 300; // Unified with Dashboard
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_SIZE = 30;

// Enhanced cache system
interface CacheEntry {
  data: PaginationData;
  timestamp: number;
  searchParams: string;
}

const resultsCache = new Map<string, CacheEntry>();

const cleanupCache = () => {
  const now = Date.now();
  const entries = Array.from(resultsCache.entries());
  
  // Remove expired entries
  entries.forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_DURATION) {
      resultsCache.delete(key);
    }
  });
  
  // Remove oldest entries if exceeding max size
  if (resultsCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, resultsCache.size - MAX_CACHE_SIZE);
    
    sortedEntries.forEach(([key]) => resultsCache.delete(key));
  }
};

// Enhanced filter hook
const useProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterState>(() => ({
    searchQuery: searchParams.get('search') || '',
    categoryFilter: searchParams.get('category'),
    stockFilter: searchParams.get('stock') || 'all',
    sortOption: searchParams.get('sort') || 'newest',
  }));

  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL params
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      const paramKey = key === 'categoryFilter' ? 'category' : 
                      key === 'stockFilter' ? 'stock' :
                      key === 'sortOption' ? 'sort' : 
                      key === 'searchQuery' ? 'search' : key;
      
      if (value && value !== 'all' && value !== '') {
        newParams.set(paramKey, value.toString());
      } else {
        newParams.delete(paramKey);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    const newFilters = {
      searchQuery: '',
      categoryFilter: null,
      stockFilter: 'all',
      sortOption: 'newest',
    };
    setFilters(newFilters);
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, updateFilter, resetFilters };
};

// Enhanced products data hook
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
  
  // Enhanced request management
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestIdRef = useRef<string>('');
  const loadingRef = useRef(false);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(filters.searchQuery, DEBOUNCE_DELAY);
  
  // Memoized fetch function
  const fetchProducts = useCallback(async (orgId: string, page: number, filterState: FilterState, requestId: string) => {
    if (!orgId) return;
    
    // Generate cache key
    const cacheKey = `store-products-${orgId}-${page}-${JSON.stringify({
      searchQuery: debouncedSearchQuery.trim().toLowerCase(),
      categoryFilter: filterState.categoryFilter,
      stockFilter: filterState.stockFilter,
      sortOption: filterState.sortOption
    })}`;

    // Cleanup cache periodically
    cleanupCache();

    // Check cache first
    const cachedData = resultsCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      setData(cachedData.data);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getProductsPaginated(orgId, page, PRODUCTS_PER_PAGE, {
        searchQuery: debouncedSearchQuery.trim() || undefined,
        categoryFilter: filterState.categoryFilter || undefined,
        stockFilter: filterState.stockFilter,
        sortOption: filterState.sortOption,
      });

      // Check if request was cancelled or superseded
      if (lastRequestIdRef.current !== requestId) {
        return;
      }

      // Cache the result
      resultsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        searchParams: cacheKey
      });

      setData(result);

    } catch (err) {
      if (lastRequestIdRef.current === requestId) {
        setError('حدث خطأ أثناء تحميل المنتجات');
      }
    } finally {
      if (lastRequestIdRef.current === requestId) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [debouncedSearchQuery]);

  // Main effect for data loading
  useEffect(() => {
    if (!organizationId) return;

    // Prevent concurrent requests
    if (loadingRef.current) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new request
    abortControllerRef.current = new AbortController();
    const requestId = `${Date.now()}-${Math.random()}`;
    lastRequestIdRef.current = requestId;
    loadingRef.current = true;

    fetchProducts(organizationId, currentPage, filters, requestId);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [organizationId, currentPage, debouncedSearchQuery, filters.categoryFilter, filters.stockFilter, filters.sortOption, fetchProducts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
  }, []);

  return { data, isLoading, error };
};

// Enhanced pagination component
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
        السابق
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
        التالي
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
      {Array.from({ length: 12 }).map((_, i) => (
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
  const [showFilters, setShowFilters] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Enhanced organization ID resolution
  const organizationId = useMemo(() => {
    // 1. Try from TenantContext
    if (currentOrganization?.id) {
      return currentOrganization.id;
    }
    
    // 2. Try from localStorage
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      return storedOrgId;
    }
    
    // 3. Known domain mapping
    const hostname = window.location.hostname;
    if (hostname.includes('asraycollection')) {
      const knownId = '560e2c06-d13c-4853-abcf-d41f017469cf';
      return knownId;
    }
    
    return null;
  }, [currentOrganization?.id]);

  // Use enhanced products data hook
  const { data: paginationData, isLoading, error } = useProductsData(
    organizationId, 
    filters, 
    currentPage
  );

  // Load categories with optimized caching
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
          toast.error('حدث خطأ في جلب الفئات');
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

  // Enhanced handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
          <h3 className="text-2xl font-semibold mb-4">حدث خطأ أثناء تحميل المنتجات</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="h-4 w-4 ml-2" />
            إعادة المحاولة
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
              متجر المنتجات
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              اكتشف مجموعة متنوعة من المنتجات عالية الجودة
            </p>
            
            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{paginationData.totalCount}</div>
                <div className="text-sm text-muted-foreground">منتج</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{categories.length}</div>
                <div className="text-sm text-muted-foreground">فئة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{paginationData.totalPages}</div>
                <div className="text-sm text-muted-foreground">صفحة</div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المنتجات..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilter('searchQuery', e.target.value)}
                  className="pl-10 pr-10"
                />
                {filters.searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter('searchQuery', '')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-3 mb-4">
                {/* Category Filter */}
                <Select
                  value={filters.categoryFilter || ''}
                  onValueChange={(value) => updateFilter('categoryFilter', value || null)}
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
                  onValueChange={(value) => updateFilter('stockFilter', value)}
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
                  onValueChange={(value) => updateFilter('sortOption', value)}
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
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex border rounded-md">
                  <Button
                    variant={view === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('list')}
                    className="rounded-l-none border-l"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Active Filters & Stats */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <>
                      <Badge variant="secondary">
                        {activeFiltersCount} فلتر نشط
                      </Badge>
                      {selectedCategoryName && (
                        <Badge variant="outline">
                          الفئة: {selectedCategoryName}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      مسح الفلاتر
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {paginationData.totalCount} منتج
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          {paginationData.products.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4">لا توجد منتجات</h3>
              <p className="text-muted-foreground mb-6">
                {activeFiltersCount > 0 
                  ? 'لا توجد منتجات تطابق الفلاتر المحددة'
                  : 'لا توجد منتجات متاحة حالياً'
                }
              </p>
              {activeFiltersCount > 0 && (
                <Button onClick={resetFilters} variant="outline">
                  مسح الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Loading indicator */}
              {isLoading && (
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التحميل...
                  </div>
                </div>
              )}

                             <StoreProductGrid 
                 products={paginationData.products}
                 view={view}
                 gridColumns={3}
               />
              
              {/* Enhanced Pagination */}
              <PaginationControls
                currentPage={paginationData.currentPage}
                totalPages={paginationData.totalPages}
                hasNextPage={paginationData.hasNextPage}
                hasPreviousPage={paginationData.hasPreviousPage}
                onPageChange={handlePageChange}
                isLoading={isLoading}
              />
            </>
          )}
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreProducts;
