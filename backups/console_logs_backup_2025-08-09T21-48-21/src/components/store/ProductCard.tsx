import React, { memo, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';
import ProductImage from './ProductImage';

// دوال مساعدة
const getProductSlug = (product: Product) => {
  return product.slug || product.name.toLowerCase().replace(/\s+/g, '-');
};

const getCategoryName = (category: any) => {
  return category?.name || 'غير محدد';
};

const calculateDiscountPercentage = (originalPrice: number, discountPrice: number) => {
  if (!discountPrice || discountPrice >= originalPrice) return null;
  const discount = ((originalPrice - discountPrice) / originalPrice) * 100;
  return `${Math.round(discount)}%`;
};

const getStockStatusText = (stockQuantity: number, t: any) => {
  if (stockQuantity <= 0) return t('products.outOfStock');
  if (stockQuantity <= 10) return t('products.lowStock');
  return t('products.inStock');
};

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  priority?: boolean;
}

const ProductCard = ({ 
  product, 
  isFavorite, 
  onToggleFavorite,
  priority = false 
}: ProductCardProps) => {
  const { t } = useTranslation();
  const productSlug = getProductSlug(product);
  const discountPercentage = calculateDiscountPercentage(Number(product.price), Number(product.discount_price));
  const stockStatus = getStockStatusText(product.stock_quantity, t);
  const categoryName = getCategoryName(product.category);

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

  // تحسين الأداء عبر تبسيط الحركات على الأجهزة الصغيرة
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: isMobile ? 10 : 20, 
      scale: isMobile ? 0.99 : 0.98 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        duration: isMobile ? 0.2 : 0.3, 
        ease: "easeOut" as const 
      }
    }
  }), [isMobile]);

  const CardWrapper = enableMotion ? motion.div : 'div';

  return (
    <CardWrapper variants={itemVariants}>
      <Card 
        className={`group h-full overflow-hidden border border-border/50 hover:border-primary/30 bg-card/90 backdrop-blur-sm shadow-md hover:shadow-2xl transition-all duration-300 rounded-xl sm:rounded-2xl relative focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary ${
          isMobile ? 'active:scale-[0.98]' : 'hover:scale-[1.02] active:scale-[0.98]'
        }`}
        style={{
          willChange: 'transform, box-shadow',
          transform: 'translateZ(0)'
        }}
        role="article"
        aria-label={`منتج: ${product.name}`}
      >
        {/* تأثير الوهج المحسن عند الـ hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-secondary/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
        
        <div className="relative overflow-hidden aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10 rounded-t-xl sm:rounded-t-2xl">
          <Link 
            to={`/product-purchase-max-v2/${productSlug}`} 
            className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-t-2xl"
            aria-label={`عرض تفاصيل ${product.name}`}
            onTouchStart={() => {}} // تحسين الاستجابة للمس على iOS
          >
            <ProductImage 
              src={product.imageUrl || product.thumbnail_image} 
              alt={product.name}
              className={`product-image w-full h-full object-contain p-2 sm:p-3 lg:p-4 transition-all duration-300 ${
              isMobile ? 'active:scale-105' : 'group-hover:scale-110 group-hover:rotate-1'
            }`}
              containerClassName="absolute inset-0"
              productName={product.name}
              priority={priority}
              size="medium"
            />
          </Link>
          
          {/* العلامات المحسنة مع تأثيرات أفضل */}
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5">
            {discountPercentage && (
              <Badge className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white border-0 shadow-xl backdrop-blur-sm font-bold text-xs px-2 py-1 rounded-full animate-pulse">
                -{discountPercentage}
              </Badge>
            )}
            {product.is_new && (
              <Badge className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white border-0 shadow-xl backdrop-blur-sm font-bold text-xs px-2 py-1 rounded-full">
                {t('featuredProducts.new')}
              </Badge>
            )}
          </div>
          
          {/* أزرار الإجراءات السريعة المحسنة */}
          <div className="absolute bottom-2 left-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-3 group-hover:translate-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Button 
                  size="icon" 
                  className="h-9 w-9 rounded-xl bg-background/95 hover:bg-primary hover:text-primary-foreground text-foreground shadow-xl backdrop-blur-md border border-border/30 transition-all duration-200 hover:scale-110 focus:ring-2 focus:ring-primary/50"
                  aria-label={`إضافة ${product.name} إلى السلة`}
                  tabIndex={-1}
                >
                  <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-9 w-9 rounded-xl bg-background/95 hover:bg-red-500 hover:text-white text-foreground shadow-xl backdrop-blur-md border border-border/30 transition-all duration-200 hover:scale-110 focus:ring-2 focus:ring-red-500/50"
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleFavorite(product.id);
                  }}
                  aria-label={isFavorite ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} إلى المفضلة`}
                  tabIndex={-1}
                >
                  <Heart className={`h-3.5 w-3.5 transition-all duration-200 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : ''}`} aria-hidden="true" />
                </Button>
              </div>
              <Button 
                size="icon" 
                className="h-9 w-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground shadow-xl backdrop-blur-md border border-primary/20 transition-all duration-200 hover:scale-110 focus:ring-2 focus:ring-primary/50"
                aria-label={`معاينة سريعة لـ ${product.name}`}
                tabIndex={-1}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-3 sm:p-4 lg:p-5 relative z-10 min-h-[120px] sm:min-h-[140px] flex flex-col justify-between">
          <Link 
            to={`/product-purchase-max-v2/${productSlug}`} 
            className="block mb-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors font-medium uppercase tracking-wide focus:outline-none focus:text-primary"
            tabIndex={-1}
          >
            {categoryName}
          </Link>
          <Link 
            to={`/product-purchase-max-v2/${productSlug}`} 
            className="block font-bold text-base sm:text-lg mb-2.5 hover:text-primary transition-colors line-clamp-2 leading-tight group-hover:text-primary focus:outline-none focus:text-primary"
            tabIndex={-1}
          >
            {product.name}
          </Link>
          
          <div className="flex items-center gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i}
                className={`w-3.5 h-3.5 transition-colors ${i < Math.floor(product.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1.5 font-medium">
              ({product.rating?.toFixed(1) || '0.0'})
            </span>
          </div>
          
          <div className="flex items-end justify-between mt-auto">
            <div className="flex flex-col">
              {product.discount_price ? (
                <>
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                    {product.discount_price.toLocaleString()} {t('featuredProducts.currency')}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground line-through">
                    {product.price.toLocaleString()} {t('featuredProducts.currency')}
                  </span>
                </>
              ) : (
                <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                  {product.price.toLocaleString()} {t('featuredProducts.currency')}
                </span>
              )}
            </div>
            
            <div className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
              متوفر
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-3 sm:p-4 lg:p-5 pt-2 relative z-10">
          <Button 
            asChild 
            className={`w-full h-10 sm:h-11 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
              isMobile ? 'active:scale-95' : 'hover:scale-105 active:scale-95'
            }`}
          >
            <Link 
              to={`/product-purchase-max-v2/${productSlug}`} 
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base focus:outline-none"
              aria-label={`عرض تفاصيل وشراء ${product.name}`}
            >
              {t('featuredProducts.viewProduct')}
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </CardWrapper>
  );
};

ProductCard.displayName = 'ProductCard';

export default ProductCard;
