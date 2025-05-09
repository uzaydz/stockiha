import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Truck, Tag, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductSummaryProps {
  productDetails: any;
  isLoading: boolean;
}

/**
 * Componente para mostrar el resumen del producto con precio y opciones de envío
 * Optimizado con React.memo para evitar renderizados innecesarios
 */
export const ProductSummary: React.FC<ProductSummaryProps> = React.memo(({
  productDetails,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card className="mb-6 border border-border/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="h-px w-full my-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!productDetails) {
    return null;
  }

  // Calcular el precio con descuento si existe
  const hasDiscount = productDetails.compare_at_price && 
    productDetails.compare_at_price > productDetails.price;
  
  const displayPrice = hasDiscount ? productDetails.price : productDetails.price;
  const originalPrice = hasDiscount ? productDetails.compare_at_price : null;
  
  // Calcular el porcentaje de descuento si existe
  const discountPercentage = hasDiscount
    ? Math.round(((productDetails.compare_at_price - productDetails.price) / productDetails.compare_at_price) * 100)
    : 0;

  return (
    <Card className="mb-6 border border-border/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
              {productDetails.thumbnail_image ? (
                <img 
                  src={productDetails.thumbnail_image} 
                  alt={productDetails.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="h-8 w-8 m-2 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">{productDetails.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold">{formatPrice(displayPrice)}</span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(originalPrice)}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm">
                      {discountPercentage}% خصم
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex flex-col gap-2 pt-1 text-sm">
            {productDetails.has_fast_shipping && (
              <div className="flex items-center text-muted-foreground">
                <Truck className="h-4 w-4 ml-2" />
                <span>{productDetails.fast_shipping_text || 'شحن سريع لجميع الولايات (1-3 أيام)'}</span>
              </div>
            )}
            {productDetails.has_money_back && (
              <div className="flex items-center text-muted-foreground">
                <Package className="h-4 w-4 ml-2" />
                <span>{productDetails.money_back_text || 'ضمان استرداد المال خلال 14 يوم'}</span>
              </div>
            )}
            {productDetails.has_quality_guarantee && (
              <div className="flex items-center text-muted-foreground">
                <Tag className="h-4 w-4 ml-2" />
                <span>{productDetails.quality_guarantee_text || 'ضمان جودة المنتج'}</span>
              </div>
            )}
            {!productDetails.has_fast_shipping && !productDetails.has_money_back && !productDetails.has_quality_guarantee && (
              <>
                <div className="flex items-center text-muted-foreground">
                  <Truck className="h-4 w-4 ml-2" />
                  <span>شحن سريع لجميع الولايات (1-3 أيام)</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Package className="h-4 w-4 ml-2" />
                  <span>ضمان استرداد المال خلال 14 يوم</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Tag className="h-4 w-4 ml-2" />
                  <span>ضمان جودة المنتج</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 