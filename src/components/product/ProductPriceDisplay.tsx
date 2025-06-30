import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CompleteProduct, ProductColor, ProductSize, getFinalPrice } from '@/lib/api/productComplete';

interface ProductPriceDisplayProps {
  product: CompleteProduct;
  quantity: number;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
}

const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({ 
  product, 
  quantity, 
  selectedColor, 
  selectedSize 
}) => {
  const priceInfo = useMemo(() => {
    return getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
  }, [product, quantity, selectedColor, selectedSize]);

  const totalPrice = priceInfo.price * quantity;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline space-x-2 space-x-reverse">
        <span className="text-3xl font-bold text-green-600">
          {priceInfo.price.toLocaleString()} دج
        </span>
        
        {priceInfo.originalPrice > priceInfo.price && (
          <span className="text-lg text-gray-500 line-through">
            {priceInfo.originalPrice.toLocaleString()} دج
          </span>
        )}
        
        {priceInfo.isWholesale && (
          <Badge variant="secondary" className="text-xs">
            سعر الجملة
          </Badge>
        )}
      </div>
      
      {quantity > 1 && (
        <div className="text-sm text-gray-600">
          المجموع: <span className="font-semibold text-lg text-green-600">
            {totalPrice.toLocaleString()} دج
          </span>
        </div>
      )}

      {priceInfo.discount && priceInfo.discount > 0 && (
        <div className="text-sm text-green-600">
          وفرت: {priceInfo.discount.toLocaleString()} دج 
          ({priceInfo.discountPercentage?.toFixed(1)}%)
        </div>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
