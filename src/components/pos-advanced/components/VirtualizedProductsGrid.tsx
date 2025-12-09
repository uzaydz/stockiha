import React, { useMemo, useRef, useState, useEffect } from 'react';
import { PackageX } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { ProductsGridProps } from '../types';
import TitaniumProductCard from './TitaniumProductCard';
import ProductListItem from './ProductListItem';

// مكون الحالة الفارغة - تصميم بريميوم
const EmptyState = React.memo<{ hasFilters: boolean }>(({ hasFilters }) => (
  <div className="h-full min-h-[400px] flex items-center justify-center p-8">
    <div className="text-center space-y-4 max-w-sm mx-auto">
      <div className="w-20 h-20 mx-auto bg-slate-50 dark:bg-[#21262d] rounded-2xl flex items-center justify-center border border-slate-100 dark:border-[#30363d] shadow-sm transform transition-transform hover:scale-110 duration-300">
        <PackageX className="h-10 w-10 text-slate-300 dark:text-[#6e7681]" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-slate-900 dark:text-[#e6edf3] tracking-tight">
          {hasFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد منتجات'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-[#8b949e] leading-relaxed">
          {hasFilters
            ? 'لم نتمكن من العثور على ما تبحث عنه. حاول استخدام كلمات مفتاحية مختلفة.'
            : 'لم يتم إضافة أي منتجات لهذا القسم بعد.'
          }
        </p>
      </div>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Hook لقياس أبعاد الحاوية - محسّن
const useContainerSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // قياس أولي فوري
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      setSize({
        width: rect.width,
        height: rect.height > 0 ? rect.height : 500 // ارتفاع افتراضي إذا كان 0
      });
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const newHeight = entry.contentRect.height > 0 ? entry.contentRect.height : 500;
        setSize({
          width: entry.contentRect.width,
          height: newHeight
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
};

// مكون صف الشبكة
const GridRow: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columnCount: number;
    favoriteProducts: any[];
    isReturnMode: boolean;
    isLossMode?: boolean;
    onAddToCart: (product: any) => void;
    gap: number;
  };
}> = ({ index, style, data }) => {
  const { items, columnCount, favoriteProducts, isReturnMode, isLossMode, onAddToCart, gap } = data;
  const startIndex = index * columnCount;
  const rowItems = items.slice(startIndex, startIndex + columnCount);

  return (
    <div style={{ ...style, display: 'flex', gap: gap, paddingLeft: gap, paddingRight: gap, paddingBottom: gap }}>
      {rowItems.map((product) => (
        <div key={product.id} style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <TitaniumProductCard
            product={product}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            isLossMode={isLossMode}
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
};

GridRow.displayName = 'GridRow';

// مكون صف القائمة
const ListRow: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    favoriteProducts: any[];
    isReturnMode: boolean;
    isLossMode?: boolean;
    onAddToCart: (product: any) => void;
    gap: number;
  };
}> = ({ index, style, data }) => {
  const { items, favoriteProducts, isReturnMode, isLossMode, onAddToCart, gap } = data;
  const product = items[index];

  return (
    <div style={{ ...style, paddingLeft: gap, paddingRight: gap }}>
      <ProductListItem
        product={product}
        favoriteProducts={favoriteProducts}
        isReturnMode={isReturnMode}
        isLossMode={isLossMode}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

ListRow.displayName = 'ListRow';

const VirtualizedProductsGrid: React.FC<ProductsGridProps> = React.memo(({
  products,
  favoriteProducts,
  isReturnMode,
  isLossMode = false,
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
    if (width < 500) return 2;
    if (width < 900) return 3;
    if (width < 1200) return 4;
    if (width < 1600) return 5;
    return 6;
  }, [width, viewMode]);

  const gap = 16;
  // ⚡ Updated height for the new "Masterpiece" design (Compact + Elegant)
  const rowHeight = viewMode === 'grid' ? 280 : 100;
  const rowCount = Math.ceil(products.length / columnCount);

  // عرض الحالة الفارغة
  if (isEmpty) {
    return (
      <div className="w-full h-full bg-background" ref={ref}>
        <EmptyState hasFilters={hasFilters} />
      </div>
    );
  }

  // حساب الارتفاع الفعلي
  const calculatedHeight = useMemo(() => {
    if (height > 100) return height;
    const maxRows = Math.min(rowCount, 5);
    return Math.max(450, maxRows * (rowHeight + gap));
  }, [height, rowCount, rowHeight, gap]);

  const itemData = useMemo(() => ({
    items: products,
    columnCount,
    favoriteProducts,
    isReturnMode,
    isLossMode,
    onAddToCart,
    gap
  }), [products, columnCount, favoriteProducts, isReturnMode, isLossMode, onAddToCart, gap]);

  return (
    <div
      className="w-full h-full bg-background"
      ref={ref}
    >
      {width > 0 && height > 0 && (
        <List
          height={height}
          itemCount={rowCount}
          itemSize={rowHeight + gap}
          width={width}
          itemData={itemData}
          className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          style={{ scrollBehavior: 'smooth' }}
        >
          {viewMode === 'grid' ? GridRow : ListRow}
        </List>
      )}
    </div>
  );
});

VirtualizedProductsGrid.displayName = 'VirtualizedProductsGrid';

export default VirtualizedProductsGrid;
