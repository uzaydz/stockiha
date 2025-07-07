import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart, Star, Package, Sparkles, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/api/products';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from '@/components/ui/optimized-image';
import React from 'react';

interface ProductCardProps {
  product: Product;
  view: 'grid' | 'list';
  index: number;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
}

const ProductCard = React.memo(({ 
  product, 
  view, 
  index, 
  onWishlistToggle,
  isWishlisted = false 
}: ProductCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // المتغيرات تم حذفها لأن OptimizedImage تدير الصور تلقائياً
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWishlistToggle?.(product.id);
    toast.success(
      isWishlisted ? t('productCard.removedFromWishlist') : t('productCard.addedToWishlist')
    );
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    // إنشاء slug من الاسم إذا لم يكن موجود
    const productSlug = product.slug || 
      product.name.toLowerCase()
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '') // إزالة الرموز الخاصة مع الحفاظ على العربية
        .replace(/\s+/g, '-') // استبدال المسافات بشرطات
        .trim();
    navigate(`/product-purchase-max-v2/${productSlug}`);
    toast.success(t('productCard.buyingProduct', { productName: product.name }));
  };

  const handleViewProduct = () => {
    // إنشاء slug من الاسم إذا لم يكن موجود
    const productSlug = product.slug || 
      product.name.toLowerCase()
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '') // إزالة الرموز الخاصة مع الحفاظ على العربية
        .replace(/\s+/g, '-') // استبدال المسافات بشرطات
        .trim();
    navigate(`/product-purchase-max-v2/${productSlug}`);
  };

  // حساب نسبة الخصم
  const discountPercentage = product.compare_at_price && product.compare_at_price > product.price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  // تحديد حالة المخزون
  const getStockStatus = () => {
    if (product.stock_quantity <= 0) return { status: 'out', label: t('productCard.outOfStock'), color: 'bg-red-100 text-red-800' };
    if (product.stock_quantity < 10) return { status: 'low', label: t('productCard.limited'), color: 'bg-amber-100 text-amber-800' };
    return { status: 'in', label: t('productCard.available'), color: 'bg-green-100 text-green-800' };
  };

  const stockStatus = getStockStatus();

  if (view === 'list') {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -2 }}
      >
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
          onClick={handleViewProduct}
        >
          <div className="flex p-4 gap-4">
            {/* صورة المنتج */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <div className="w-full h-full bg-white dark:bg-gray-50 border border-gray-100 dark:border-gray-200 rounded-lg overflow-hidden flex items-center justify-center p-2">
                <OptimizedImage
                  src={product.thumbnail_image || product.images?.[0] || '/placeholder.svg'}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-105"
                  placeholder="/placeholder.svg"
                />
              </div>
              
              {/* شارات المنتج */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.is_new && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                    <Sparkles className="h-3 w-3 ml-1" />
                    {t('productCard.new')}
                  </Badge>
                )}
                {discountPercentage > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    -{discountPercentage}%
                  </Badge>
                )}
              </div>

              {/* زر المفضلة */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleWishlistToggle}
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
              >
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-red-500 text-red-500")} />
              </Button>
            </div>

            {/* تفاصيل المنتج */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <Badge className={cn("text-xs ml-2", stockStatus.color)}>
                  {stockStatus.label}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                {product.description}
              </p>
              
              {/* السعر */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>
              
              {/* الأزرار */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleBuyNow}
                  disabled={stockStatus.status === 'out'}
                  className="flex-1 gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {stockStatus.status === 'out' ? t('productCard.outOfStock') : t('productCard.buyNow')}
                </Button>
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleViewProduct(); }}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group h-full"
        onClick={handleViewProduct}
      >
        {/* صورة المنتج */}
        <div className="relative aspect-square">
          <div className="w-full h-full bg-white dark:bg-gray-50 border border-gray-100 dark:border-gray-200 overflow-hidden rounded-t-lg flex items-center justify-center p-2">
            <OptimizedImage
              src={product.thumbnail_image || product.images?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-105"
              placeholder="/placeholder.svg"
            />
          </div>
          
          {/* شارات المنتج */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.is_new && (
              <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                <Sparkles className="h-3 w-3 ml-1" />
                {t('productCard.new')}
              </Badge>
            )}
            {discountPercentage > 0 && (
              <Badge variant="destructive" className="text-xs font-bold">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {/* زر المفضلة */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWishlistToggle}
            className="absolute top-3 right-3 h-10 w-10 p-0 bg-white/90 hover:bg-white shadow-sm"
          >
            <Heart className={cn("h-5 w-5", isWishlisted && "fill-red-500 text-red-500")} />
          </Button>

          {/* زر عرض سريع */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button 
              variant="secondary" 
              onClick={(e) => { e.stopPropagation(); handleViewProduct(); }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {t('productCard.quickView')}
            </Button>
          </div>
        </div>

        {/* تفاصيل المنتج */}
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-base line-clamp-2 group-hover:text-primary transition-colors flex-1">
              {product.name}
            </h3>
            <Badge className={cn("text-xs ml-2 flex-shrink-0", stockStatus.color)}>
              {stockStatus.label}
            </Badge>
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {product.description}
          </p>
          
          {/* السعر */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
          
          {/* زر الشراء */}
          <Button 
            onClick={handleBuyNow}
            disabled={stockStatus.status === 'out'}
            className="w-full gap-2"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4" />
            {stockStatus.status === 'out' ? t('productCard.outOfStock') : t('productCard.buyNow')}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
