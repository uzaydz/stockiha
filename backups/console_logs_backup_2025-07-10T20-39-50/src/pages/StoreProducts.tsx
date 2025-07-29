import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductsPage } from '@/context/ProductsPageContext';
import StoreProductGrid from '@/components/store/StoreProductGrid';
import StoreLayout from '@/components/StoreLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Grid3X3, 
  List, 
  X, 
  ShoppingBag, 
  Search, 
  RotateCcw,
  Package,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PRODUCTS_PER_PAGE = 12;

// مكون الهيكل العظمي للتحميل
const ProductsSkeleton = () => (
  <div className="container mx-auto px-4 py-6">
    <div className="text-center mb-8">
      <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
      <Skeleton className="h-10 w-64 mx-auto mb-4" />
      <Skeleton className="h-6 w-96 mx-auto mb-6" />
      <div className="flex items-center justify-center gap-8">
        <Skeleton className="h-16 w-20" />
        <Skeleton className="h-16 w-20" />
        <Skeleton className="h-16 w-20" />
      </div>
    </div>
    <Card className="mb-8">
      <CardContent className="p-6">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// مكون التنقل بين الصفحات
const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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
        disabled={currentPage <= 1}
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
        disabled={currentPage >= totalPages}
        className="gap-2"
      >
        التالي
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

const StoreProducts = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 🎯 استخدام ProductsPageContext المحسن فقط - لا طلبات API إضافية
  const { 
    products, 
    categories, 
    isLoading,
    error,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange
  } = useProductsPage();

  // حالة العرض والصفحات
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState('newest');

  // إعادة تعيين التمرير إلى الأعلى عند تحميل الصفحة
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // مزامنة الفلاتر مع URL
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const searchFromUrl = searchParams.get('search');
    
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
    
    if (searchFromUrl && searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl);
    }
  }, [searchParams, selectedCategory, searchTerm, setSelectedCategory, setSearchTerm]);

  // تحديث URL عند تغيير الفلاتر
  const updateUrlParams = (key: string, value: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  };

  // معالجة تغيير الفلاتر
  const handleCategoryChange = (categoryId: string) => {
    const newCategory = categoryId === 'all' ? null : categoryId;
    setSelectedCategory(newCategory);
    updateUrlParams('category', newCategory);
    setCurrentPage(1);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    updateUrlParams('search', term);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setPriceRange({ min: 0, max: 1000000 });
    setSearchParams(new URLSearchParams());
    setCurrentPage(1);
  };

  // ترتيب المنتجات
  const sortedProducts = useMemo(() => {
    let sorted = [...filteredProducts];
    
    switch (sortOption) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        // الترتيب الافتراضي من قاعدة البيانات
        break;
    }
    
    return sorted;
  }, [filteredProducts, sortOption]);

  // تقسيم المنتجات للصفحات
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, currentPage]);

  // حساب بيانات الصفحات
  const totalPages = Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE);

  // حساب عدد الفلاتر النشطة
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCategory) count++;
    if (priceRange.min > 0 || priceRange.max < 1000000) count++;
    return count;
  }, [searchTerm, selectedCategory, priceRange]);

  // معالجة تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // حالة التحميل
  if (isLoading) {
    return (
      <StoreLayout>
        <ProductsSkeleton />
      </StoreLayout>
    );
  }

  // حالة الخطأ
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
          {/* Header */}
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
            
            {/* إحصائيات سريعة */}
            <div className="flex items-center justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{products.length}</div>
                <div className="text-sm text-muted-foreground">منتج</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{categories.length}</div>
                <div className="text-sm text-muted-foreground">فئة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{filteredProducts.length}</div>
                <div className="text-sm text-muted-foreground">نتيجة</div>
              </div>
            </div>
          </motion.div>

          {/* الفلاتر */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {/* شريط البحث */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المنتجات..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* عناصر التحكم في الفلاتر */}
              <div className="flex flex-wrap gap-3 mb-4">
                {/* فلتر الفئة */}
                <Select
                  value={selectedCategory || 'all'}
                  onValueChange={handleCategoryChange}
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

                {/* فلتر الترتيب */}
                <Select
                  value={sortOption}
                  onValueChange={setSortOption}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="name-asc">الاسم (أ-ي)</SelectItem>
                    <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
                    <SelectItem value="price-low">السعر (منخفض)</SelectItem>
                    <SelectItem value="price-high">السعر (مرتفع)</SelectItem>
                  </SelectContent>
                </Select>

                {/* أزرار العرض */}
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
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

                {/* زر إعادة تعيين الفلاتر */}
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    إعادة تعيين ({activeFiltersCount})
                  </Button>
                )}
              </div>

              {/* معلومات النتائج */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    عرض {paginatedProducts.length} من {sortedProducts.length} منتج
                  </span>
                  {selectedCategory && (
                    <Badge variant="secondary" className="ml-2">
                      {categories.find(c => c.id === selectedCategory)?.name}
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  الصفحة {currentPage} من {totalPages}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* عرض المنتجات */}
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedCategory 
                  ? 'لم يتم العثور على منتجات تطابق البحث'
                  : 'لا توجد منتجات متاحة حالياً'
                }
              </p>
              {(searchTerm || selectedCategory) && (
                <Button onClick={resetFilters} variant="outline">
                  <RotateCcw className="h-4 w-4 ml-2" />
                  إعادة تعيين الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <>
              <StoreProductGrid 
                products={paginatedProducts}
                viewMode={viewMode}
              />
              
              {/* التنقل بين الصفحات */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreProducts;
