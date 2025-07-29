import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { Package2 } from 'lucide-react';
import { ProductsGridProps } from '../types';
import ProductGridItem from './ProductGridItem';
import ProductListItem from './ProductListItem';

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

// مكون عرض الشبكة محسن
const GridView = React.memo<{
  products: any[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  onAddToCart: (product: any) => void;
}>(({ products, favoriteProducts, isReturnMode, onAddToCart }) => {
  // تحسين الـ key للمنتجات لتجنب إعادة الرسم غير الضرورية
  const productItems = useMemo(() => 
    products.map((product) => (
      <ProductGridItem
        key={`grid-${product.id}-${product.stock_quantity}-${product.price}`}
        product={product}
        favoriteProducts={favoriteProducts}
        isReturnMode={isReturnMode}
        onAddToCart={onAddToCart}
      />
    )), [products, favoriteProducts, isReturnMode, onAddToCart]
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, staggerChildren: 0.1 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
    >
      {productItems}
    </motion.div>
  );
});

GridView.displayName = 'GridView';

// مكون عرض القائمة محسن
const ListView = React.memo<{
  products: any[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  onAddToCart: (product: any) => void;
}>(({ products, favoriteProducts, isReturnMode, onAddToCart }) => {
  // تحسين الـ key للمنتجات لتجنب إعادة الرسم غير الضرورية
  const productItems = useMemo(() => 
    products.map((product) => (
      <ProductListItem
        key={`list-${product.id}-${product.stock_quantity}-${product.price}`}
        product={product}
        favoriteProducts={favoriteProducts}
        isReturnMode={isReturnMode}
        onAddToCart={onAddToCart}
      />
    )), [products, favoriteProducts, isReturnMode, onAddToCart]
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, staggerChildren: 0.1 }}
      className="space-y-3"
    >
      {productItems}
    </motion.div>
  );
});

ListView.displayName = 'ListView';

const ProductsGrid: React.FC<ProductsGridProps> = React.memo(({
  products,
  favoriteProducts,
  isReturnMode,
  viewMode,
  searchQuery,
  selectedCategory,
  stockFilter,
  onAddToCart
}) => {
  // تحسين منطق التصفية
  const hasFilters = useMemo(() => 
    Boolean(searchQuery) || selectedCategory !== 'all' || stockFilter !== 'all'
  , [searchQuery, selectedCategory, stockFilter]);

  // تجنب إعادة الرسم إذا لم تتغير المنتجات
  const isEmpty = products.length === 0;

  if (isEmpty) {
    return (
      <TabsContent value="products" className="flex-1 mt-0 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-4 pb-20">
            <EmptyState hasFilters={hasFilters} />
          </div>
        </ScrollArea>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="products" className="flex-1 mt-0 min-h-0">
      <ScrollArea className="h-full w-full">
        <div className="p-4 pb-20">
          {viewMode === 'grid' ? (
            <GridView
              products={products}
              favoriteProducts={favoriteProducts}
              isReturnMode={isReturnMode}
              onAddToCart={onAddToCart}
            />
          ) : (
            <ListView
              products={products}
              favoriteProducts={favoriteProducts}
              isReturnMode={isReturnMode}
              onAddToCart={onAddToCart}
            />
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة لتحسين الأداء
  return (
    prevProps.products.length === nextProps.products.length &&
    prevProps.favoriteProducts.length === nextProps.favoriteProducts.length &&
    prevProps.isReturnMode === nextProps.isReturnMode &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.stockFilter === nextProps.stockFilter &&
    // مقارنة سطحية للمنتجات الأولى للتأكد من عدم تغيير المحتوى
    (prevProps.products.length === 0 || 
     (prevProps.products[0]?.id === nextProps.products[0]?.id &&
      prevProps.products[0]?.stock_quantity === nextProps.products[0]?.stock_quantity))
  );
});

ProductsGrid.displayName = 'ProductsGrid';

export default ProductsGrid; 