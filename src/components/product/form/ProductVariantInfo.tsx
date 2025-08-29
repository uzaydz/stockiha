import React, { memo } from 'react';
import { ProductColor, ProductSize } from '@/types/productForm';

interface ProductVariantInfoProps {
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  t: (key: string) => string;
}

const ProductVariantInfo = memo<ProductVariantInfoProps>(({ selectedColor, selectedSize, t }) => {
  if (!selectedColor && !selectedSize) return null;
  
  return (
    <div className="bg-background/50 rounded-xl p-4 space-y-2 mb-4">
      {selectedColor && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('orderForm.color')}:</span>
          <span className="font-medium">
            {(selectedColor as any).name || (selectedColor as any).color_name || 'اللون المختار'}
          </span>
          {(selectedColor as any).value && (
            <div 
              className="w-4 h-4 rounded-full border border-border ml-1" 
              style={{ backgroundColor: (selectedColor as any).value }}
            />
          )}
        </div>
      )}
      {selectedSize && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('orderForm.size')}:</span>
          <span className="font-medium">
            {(selectedSize as any).name || (selectedSize as any).size_name || 'المقاس المختار'}
          </span>
        </div>
      )}
    </div>
  );
});

ProductVariantInfo.displayName = 'ProductVariantInfo';

export default ProductVariantInfo;
