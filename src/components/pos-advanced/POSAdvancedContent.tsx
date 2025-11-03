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

const POSAdvancedContent: React.FC<POSAdvancedContentProps> = ({
  // منتجات وبيانات أساسية
  products = [],
  pagination,
  favoriteProducts = [],
  productCategories = [],
  subscriptionServices = [],
  subscriptionCategories = [],
  
  // حالات وإعدادات
  isReturnMode = false,
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
  isMobile
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

  return (
    <Tabs 
      value={filterState.activeTab} 
      onValueChange={(value) => updateFilterState({ activeTab: value as any })}
      className="flex flex-col w-full bg-background dark:bg-slate-950 rounded-2xl shadow-sm border border-border/40"
    >
      {/* الرأس مع البحث والسكانر - غير ثابت على الهاتف */}
      <div className="md:sticky md:top-0 z-10 bg-background dark:bg-slate-950 rounded-t-2xl shadow-sm">
        <Header
          isReturnMode={isReturnMode}
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
          <div className="px-3 pb-2 pt-1.5 space-y-2 bg-card/30 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                <p className="text-[10px] text-muted-foreground font-medium">إجمالي</p>
                <p className="text-sm font-bold tracking-tight text-primary">{totalProducts.toLocaleString('ar-DZ')}</p>
              </div>
              <div className="flex-1 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                <p className="text-[10px] text-muted-foreground font-medium">المعروضة</p>
                <p className="text-sm font-bold tracking-tight text-primary">{displayProducts.length.toLocaleString('ar-DZ')}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFiltersOpen(prev => !prev)}
              className="w-full h-8 justify-center gap-2 rounded-lg border-border/50 bg-background hover:bg-muted/50 transition-colors font-medium text-xs"
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
            "border-b border-border/40",
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
      <TabsContent value="products" className={cn("mt-0", filterState.activeTab === 'products' ? '' : 'hidden')}>
        {/* شبكة المنتجات المحسنة */}
        <VirtualizedProductsGrid
          products={displayProducts}
          favoriteProducts={favoriteProducts}
          isReturnMode={isReturnMode}
          viewMode={filterState.viewMode}
          searchQuery={searchQuery}
          selectedCategory={categoryFilter}
          stockFilter={filterState.stockFilter}
          onAddToCart={onAddToCart}
          isMobile={isMobile}
        />
      </TabsContent>

      {/* مكون التنقل بين الصفحات - Sticky في الأسفل */}
      {pagination && filterState.activeTab === 'products' && (
        <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border/40 shadow-lg z-10">
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
};

export default React.memo(POSAdvancedContent);
