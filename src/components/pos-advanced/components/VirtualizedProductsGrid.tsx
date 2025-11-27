import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Package2 } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
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

// Hook لقياس أبعاد الحاوية
const useContainerSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
};

// مكون صف الشبكة
const GridRow = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columnCount: number;
    favoriteProducts: any[];
    isReturnMode: boolean;
    onAddToCart: (product: any) => void;
    gap: number;
  };
}>(({ index, style, data }) => {
  const { items, columnCount, favoriteProducts, isReturnMode, onAddToCart, gap } = data;
  const startIndex = index * columnCount;
  const rowItems = items.slice(startIndex, startIndex + columnCount);

  return (
    <div style={{ ...style, display: 'flex', gap: gap, paddingLeft: gap, paddingRight: gap }}>
      {rowItems.map((product) => (
        <div key={product.id} style={{ flex: 1, minWidth: 0 }}>
          <ProductGridItem
            product={product}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            onAddToCart={onAddToCart}
          />
        </div>
      ))}
      {/* تعبئة الفراغات للحفاظ على المحاذاة في الصف الأخير */}
      {rowItems.length < columnCount && Array.from({ length: columnCount - rowItems.length }).map((_, i) => (
        <div key={`empty-${i}`} style={{ flex: 1, minWidth: 0 }} />
      ))}
    </div>
  );
});

GridRow.displayName = 'GridRow';

// مكون صف القائمة
const ListRow = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    favoriteProducts: any[];
    isReturnMode: boolean;
    onAddToCart: (product: any) => void;
    gap: number;
  };
}>(({ index, style, data }) => {
  const { items, favoriteProducts, isReturnMode, onAddToCart, gap } = data;
  const product = items[index];

  return (
    <div style={{ ...style, paddingLeft: gap, paddingRight: gap }}>
      <ProductListItem
        product={product}
        favoriteProducts={favoriteProducts}
        isReturnMode={isReturnMode}
        onAddToCart={onAddToCart}
      />
    </div>
  );
});

ListRow.displayName = 'ListRow';

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
  const { ref, width, height } = useContainerSize();

  // تبسيط منطق التصفية
  const hasFilters = useMemo(() =>
    Boolean(searchQuery) || selectedCategory !== 'all' || stockFilter !== 'all'
    , [searchQuery, selectedCategory, stockFilter]);

  const isEmpty = products.length === 0;

  // حساب عدد الأعمدة بناءً على العرض
  const columnCount = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (width < 640) return 2; // sm
    if (width < 768) return 3; // md
    if (width < 1024) return 3; // lg
    if (width < 1280) return 4; // xl
    return 5; // 2xl and larger (Default to 5)
  }, [width, viewMode]);

  const gap = 12; // gap-3 equivalent
  const rowHeight = viewMode === 'grid' ? 320 : 100; // ارتفاع تقريبي للبطاقة
  const rowCount = Math.ceil(products.length / columnCount);

  // عرض الحالة الفارغة
  if (isEmpty) {
    return (
      <div className="w-full h-full bg-background">
        <EmptyState hasFilters={hasFilters} />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background" ref={ref}>
      {width > 0 && (
        <List
          height={height || 600} // ارتفاع افتراضي إذا لم يتم القياس بعد
          itemCount={rowCount}
          itemSize={rowHeight + gap}
          width={width}
          itemData={{
            items: products,
            columnCount,
            favoriteProducts,
            isReturnMode,
            onAddToCart,
            gap
          }}
          className="scrollbar-hide pb-20" // إضافة padding في الأسفل
        >
          {viewMode === 'grid' ? GridRow : ListRow}
        </List>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.products === nextProps.products && // الاعتماد على المرجع لأن القائمة تأتي من useMemo في الوالد
    prevProps.favoriteProducts === nextProps.favoriteProducts &&
    prevProps.isReturnMode === nextProps.isReturnMode &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.stockFilter === nextProps.stockFilter &&
    prevProps.isMobile === nextProps.isMobile
  );
});

VirtualizedProductsGrid.displayName = 'VirtualizedProductsGrid';

export default VirtualizedProductsGrid;
