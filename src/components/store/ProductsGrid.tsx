import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';
import { ProductCard } from './ProductCard';
import { ProductListItem } from './ProductListItem';

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
  const [enableMotion, setEnableMotion] = useState(false);

  // تحسين الأداء: حفظ النتائج في الذاكرة مع تحسينات إضافية
  const memoizedProducts = useMemo(() => products?.slice(0, 50) || [], [products]); // تحديد العدد للأداء
  const memoizedFavorites = useMemo(() => new Set(favorites), [favorites]);
  
  // تحسين الاستجابة للشاشات الصغيرة
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // تحسين الأداء: استخدام useCallback للوظائف
  const handleToggleFavorite = useCallback((productId: string) => {
    onToggleFavorite(productId);
  }, [onToggleFavorite]);

  useEffect(() => {
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
      setEnableMotion(!prefersReduced && !isSmall);
    } catch {
      setEnableMotion(false);
    }
  }, []);

  // تأثيرات الحركة المحسنة للعناصر
  const containerVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
        staggerChildren: isMobile ? 0.05 : 0.08,
        delayChildren: 0.1
      }
    }
  }), [isMobile]);

  // تأثيرات محسنة للعناصر الفردية
  const itemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  }), []);

  if (loading) {
    return (
      <motion.div 
        className="text-center py-16 sm:py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        role="status"
        aria-live="polite"
        aria-label={t('featuredProducts.loading')}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-4 sm:mb-6">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin" aria-hidden="true" />
        </div>
        <h3 className="text-base sm:text-lg font-medium mb-2">{t('featuredProducts.loading')}</h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">{t('featuredProducts.loadingMessage')}</p>
      </motion.div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <motion.div 
        className="text-center py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl sm:rounded-3xl border-2 border-dashed border-muted-foreground/20 mx-4 sm:mx-0"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        role="status"
        aria-live="polite"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full mb-4 sm:mb-6">
          <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 px-4">{t('featuredProducts.noProducts')}</h3>
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto px-4">
          {t('featuredProducts.noProductsMessage')}
        </p>
      </motion.div>
    );
  }

  if (enableMotion) {
    return (
      <div
        className={viewType === 'grid'
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-0 bg-white dark:bg-gray-800"
          : "space-y-4 sm:space-y-6 px-2 sm:px-0 bg-white dark:bg-gray-800"
        }
        role="grid"
        aria-label={viewType === 'grid' ? t('featuredProducts.storeProducts.gridView') : t('featuredProducts.storeProducts.listView')}
      >
        {memoizedProducts.map((product, index) => {
          const isFavorite = memoizedFavorites.has(product.id);
          const priority = index < 6; // زيادة عدد العناصر ذات الأولوية للتحميل السريع
          
          const ProductComponent = viewType === 'grid' ? ProductCard : ProductListItem;

          return (
            <div
              key={product.id}
              className="w-full"
            >
              <ProductComponent
                product={product}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                priority={priority}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={viewType === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-0 bg-white dark:bg-gray-800"
        : "space-y-4 sm:space-y-6 px-2 sm:px-0 bg-white dark:bg-gray-800"
      }
      role="grid"
      aria-label={viewType === 'grid' ? t('featuredProducts.storeProducts.gridView') : t('featuredProducts.storeProducts.listView')}
    >
      {memoizedProducts.map((product, index) => {
        const isFavorite = memoizedFavorites.has(product.id);
        const priority = index < 6; // زيادة عدد العناصر ذات الأولوية للتحميل السريع
        
        const ProductComponent = viewType === 'grid' ? ProductCard : ProductListItem;

        return (
          <ProductComponent
            key={product.id}
            product={product} 
            isFavorite={isFavorite} 
            onToggleFavorite={handleToggleFavorite} 
            priority={priority} 
          />
        );
      })}
    </div>
  );
});

ProductsGrid.displayName = 'ProductsGrid';

export default ProductsGrid;
