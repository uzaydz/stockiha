import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';
import ProductImage from './ProductImage';
import { 
  getProductSlug, 
  calculateDiscount, 
  getStockStatusText, 
  getCategoryName 
} from './productUtils';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  priority?: boolean;
}

const ProductCard = memo(({ 
  product, 
  isFavorite, 
  onToggleFavorite,
  priority = false 
}: ProductCardProps) => {
  const { t } = useTranslation();
  const productSlug = getProductSlug(product);
  const discountPercentage = calculateDiscount(Number(product.price), Number(product.discount_price));
  const stockStatus = getStockStatusText(product.stock_quantity, t);
  const categoryName = getCategoryName(product.category);

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card 
        className="group h-full overflow-hidden border border-border/50 hover:border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl relative"
        style={{
          willChange: 'transform, box-shadow',
          transform: 'translateZ(0)'
        }}
      >
        {/* تأثير الوهج عند الـ hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
        
        <div className="relative overflow-hidden aspect-[4/3] bg-gradient-to-br from-muted/20 to-muted/5 rounded-t-3xl">
          <Link to={`/product-purchase-max-v2/${productSlug}`} className="block w-full h-full">
            <ProductImage 
              src={product.imageUrl || product.thumbnail_image} 
              alt={product.name}
              className="product-image w-full h-full object-contain p-4 transition-all duration-300 group-hover:scale-105"
              containerClassName="absolute inset-0"
              productName={product.name}
              priority={priority}
              size="medium"
            />
          </Link>
          
          {/* العلامات المحسنة */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
            {discountPercentage && (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg backdrop-blur-sm font-bold">
                {discountPercentage}
              </Badge>
            )}
            {product.is_new && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg backdrop-blur-sm font-bold">
                {t('featuredProducts.new')}
              </Badge>
            )}
          </div>
          
          {/* أزرار الإجراءات السريعة */}
          <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur-sm border border-border/50"
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur-sm border border-border/50"
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleFavorite(product.id);
                  }}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
              <Button 
                size="icon" 
                className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur-sm border border-border/50"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-4 lg:p-6 relative z-10">
          <Link 
            to={`/product-purchase-max-v2/${productSlug}`} 
            className="block mb-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {categoryName}
          </Link>
          <Link 
            to={`/product-purchase-max-v2/${productSlug}`} 
            className="block font-bold text-lg mb-3 hover:text-primary transition-colors line-clamp-2 leading-tight"
          >
            {product.name}
          </Link>
          
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
          
          <div className="flex items-center justify-between">
            {product.discount_price ? (
              <div className="flex flex-col">
                <span className="text-xl font-bold text-primary">
                  {product.discount_price.toLocaleString()} {t('featuredProducts.currency')}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {product.price.toLocaleString()} {t('featuredProducts.currency')}
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-primary">
                {product.price.toLocaleString()} {t('featuredProducts.currency')}
              </span>
            )}
            
            <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${stockStatus.className}`}>
              {stockStatus.text}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 lg:p-6 pt-0 relative z-10">
          <Button 
            asChild 
            className="w-full h-12 rounded-xl font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link 
              to={`/product-purchase-max-v2/${productSlug}`} 
              className="flex items-center justify-center gap-2"
            >
              {t('featuredProducts.viewProduct')}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
