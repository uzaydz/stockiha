import React, { memo } from 'react';
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

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <div className="relative flex flex-col sm:flex-row items-stretch border border-border/50 hover:border-primary/40 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/2 to-secondary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative w-full sm:w-48 aspect-square sm:aspect-[4/3]">
          <Link to={`/product-purchase-max-v2/${productSlug}`} className="block w-full h-full">
            <ProductImage 
              src={product.imageUrl} 
              alt={product.name}
              className="product-image w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              containerClassName="absolute inset-0"
              productName={product.name}
              priority={priority}
              size="medium"
            />
          </Link>
          
          {/* العلامات */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
            {discountPercentage && (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md">
                {discountPercentage}
              </Badge>
            )}
            {product.is_new && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                {t('featuredProducts.new')}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-6 flex flex-col justify-between relative z-10">
          <div>
            <Link 
              to={`/product-purchase-max-v2/${productSlug}`} 
              className="block text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              {categoryName}
            </Link>
            <Link 
              to={`/product-purchase-max-v2/${productSlug}`} 
              className="block font-bold text-xl mb-3 hover:text-primary transition-colors line-clamp-2"
            >
              {product.name}
            </Link>
            
            <p className="text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
            
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2 font-medium">
                {product.rating?.toFixed(1)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              {product.discount_price ? (
                <>
                  <span className="text-2xl font-bold text-primary">
                    {product.discount_price.toLocaleString()} {t('featuredProducts.currency')}
                  </span>
                  <span className="text-lg text-muted-foreground line-through">
                    {product.price.toLocaleString()} {t('featuredProducts.currency')}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {product.price.toLocaleString()} {t('featuredProducts.currency')}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                asChild 
                className="h-11 px-6 rounded-xl font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <Link 
                  to={`/product-purchase-max-v2/${productSlug}`} 
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {t('featuredProducts.viewProduct')}
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-11 w-11 rounded-xl border-2 hover:bg-primary/5 transition-all duration-300"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite(product.id);
                }}
              >
                <Heart className={`h-5 w-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ProductListItem.displayName = 'ProductListItem';

export default ProductListItem;
