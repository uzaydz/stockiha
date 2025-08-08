import React, { memo } from 'react';
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
  
  return (
    <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden bg-background">
      {/* خلفية متدرجة محسنة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-secondary/3"></div>
      <div className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-20 -right-40 w-80 h-80 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-full blur-3xl opacity-60"></div>
      
      {/* نقاط زخرفية */}
      <div className="absolute top-32 right-20 w-2 h-2 bg-primary/20 rounded-full"></div>
      <div className="absolute top-48 right-32 w-1 h-1 bg-secondary/30 rounded-full"></div>
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-primary/15 rounded-full"></div>
      
      <div className="container px-4 mx-auto relative z-10">
        {/* العنوان وأدوات التحكم */}
        <FeaturedProductsHeader
          title={title}
          description={description}
          viewType={viewType}
          onViewTypeChange={setViewType}
        />
        
        {/* شبكة المنتجات */}
        <ProductsGrid
          products={displayedProducts}
          loading={loading}
          viewType={viewType}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
        
        {/* زر عرض جميع المنتجات المحسن */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button 
            asChild 
            size="lg" 
            className="h-14 px-8 rounded-2xl font-medium bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <Link to="/products" className="flex items-center gap-3">
              {t('featuredProducts.browseAllProducts')}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
});

FeaturedProducts.displayName = 'FeaturedProducts';

export default FeaturedProducts;
