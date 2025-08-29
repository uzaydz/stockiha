import React, { memo } from 'react';
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';

interface ProductImageSectionProps {
  product: any;
  selectedColor?: any;
  className?: string;
}

/**
 * مكون قسم الصور المحسن للأداء
 * - يستخدم memo لمنع re-renders غير الضرورية
 * - يحتوي فقط على معرض الصور
 */
export const ProductImageSection = memo<ProductImageSectionProps>(({
  product,
  selectedColor,
  className = "lg:sticky lg:top-28"
}) => {
  return (
    <div className={className}>
      <ProductImageGalleryV2 
        product={product} 
        selectedColor={selectedColor}
      />
    </div>
  );
});

ProductImageSection.displayName = 'ProductImageSection';
