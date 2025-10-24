import React, { useMemo } from 'react';
import { Package2 } from 'lucide-react';
import { ProductsGridProps } from '../types';
import ProductGridItem from './ProductGridItem';
import ProductListItem from './ProductListItem';

// مكون الحالة الفارغة
const EmptyState = React.memo<{ hasFilters: boolean }>(({ hasFilters }) => (
  <div className="h-80 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
        <Package2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {hasFilters ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {hasFilters
            ? 'جرب تغيير معايير البحث أو التصفية'
            : 'لم يتم العثور على أي منتجات'
          }
        </p>
      </div>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// مكون عرض المنتجات
const ProductsDisplay = React.memo<{
  products: any[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  onAddToCart: (product: any) => void;
  viewMode: 'grid' | 'list';
  bottomPadding: number;
}>(({ products, favoriteProducts, isReturnMode, onAddToCart, viewMode, bottomPadding }) => {
  return (
    <div className="w-full" style={{ paddingBottom: bottomPadding }}>
      <div className="p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
            {products.map((product) => (
              <ProductGridItem
                key={`grid-${product.id}-${product.stock_quantity || 0}`}
                product={product}
                favoriteProducts={favoriteProducts}
                isReturnMode={isReturnMode}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <ProductListItem
                key={`list-${product.id}-${product.stock_quantity || 0}`}
                product={product}
                favoriteProducts={favoriteProducts}
                isReturnMode={isReturnMode}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ProductsDisplay.displayName = 'ProductsDisplay';

const haveSameProducts = (prevProducts: any[], nextProducts: any[]): boolean => {
  if (prevProducts.length !== nextProducts.length) {
    return false;
  }

  for (let i = 0; i < prevProducts.length; i += 1) {
    const prevProduct = prevProducts[i];
    const nextProduct = nextProducts[i];

    if (prevProduct.id !== nextProduct.id) {
      return false;
    }

    const prevStock =
      prevProduct.actual_stock_quantity ??
      prevProduct.stock_quantity ??
      prevProduct.stockQuantity ??
      0;
    const nextStock =
      nextProduct.actual_stock_quantity ??
      nextProduct.stock_quantity ??
      nextProduct.stockQuantity ??
      0;

    if (prevStock !== nextStock) {
      return false;
    }
  }

  return true;
};

const VirtualizedProductsGrid: React.FC<ProductsGridProps> = React.memo(({
  products,
  favoriteProducts,
  isReturnMode,
  viewMode,
  searchQuery,
  selectedCategory,
  stockFilter,
  onAddToCart,
  isMobile
}) => {
  // تبسيط منطق التصفية
  const hasFilters = useMemo(() => 
    Boolean(searchQuery) || selectedCategory !== 'all' || stockFilter !== 'all'
  , [searchQuery, selectedCategory, stockFilter]);

  const isEmpty = products.length === 0;
  const bottomPadding = isMobile ? 120 : 80;

  // عرض الحالة الفارغة
  if (isEmpty) {
    return (
      <div className="w-full bg-background">
        <EmptyState hasFilters={hasFilters} />
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      <ProductsDisplay
        products={products}
        favoriteProducts={favoriteProducts}
        isReturnMode={isReturnMode}
        onAddToCart={onAddToCart}
        viewMode={viewMode}
        bottomPadding={bottomPadding}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    haveSameProducts(prevProps.products, nextProps.products) &&
    prevProps.favoriteProducts.length === nextProps.favoriteProducts.length &&
    prevProps.isReturnMode === nextProps.isReturnMode &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.stockFilter === nextProps.stockFilter
  );
});

VirtualizedProductsGrid.displayName = 'VirtualizedProductsGrid';

export default VirtualizedProductsGrid;
