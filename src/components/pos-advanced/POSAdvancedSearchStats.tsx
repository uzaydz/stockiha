import React from 'react';

interface POSAdvancedSearchStatsProps {
  allProductsCount: number;
  filteredProductsCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  categoryFilter: string;
  categoryName?: string;
}

export const POSAdvancedSearchStats: React.FC<POSAdvancedSearchStatsProps> = ({
  allProductsCount,
  filteredProductsCount,
  currentPage,
  totalPages,
  searchQuery,
  categoryFilter,
  categoryName
}) => {
  if (allProductsCount === 0) return null;

  return (
    <div className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-primary/5 to-primary/10 border-b text-xs sm:text-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            📦 <strong className="text-foreground">{allProductsCount}</strong> <span className="hidden sm:inline">منتج</span>
          </span>
          <span className="flex items-center gap-1">
            🔍 <strong className="text-foreground">{filteredProductsCount}</strong> <span className="hidden sm:inline">نتيجة</span>
            {searchQuery && <span className="text-primary text-[10px] sm:text-xs">"{searchQuery}"</span>}
          </span>
          <span className="flex items-center gap-1">
            📄 <strong className="text-foreground">{currentPage}</strong>/<strong className="text-foreground">{totalPages}</strong>
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {categoryFilter && categoryFilter !== 'all' && (
            <span className="bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
              {categoryName || 'غير محدد'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
