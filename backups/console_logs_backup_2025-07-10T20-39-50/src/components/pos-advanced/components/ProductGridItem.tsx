import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
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

  const imageUrl = product.thumbnail_image || (product.images && product.images[0]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className={cn(
        "group cursor-pointer transition-all duration-300 overflow-hidden h-full flex flex-col",
        "border-0 shadow-sm hover:shadow-xl",
        isReturnMode 
          ? "ring-2 ring-orange-300 hover:ring-orange-400 bg-gradient-to-br from-orange-50/40 to-orange-100/20 hover:shadow-orange-200/30" 
          : "ring-1 ring-border hover:ring-primary/30 bg-gradient-to-br from-background to-background/80 backdrop-blur-sm hover:shadow-primary/5",
        isOutOfStock && "opacity-60 grayscale-[0.3]",
        isLowStock && !isReturnMode && "ring-yellow-300",
        isLowStock && isReturnMode && "ring-orange-400"
      )}>
        <div onClick={handleClick} className="h-full flex flex-col">
          {/* صورة المنتج مع تحسينات حديثة */}
          <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/80 overflow-hidden">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60",
              imageUrl ? 'hidden' : ''
            )}>
              <Package2 className="h-12 w-12 text-muted-foreground/50" />
            </div>
            
            {/* طبقة تفاعلية */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
            
            {/* شارات الحالة المحسنة للتباين */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              {isFavorite && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center"
                >
                  <Badge className="bg-yellow-500/95 text-white text-xs backdrop-blur-md border-2 border-yellow-400/30 shadow-2xl ring-1 ring-black/10">
                    <Heart className="h-3 w-3 fill-current" />
                  </Badge>
                </motion.div>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs backdrop-blur-md shadow-2xl border-2 border-white/20 dark:border-gray-800/20 ring-1 ring-black/10 dark:ring-white/10">
                  نفد المخزون
                </Badge>
              )}
              {isLowStock && (
                <Badge className="bg-yellow-500/95 text-white text-xs backdrop-blur-md shadow-2xl border-2 border-yellow-400/30 ring-1 ring-black/10">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  قليل
                </Badge>
              )}
            </div>

            {/* مؤشر الإضافة المحسن */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "p-3 rounded-full backdrop-blur-sm border shadow-xl",
                  isReturnMode 
                    ? "bg-orange-500/90 border-orange-400/50 text-white" 
                    : "bg-primary/90 border-primary-foreground/20 text-primary-foreground"
                )}
              >
                {isReturnMode ? (
                  <RotateCcw className="h-5 w-5 animate-spin" style={{ animationDuration: '2s' }} />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
              </motion.div>
            </div>

            {/* شارة السعر العائمة المحسنة بتباين عالي */}
            <div className="absolute bottom-3 left-3">
              <Badge 
                className="text-sm font-bold !bg-white/95 dark:!bg-gray-900/95 !text-gray-900 dark:!text-gray-100 backdrop-blur-md shadow-2xl border-2 border-gray-300/50 dark:border-gray-600/50 ring-1 ring-black/20 dark:ring-white/20"
                style={{ 
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.1)' 
                }}
              >
                {product.price?.toLocaleString()} دج
              </Badge>
            </div>
          </div>

          {/* معلومات المنتج المحسنة */}
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                  {product.name}
                </h3>
                {((product.category as any)?.name || (product as any).category_name) && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {(product.category as any)?.name || (product as any).category_name}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                    stock > lowStockThreshold 
                      ? "bg-green-100 text-green-700" 
                      : stock > 0 
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  )}>
                    {stock > lowStockThreshold && <CheckCircle className="h-3 w-3" />}
                    {stock <= lowStockThreshold && stock > 0 && <AlertCircle className="h-3 w-3" />}
                    {stock === 0 && <AlertCircle className="h-3 w-3" />}
                    {stock} قطعة
                  </div>
                </div>

                {product.has_variants && (
                  <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    متغيرات
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id &&
         prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
         prevProps.product.name === nextProps.product.name &&
         prevProps.product.price === nextProps.product.price;
});

ProductGridItem.displayName = 'ProductGridItem';

export default ProductGridItem; 