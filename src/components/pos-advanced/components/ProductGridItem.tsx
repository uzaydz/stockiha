import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package2,
  RotateCcw,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Heart,
  Tag,
  Sparkles
} from 'lucide-react';
import { ProductItemProps } from '../types';

const ProductGridItem: React.FC<ProductItemProps> = React.memo(({ 
  product, 
  favoriteProducts, 
  isReturnMode, 
  onAddToCart 
}) => {
  const stock = product.stock_quantity || 0;
  const lowStockThreshold = 10;
  const isLowStock = stock > 0 && stock <= lowStockThreshold;
  const isOutOfStock = stock === 0;
  const isFavorite = favoriteProducts.some(fav => fav.id === product.id);

  const handleClick = useCallback(() => {
    onAddToCart(product);
  }, [product, onAddToCart]);

  // معالجة محسّنة للصور مع دعم جميع الحالات
  const imageUrl = React.useMemo(() => {
    // محاولة استخدام thumbnail_image أولاً
    if (product.thumbnail_image && product.thumbnail_image.trim()) {
      return product.thumbnail_image;
    }
    
    // محاولة استخدام thumbnailImage (camelCase)
    if ((product as any).thumbnailImage && (product as any).thumbnailImage.trim()) {
      return (product as any).thumbnailImage;
    }
    
    // محاولة استخدام أول صورة من مصفوفة images
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
        return firstImage;
      }
    }
    
    // محاولة استخدام صورة من أول لون متاح
    if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
      for (const color of product.colors) {
        if (color.image_url && color.image_url.trim()) {
          return color.image_url;
        }
      }
    }
    
    return null;
  }, [product]);

  return (
    <Card className={cn(
      "group relative cursor-pointer transition-all duration-200 overflow-hidden h-full flex flex-col",
      "border border-slate-800/30 bg-card hover:border-slate-700/50 hover:shadow-lg",
      isReturnMode && "border-amber-500/30 hover:border-amber-500/50",
      isOutOfStock && "opacity-60",
      isLowStock && !isReturnMode && "border-yellow-500/30"
    )}>
        
        <div onClick={handleClick} className="h-full flex flex-col">
          {/* صورة المنتج */}
          <div className="relative aspect-square bg-muted/30 overflow-hidden">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              imageUrl ? 'hidden' : ''
            )}>
              <Package2 className="h-12 w-12 text-muted-foreground" />
            </div>
            
            {/* طبقة تفاعلية */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            
            {/* شارات الحالة */}
            <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
              {isFavorite && (
                <Badge className="bg-yellow-500 text-white text-xs font-semibold px-1.5 py-1 rounded-md shadow-md">
                  <Heart className="h-3 w-3 fill-current" />
                </Badge>
              )}
              {isOutOfStock && (
                <Badge className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-md shadow-md">
                  نفد
                </Badge>
              )}
              {isLowStock && (
                <Badge className="bg-yellow-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  قليل
                </Badge>
              )}
            </div>

            {/* مؤشر الإضافة */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className={cn(
                "p-3 rounded-lg backdrop-blur-sm shadow-lg",
                isReturnMode 
                  ? "bg-amber-500 text-white" 
                  : "bg-primary text-primary-foreground"
              )}>
                {isReturnMode ? (
                  <RotateCcw className="h-5 w-5" />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
              </div>
            </div>

            {/* شارة السعر */}
            <div className="absolute bottom-2 left-2 z-10">
              <div className={cn(
                "px-2.5 py-1 rounded-lg font-bold text-sm backdrop-blur-sm shadow-md",
                isReturnMode
                  ? "bg-amber-500 text-white"
                  : "bg-card/90 text-foreground border border-slate-700/50"
              )}>
                {product.price?.toLocaleString()} دج
              </div>
            </div>
          </div>

          {/* معلومات المنتج */}
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                  {product.name}
                </h3>
                {((product.category as any)?.name || (product as any).category_name) && (
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted border border-slate-700/30">
                    <Tag className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {(product.category as any)?.name || (product as any).category_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded-md font-semibold flex items-center gap-1",
                    stock > lowStockThreshold 
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                      : stock > 0 
                        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                  )}>
                    {stock > lowStockThreshold && <CheckCircle className="h-3 w-3" />}
                    {stock <= lowStockThreshold && stock > 0 && <AlertCircle className="h-3 w-3" />}
                    {stock === 0 && <AlertCircle className="h-3 w-3" />}
                    {stock}
                  </div>
                </div>

                {product.has_variants && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15">
                    <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.5} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
  );
}, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id &&
         prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
         prevProps.product.name === nextProps.product.name &&
         prevProps.product.price === nextProps.product.price;
});

ProductGridItem.displayName = 'ProductGridItem';

export default ProductGridItem;
