import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Heart,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { ProductItemProps } from '../types';
import ProductImage from '@/components/store/ProductImage';

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

  // معالجة الصور (نفس المنطق السابق لضمان العمل)
  const imageUrl = React.useMemo(() => {
    // ⚡ أولاً: الصورة المحلية Base64 (للعمل Offline)
    if ((product as any).thumbnail_base64 && (product as any).thumbnail_base64.trim()) {
      return (product as any).thumbnail_base64;
    }

    if (product.thumbnail_image && product.thumbnail_image.trim()) {
      return product.thumbnail_image;
    }

    if ((product as any).thumbnailImage && (product as any).thumbnailImage.trim()) {
      return (product as any).thumbnailImage;
    }

    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
        return firstImage;
      }
    }

    if ((product as any).images_base64) {
      try {
        const localImages = JSON.parse((product as any).images_base64);
        if (Array.isArray(localImages) && localImages.length > 0) {
          return localImages[0];
        }
      } catch { }
    }

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
    <Card
      onClick={handleClick}
      className={cn(
        "h-full flex flex-col cursor-pointer overflow-hidden border bg-card shadow-sm",
        "rounded-xl transition-none", // No animation
        isReturnMode
          ? "border-amber-500/30 bg-amber-50/10"
          : "border-border/60 hover:border-primary/40" // Subtle border change only
      )}
    >
      {/* قسم الصورة - ثابت وأنيق */}
      <div className="relative aspect-square w-full bg-muted/10 overflow-hidden border-b border-border/40">
        <ProductImage
          src={imageUrl || ''}
          alt={product.name}
          productName={product.name}
          className="w-full h-full object-cover"
          size="medium"
        />

        {/* شارات الحالة - تصميم بسيط وراقي */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          {isFavorite && (
            <div className="bg-white/90 dark:bg-black/90 p-1.5 rounded-full shadow-sm border border-border/50">
              <Heart className="h-3.5 w-3.5 text-red-500 fill-current" />
            </div>
          )}
          {product.has_variants && (
            <div className="bg-white/90 dark:bg-black/90 p-1.5 rounded-full shadow-sm border border-border/50">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
        </div>

        {/* شارة المخزون - تظهر فقط عند الضرورة القصوى */}
        {(isOutOfStock || isLowStock) && (
          <div className="absolute top-2 left-2 z-10">
            {isOutOfStock ? (
              <Badge variant="destructive" className="h-6 px-2 text-[10px] font-medium shadow-sm">
                نفد
              </Badge>
            ) : (
              <Badge variant="secondary" className="h-6 px-2 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm">
                {stock} متاح
              </Badge>
            )}
          </div>
        )}

        {/* زر الإضافة - يظهر دائماً بشكل أنيق في الزاوية */}
        <div className={cn(
          "absolute bottom-2 right-2 p-2 rounded-lg shadow-md flex items-center justify-center",
          isReturnMode
            ? "bg-amber-500 text-white"
            : "bg-primary text-primary-foreground"
        )}>
          {isReturnMode ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* تفاصيل المنتج - تصميم نظيف واحترافي */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 mb-1">
            {product.name}
          </h3>
          {((product.category as any)?.name || (product as any).category_name) && (
            <p className="text-xs text-muted-foreground font-medium">
              {(product.category as any)?.name || (product as any).category_name}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
          <div className="font-bold text-base text-foreground">
            {product.price?.toLocaleString('ar-DZ')} <span className="text-xs font-normal text-muted-foreground">دج</span>
          </div>

          {/* مؤشر المخزون البسيط للمنتجات المتوفرة */}
          {!isOutOfStock && !isLowStock && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-muted/30 px-1.5 py-0.5 rounded-md">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span>{stock}</span>
            </div>
          )}
        </div>
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
