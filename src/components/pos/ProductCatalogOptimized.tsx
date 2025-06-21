import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Product } from '@/types';
import { Search, Filter, ShoppingCart, Tag, Package, LayoutGrid, ListFilter, Percent, Users, Plus, ArrowUpDown, Layers, Grid3X3, Grid2X2, List, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { getCategories, Category } from '@/lib/api/unified-api';
import { useTenant } from '@/context/TenantContext';
import { getPaginatedProducts, searchProductsAutocomplete, getProductsStats, transformDatabaseProduct } from '@/lib/api/pos-products-api';
import { useInView } from 'react-intersection-observer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';

interface ProductCatalogOptimizedProps {
  onAddToCart: (product: Product) => void;
}

export default function ProductCatalogOptimized({ onAddToCart }: ProductCatalogOptimizedProps) {
  const { currentOrganization } = useTenant();
  
  // حالة البيانات
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // مرجع لآخر تحديث للمنتجات
  const lastUpdateRef = useRef<number>(0);
  
  // حالة Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // حالة الفلترة والبحث
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'name' | 'price' | 'stock' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Infinite scroll observer
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });
  
  // خطأ في التحميل
  const [error, setError] = useState<string | null>(null);
  
  // مرجع للـ ScrollArea
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const pageSize = viewMode === 'grid' ? 50 : viewMode === 'compact' ? 80 : 30;
  
  // جلب الفئات
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const fetchedCategories = await getCategories(currentOrganization.id);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, [currentOrganization?.id]);
  
  // جلب إحصائيات المنتجات
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const stats = await getProductsStats(currentOrganization.id);
        setStats(stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [currentOrganization?.id]);
  
  // جلب المنتجات
  const fetchProducts = useCallback(async (page: number, reset: boolean = false) => {
    if (!currentOrganization?.id) return;
    
    try {
      setError(null);
      
      if (page === 1) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await getPaginatedProducts(currentOrganization.id, {
        page,
        pageSize,
        searchQuery: debouncedSearchQuery || undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        sortBy: sortOption,
        sortOrder: sortOrder,
        includeVariants: true
      });
      
      const transformedProducts = response.products.map(transformDatabaseProduct);
      
      if (reset) {
        setProducts(transformedProducts);
        // إعادة التمرير إلى الأعلى عند إعادة التعيين
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = 0;
        }
      } else {
        setProducts(prev => [...prev, ...transformedProducts]);
      }
      
      setCurrentPage(response.currentPage);
      setTotalPages(response.pageCount);
      setTotalProducts(response.totalCount);
      setHasNextPage(response.hasNextPage);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('حدث خطأ في تحميل المنتجات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsInitialLoading(false);
      setIsLoadingMore(false);
    }
  }, [currentOrganization?.id, debouncedSearchQuery, selectedCategory, sortOption, sortOrder, pageSize]);
  
  // تحميل الصفحة الأولى عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1, true);
  }, [debouncedSearchQuery, selectedCategory, sortOption, sortOrder, currentOrganization?.id]);
  
  // تحميل المزيد عند الوصول لنهاية القائمة
  useEffect(() => {
    if (inView && hasNextPage && !isLoadingMore && !isInitialLoading) {
      fetchProducts(currentPage + 1, false);
    }
  }, [inView, hasNextPage, isLoadingMore, isInitialLoading, currentPage, fetchProducts]);

  // تحديث دوري للمنتجات كل 30 ثانية لضمان تحديث المخزون
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // تحديث فقط إذا مر أكثر من 30 ثانية منذ آخر تحديث
      if (now - lastUpdateRef.current > 30000) {
        lastUpdateRef.current = now;
        fetchProducts(1, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchProducts]);

  // تحديث فوري عند تغيير focus للنافذة (عند العودة للتطبيق)
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      // تحديث فقط إذا مر أكثر من 10 ثوانٍ منذ آخر تحديث
      if (now - lastUpdateRef.current > 10000) {
        lastUpdateRef.current = now;
        fetchProducts(1, true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchProducts]);
  
  // دالة للحصول على الفئات المعروضة
  const displayCategories = useMemo(() => {
    if (!categories.length) return [];
    
    const categoriesWithCount = categories
      .filter(cat => cat.is_active)
      .map(cat => {
        // في هذا الإصدار، سنستخدم الإحصائيات من stats
        const productCount = products.filter(product => 
          product.category_id === cat.id
        ).length;
        
        return {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          productCount
        };
      })
      .sort((a, b) => {
        if (a.productCount === 0 && b.productCount === 0) {
          return a.name.localeCompare(b.name);
        }
        if (a.productCount === 0) return 1;
        if (b.productCount === 0) return -1;
        return b.productCount - a.productCount;
      });

    // فلترة حسب البحث
    if (categorySearchQuery.trim()) {
      const query = categorySearchQuery.toLowerCase();
      return categoriesWithCount.filter(cat => 
        cat.name.toLowerCase().includes(query)
      );
    }

    return categoriesWithCount;
  }, [categories, products, categorySearchQuery]);
  
  // معالج إضافة المنتج للسلة
  const handleProductClick = useCallback((product: Product) => {
    if (product.stockQuantity > 0) {
      onAddToCart(product);
      
      // تحديث المخزون محلياً فوراً لتحسين تجربة المستخدم
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === product.id 
            ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - 1) }
            : p
        )
      );
    }
  }, [onAddToCart]);
  
  // مكون لعرض المنتج الواحد
  const ProductCard = useCallback(({ product }: { product: Product }) => {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-xl border overflow-hidden transition-all hover:shadow-lg relative group",
          product.stockQuantity > 0 
            ? "hover:border-primary/50 cursor-pointer bg-card hover:translate-y-[-2px]" 
            : "opacity-70 bg-muted/40 border-muted"
        )}
        onClick={() => handleProductClick(product)}
      >
        <div className="relative aspect-square bg-gradient-to-br from-white to-gray-50">
          <img
            src={product.thumbnailImage || '/placeholder-product.svg'}
            alt={product.name}
            className="object-contain w-full h-full p-2"
            loading="lazy"
          />
          
          {product.stockQuantity <= 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-sm font-medium px-3 py-1.5 bg-black/70 rounded-full">نفذت الكمية</span>
            </div>
          )}
          
          {/* شارات المنتج */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {(product as any).allow_wholesale && (product as any).wholesale_price !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-blue-500/90 text-white border-blue-600">
                      <Users className="h-3 w-3 mr-1" />
                      جملة
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">سعر الجملة: {formatPrice((product as any).wholesale_price ?? 0)}</p>
                    <p className="text-xs">الحد الأدنى: {(product as any).min_wholesale_quantity} قطعة</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {product.isDigital && (
              <Badge variant="secondary" className="shadow-sm">
                رقمي
              </Badge>
            )}
          </div>
          
          {/* زر الإضافة للسلة */}
          {product.stockQuantity > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full w-8 h-8 p-0 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                if (product.stockQuantity > 0) {
                  onAddToCart(product);
                  
                  // تحديث المخزون محلياً فوراً
                  setProducts(prevProducts => 
                    prevProducts.map(p => 
                      p.id === product.id 
                        ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - 1) }
                        : p
                    )
                  );
                }
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">إضافة إلى السلة</span>
            </Button>
          )}
        </div>
        
        <div className="p-3 space-y-2">
          <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
              )}
            </div>
            
            <Badge variant={product.stockQuantity > 10 ? "secondary" : product.stockQuantity > 0 ? "outline" : "destructive"} className="text-xs">
              {product.stockQuantity > 0 ? `${product.stockQuantity} متاح` : 'نفذ'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>SKU: {product.sku}</span>
            {product.barcode && (
              <>
                <span>•</span>
                <span>{product.barcode}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  }, [handleProductClick, onAddToCart]);
  
  // مكون لعرض skeleton loader
  const ProductSkeleton = () => (
    <div className="rounded-xl border overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 to-background/50 rounded-lg border shadow-md overflow-hidden">
      {/* شريط البحث والفلترة */}
      <div className="bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-sm p-3 border-b sticky top-0 z-[1]">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="بحث عن منتج، باركود، SKU..."
              className="pl-9 w-full border-primary/20 focus:border-primary shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* أزرار التحكم */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (sortOption === 'name') {
                      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    } else {
                      setSortOption('name');
                      setSortOrder('ASC');
                    }
                  }}
                  className="flex-shrink-0 shadow-sm"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ترتيب: {sortOption === 'name' ? 'الاسم' : sortOption === 'price' ? 'السعر' : sortOption === 'stock' ? 'المخزون' : 'التاريخ'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("flex-shrink-0 shadow-sm", showFilters && "bg-primary/10 text-primary border-primary/50")}
          >
            <Filter className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (viewMode === 'grid') setViewMode('compact');
              else if (viewMode === 'compact') setViewMode('list');
              else setViewMode('grid');
            }}
            className="flex-shrink-0 shadow-sm"
          >
            {viewMode === 'grid' && <Grid3X3 className="h-4 w-4" />}
            {viewMode === 'compact' && <Grid2X2 className="h-4 w-4" />}
            {viewMode === 'list' && <List className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* الفئات */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              className="pt-1 pb-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {categories.length > 5 && (
                <div className="mb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={`بحث في ${categories.length} فئة...`}
                      className="pl-9 h-8 text-sm border-primary/20 focus:border-primary"
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>الفئة:</span>
                </div>
                
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue>
                      {selectedCategory === 'all' 
                        ? `جميع الفئات (${totalProducts})`
                        : `${displayCategories.find(cat => cat.id === selectedCategory)?.name || selectedCategory}`
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all" className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>جميع الفئات</span>
                      </div>
                    </SelectItem>
                    
                    <div className="border-t my-1" />
                    
                    {displayCategories.map(category => (
                      <SelectItem 
                        key={category.id} 
                        value={category.id} 
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="opacity-50" />

      {/* معلومات المنتجات */}
      <div className="bg-gradient-to-r from-muted/30 to-muted/10 px-4 py-2 flex items-center justify-between text-sm border-b sticky top-[68px] z-10">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary/70" />
          <span>
            عرض {products.length} من {totalProducts} منتج
          </span>
          {isLoadingMore && (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          {selectedCategory !== 'all' && (
            <Badge variant="outline" className="bg-background/80 shadow-sm border-primary/20">
              {displayCategories.find(cat => cat.id === selectedCategory)?.name || selectedCategory}
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="outline" className="bg-background/80 shadow-sm border-primary/20">
              بحث: {searchQuery}
            </Badge>
          )}
        </div>
      </div>

      {/* كتالوج المنتجات */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isInitialLoading ? (
          <div className={cn(
            "p-4",
            viewMode === 'grid' ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4" :
            viewMode === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3" :
            "space-y-2"
          )}>
            {Array.from({ length: pageSize }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground p-6">
            <Package className="h-12 w-12 mb-2 opacity-20" />
            <p className="mb-2">لم يتم العثور على منتجات</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="bg-background/80"
            >
              إعادة ضبط الفلتر
            </Button>
          </div>
        ) : (
          <>
            <div className={cn(
              "p-4",
              viewMode === 'grid' ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4" :
              viewMode === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3" :
              "space-y-2"
            )}>
              <AnimatePresence mode="popLayout">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </AnimatePresence>
            </div>
            
            {/* مؤشر تحميل المزيد */}
            {hasNextPage && (
              <div ref={loadMoreRef} className="p-4 flex justify-center">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري تحميل المزيد...</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fetchProducts(currentPage + 1, false)}
                    className="text-muted-foreground"
                  >
                    تحميل المزيد
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
} 