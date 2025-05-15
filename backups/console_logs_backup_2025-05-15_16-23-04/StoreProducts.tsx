import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getProducts } from '@/lib/api/products';
import { getCategories } from '@/lib/api/categories';
import StoreProductHeader from '@/components/store/StoreProductHeader';
import StoreCategoriesBar from '@/components/store/StoreCategoriesBar';
import StoreProductGrid from '@/components/store/StoreProductGrid';
import StoreProductFilters from '@/components/store/StoreProductFilters';
import StoreLayout from '@/components/StoreLayout';
import type { Product } from '@/lib/api/products';
import type { Category } from '@/lib/api/categories';
import { useTenant } from '@/context/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

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

  // Fetch products and categories data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!currentOrganization) {
          console.log("لا توجد مؤسسة حالية، لا يمكن جلب المنتجات");
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
        
        // التحقق من كائن category إذا كان موجوداً
        const category = product.category;
        return category != null && 
          typeof category === 'object' && 
          'id' in category && 
          category.id === categoryFilter;
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

  // SkeletonLoader component for showing loading state
  const SkeletonLoader = () => (
    <div className="space-y-8">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <StoreProductHeader 
          productCount={filteredProducts.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          view={view}
          onViewChange={setView}
          onGridColumnsChange={setGridColumns}
        />
        
        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          {/* Mobile Filter Button */}
          <div className="block lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full mb-4">
                  <SlidersHorizontal className="ml-2 h-4 w-4" />
                  تصفية وفلترة المنتجات
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>خيارات التصفية</SheetTitle>
                  <SheetDescription>
                    اختر الفلاتر المناسبة لعرض المنتجات التي تبحث عنها
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <StoreProductFilters
                    categories={categories}
                    selectedCategory={categoryFilter}
                    onCategoryChange={handleCategoryChange}
                    priceRange={priceRange}
                    onPriceRangeChange={setPriceRange}
                    stockFilter={stockFilter}
                    onStockFilterChange={setStockFilter}
                    onResetFilters={resetFilters}
                    className="flex flex-col gap-4"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:w-1/4 xl:w-1/5">
            <div className="sticky top-24">
              <StoreProductFilters
                categories={categories}
                selectedCategory={categoryFilter}
                onCategoryChange={handleCategoryChange}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                stockFilter={stockFilter}
                onStockFilterChange={setStockFilter}
                onResetFilters={resetFilters}
              />
            </div>
          </aside>
          
          {/* Main Content */}
          <main className="lg:w-3/4 xl:w-4/5">
            {/* Categories Horizontal Bar */}
            <StoreCategoriesBar
              categories={categories}
              selectedCategory={categoryFilter}
              onCategoryChange={handleCategoryChange}
            />
            
            {isLoading ? (
              <SkeletonLoader />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <StoreProductGrid
                  products={filteredProducts}
                  view={view}
                  gridColumns={gridColumns}
                />
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreProducts; 