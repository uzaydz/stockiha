import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';
import ProductCard from './ProductCard';
import ProductListItem from './ProductListItem';

interface ProductsGridProps {
  products: Product[];
  loading: boolean;
  viewType: 'grid' | 'list';
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
}

const ProductsGrid = memo(({ 
  products, 
  loading, 
  viewType, 
  favorites, 
  onToggleFavorite 
}: ProductsGridProps) => {
  const { t } = useTranslation();

  // تأثيرات الحركة للعناصر
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="text-center py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h3 className="text-lg font-medium mb-2">{t('featuredProducts.loading')}</h3>
        <p className="text-muted-foreground">{t('featuredProducts.loadingMessage')}</p>
      </motion.div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <motion.div 
        className="text-center py-20 bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl border-2 border-dashed border-muted-foreground/20"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
          <ShoppingCart className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-3">{t('featuredProducts.noProducts')}</h3>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t('featuredProducts.noProductsMessage')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={viewType === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8" 
        : "space-y-6"
      }
    >
      {products.map((product, index) => {
        const isFavorite = favorites.includes(product.id);
        const priority = index < 4; // أول 4 منتجات لها أولوية في التحميل

        return viewType === 'grid' ? (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            priority={priority}
          />
        ) : (
          <ProductListItem
            key={product.id}
            product={product}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            priority={priority}
          />
        );
      })}
    </motion.div>
  );
});

ProductsGrid.displayName = 'ProductsGrid';

export default ProductsGrid;
