import React, { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';

// استيراد المكونات المنفصلة الجديدة
import FeaturedProductsHeader from './FeaturedProductsHeader';
import ProductsGrid from './ProductsGrid';
import { useFeaturedProducts, useViewMode } from './useFeaturedProducts';

interface FeaturedProductsProps {
  title?: string;
  description?: string;
  products?: Product[];
  selectionMethod?: 'automatic' | 'manual';
  selectionCriteria?: 'featured' | 'best_selling' | 'newest' | 'discounted';
  selectedProducts?: string[];
  displayCount?: number;
  displayType?: 'grid' | 'list';
  organizationId?: string;
}

const FeaturedProducts = memo(({
  title,
  description,
  products: initialProducts = [],
  selectionMethod = 'automatic',
  selectionCriteria = 'featured',
  selectedProducts = [],
  displayCount = 4,
  displayType = 'grid',
  organizationId
}: FeaturedProductsProps) => {
  const { t } = useTranslation();
  
  // استخدام الـ hooks المخصصة
  const {
    displayedProducts,
    loading,
    favorites,
    toggleFavorite
  } = useFeaturedProducts({
    initialProducts,
    selectionMethod,
    selectionCriteria,
    selectedProducts,
    displayCount,
    organizationId
  });

  const { viewType, setViewType } = useViewMode(displayType);
  
  const [enableMotion, setEnableMotion] = useState(false);
  useEffect(() => {
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
      setEnableMotion(!prefersReduced && !isSmall);
    } catch {
      setEnableMotion(false);
    }
  }, []);




  return (
    <section className="py-10 sm:py-14 md:py-20 lg:py-24 relative overflow-hidden bg-white dark:bg-gray-900">
      {/* خلفية متدرجة محسنة - إخفاء على الموبايل لتقليل العمل */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 hidden md:block"></div>
      <div className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl opacity-60 hidden md:block"></div>
      <div className="absolute bottom-20 -right-40 w-80 h-80 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-full blur-3xl opacity-60 hidden md:block"></div>
      {/* نقاط زخرفية - إخفاء على الموبايل */}
      <div className="absolute top-32 right-20 w-2 h-2 bg-primary/20 rounded-full hidden md:block"></div>
      <div className="absolute top-48 right-32 w-1 h-1 bg-secondary/30 rounded-full hidden md:block"></div>
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-primary/15 rounded-full hidden md:block"></div>

      <div className="container px-3 sm:px-4 mx-auto relative z-10 bg-gray-50 dark:bg-gray-800 min-h-[400px]">
        {/* العنوان وأدوات التحكم */}
        <FeaturedProductsHeader
          title={title}
          description={description}
          viewType={viewType}
          onViewTypeChange={setViewType}
        />
        
        {/* شبكة المنتجات */}
        <ProductsGrid
          products={displayedProducts as unknown as Product[]}
          loading={loading}
          viewType={viewType}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
        
        {/* زر عرض جميع المنتجات المحسن */}
        {enableMotion ? (
          <motion.div 
            className="text-center mt-12 md:mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button 
              asChild 
              size="lg" 
              className="h-12 md:h-14 px-6 md:px-8 rounded-2xl font-medium bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <Link to="/products" className="flex items-center gap-2 md:gap-3">
                {t('featuredProducts.browseAllProducts')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="text-center mt-12 md:mt-16">
            <Button 
              asChild 
              size="lg" 
              className="h-12 md:h-14 px-6 md:px-8 rounded-2xl font-medium bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <Link to="/products" className="flex items-center gap-2 md:gap-3">
                {t('featuredProducts.browseAllProducts')}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
});

FeaturedProducts.displayName = 'FeaturedProducts';

export default FeaturedProducts;
