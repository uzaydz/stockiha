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
  // استخدام hook المخصص للتصفية المحلية فقط (البحث يتم على مستوى قاعدة البيانات)
  const {
    filterState,
    updateFilterState,
    availableCategories,
    isPending
  } = usePOSFilters(products, productCategories, subscriptionCategories);
  
  // المنتجات تأتي مفلترة من API، لا نحتاج لفلترة إضافية
  const displayProducts = products;

  // حساب عدد الاشتراكات مع تحسين الأداء
  const subscriptionsCount = useMemo(() => 
    subscriptionServices?.length || 0
  , [subscriptionServices]);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(!isMobile);

  useEffect(() => {
    setIsMobileFiltersOpen(!isMobile);
  }, [isMobile]);

  const totalProducts = useMemo(() => (
    pagination?.total_count ?? displayProducts.length
  ), [pagination?.total_count, displayProducts.length]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterState.selectedCategory && filterState.selectedCategory !== 'all') count += 1;
    if (filterState.stockFilter && filterState.stockFilter !== 'all') count += 1;
    if (searchQuery.trim().length > 0) count += 1;
    if (filterState.sortBy && filterState.sortBy !== 'created_at' as any) count += 1;
    return count;
  }, [filterState.selectedCategory, filterState.stockFilter, filterState.sortBy, searchQuery]);

  return (
    <Tabs 
      value={filterState.activeTab} 
      onValueChange={(value) => updateFilterState({ activeTab: value as any })}
      className="flex flex-col w-full bg-background dark:bg-slate-950 rounded-2xl shadow-sm border border-border/40"
    >
      {/* الرأس مع البحث والسكانر - Sticky في الأعلى */}
      <div className="sticky top-0 z-10 bg-background dark:bg-slate-950 rounded-t-2xl shadow-sm">
        <Header
          isReturnMode={isReturnMode}
          filteredProductsCount={displayProducts.length}
          isPOSDataLoading={isPOSDataLoading || isPending}
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
          <div className="px-4 pb-3 pt-2 space-y-3 bg-card/30 border-b border-border/40">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm px-3 py-2.5 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">إجمالي المنتجات</p>
                <p className="mt-1 text-lg font-bold tracking-tight text-primary">{totalProducts.toLocaleString('ar-DZ')}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm px-3 py-2.5 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">المنتجات المعروضة</p>
                <p className="mt-1 text-lg font-bold tracking-tight text-primary">{displayProducts.length.toLocaleString('ar-DZ')}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFiltersOpen(prev => !prev)}
              className="w-full justify-center gap-2 rounded-lg border-border/50 bg-background hover:bg-muted/50 transition-colors font-medium"
            >
              <Filter className="h-4 w-4" />
              {isMobileFiltersOpen ? 'إخفاء خيارات التصفية' : 'عرض خيارات التصفية'}
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
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
              isPending={isPending}
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
            isLoading={isPOSDataLoading || isPending}
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
