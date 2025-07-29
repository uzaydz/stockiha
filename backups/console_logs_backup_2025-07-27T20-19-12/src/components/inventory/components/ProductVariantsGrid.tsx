import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ProductVariantsGridProps {
  variants: any[];
  productId: string;
  useSizes: boolean;
  onEdit: (variantId?: string, currentQuantity?: number) => void;
  VariantCardComponent: React.ComponentType<any>;
}

const ProductVariantsGrid: React.FC<ProductVariantsGridProps> = React.memo(({ variants, productId, useSizes, onEdit, VariantCardComponent }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {useSizes ? <span>المقاسات</span> : <span>الألوان</span>}
        <Badge variant="secondary">{variants.length}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {variants.map((variant, index) => (
          <VariantCardComponent
            key={index}
            variant={variant}
            productId={productId}
            onEdit={onEdit}
          />
        ))}
      </div>
    </CardContent>
  </Card>
));

export default ProductVariantsGrid; 