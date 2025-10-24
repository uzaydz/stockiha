import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Product } from '@/api/store';
import ProductCard from './ProductCard';

interface StoreProductGridProps {
  products: any[]; // نوع مرن للمنتجات
  view: 'grid' | 'list';
  gridColumns: 2 | 3 | 4;
}

const StoreProductGrid = ({
  products,
  view,
  gridColumns
}: StoreProductGridProps) => {
  const { t } = useTranslation();
  const [wishlist, setWishlist] = useState<string[]>([]);
  
  const toggleWishlist = (productId: string) => {
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter(id => id !== productId));
    } else {
      setWishlist([...wishlist, productId]);
    }
  };
  
  // Determine grid columns class
  const getGridClass = () => {
    if (view === 'list') return 'grid-cols-1 gap-4';
    
    switch (gridColumns) {
      case 2:
        return 'grid-cols-1 sm:grid-cols-2 gap-6';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };
  
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-2xl font-semibold mb-4">{t('productCard.noProducts')}</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {t('productCard.noProductsMessage')}
        </p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("grid", getGridClass())}
    >
      {products.map((product, index) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          isFavorite={wishlist.includes(product.id)}
          onToggleFavorite={toggleWishlist}
          priority={index < 6} // أول 6 صور لها أولوية
        />
      ))}
    </motion.div>
  );
};

export default StoreProductGrid;
