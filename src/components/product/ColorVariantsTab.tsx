import React from 'react';
import { Plus, Palette, Settings } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ColorCard from './ColorCard';

interface ColorVariantsTabProps {
  colors: ProductColor[];
  onAddColor: () => void;
  onEditColor: (color: ProductColor) => void;
  onDeleteColor: (colorId: string) => void;
  onManageSizes?: (colorId: string) => void;
  useVariantPrices: boolean;
  onUseVariantPricesChange: (useVariantPrices: boolean) => void;
  useSizes: boolean;
  onUseSizesChange: (useSizes: boolean) => void;
  basePrice?: number;
  basePurchasePrice?: number;
}

const ColorVariantsTab: React.FC<ColorVariantsTabProps> = ({
  colors,
  onAddColor,
  onEditColor,
  onDeleteColor,
  onManageSizes,
  useVariantPrices,
  onUseVariantPricesChange,
  useSizes,
  onUseSizesChange,
  basePrice,
  basePurchasePrice,
}) => {
  return (
    <div className="space-y-6">
      {/* إعدادات المنتج */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">إعدادات المنتج</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="use-variant-prices" className="font-medium">
                  أسعار متغيرة
                </Label>
                <p className="text-sm text-muted-foreground">
                  سعر مختلف لكل لون
                </p>
              </div>
            </div>
            <Switch
              checked={useVariantPrices}
              onCheckedChange={onUseVariantPricesChange}
              id="use-variant-prices"
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="use-sizes" className="font-medium">
                  إدارة المقاسات
                </Label>
                <p className="text-sm text-muted-foreground">
                  مقاسات متعددة للألوان
                </p>
              </div>
            </div>
            <Switch
              checked={useSizes}
              onCheckedChange={onUseSizesChange}
              id="use-sizes"
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* قائمة الألوان */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            الألوان ({colors.length})
          </h3>
          <Button onClick={onAddColor} size="sm">
            <Plus className="h-4 w-4 ml-2" />
            إضافة لون
          </Button>
        </div>
        
        {colors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Palette className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              لا توجد ألوان بعد
            </h3>
            <p className="text-muted-foreground mb-4">
              أضف الألوان المختلفة لمنتجك
            </p>
            <Button onClick={onAddColor}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة أول لون
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colors.map((color) => (
              <ColorCard
                key={color.id}
                color={color}
                onEdit={onEditColor}
                onDelete={onDeleteColor}
                onManageSizes={onManageSizes}
                useSizes={useSizes}
                useVariantPrices={useVariantPrices}
                basePrice={basePrice}
                basePurchasePrice={basePurchasePrice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorVariantsTab;