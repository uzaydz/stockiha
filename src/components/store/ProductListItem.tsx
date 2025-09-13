import React, { memo, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Eye, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';
import ProductImage from './ProductImage';
import { 
  getProductSlug, 
  calculateDiscount, 
  getCategoryName 
} from './productUtils';

interface ProductListItemProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  priority?: boolean;
}

const ProductListItem = memo(({ 
  product, 
  isFavorite, 
  onToggleFavorite,
  priority = false 
}: ProductListItemProps) => {
  const { t } = useTranslation();
  const productSlug = getProductSlug(product);
  const discountPercentage = calculateDiscount(Number(product.price), Number(product.discount_price));
  const categoryName = getCategoryName(product.category);
  
  // تحسين الأداء على الأجهزة الصغيرة
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" as const }
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <div className="relative flex flex-col sm:flex-row items-stretch border border-border/50 hover:border-primary/30 rounded-2xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group hover:scale-[1.01] active:scale-[0.99]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-secondary/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative w-full sm:w-52 lg:w-56 aspect-square sm:aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10">
          <Link to={`/product-purchase-max-v2/${productSlug}`} className="block w-full h-full">
            <ProductImage 
              src={product.thumbnail_image || product.imageUrl} 
              alt={product.name}
              className="product-image w-full h-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-1"
              containerClassName="absolute inset-0"
              productName={product.name}
              priority={priority}
              size="medium"
            />
          </Link>
          
          {/* العلامات المحسنة */}
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
            {discountPercentage && (
              <Badge className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white border-0 shadow-xl text-xs px-2 py-1 rounded-full animate-pulse font-bold">
                -{discountPercentage}
              </Badge>
            )}
            {product.is_new && (
              <Badge className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white border-0 shadow-xl text-xs px-2 py-1 rounded-full font-bold">
                {t('featuredProducts.new')}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-4 sm:p-5 lg:p-6 flex flex-col justify-between relative z-10">
          <div>
            {categoryName && (
              <Link 
                to={`/product-purchase-max-v2/${productSlug}`} 
                className="block text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors mb-2 font-medium uppercase tracking-wider"
              >
                {categoryName}
              </Link>
            )}
            <Link 
              to={`/product-purchase-max-v2/${productSlug}`} 
              className="block font-bold text-lg sm:text-xl lg:text-2xl mb-3 hover:text-primary transition-colors line-clamp-2 group-hover:text-primary"
            >
              {product.name}
            </Link>
            
            <p className="text-muted-foreground mb-3 line-clamp-2 leading-relaxed text-sm sm:text-base opacity-80">
              {product.description}
            </p>
            
            <div className="flex items-center gap-0.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`w-4 h-4 transition-colors ${i < 4 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"}`}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2 font-medium">
                (4.9)
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-auto gap-4">
            <div className="flex flex-col">
              {product.discount_price ? (
                <>
                  <span className="text-xl sm:text-2xl font-bold text-primary">
                    {product.discount_price.toLocaleString()} {t('featuredProducts.currency')}
                  </span>
                  <span className="text-base sm:text-lg text-muted-foreground line-through">
                    {product.price.toLocaleString()} {t('featuredProducts.currency')}
                  </span>
                </>
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-primary">
                  {product.price.toLocaleString()} {t('featuredProducts.currency')}
                </span>
              )}
              <div className="text-xs mt-1 px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 w-fit">
                {t('featuredProducts.stock.available')}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                asChild 
                className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <Link 
                  to={`/product-purchase-max-v2/${productSlug}`} 
                  className="flex items-center gap-2 text-sm sm:text-base"
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('featuredProducts.viewProduct')}
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-2 hover:bg-red-50 hover:border-red-200 transition-all duration-300 hover:scale-110"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite(product.id);
                }}
              >
                <Heart className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-200 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'hover:text-red-500'}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ProductListItem.displayName = 'ProductListItem';

export { ProductListItem };
export default ProductListItem;
