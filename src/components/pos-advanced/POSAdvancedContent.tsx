import React, { useEffect, useMemo, useState } from 'react';
import { Product } from '@/types';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePOSFilters } from './hooks/usePOSFilters';
import { POSAdvancedContentProps } from './types';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

// استيراد المكونات المنفصلة
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import VirtualizedProductsGrid from './components/VirtualizedProductsGrid';
import PaginationControls from './components/PaginationControls';
import SubscriptionsTab from './components/SubscriptionsTab';

const POSAdvancedContent: React.FC<POSAdvancedContentProps> = React.memo(({
  // منتجات وبيانات أساسية
  products = [],
  pagination,
  favoriteProducts = [],
  productCategories = [],
  subscriptionServices = [],
  subscriptionCategories = [],

  // حالات وإعدادات
  isReturnMode = false,
  isLossMode = false,
  isPOSDataLoading = false,

  // وظائف callback
  onAddToCart,
  onAddSubscription,
  onRefreshData,
  isAppEnabled = () => false,

  // دوال pagination والبحث
  onPageChange,
  onSearchChange,
  onCategoryFilter,
  onPageSizeChange,
  searchQuery = '',
  categoryFilter = '',

  // دالة السكانر
  onBarcodeSearch,
  isScannerLoading = false,
  onOpenMobileScanner,
  isCameraScannerSupported,
  hasNativeBarcodeDetector,
  isMobile,
  // ⚡ إخفاء الهيدر الداخلي (للتصميم الجديد Infinity Space)
  hideInternalHeader = false
}) => {
  // Hook محسّن لإدارة UI state فقط (viewMode, activeTab)
  // التصفية والبحث والترتيب يتم بالكامل على مستوى الـ API
  const {
    filterState,
    updateFilterState,
    availableCategories
  } = usePOSFilters(productCategories);

  // المنتجات تأتي مُصفّاة ومُرتّبة ومُقسّمة من الـ API - نستخدمها مباشرة
  const displayProducts = products;

  // ⚡ DEBUG: تم تقليل الـ logging لتحسين الأداء
  // يُسجّل فقط في development وعند تغيير عدد المنتجات
  const prevProductsCountRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (products?.length !== prevProductsCountRef.current) {
      prevProductsCountRef.current = products?.length || 0;
      if (process.env.NODE_ENV === 'development') {
        console.log('[POSContent] 🖥️ المنتجات المستلمة للعرض:', {
          products_received: products?.length || 0,
          displayProducts_count: displayProducts?.length || 0,
          pagination: pagination,
          searchQuery: searchQuery || '(none)',
          categoryFilter: categoryFilter || '(all)'
        });
      }
    }
  }, [products?.length, displayProducts?.length, pagination, searchQuery, categoryFilter]);

  // حساب عدد الاشتراكات مع تحسين الأداء
  const subscriptionsCount = useMemo(() =>
    subscriptionServices?.length || 0
    , [subscriptionServices]);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(!isMobile);

  useEffect(() => {
    setIsMobileFiltersOpen(!isMobile);
  }, [isMobile]);

  // العدد الإجمالي من pagination API
  const totalProducts = pagination?.total_count ?? displayProducts.length;

  // حساب عدد الفلاتر النشطة من المعاملات الخارجية (API)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter && categoryFilter !== 'all') count += 1;
    if (searchQuery.trim().length > 0) count += 1;
    return count;
  }, [categoryFilter, searchQuery]);

  // ⚡ عند استخدام تصميم Infinity Space، نعرض المنتجات مباشرة بدون Tabs
  if (hideInternalHeader) {
    return (
      <div className="flex flex-col w-full h-full min-h-0 overflow-hidden">
        {/* شبكة المنتجات - تأخذ كل المساحة المتاحة */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <VirtualizedProductsGrid
            products={displayProducts}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            isLossMode={isLossMode || false}
            viewMode="grid"
            searchQuery={searchQuery}
            selectedCategory={categoryFilter}
            stockFilter="all"
            onAddToCart={onAddToCart}
            isMobile={isMobile}
          />
        </div>

        {/* مكون التنقل بين الصفحات - ثابت في الأسفل */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex-shrink-0 bg-white dark:bg-[#161b22] border-t border-zinc-200 dark:border-[#30363d]">
            <PaginationControls
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              pageSize={pagination.per_page}
              totalItems={pagination.total_count}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              isLoading={isPOSDataLoading}
            />
          </div>
        )}
      </div>
    );
  }

  // التصميم القديم مع Tabs
  return (
    <Tabs
      value={filterState.activeTab}
      onValueChange={(value) => updateFilterState({ activeTab: value as any })}
      className="flex flex-col w-full h-full bg-background dark:bg-[#0f1419] rounded-2xl shadow-sm border border-border/40 dark:border-[#30363d]"
    >
      {/* الرأس مع البحث والسكانر - غير ثابت على الهاتف */}
      <div className="md:sticky md:top-0 z-10 bg-background dark:bg-[#161b22] rounded-t-2xl shadow-sm">
        <Header
          isReturnMode={isReturnMode}
          isLossMode={isLossMode}
          filteredProductsCount={displayProducts.length}
          isPOSDataLoading={isPOSDataLoading}
          onRefreshData={onRefreshData}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onBarcodeSearch={onBarcodeSearch}
          isScannerLoading={isScannerLoading}
          onOpenMobileScanner={onOpenMobileScanner}
          isCameraScannerSupported={isCameraScannerSupported}
          hasNativeBarcodeDetector={hasNativeBarcodeDetector}
          isMobile={isMobile}
        />

        {isMobile && (
          <div className="px-3 pb-2 pt-1.5 space-y-2 bg-card/30 dark:bg-[#161b22]/50 border-b border-border/40 dark:border-[#30363d]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 rounded-lg border border-border/50 dark:border-[#30363d] bg-background/80 dark:bg-[#21262d]/80 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                <p className="text-[10px] text-muted-foreground dark:text-[#8b949e] font-medium">إجمالي</p>
                <p className="text-sm font-bold tracking-tight text-primary dark:text-[#e6edf3]">{totalProducts.toLocaleString('ar-DZ')}</p>
              </div>
              <div className="flex-1 rounded-lg border border-border/50 dark:border-[#30363d] bg-background/80 dark:bg-[#21262d]/80 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                <p className="text-[10px] text-muted-foreground dark:text-[#8b949e] font-medium">المعروضة</p>
                <p className="text-sm font-bold tracking-tight text-primary dark:text-[#e6edf3]">{displayProducts.length.toLocaleString('ar-DZ')}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFiltersOpen(prev => !prev)}
              className="w-full h-8 justify-center gap-2 rounded-lg border-border/50 dark:border-[#30363d] bg-background dark:bg-[#21262d] hover:bg-muted/50 dark:hover:bg-[#30363d] transition-colors font-medium text-xs"
            >
              <Filter className="h-3.5 w-3.5" />
              {isMobileFiltersOpen ? 'إخفاء الفلاتر' : 'فلاتر'}
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* أدوات التحكم والتصفية - Sticky مع الهيدر */}
        {(!isMobile || isMobileFiltersOpen) && (
          <div className={cn(
            "border-b border-border/40 dark:border-[#30363d]",
            isMobile && "sm:hidden"
          )}>
            <FilterControls
              filterState={filterState}
              availableCategories={availableCategories}
              filteredProductsCount={displayProducts.length}
              subscriptionsCount={subscriptionsCount}
              isAppEnabled={isAppEnabled}
              onFilterChange={updateFilterState}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* تبويب المنتجات - سكرول حر */}
      <TabsContent value="products" className={cn("mt-0 flex-1", filterState.activeTab === 'products' ? '' : 'hidden')}>
        {/* شبكة المنتجات المحسنة */}
        <VirtualizedProductsGrid
          products={displayProducts}
          favoriteProducts={favoriteProducts}
          isReturnMode={isReturnMode}
          isLossMode={isLossMode || false}
          viewMode={filterState.viewMode}
          searchQuery={searchQuery}
          selectedCategory={categoryFilter}
          stockFilter={filterState.stockFilter}
          onAddToCart={onAddToCart}
          isMobile={isMobile}
        />
      </TabsContent>

      {/* مكون التنقل بين الصفحات - ثابت في الأسفل */}
      {pagination && filterState.activeTab === 'products' && (
        <div className="bg-card/95 dark:bg-[#161b22]/95 backdrop-blur-md border-t border-border/40 dark:border-[#30363d] shadow-lg z-10 flex-shrink-0">
          <PaginationControls
            currentPage={pagination.current_page}
            totalPages={pagination.total_pages}
            pageSize={pagination.per_page}
            totalItems={pagination.total_count}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={isPOSDataLoading}
          />
        </div>
      )}

      {/* تبويب الاشتراكات المحسن */}
      <TabsContent value="subscriptions" className={cn("mt-0", filterState.activeTab === 'subscriptions' ? '' : 'hidden')}>
        <SubscriptionsTab
          subscriptions={subscriptionServices}
          categories={subscriptionCategories}
          onAddSubscription={onAddSubscription || onAddToCart}
        />
      </TabsContent>
    </Tabs>
  );
});

// ⚡ تحسين الأداء: إضافة displayName لـ React DevTools
POSAdvancedContent.displayName = 'POSAdvancedContent';

export default POSAdvancedContent;
