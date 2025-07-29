import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package2,
  RotateCcw,
  ShoppingCart,
  Star
} from 'lucide-react';
import { ProductItemProps } from '../types';

const ProductListItem: React.FC<ProductItemProps> = ({ 
  product, 
  favoriteProducts, 
  isReturnMode, 
  onAddToCart 
}) => {
  const stock = product.stock_quantity || 0;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= ((product as any).low_stock_threshold || 10);
  const isFavorite = favoriteProducts.some(fav => fav.id === product.id);

  const handleClick = useCallback(() => {
    onAddToCart(product);
  }, [product, onAddToCart]);

  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-300 hover:shadow-md",
      isReturnMode 
        ? "border-orange-200 hover:border-orange-300 bg-gradient-to-r from-orange-50/30 to-background hover:from-orange-50/50" 
        : "border-border hover:border-primary/30",
      isOutOfStock && "opacity-60"
    )}>
      <CardContent 
        className="p-3"
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          {/* صورة مصغرة */}
          <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
            {(product.thumbnail_image || product.thumbnailImage || (product.images && product.images[0])) ? (
              <img 
                src={product.thumbnail_image || product.thumbnailImage || (product.images && product.images[0])} 
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              (product.thumbnail_image || product.thumbnailImage || (product.images && product.images[0])) ? "hidden" : ""
            )}>
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* معلومات المنتج */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {(product.category as any)?.name || (product as any).category_name || 'غير محدد'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-primary">
                  {product.price?.toLocaleString()} دج
                </div>
                <div className="text-xs text-muted-foreground">
                  مخزون: {stock}
                </div>
              </div>
            </div>

            {/* شارات الحالة */}
            <div className="flex items-center gap-1 mt-2">
              {isFavorite && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  مفضل
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">
                  نفد المخزون
                </Badge>
              )}
              {isLowStock && (
                <Badge className="bg-yellow-500 text-white text-xs">
                  مخزون منخفض
                </Badge>
              )}
              {product.has_variants && (
                <Badge variant="outline" className="text-xs">
                  متغيرات
                </Badge>
              )}
            </div>
          </div>

          {/* أيقونة الإضافة */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isReturnMode ? (
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductListItem; 