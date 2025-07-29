import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface ProductInventoryInfoProps {
  totalStockQuantity: number;
  minStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  stockStatus: string;
  totalStockValue: number;
  lastInventoryUpdate: string;
  StockStatusBadge: React.ReactNode;
}

const ProductInventoryInfo: React.FC<ProductInventoryInfoProps> = React.memo(({
  totalStockQuantity,
  minStockLevel,
  reorderLevel,
  reorderQuantity,
  stockStatus,
  totalStockValue,
  lastInventoryUpdate,
  StockStatusBadge
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        معلومات المخزون
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">إجمالي المخزون</Label>
          <div className="text-lg font-bold">{totalStockQuantity}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">الحد الأدنى</Label>
          <div className="text-lg font-bold">{minStockLevel}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">مستوى إعادة الطلب</Label>
          <div className="text-lg font-bold">{reorderLevel}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">كمية إعادة الطلب</Label>
          <div className="text-lg font-bold">{reorderQuantity}</div>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">حالة المخزون</Label>
          {StockStatusBadge}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">قيمة المخزون</Label>
          <div className="text-lg font-bold text-green-600">
            {totalStockValue.toLocaleString()} د.ج
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">آخر تحديث</Label>
          <div className="text-sm">
            {new Date(lastInventoryUpdate).toLocaleDateString('ar-DZ')}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));

export default ProductInventoryInfo; 