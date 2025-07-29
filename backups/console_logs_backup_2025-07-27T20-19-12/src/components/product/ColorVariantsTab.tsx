import React from 'react';
import { Plus, Palette, TrendingUp, Package, Ruler, Star, Sparkles, BarChart3 } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  // حساب الإحصائيات
  const totalQuantity = colors.reduce((sum, color) => sum + color.quantity, 0);
  const colorsWithSizes = colors.filter(c => c.has_sizes).length;
  const totalValue = colors.reduce((sum, color) => sum + (color.price * color.quantity), 0);
  const totalSizes = colors.reduce((sum, color) => sum + (color.sizes?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* شريط التحكم العلوي - مبسط */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
              ألوان المنتج
              {colors.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {colors.length}
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              إدارة الألوان والمتغيرات
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
        <Button 
          onClick={onAddColor}
            className="bg-primary hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="h-4 w-4 ml-2" />
          إضافة لون
        </Button>
          
          {colors.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => {/* يمكن إضافة ميزة استيراد الألوان */}}
              className="border-primary/30 text-primary hover:bg-primary/5"
            >
              <Package className="h-4 w-4 ml-2" />
              استيراد
            </Button>
          )}
        </div>
      </div>

      {/* إعدادات التحكم - مبسطة */}
      <div className="flex flex-col sm:flex-row gap-6 p-6 bg-background border border-border/50 rounded-lg shadow-sm">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
          <Switch
            checked={useVariantPrices}
            onCheckedChange={onUseVariantPricesChange}
            id="use-variant-prices"
            className="data-[state=checked]:bg-primary"
          />
          <div>
            <Label htmlFor="use-variant-prices" className="font-medium text-sm flex items-center gap-2">
              أسعار مختلفة للألوان
              <Badge variant="outline" className="text-xs">اختياري</Badge>
            </Label>
            <p className="text-xs text-muted-foreground">
              سعر مختلف لكل لون
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
          <Switch
            checked={useSizes}
            onCheckedChange={onUseSizesChange}
            id="use-sizes"
            className="data-[state=checked]:bg-primary"
          />
          <div>
            <Label htmlFor="use-sizes" className="font-medium text-sm flex items-center gap-2">
              استخدام المقاسات
              <Badge variant="outline" className="text-xs">متقدم</Badge>
            </Label>
            <p className="text-xs text-muted-foreground">
              مقاسات متعددة لكل لون
            </p>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      {colors.length === 0 ? (
        /* الحالة الفارغة - مبسطة */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Palette className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            لا توجد ألوان
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            أضف الألوان المختلفة لمنتجك لتوفير خيارات للعملاء
          </p>
          <Button 
            onClick={onAddColor}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-5 w-5 ml-2" />
            إضافة أول لون
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* إحصائيات مبسطة */}
          {colors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-background border rounded-lg text-center">
                <div className="text-2xl font-semibold text-foreground">{colors.length}</div>
                <div className="text-sm text-muted-foreground">الألوان</div>
              </div>
              
              <div className="p-4 bg-background border rounded-lg text-center">
                <div className="text-2xl font-semibold text-foreground">{totalQuantity}</div>
                <div className="text-sm text-muted-foreground">الكمية</div>
              </div>
              
              <div className="p-4 bg-background border rounded-lg text-center">
                <div className="text-2xl font-semibold text-foreground">{totalValue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">قيمة المخزون</div>
              </div>
              
              <div className="p-4 bg-background border rounded-lg text-center">
                <div className="text-2xl font-semibold text-foreground">{colorsWithSizes}</div>
                <div className="text-sm text-muted-foreground">بمقاسات</div>
              </div>
              
              {useSizes && totalSizes > 0 && (
                <div className="p-4 bg-background border rounded-lg text-center col-span-2 md:col-span-1">
                  <div className="text-2xl font-semibold text-foreground">{totalSizes}</div>
                  <div className="text-sm text-muted-foreground">إجمالي المقاسات</div>
                </div>
              )}
            </div>
          )}

          {/* شبكة الألوان */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
        </div>
      )}
    </div>
  );
};

export default ColorVariantsTab;
