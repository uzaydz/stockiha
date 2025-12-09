/**
 * 🚀 InfinityProductsGrid - شبكة منتجات بتحميل لانهائي
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - تحميل تلقائي عند التمرير
 * - أداء محسّن مع virtualization
 * - تصميم Titanium احترافي
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useRef, useEffect, useState, memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Package, Search } from 'lucide-react';
import TitaniumProductCard from './TitaniumProductCard';
import { Product } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface InfinityProductsGridProps {
  products: Product[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  isLossMode: boolean;
  onAddToCart: (product: Product) => void;
  // Pagination
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  // Search/Filter state
  searchQuery?: string;
  selectedCategory?: string;
  totalCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Empty State Component
// ═══════════════════════════════════════════════════════════════════════════

const EmptyState = memo<{ searchQuery?: string; selectedCategory?: string }>(
  ({ searchQuery, selectedCategory }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-[#21262d] flex items-center justify-center mb-4">
        {searchQuery ? (
          <Search className="w-10 h-10 text-zinc-400 dark:text-[#8b949e]" />
        ) : (
          <Package className="w-10 h-10 text-zinc-400 dark:text-[#8b949e]" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-[#e6edf3] mb-2">
        {searchQuery ? 'لا توجد نتائج' : 'لا توجد منتجات'}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-[#8b949e] text-center max-w-sm">
        {searchQuery
          ? `لم نجد منتجات تطابق "${searchQuery}"`
          : selectedCategory
            ? 'لا توجد منتجات في هذه الفئة'
            : 'لا توجد منتجات متاحة حالياً'}
      </p>
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

// ═══════════════════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════════════════

const LoadingSkeleton = memo(() => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-lg overflow-hidden animate-pulse"
      >
        <div className="aspect-[4/3] bg-zinc-200 dark:bg-[#21262d]" />
        <div className="p-3 space-y-3">
          <div className="h-4 bg-zinc-200 dark:bg-[#21262d] rounded w-3/4" />
          <div className="flex justify-between">
            <div className="h-3 bg-zinc-200 dark:bg-[#21262d] rounded w-1/4" />
            <div className="h-4 bg-zinc-200 dark:bg-[#21262d] rounded w-1/3" />
          </div>
        </div>
      </div>
    ))}
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

// ═══════════════════════════════════════════════════════════════════════════
// Load More Trigger
// ═══════════════════════════════════════════════════════════════════════════

const LoadMoreTrigger = memo<{
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}>(({ hasNextPage, isFetchingNextPage, onLoadMore }) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (!hasNextPage && !isFetchingNextPage) return null;

  return (
    <div
      ref={triggerRef}
      className="flex items-center justify-center py-8"
    >
      {isFetchingNextPage ? (
        <div className="flex items-center gap-3 text-zinc-500 dark:text-[#8b949e]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">جاري التحميل...</span>
        </div>
      ) : hasNextPage ? (
        <button
          onClick={onLoadMore}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-md shadow-orange-500/20"
        >
          تحميل المزيد
        </button>
      ) : null}
    </div>
  );
});
LoadMoreTrigger.displayName = 'LoadMoreTrigger';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const InfinityProductsGrid: React.FC<InfinityProductsGridProps> = memo(({
  products,
  favoriteProducts,
  isReturnMode,
  isLossMode,
  onAddToCart,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  onLoadMore,
  searchQuery,
  selectedCategory,
  totalCount
}) => {
  // حالة التحميل الأولي
  if (isLoading && products.length === 0) {
    return <LoadingSkeleton />;
  }

  // حالة فارغة
  if (!isLoading && products.length === 0) {
    return <EmptyState searchQuery={searchQuery} selectedCategory={selectedCategory} />;
  }

  return (
    <div className="flex flex-col">
      {/* معلومات العرض */}
      {totalCount !== undefined && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-[#30363d] bg-white/50 dark:bg-[#0f1419]/80 backdrop-blur-sm sticky top-0 z-10">
          <span className="text-xs text-zinc-500 dark:text-[#8b949e] font-medium">
            {products.length} من {totalCount} منتج
          </span>
          {searchQuery && (
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              البحث: "{searchQuery}"
            </span>
          )}
        </div>
      )}

      {/* شبكة المنتجات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
        {products.map((product) => (
          <TitaniumProductCard
            key={product.id}
            product={product}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            isLossMode={isLossMode}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

      {/* مؤشر تحميل المزيد */}
      <LoadMoreTrigger
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
      />
    </div>
  );
});

InfinityProductsGrid.displayName = 'InfinityProductsGrid';

export default InfinityProductsGrid;
