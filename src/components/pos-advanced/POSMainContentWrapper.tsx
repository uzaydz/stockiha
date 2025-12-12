/**
 * ⚡ مكون المحتوى الرئيسي لـ POS
 * يفصل واجهة المنتجات والهيدر عن المكون الرئيسي
 */

import React, { Suspense, memo } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import POSAdvancedContent from '@/components/pos-advanced/POSAdvancedContent';
import { InfinityHeader, type POSMode } from '@/components/pos-infinity';
import { POSAdvancedHeader } from '@/components/pos-advanced/POSAdvancedHeader';

interface Category {
  id: string;
  name: string;
  productsCount?: number;
}

interface PendingStats {
  total: number;
  pending: number;
  failed: number;
}

interface POSMainContentWrapperProps {
  // الهيدر
  useInfinityDesign: boolean;
  isReturnMode: boolean;
  isLossMode: boolean;
  toggleReturnMode: () => void;
  toggleLossMode: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onBarcodeSearch: (value: string) => void;
  isScannerLoading: boolean;
  categoryFilter: string;
  productCategories: Category[];
  products: any[];
  onCategoryFilter: (categoryId: string) => void;
  cartItemsCount: number;
  cartTotal: number;
  returnItemsCount: number;
  lossItemsCount: number;
  onOpenCalculator: () => void;
  onOpenExpense: () => void;
  onOpenSettings: () => void;
  onOpenRepair: () => void;
  onRefreshData: () => void;
  isCompactLayout: boolean;
  // مؤشر العمليات المعلقة
  hasPendingOperations: boolean;
  pendingStatus: 'normal' | 'warning' | 'critical';
  pendingStats: PendingStats;
  onRefreshPendingStats: () => void;
  // المحتوى الأساسي
  pagination: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total_count: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  subscriptionServices: any[];
  subscriptionCategories: any[];
  favoriteProducts: any[];
  isPOSDataLoading: boolean;
  onAddToCart: (product: any) => void;
  onAddSubscription: (subscription: any) => void;
  isAppEnabled: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenMobileScanner: () => void;
  isCameraScannerSupported: boolean;
  hasNativeBarcodeDetector: boolean;
}

const POSMainContentWrapper = memo<POSMainContentWrapperProps>(({
  useInfinityDesign,
  isReturnMode,
  isLossMode,
  toggleReturnMode,
  toggleLossMode,
  searchQuery,
  onSearchChange,
  onBarcodeSearch,
  isScannerLoading,
  categoryFilter,
  productCategories,
  products,
  onCategoryFilter,
  cartItemsCount,
  cartTotal,
  returnItemsCount,
  lossItemsCount,
  onOpenCalculator,
  onOpenExpense,
  onOpenSettings,
  onOpenRepair,
  onRefreshData,
  isCompactLayout,
  hasPendingOperations,
  pendingStatus,
  pendingStats,
  onRefreshPendingStats,
  pagination,
  subscriptionServices,
  subscriptionCategories,
  favoriteProducts,
  isPOSDataLoading,
  onAddToCart,
  onAddSubscription,
  isAppEnabled,
  onPageChange,
  onPageSizeChange,
  onOpenMobileScanner,
  isCameraScannerSupported,
  hasNativeBarcodeDetector
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0 order-1" dir="rtl">
      {/* الهيدر - ثابت في الأعلى */}
      <div className="flex-shrink-0 bg-background pb-2 pt-2 px-2">
        {useInfinityDesign ? (
          // ⚡ التصميم الجديد - Infinity Space
          <div className="relative">
            <InfinityHeader
              isReturnMode={isReturnMode}
              isLossMode={isLossMode}
              toggleReturnMode={toggleReturnMode}
              toggleLossMode={toggleLossMode}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onBarcodeSearch={onBarcodeSearch}
              isScannerLoading={isScannerLoading}
              selectedCategory={categoryFilter}
              categories={productCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                productsCount: products?.filter(p => p.category_id === cat.id).length || 0
              }))}
              onCategoryChange={onCategoryFilter}
              cartItemsCount={cartItemsCount}
              cartTotal={cartTotal}
              returnItemsCount={returnItemsCount}
              lossItemsCount={lossItemsCount}
              onOpenCalculator={onOpenCalculator}
              onOpenExpense={onOpenExpense}
              onOpenSettings={onOpenSettings}
              onOpenRepair={onOpenRepair}
              onRefreshData={onRefreshData}
              isMobile={isCompactLayout}
            />

            {/* ⚡ مؤشر العمليات المعلقة */}
            {hasPendingOperations && (
              <div
                className={`absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm cursor-pointer transition-all ${
                  pendingStatus === 'critical' ? 'bg-red-500 animate-pulse' :
                  pendingStatus === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                onClick={onRefreshPendingStats}
                title={`${pendingStats.pending} معلق، ${pendingStats.failed} فاشل - انقر للتحديث`}
              >
                <span>{pendingStatus === 'critical' ? '🚨' : pendingStatus === 'warning' ? '⚠️' : '📡'}</span>
                <span>{pendingStats.total}</span>
              </div>
            )}
          </div>
        ) : (
          // التصميم القديم
          <div className="flex items-center justify-between gap-2">
            <POSAdvancedHeader
              isReturnMode={isReturnMode}
              returnItemsCount={returnItemsCount}
              toggleReturnMode={toggleReturnMode}
              onCalculatorOpen={onOpenCalculator}
              onSettingsOpen={onOpenSettings}
              onRepairOpen={onOpenRepair}
              onQuickExpenseOpen={onOpenExpense}
              isRepairEnabled={true}
              isLossMode={isLossMode}
              lossItemsCount={lossItemsCount}
              toggleLossMode={toggleLossMode}
            />

            {/* ⚡ مؤشر العمليات المعلقة */}
            {hasPendingOperations && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm cursor-pointer transition-all ${
                  pendingStatus === 'critical' ? 'bg-red-500 animate-pulse' :
                  pendingStatus === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                onClick={onRefreshPendingStats}
                title={`${pendingStats.pending} معلق، ${pendingStats.failed} فاشل - انقر للتحديث`}
              >
                <span>{pendingStatus === 'critical' ? '🚨' : pendingStatus === 'warning' ? '⚠️' : '📡'}</span>
                <span>{pendingStats.total}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* المحتوى الأساسي - يأخذ المساحة المتبقية */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <POSAdvancedContent
            products={products}
            pagination={pagination}
            subscriptionServices={subscriptionServices}
            subscriptionCategories={subscriptionCategories}
            productCategories={productCategories}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            isLossMode={isLossMode}
            isPOSDataLoading={isPOSDataLoading}
            onAddToCart={onAddToCart}
            onAddSubscription={onAddSubscription}
            onRefreshData={onRefreshData}
            isAppEnabled={isAppEnabled}
            onPageChange={onPageChange}
            onSearchChange={onSearchChange}
            onCategoryFilter={onCategoryFilter}
            onPageSizeChange={onPageSizeChange}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            onBarcodeSearch={onBarcodeSearch}
            isScannerLoading={isScannerLoading}
            onOpenMobileScanner={onOpenMobileScanner}
            isCameraScannerSupported={isCameraScannerSupported}
            hasNativeBarcodeDetector={hasNativeBarcodeDetector}
            isMobile={isCompactLayout}
            hideInternalHeader={useInfinityDesign}
          />
        </Suspense>
      </div>
    </div>
  );
});

POSMainContentWrapper.displayName = 'POSMainContentWrapper';

export default POSMainContentWrapper;
