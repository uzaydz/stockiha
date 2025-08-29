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
    <div className="px-6 py-2 bg-gradient-to-r from-primary/5 to-primary/10 border-b text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            📦 <strong className="text-foreground">{allProductsCount}</strong> منتج محمل محلياً
          </span>
          <span className="flex items-center gap-1">
            🔍 <strong className="text-foreground">{filteredProductsCount}</strong> نتيجة 
            {searchQuery && <span className="text-primary">للبحث: "{searchQuery}"</span>}
          </span>
          <span className="flex items-center gap-1">
            📄 صفحة <strong className="text-foreground">{currentPage}</strong> من <strong className="text-foreground">{totalPages}</strong>
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {categoryFilter && categoryFilter !== 'all' && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">
              فئة: {categoryName || 'غير محدد'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
