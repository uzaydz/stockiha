import React from 'react';
import { Card } from '@/components/ui/card';

interface ProductInventorySummaryProps {
  totalStock: number;
  variantsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

const ProductInventorySummary: React.FC<ProductInventorySummaryProps> = React.memo(({ totalStock, variantsCount, lowStockCount, outOfStockCount }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <Card className="p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{totalStock}</div>
        <div className="text-xs text-muted-foreground">إجمالي المخزون</div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{variantsCount}</div>
        <div className="text-xs text-muted-foreground">المتغيرات</div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
        <div className="text-xs text-muted-foreground">منخفض المخزون</div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
        <div className="text-xs text-muted-foreground">نفذ من المخزون</div>
      </div>
    </Card>
  </div>
));

export default ProductInventorySummary;
