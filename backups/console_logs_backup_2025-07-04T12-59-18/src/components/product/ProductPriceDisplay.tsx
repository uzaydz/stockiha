import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowTrendingDownIcon, 
  TagIcon, 
  CurrencyDollarIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { CompleteProduct, ProductColor, ProductSize, getFinalPrice } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';

interface ProductPriceDisplayProps {
  product: CompleteProduct;
  quantity: number;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  className?: string;
}

const ProductPriceDisplay = memo<ProductPriceDisplayProps>(({ 
  product, 
  quantity, 
  selectedColor, 
  selectedSize,
  className
}) => {
  
  // تحسين حسابات السعر بـ useMemo
  const priceData = useMemo(() => {
    const priceInfo = getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
    const totalPrice = priceInfo.price * quantity;
    const totalOriginalPrice = priceInfo.originalPrice * quantity;
    
    // تنسيق الأسعار
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('ar-DZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price);
    };

    return {
      ...priceInfo,
      totalPrice,
      totalOriginalPrice,
      formattedPrice: formatPrice(priceInfo.price),
      formattedOriginalPrice: formatPrice(priceInfo.originalPrice),
      formattedTotalPrice: formatPrice(totalPrice),
      formattedTotalOriginalPrice: formatPrice(totalOriginalPrice),
      formattedDiscount: priceInfo.discount ? formatPrice(priceInfo.discount * quantity) : null,
      hasDiscount: priceInfo.originalPrice > priceInfo.price,
      discountPercentage: priceInfo.discountPercentage || 0
    };
  }, [product, quantity, selectedColor, selectedSize]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* البطاقة الرئيسية للسعر */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl p-6 space-y-4"
      >
        {/* العنوان */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl">
            <CurrencyDollarIcon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">السعر</h3>
        </div>

        {/* السعر الحالي */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl lg:text-5xl font-bold text-primary">
            {priceData.formattedPrice}
          </span>
          <span className="text-xl font-medium text-primary">دج</span>
          
          {/* السعر الأصلي مع الخصم */}
          {priceData.hasDiscount && (
            <div className="flex items-center gap-2">
              <span className="text-lg text-muted-foreground line-through">
                {priceData.formattedOriginalPrice} دج
              </span>
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                <FireIcon className="w-3 h-3 ml-1" />
                -{priceData.discountPercentage.toFixed(0)}%
              </Badge>
            </div>
          )}
        </div>

        {/* شارة سعر الجملة */}
        {priceData.isWholesale && (
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              <TagIcon className="w-3 h-3 ml-1" />
              سعر الجملة
            </Badge>
          </div>
        )}

        {/* معلومات التوفير */}
        {priceData.hasDiscount && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700">
              <SparklesIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                وفرت {priceData.formattedDiscount} دج من هذا المنتج
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* إجمالي السعر للكمية */}
      {quantity > 1 && (
        <div className="bg-background/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm mb-3">
            <span className="text-muted-foreground">المجموع الإجمالي</span>
            <span className="text-primary font-medium">({quantity} قطع)</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الإجمالي:</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{priceData.formattedTotalPrice}</span>
              <span className="text-lg font-semibold text-primary mr-1">دج</span>
              {priceData.hasDiscount && (
                <div className="text-sm text-muted-foreground line-through">
                  {priceData.formattedTotalOriginalPrice} دج
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border pt-2">
            <span>سعر القطعة الواحدة:</span>
            <span>{priceData.formattedPrice} دج</span>
          </div>
        </div>
      )}
    </div>
  );
});

ProductPriceDisplay.displayName = 'ProductPriceDisplay';

export default ProductPriceDisplay;
