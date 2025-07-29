import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { Package2 } from 'lucide-react';
import { ProductsGridProps } from '../types';
import { useVirtualizedList } from '../hooks/useVirtualizedList';
import ProductGridItem from './ProductGridItem';
import ProductListItem from './ProductListItem';

const GRID_ITEM_HEIGHT = 280; // ارتفاع عنصر الشبكة
const LIST_ITEM_HEIGHT = 120; // ارتفاع عنصر القائمة
const CONTAINER_HEIGHT = 600; // ارتفاع الحاوية الافتراضي

// مكون منطقة فارغة محسن
const EmptyState = React.memo<{ hasFilters: boolean }>(({ hasFilters }) => (
  <div className="h-64 flex items-center justify-center">
    <div className="text-center">
      <Package2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-medium mb-2">
        {hasFilters 
          ? 'لا توجد منتجات مطابقة للتصفية'
          : 'لا توجد منتجات'
        }
      </h3>
      <p className="text-muted-foreground">
        {hasFilters
          ? 'جرب تغيير معايير البحث أو التصفية'
          : 'لم يتم العثور على أي منتجات في قاعدة البيانات'
        }
      </p>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// مكون العرض المُحسن باستخدام virtualization
const VirtualizedGrid = React.memo<{
  products: any[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  onAddToCart: (product: any) => void;
  containerHeight: number;
}>(({ products, favoriteProducts, isReturnMode, onAddToCart, containerHeight }) => {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  } = useVirtualizedList(products, {
    itemHeight: GRID_ITEM_HEIGHT,
    containerHeight,
    overscan: 2
  });

  // تحسين العناصر المرئية
  const visibleGridItems = useMemo(() => 
    visibleItems.map((product, index) => (
      <div
        key={`grid-${product.id}-${visibleRange.startIndex + index}`}
        style={{ 
          position: 'absolute',
          top: (visibleRange.startIndex + index) * GRID_ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: GRID_ITEM_HEIGHT
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
          <ProductGridItem
            product={product}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            onAddToCart={onAddToCart}
          />
        </div>
      </div>
    )), [visibleItems, visibleRange.startIndex, favoriteProducts, isReturnMode, onAddToCart]
  );

  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="relative"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleGridItems}
        </div>
      </div>
    </div>
  );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

// مكون القائمة المُحسن باستخدام virtualization
const VirtualizedList = React.memo<{
  products: any[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  onAddToCart: (product: any) => void;
  containerHeight: number;
}>(({ products, favoriteProducts, isReturnMode, onAddToCart, containerHeight }) => {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  } = useVirtualizedList(products, {
    itemHeight: LIST_ITEM_HEIGHT,
    containerHeight,
    overscan: 5
  });

  // تحسين العناصر المرئية
  const visibleListItems = useMemo(() => 
    visibleItems.map((product, index) => (
      <div
        key={`list-${product.id}-${visibleRange.startIndex + index}`}
        style={{ 
          position: 'absolute',
          top: (visibleRange.startIndex + index) * LIST_ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: LIST_ITEM_HEIGHT
        }}
      >
        <div className="px-4">
          <ProductListItem
            product={product}
            favoriteProducts={favoriteProducts}
            isReturnMode={isReturnMode}
            onAddToCart={onAddToCart}
          />
        </div>
      </div>
    )), [visibleItems, visibleRange.startIndex, favoriteProducts, isReturnMode, onAddToCart]
  );

  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="relative"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleListItems}
        </div>
      </div>
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

const VirtualizedProductsGrid: React.FC<ProductsGridProps> = React.memo(({
  products,
  favoriteProducts,
  isReturnMode,
  viewMode,
  searchQuery,
  selectedCategory,
  stockFilter,
  onAddToCart
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(CONTAINER_HEIGHT);

  // حساب ارتفاع الحاوية
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height || CONTAINER_HEIGHT);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // تحسين منطق التصفية
  const hasFilters = useMemo(() => 
    Boolean(searchQuery) || selectedCategory !== 'all' || stockFilter !== 'all'
  , [searchQuery, selectedCategory, stockFilter]);

  // تجنب إعادة الرسم إذا لم تتغير المنتجات
  const isEmpty = products.length === 0;

  // مع pagination، سنستخدم العرض العادي دائماً لأن عدد المنتجات محدود
  const shouldUseVirtualization = false;

  if (isEmpty) {
    return (
      <TabsContent value="products" className="flex-1 mt-0 min-h-0 h-full">
        <div className="h-full w-full">
          <div className="p-4">
            <EmptyState hasFilters={hasFilters} />
          </div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="products" className="flex-1 mt-0 min-h-0 h-full w-full">
      <div ref={containerRef} className="flex-1 h-full w-full overflow-hidden">
        {shouldUseVirtualization ? (
          // استخدام virtualization للقوائم الطويلة
          viewMode === 'grid' ? (
            <VirtualizedGrid
              products={products}
              favoriteProducts={favoriteProducts}
              isReturnMode={isReturnMode}
              onAddToCart={onAddToCart}
              containerHeight={containerHeight}
            />
          ) : (
            <VirtualizedList
              products={products}
              favoriteProducts={favoriteProducts}
              isReturnMode={isReturnMode}
              onAddToCart={onAddToCart}
              containerHeight={containerHeight}
            />
          )
        ) : (
          // العرض العادي مع تمرير كامل
          <div className="h-full w-full overflow-y-auto">
            <div className="p-4 pb-4">
              {viewMode === 'grid' ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, staggerChildren: 0.1 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
                >
                  {products.map((product) => (
                    <ProductGridItem
                      key={`grid-${product.id}-${product.stock_quantity}-${product.price}`}
                      product={product}
                      favoriteProducts={favoriteProducts}
                      isReturnMode={isReturnMode}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, staggerChildren: 0.1 }}
                  className="space-y-3"
                >
                  {products.map((product) => (
                    <ProductListItem
                      key={`list-${product.id}-${product.stock_quantity}-${product.price}`}
                      product={product}
                      favoriteProducts={favoriteProducts}
                      isReturnMode={isReturnMode}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة لتحسين الأداء
  if (
    prevProps.products.length !== nextProps.products.length ||
    prevProps.favoriteProducts.length !== nextProps.favoriteProducts.length ||
    prevProps.isReturnMode !== nextProps.isReturnMode ||
    prevProps.viewMode !== nextProps.viewMode ||
    prevProps.searchQuery !== nextProps.searchQuery ||
    prevProps.selectedCategory !== nextProps.selectedCategory ||
    prevProps.stockFilter !== nextProps.stockFilter
  ) {
    return false; // props مختلفة، يجب إعادة الرسم
  }

  // مقارنة شاملة للمنتجات - التحقق من تغيير المخزون لأي منتج
  if (prevProps.products.length === 0) {
    return true; // لا توجد منتجات، لا حاجة لإعادة الرسم
  }

  // فحص كل منتج للتأكد من عدم تغيير المخزون
  for (let i = 0; i < prevProps.products.length; i++) {
    const prevProduct = prevProps.products[i];
    const nextProduct = nextProps.products[i];
    
    if (
      prevProduct?.id !== nextProduct?.id ||
      prevProduct?.stock_quantity !== nextProduct?.stock_quantity ||
      prevProduct?.price !== nextProduct?.price
    ) {
      console.log('🔄 [VirtualizedProductsGrid] تم اكتشاف تغيير في المنتج:', {
        productId: prevProduct?.id || nextProduct?.id,
        prevStock: prevProduct?.stock_quantity,
        nextStock: nextProduct?.stock_quantity,
        index: i
      });
      return false; // تغيير في منتج، يجب إعادة الرسم
    }
  }

  return true; // لا توجد تغييرات، لا حاجة لإعادة الرسم
});

VirtualizedProductsGrid.displayName = 'VirtualizedProductsGrid';

export default VirtualizedProductsGrid; 