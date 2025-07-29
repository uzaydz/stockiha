import React, { useMemo } from 'react';
import { Product } from '@/types';
import { Tabs } from '@/components/ui/tabs';
import { usePOSFilters } from './hooks/usePOSFilters';
import { POSAdvancedContentProps } from './types';

// استيراد المكونات المنفصلة
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import VirtualizedProductsGrid from './components/VirtualizedProductsGrid'; // استخدام النسخة المحسنة
import SubscriptionsTab from './components/SubscriptionsTab';
import PaginationControls from './components/PaginationControls';

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
  isScannerLoading = false
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

  return (
    <Tabs 
      value={filterState.activeTab} 
      onValueChange={(value) => updateFilterState({ activeTab: value as any })}
      className="flex flex-col h-full max-h-full w-full"
    >
      {/* الرأس مع البحث والسكانر المحسن */}
      <Header
        isReturnMode={isReturnMode}
        filteredProductsCount={displayProducts.length}
        isPOSDataLoading={isPOSDataLoading || isPending}
        onRefreshData={onRefreshData}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBarcodeSearch={onBarcodeSearch}
        isScannerLoading={isScannerLoading}
      />

      {/* أدوات التحكم والتصفية المحسنة */}
      <FilterControls
        filterState={filterState}
        availableCategories={availableCategories}
        filteredProductsCount={displayProducts.length}
        subscriptionsCount={subscriptionsCount}
        isAppEnabled={isAppEnabled}
        onFilterChange={updateFilterState}
        isPending={isPending}
      />

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
      />

      {/* مكون التنقل بين الصفحات */}
      {pagination && (
        <PaginationControls
          currentPage={pagination.current_page}
          totalPages={pagination.total_pages}
          pageSize={pagination.per_page}
          totalItems={pagination.total_count}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={isPOSDataLoading || isPending}
        />
      )}

      {/* تبويب الاشتراكات */}
      <SubscriptionsTab
        subscriptionServices={subscriptionServices}
        subscriptionCategories={subscriptionCategories}
        onAddToCart={onAddToCart}
      />
        </Tabs>
  );
};

export default React.memo(POSAdvancedContent);
