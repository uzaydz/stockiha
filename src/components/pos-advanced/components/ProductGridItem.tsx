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

  // معالجة محسّنة للصور مع دعم جميع الحالات + دعم Offline (Base64)
  const imageUrl = React.useMemo(() => {
    // 🔍 DEBUG: عرض حالة الصور للمنتج
    const hasBase64 = !!(product as any).thumbnail_base64;
    const hasThumbnail = !!product.thumbnail_image;
    const hasImages = !!(product.images && Array.isArray(product.images) && product.images.length > 0);

    // Log only for products that should have images (just created or have any image field)
    if (hasBase64 || hasThumbnail || hasImages) {
      console.log(`[ProductGridItem] 🔍 ${product.name} (${product.id.substring(0, 8)}): base64=${hasBase64 ? `${Math.round(String((product as any).thumbnail_base64).length/1024)}KB` : 'NO'}, thumbnail=${hasThumbnail ? 'YES' : 'NO'}, images=${hasImages ? product.images!.length : 0}`);
    }

    // ⚡ أولاً: الصورة المحلية Base64 (للعمل Offline)
    if ((product as any).thumbnail_base64 && (product as any).thumbnail_base64.trim()) {
      console.log(`[ProductGridItem] 🖼️ ✅ Using thumbnail_base64 for ${product.name} (${Math.round(String((product as any).thumbnail_base64).length/1024)}KB)`);
      return (product as any).thumbnail_base64;
    }

    // محاولة استخدام thumbnail_image
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

    // ⚡ التحقق من الصور المحلية الإضافية (Base64)
    if ((product as any).images_base64) {
      try {
        const localImages = JSON.parse((product as any).images_base64);
        if (Array.isArray(localImages) && localImages.length > 0) {
          return localImages[0];
        }
      } catch {}
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
      "group relative cursor-pointer overflow-hidden h-full flex flex-col z-0",
      "rounded-2xl border bg-gradient-to-b transition-all duration-300",
      "hover:shadow-xl hover:shadow-primary/5 hover:z-[5]",
      stock > 0
        ? "from-card to-card/80 border-border/50 hover:border-primary/30 hover:-translate-y-1 hover:shadow-2xl"
        : "from-muted/30 to-muted/20 border-muted opacity-75",
      isReturnMode && "border-amber-500/40 hover:border-amber-500/60 ring-1 ring-amber-500/20"
    )}>
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]" />

      <div onClick={handleClick} className="h-full flex flex-col relative">
        {/* صورة المنتج */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/40 to-muted/20 overflow-hidden rounded-t-2xl">
          <ProductImage
            src={imageUrl || ''}
            alt={product.name}
            productName={product.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
            size="large"
          />

          {/* طبقة تفاعلية محسّنة */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

          {/* شارات الحالة */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-[2]">
            {isFavorite && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-0 flex items-center gap-1">
                <Heart className="h-3 w-3 fill-current" />
                <span>مفضل</span>
              </Badge>
            )}
            {isOutOfStock && (
              <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border-0 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>نفد</span>
              </Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-0 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>قليل</span>
              </Badge>
            )}
          </div>

          {/* مؤشر الإضافة المحسّن */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-[2]">
            <div className={cn(
              "p-4 rounded-2xl backdrop-blur-md shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300",
              isReturnMode
                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white ring-2 ring-white/30"
                : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-white/30"
            )}>
              {isReturnMode ? (
                <RotateCcw className="h-6 w-6" strokeWidth={2.5} />
              ) : (
                <ShoppingCart className="h-6 w-6" strokeWidth={2.5} />
              )}
            </div>
          </div>

          {/* شارة السعر المحسّنة */}
          <div className="absolute bottom-3 left-3 z-[2]">
            <div className={cn(
              "px-3 py-1.5 rounded-xl font-bold text-sm backdrop-blur-md shadow-xl border transition-all duration-300",
              isReturnMode
                ? "bg-gradient-to-r from-amber-500/95 to-orange-500/95 text-white border-white/20"
                : "bg-card/95 text-foreground border-border/50 group-hover:bg-primary/95 group-hover:text-primary-foreground group-hover:border-primary/30"
            )}>
              {product.price?.toLocaleString('ar-DZ')} دج
            </div>
          </div>
        </div>

        {/* معلومات المنتج */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-card/50 to-transparent">
          <div className="space-y-2.5">
            <div>
              <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-300">
                {product.name}
              </h3>
              {((product.category as any)?.name || (product as any).category_name) && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-muted/80 to-muted/60 border border-border/40 shadow-sm">
                  <Tag className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                  <span className="text-xs text-muted-foreground font-semibold">
                    {(product.category as any)?.name || (product as any).category_name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-sm border transition-all duration-300",
                  stock > lowStockThreshold
                    ? "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : stock > 0
                      ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                      : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 text-red-700 dark:text-red-400 border-red-500/30"
                )}>
                  {stock > lowStockThreshold && <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  {stock <= lowStockThreshold && stock > 0 && <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  {stock === 0 && <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  <span>{stock} متاح</span>
                </div>
              </div>

              {product.has_variants && (
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
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
