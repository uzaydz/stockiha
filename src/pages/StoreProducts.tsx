import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getProducts } from '@/lib/api/products';
import { getCategories, Category } from '@/lib/api/categories';
import StoreProductHeader from '@/components/store/StoreProductHeader';
import StoreCategoriesBar from '@/components/store/StoreCategoriesBar';
import StoreProductGrid from '@/components/store/StoreProductGrid';
import StoreProductFilters from '@/components/store/StoreProductFilters';
import StoreLayout from '@/components/StoreLayout';
import type { Product } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, Grid3X3, List, Filter, X, ShoppingBag, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const StoreProducts = () => {
  const { currentOrganization } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(searchParams.get('category'));
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products and categories data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!currentOrganization) {
          setProducts([]);
          setFilteredProducts([]);
          return;
        }
          
        const [productsData, categoriesData] = await Promise.all([
          getProducts(currentOrganization.id),
          getCategories(currentOrganization.id)
        ]);

        setProducts(productsData);
        setFilteredProducts(productsData);
        
        // تصفية الفئات لإظهار فئات المنتجات فقط
        const productCategories = categoriesData.filter(
          (category) => category.type === 'product'
        );
        setCategories(productCategories);

        // تحديد نطاق السعر التلقائي بناءً على المنتجات
        if (productsData.length > 0) {
          const prices = productsData.map(p => p.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          setPriceRange([minPrice, maxPrice]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentOrganization]);

  // تحديث تصفية الفئة عند تغير معلمات URL
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam !== categoryFilter) {
      setCategoryFilter(categoryParam);
    }
  }, [searchParams]);

  // Apply filters and search
  useEffect(() => {
    let result = [...products];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        product => 
          product.name.toLowerCase().includes(query) || 
          product.description.toLowerCase().includes(query) ||
          (product.brand && product.brand.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(product => {
        // استخدام category_id كخيار أول إذا كان موجوداً
        if (product.category_id === categoryFilter) {
          return true;
        }
        
        // التحقق من كائن category إذا كان موجوداً واستخراج id منه
        const category = product.category;
        if (!category || typeof category !== 'object') {
          return false;
        }
        
        // فحص إضافي للتأكد من وجود id
        if ('id' in category) {
          return (category as any).id === categoryFilter;
        }
        
        return false;
      });
    }

    // Apply price range filter
    result = result.filter(
      product => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Apply stock filter
    if (stockFilter !== 'all') {
      if (stockFilter === 'in-stock') {
        result = result.filter(product => product.stock_quantity > 0);
      } else if (stockFilter === 'out-of-stock') {
        result = result.filter(product => product.stock_quantity === 0);
      }
    }

    // Apply sorting
    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'popularity') {
      // Sort by any popularity metric you have (views, sales, etc.)
      // For now, just keep the default order
    } else if (sortOption === 'rating') {
      // Sort by rating if you have a rating system
      // For now, just keep the default order
    }

    setFilteredProducts(result);
  }, [products, searchQuery, categoryFilter, priceRange, sortOption, stockFilter]);

  // تحديث معلمات URL عند تغيير تصفية الفئة بواسطة المستخدم
  const handleCategoryChange = (categoryId: string | null) => {
    setCategoryFilter(categoryId);
    if (categoryId) {
      setSearchParams(prev => {
        prev.set('category', categoryId);
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.delete('category');
        return prev;
      });
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter(null);
    setStockFilter('all');
    setSortOption('newest');
    
    // إزالة معلمة الفئة من URL
    setSearchParams(prev => {
      prev.delete('category');
      return prev;
    });
    
    // Reset price range to the full range of all products
    if (products.length > 0) {
      const prices = products.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      setPriceRange([minPrice, maxPrice]);
    } else {
      setPriceRange([0, 5000]);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (categoryFilter) count++;
    if (stockFilter !== 'all') count++;
    if (sortOption !== 'newest') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          {/* Search and Filters Skeleton */}
          <div className="mb-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
              اكتشف مجموعة واسعة من المنتجات عالية الجودة بأفضل الأسعار
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mt-6">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">{products.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground">منتج متاح</div>
              </div>
              <Separator orientation="vertical" className="h-6 md:h-8" />
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">{categories.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground">فئة</div>
              </div>
              <Separator orientation="vertical" className="h-6 md:h-8" />
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">{filteredProducts.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground">نتيجة البحث</div>
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
                    placeholder="ابحث عن المنتجات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 pl-10 h-12 text-lg border-primary/20 focus:border-primary"
                  />
                  {searchQuery && (
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
                    <span className="text-sm font-medium text-muted-foreground">فلترة سريعة:</span>
                  </div>
                  
                  {/* Category Quick Filter */}
                  <Select value={categoryFilter || 'all'} onValueChange={(value) => handleCategoryChange(value === 'all' ? null : value)}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الفئات</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort Filter */}
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="ترتيب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">الأحدث</SelectItem>
                      <SelectItem value="price-low">السعر: من الأقل للأعلى</SelectItem>
                      <SelectItem value="price-high">السعر: من الأعلى للأقل</SelectItem>
                      <SelectItem value="popularity">الأكثر شعبية</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Stock Filter */}
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue placeholder="التوفر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="in-stock">متوفر</SelectItem>
                      <SelectItem value="out-of-stock">غير متوفر</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Advanced Filters Toggle */}
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="h-9 relative">
                        <SlidersHorizontal className="h-4 w-4 ml-2" />
                        فلاتر متقدمة
                        {activeFiltersCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-2 -left-2 h-5 w-5 rounded-full p-0 text-xs">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle>فلاتر متقدمة</SheetTitle>
                        <SheetDescription>
                          استخدم الفلاتر للعثور على المنتجات التي تبحث عنها
                        </SheetDescription>
                      </SheetHeader>
                      <div className="py-6">
                        <StoreProductFilters
                          categories={categories}
                          selectedCategory={categoryFilter}
                          onCategoryChange={handleCategoryChange}
                          priceRange={priceRange}
                          onPriceRangeChange={setPriceRange}
                          stockFilter={stockFilter}
                          onStockFilterChange={setStockFilter}
                          onResetFilters={resetFilters}
                          className="space-y-6"
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Reset Filters */}
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" onClick={resetFilters} className="h-9 text-muted-foreground">
                      <X className="h-4 w-4 ml-2" />
                      إعادة تعيين ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                {/* View Controls and Results Info */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      عرض {filteredProducts.length} من أصل {products.length} منتج
                    </span>
                    
                    {/* Active Filters Display */}
                    {activeFiltersCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">الفلاتر النشطة:</span>
                        <div className="flex gap-1">
                          {searchQuery && (
                            <Badge variant="secondary" className="text-xs">
                              بحث: {searchQuery}
                            </Badge>
                          )}
                          {categoryFilter && (
                            <Badge variant="secondary" className="text-xs">
                              فئة: {categories.find(c => c.id === categoryFilter)?.name}
                            </Badge>
                          )}
                          {stockFilter !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                              {stockFilter === 'in-stock' ? 'متوفر' : 'غير متوفر'}
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

          {/* Products Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {filteredProducts.length === 0 ? (
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
                  <h3 className="text-2xl font-semibold mb-4">لا توجد منتجات مطابقة</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    لم نتمكن من العثور على منتجات تطابق معايير البحث الحالية. جرب تعديل الفلاتر أو البحث بكلمات مختلفة.
                  </p>
                  <Button onClick={resetFilters} variant="outline">
                    <Filter className="h-4 w-4 ml-2" />
                    إعادة تعيين الفلاتر
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="products"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <StoreProductGrid
                    products={filteredProducts}
                    view={view}
                    gridColumns={gridColumns}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreProducts; 