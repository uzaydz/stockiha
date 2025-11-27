import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    RotateCcw,
    Plus,
    Star,
    Layers,
    Box,
    AlertCircle,
    CheckCircle2
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

    // معالجة الصور
    const imageUrl = React.useMemo(() => {
        if ((product as any).thumbnail_base64 && (product as any).thumbnail_base64.trim()) return (product as any).thumbnail_base64;
        if (product.thumbnail_image && product.thumbnail_image.trim()) return product.thumbnail_image;
        if ((product as any).thumbnailImage && (product as any).thumbnailImage.trim()) return (product as any).thumbnailImage;
        if (product.images && Array.isArray(product.images) && product.images.length > 0) return product.images[0];
        if ((product as any).images_base64) {
            try {
                const localImages = JSON.parse((product as any).images_base64);
                if (Array.isArray(localImages) && localImages.length > 0) return localImages[0];
            } catch { }
        }
        if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
            for (const color of product.colors) {
                if (color.image_url && color.image_url.trim()) return color.image_url;
            }
        }
        return null;
    }, [product]);

    return (
        <div
            onClick={handleClick}
            dir="rtl"
            className={cn(
                "group relative cursor-pointer h-full flex flex-col",
                "bg-white dark:bg-zinc-900 rounded-xl overflow-hidden",
                "border border-zinc-200 dark:border-zinc-800",
                "shadow-sm hover:shadow-lg hover:border-primary/50",
                "transition-all duration-200 ease-in-out",
                "active:scale-[0.98]",
                stock === 0 && "opacity-75 grayscale-[0.3]",
                isReturnMode && "ring-2 ring-amber-500 border-amber-500"
            )}
        >
            {/* قسم الصورة */}
            <div className="relative h-32 sm:h-40 w-full bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
                <ProductImage
                    src={imageUrl || ''}
                    alt={product.name}
                    productName={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    size="medium"
                />

                {/* تدرج لوني لتحسين قراءة النصوص فوق الصورة */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* السعر - يظهر فوق الصورة بشكل بارز */}
                <div className="absolute bottom-2 left-2 z-10">
                    <div className={cn(
                        "px-2.5 py-1 rounded-lg font-bold text-sm shadow-sm backdrop-blur-md",
                        isReturnMode
                            ? "bg-amber-500 text-white"
                            : "bg-white/95 text-zinc-900 dark:bg-zinc-950/90 dark:text-white"
                    )}>
                        {product.price?.toLocaleString('ar-DZ')}
                        <span className="text-[10px] font-normal mr-1 opacity-80">دج</span>
                    </div>
                </div>

                {/* شارة المفضل */}
                {isFavorite && (
                    <div className="absolute top-2 right-2 z-10">
                        <div className="p-1.5 rounded-full bg-amber-400/90 text-white shadow-sm backdrop-blur-sm">
                            <Star className="h-3.5 w-3.5 fill-current" />
                        </div>
                    </div>
                )}

                {/* شارة المتغيرات */}
                {product.has_variants && (
                    <div className="absolute top-2 left-2 z-10">
                        <div className="p-1.5 rounded-md bg-black/40 text-white backdrop-blur-sm border border-white/10">
                            <Layers className="h-3.5 w-3.5" />
                        </div>
                    </div>
                )}

                {/* طبقة التفاعل عند التحويم */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-200",
                        isReturnMode ? "bg-amber-500 text-white" : "bg-primary text-white"
                    )}>
                        {isReturnMode ? <RotateCcw className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
                    </div>
                </div>
            </div>

            {/* قسم المعلومات */}
            <div className="flex-1 p-3 flex flex-col gap-2">
                {/* اسم المنتج */}
                <div className="flex-1">
                    <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    {((product.category as any)?.name || (product as any).category_name) && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate font-medium">
                            {(product.category as any)?.name || (product as any).category_name}
                        </p>
                    )}
                </div>

                {/* شريط الحالة والمخزون */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                    {isOutOfStock ? (
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md w-full justify-center">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold">نفد المخزون</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className={cn(
                                "flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md",
                                isLowStock
                                    ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                                    : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                            )}>
                                <Box className="h-3.5 w-3.5" />
                                <span>{stock}</span>
                            </div>

                            {/* مؤشر مرئي للمخزون */}
                            <div className="flex gap-0.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", stock > 0 ? (isLowStock ? "bg-amber-500" : "bg-emerald-500") : "bg-zinc-200")} />
                                <div className={cn("w-1.5 h-1.5 rounded-full", stock > 5 ? (isLowStock ? "bg-amber-500" : "bg-emerald-500") : "bg-zinc-200 dark:bg-zinc-700")} />
                                <div className={cn("w-1.5 h-1.5 rounded-full", stock > 10 ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700")} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.product.id === nextProps.product.id &&
        prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
        prevProps.product.name === nextProps.product.name &&
        prevProps.product.price === nextProps.product.price &&
        prevProps.isReturnMode === nextProps.isReturnMode;
});

ProductGridItem.displayName = 'ProductGridItem';

export default ProductGridItem;
