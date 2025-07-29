import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Edit3, Eye } from 'lucide-react';

interface VariantCardProps {
  variant: any;
  productId: string;
  onEdit: (variantId?: string, currentQuantity?: number) => void;
}

const VariantCard: React.FC<VariantCardProps> = React.memo(({ variant, productId, onEdit }) => {
  const isSimple = variant.type === 'simple';
  const isColorWithSizes = variant.type === 'color_with_sizes';

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {!isSimple && variant.color_code && (
              <div 
                className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
                style={{ backgroundColor: variant.color_code }}
                title={variant.color_name}
              />
            )}
            <div>
              <h4 className="font-medium text-sm">
                {variant.name || variant.color_name || 'متغير'}
              </h4>
              {variant.barcode && (
                <p className="text-xs text-muted-foreground mt-1">
                  باركود: {variant.barcode}
                </p>
              )}
            </div>
          </div>
          {/* يمكن تمرير شارة الحالة هنا إذا لزم */}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-primary">
              {isColorWithSizes ? variant.color_quantity : variant.quantity}
            </div>
            <div className="text-xs text-muted-foreground">الكمية الحالية</div>
          </div>
          {variant.price && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {variant.price} د.ج
              </div>
              <div className="text-xs text-muted-foreground">السعر</div>
            </div>
          )}
        </div>

        {/* عرض المقاسات إذا وجدت */}
        {isColorWithSizes && variant.sizes && variant.sizes.length > 0 && (
          <div className="space-y-2 mb-3">
            <Label className="text-xs font-medium text-muted-foreground">المقاسات:</Label>
            <div className="grid grid-cols-2 gap-2">
              {variant.sizes.map((size: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background border rounded">
                  <span className="text-xs font-medium">{size.size_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{size.quantity}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onEdit(size.size_id, size.quantity)}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onEdit(
              isSimple ? undefined : variant.color_id,
              isColorWithSizes ? variant.color_quantity : variant.quantity
            )}
          >
            <Edit3 className="w-3 h-3 mr-1" />
            تعديل
          </Button>
          {variant.color_image && (
            <Button size="sm" variant="outline">
              <Eye className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default VariantCard; 