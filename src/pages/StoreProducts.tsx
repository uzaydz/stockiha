import React, { useState, useMemo, useEffect } from 'react';
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
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

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
        {t('featuredProducts.storeProducts.previous')}
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
        {t('featuredProducts.storeProducts.next')}
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

const StoreProducts = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [uiPriceMin, setUiPriceMin] = useState<number>(0);
  const [uiPriceMax, setUiPriceMax] = useState<number>(0);
  
  // 🎯 استخدام ProductsPageContext المحسن فقط - لا طلبات API إضافية
  const { 
    products, 
    categories, 
    subcategories,
    isLoading,
    error,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    priceRange,
    setPriceRange,
    meta,
    currentPage,
    setCurrentPage,
    sortOption,
    setSortOption,
    pageSize,
    setPageSize
  } = useProductsPage();

  const debouncedSearch = useSearchDebounce(searchTerm, 350);
  const [uiSelectedCategory, setUiSelectedCategory] = useState<string | null>(null);
  const [uiSelectedSubcategory, setUiSelectedSubcategory] = useState<string | null>(null);

  // حالة العرض فقط محلياً
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // الترتيب يُدار من خلال السياق لتفعيل الترتيب من الخادم

  // إعادة تعيين التمرير إلى الأعلى عند تحميل الصفحة
  useEffect(() => {
    try {
      const run = () => window.scrollTo({ top: 0, behavior: 'auto' });
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(run, { timeout: 500 });
      } else {
        setTimeout(run, 0);
      }
    } catch {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  // مزامنة حجم الصفحة بين الواجهة والسياق
  useEffect(() => {
    setPageSize(PRODUCTS_PER_PAGE);
  }, [setPageSize]);

  // مزامنة قيم السعر الظاهرة مع قيم السياق
  useEffect(() => {
    setUiPriceMin(priceRange.min);
    setUiPriceMax(priceRange.max);
  }, [priceRange.min, priceRange.max]);

  // مزامنة قيم الفئة/الفئة الفرعية الظاهرة مع القيم المطبقة
  useEffect(() => {
    setUiSelectedCategory(selectedCategory);
  }, [selectedCategory]);
  useEffect(() => {
    setUiSelectedSubcategory(selectedSubcategory);
  }, [selectedSubcategory]);

  // preload أول 6 صور للتسريع
  useEffect(() => {
    if (filteredProducts.length === 0) return;
    const firstImages = filteredProducts.slice(0, 4)
      .map(p => p.thumbnail_image)
      .filter(Boolean) as string[];

    const preload = () => {
      firstImages.forEach(src => {
        // إنشاء link preload مع as="image" لتجنب التحذير
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
        
        // أيضاً إنشاء Image object للتحميل الفعلي
        const img = new Image();
        img.loading = 'lazy';
        img.decoding = 'async' as any;
        img.src = src;
      });
    };

    try {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(preload, { timeout: 1200 });
      } else {
        const t = setTimeout(preload, 300);
        return () => clearTimeout(t);
      }
    } catch {
      const t = setTimeout(preload, 300);
      return () => clearTimeout(t);
    }
  }, [filteredProducts]);

  // مزامنة الفلاتر مع URL
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const searchFromUrl = searchParams.get('search');
    const subcategoryFromUrl = searchParams.get('subcategory');
    const sortFromUrl = searchParams.get('sort');
    const pageFromUrl = searchParams.get('page');
    const minPriceFromUrl = searchParams.get('min_price');
    const maxPriceFromUrl = searchParams.get('max_price');
    
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
      // عند تغيير الفئة من الرابط، أعد ضبط الفئة الفرعية
      setSelectedSubcategory(null);
    }

    if (subcategoryFromUrl && subcategoryFromUrl !== selectedSubcategory) {
      setSelectedSubcategory(subcategoryFromUrl);
      // تأكد من مزامنة الفئة الرئيسية مع الفئة الفرعية (لتحسين UX)
      const sc = subcategories.find(s => s.id === subcategoryFromUrl);
      if (sc && sc.category_id && sc.category_id !== selectedCategory) {
        setSelectedCategory(sc.category_id);
        updateUrlParamsBatch({ category: sc.category_id });
      }
    }
    
    if (searchFromUrl && searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl);
    }

    if (sortFromUrl && sortFromUrl !== sortOption) {
      // التحقق من القيم المسموحة
      const allowed = ['newest', 'name-asc', 'name-desc', 'price-low', 'price-high'];
      if (allowed.includes(sortFromUrl)) {
        setSortOption(sortFromUrl as any);
      }
    }

    if (pageFromUrl) {
      const p = parseInt(pageFromUrl, 10);
      if (!isNaN(p) && p > 0 && p !== currentPage) {
        setCurrentPage(p);
      }
    }

    if (minPriceFromUrl) {
      const min = parseInt(minPriceFromUrl, 10);
      if (!isNaN(min) && min !== priceRange.min) {
        setPriceRange({ ...priceRange, min });
      }
    }

    if (maxPriceFromUrl) {
      const max = parseInt(maxPriceFromUrl, 10);
      if (!isNaN(max) && max !== priceRange.max) {
        setPriceRange({ ...priceRange, max });
      }
    }
  }, [searchParams, selectedCategory, selectedSubcategory, searchTerm, sortOption, currentPage, priceRange.min, priceRange.max, setSelectedCategory, setSelectedSubcategory, setSearchTerm, setSortOption, setCurrentPage, setPriceRange, subcategories]);

  // تحديث URL عند تغيير الفلاتر (مفرد)
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

  // تحديث URL بعدة مفاتيح دفعة واحدة لتقليل إعادة الرندر وثقل click handler
  const updateUrlParamsBatch = (entries: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(entries)) {
        if (value && value !== 'all' && value !== '') {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      }
      return newParams;
    });
  };

  // معالجة تغيير الفلاتر
  const handleCategoryChange = (categoryId: string) => {
    const newCategory = categoryId === 'all' ? null : categoryId;
    // تحديث حالة الواجهة
    setUiSelectedCategory(newCategory);
    setUiSelectedSubcategory(null);
    // تطبيق مباشر + تحديث URL دفعة واحدة لتقليل الكلفة
    setSelectedCategory(newCategory);
    setSelectedSubcategory(null);
    setCurrentPage(1);
    updateUrlParamsBatch({
      category: newCategory,
      subcategory: null,
      page: '1'
    });
    if (window.innerWidth < 1024) setShowMobileFilters(false);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  // حدّث رابط البحث فقط بعد الهدوء (debounce) أو عند الضغط Enter
  useEffect(() => {
    const currentInUrl = searchParams.get('search') || '';
    const normalized = debouncedSearch || '';
    if (currentInUrl !== normalized) {
      setCurrentPage(1);
      updateUrlParamsBatch({ search: normalized || null, page: '1' });
    }
  }, [debouncedSearch]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setPriceRange({ min: 0, max: 1000000 });
    setSearchParams(new URLSearchParams());
    setCurrentPage(1);
  };

  // المنتجات تُعاد من السياق مصفاة ومقسمة صفحات من الخادم
  const paginatedProducts = filteredProducts;
  const totalPages = meta?.total_pages || 1;

  // حساب عدد الفلاتر النشطة
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCategory) count++;
    if (selectedSubcategory) count++;
    if (priceRange.min > 0 || priceRange.max < 1000000) count++;
    return count;
  }, [searchTerm, selectedCategory, selectedSubcategory, priceRange]);

  // معالجة تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrlParams('page', String(page));
    window.scrollTo({ top: 0, behavior: 'auto' });
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t('featuredProducts.storeProducts.title')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('featuredProducts.storeProducts.subtitle')}
            </p>
          </div>

          {/* تخطيط بعمود جانبي + محتوى */}
          <div className={`flex flex-col lg:flex-row gap-6 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
            {/* Sidebar */}
            <aside className="lg:w-72 lg:shrink-0 lg:sticky lg:top-4 self-start">
              {/* Mobile toggle */}
              <div className="lg:hidden mb-4">
                <Button variant="outline" className="w-full" onClick={() => setShowMobileFilters((s) => !s)}>
                  {t('featuredProducts.storeProducts.filter', 'تصفية')}
                </Button>
              </div>

              <div className={`space-y-4 ${showMobileFilters ? '' : 'hidden'} lg:block`}>
                <Card>
                  <CardContent className="p-4">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                      <Input
                        placeholder={t('navbar.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = (e.target as HTMLInputElement).value || '';
                            updateUrlParams('search', value || null);
                            setCurrentPage(1);
                            updateUrlParams('page', '1');
                            if (window.innerWidth < 1024) setShowMobileFilters(false);
                          }
                        }}
                        className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                      />
                    </div>

                    {/* Category */}
                    <div className="mb-3">
                      <label className="block text-sm mb-2">{t('navbar.categories')}</label>
                      <Select value={uiSelectedCategory || 'all'} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('featuredProducts.storeProducts.allCategories')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('featuredProducts.storeProducts.allCategories')}</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory */}
                    {uiSelectedCategory && subcategories.some(sc => sc.category_id === uiSelectedCategory) && (
                      <div className="mb-3">
                        <label className="block text-sm mb-2">{t('featuredProducts.storeProducts.subcategory', 'الفئة الفرعية')}</label>
                        <Select
                          key={uiSelectedCategory || 'all'}
                          value={uiSelectedSubcategory || 'all'}
                          onValueChange={(val) => {
                            const newSub = val === 'all' ? null : val;
                            setUiSelectedSubcategory(newSub);
                            // تطبيق مباشر للفئة الفرعية أيضاً
                            setSelectedSubcategory(newSub);
                            setCurrentPage(1);
                            updateUrlParamsBatch({ subcategory: newSub, page: '1' });
                            if (window.innerWidth < 1024) setShowMobileFilters(false);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('featuredProducts.storeProducts.allSubcategories', 'كل الفئات الفرعية')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('featuredProducts.storeProducts.allSubcategories', 'كل الفئات الفرعية')}</SelectItem>
                            {subcategories.filter(sc => sc.category_id === uiSelectedCategory).map((sc) => (
                              <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Price Range */}
                    <div className="mb-3">
                      <label className="block text-sm mb-2">{t('featuredProducts.storeProducts.priceRange', 'نطاق السعر')}</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min={0}
                          value={uiPriceMin}
                          onChange={(e) => setUiPriceMin(Number(e.target.value) || 0)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPriceRange({ min: uiPriceMin, max: uiPriceMax }); setCurrentPage(1); updateUrlParamsBatch({ min_price: String(uiPriceMin), max_price: String(uiPriceMax), page: '1' }); if (window.innerWidth < 1024) setShowMobileFilters(false); } }}
                          placeholder={t('featuredProducts.storeProducts.min', 'الأدنى')}
                        />
                        <Input
                          type="number"
                          min={0}
                          value={uiPriceMax}
                          onChange={(e) => setUiPriceMax(Number(e.target.value) || 0)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPriceRange({ min: uiPriceMin, max: uiPriceMax }); setCurrentPage(1); updateUrlParamsBatch({ min_price: String(uiPriceMin), max_price: String(uiPriceMax), page: '1' }); if (window.innerWidth < 1024) setShowMobileFilters(false); } }}
                          placeholder={t('featuredProducts.storeProducts.max', 'الأعلى')}
                        />
                        <Button size="sm" onClick={() => { setPriceRange({ min: uiPriceMin, max: uiPriceMax }); setCurrentPage(1); updateUrlParamsBatch({ min_price: String(uiPriceMin), max_price: String(uiPriceMax), page: '1' }); if (window.innerWidth < 1024) setShowMobileFilters(false); }}>
                          {t('common.apply', 'تطبيق')}
                        </Button>
                      </div>
                    </div>

                    {/* Sort */}
                    <div className="mb-3">
                      <label className="block text-sm mb-2">{t('common.sort')}</label>
                      <Select value={sortOption} onValueChange={(val) => { setSortOption(val as any); setCurrentPage(1); updateUrlParamsBatch({ sort: val, page: '1' }); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">{t('featuredProducts.storeProducts.newest')}</SelectItem>
                          <SelectItem value="name-asc">الاسم (أ-ي)</SelectItem>
                          <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
                          <SelectItem value="price-low">السعر (منخفض)</SelectItem>
                          <SelectItem value="price-high">السعر (مرتفع)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Apply + View + Reset */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Button size="sm" onClick={() => {
                        setSelectedCategory(uiSelectedCategory);
                        setSelectedSubcategory(uiSelectedSubcategory);
                        setPriceRange({ min: uiPriceMin, max: uiPriceMax });
                        setCurrentPage(1);
                        updateUrlParamsBatch({
                          category: uiSelectedCategory,
                          subcategory: uiSelectedSubcategory,
                          min_price: String(uiPriceMin),
                          max_price: String(uiPriceMax),
                          page: '1'
                        });
                        if (window.innerWidth < 1024) setShowMobileFilters(false);
                      }}>
                        {t('common.apply', 'تطبيق')}
                      </Button>
                      <div className="flex border rounded-md">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="rounded-r-none"
                          aria-label={t('featuredProducts.storeProducts.gridView', 'عرض شبكي')}
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-l-none border-l"
                          aria-label={t('featuredProducts.storeProducts.listView', 'عرض قائم')}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>

                      {activeFiltersCount > 0 && (
                        <Button variant="outline" size="sm" onClick={resetFilters} className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          {t('featuredProducts.storeProducts.resetFilters')} ({activeFiltersCount})
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Results meta */}
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>
                        {t('featuredProducts.storeProducts.showingResults', { current: paginatedProducts.length, total: meta?.total_count || paginatedProducts.length })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1">
              {paginatedProducts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t('featuredProducts.storeProducts.noProducts')}</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || selectedCategory || selectedSubcategory
                      ? t('featuredProducts.storeProducts.noProductsMessage')
                      : t('featuredProducts.storeProducts.noProductsAvailable')
                    }
                  </p>
                  {(searchTerm || selectedCategory || selectedSubcategory) && (
                    <Button onClick={resetFilters} variant="outline">
                      <RotateCcw className="h-4 w-4 ml-2" />
                      {t('featuredProducts.storeProducts.resetFiltersButton')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <StoreProductGrid 
                    products={paginatedProducts}
                    view={viewMode}
                    gridColumns={3}
                  />
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </main>
          </div>

          
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreProducts;
