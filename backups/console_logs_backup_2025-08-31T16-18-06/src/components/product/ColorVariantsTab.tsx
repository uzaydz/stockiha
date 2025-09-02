import React from 'react';
import { Plus, Palette } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
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
    <div className="space-y-8" dir="rtl">
      {/* رأس بسيط */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#fc5d41]/10 rounded-xl flex items-center justify-center">
            <Palette className="h-6 w-6 text-[#fc5d41]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              الألوان والمقاسات
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              إدارة المتغيرات والمخزون
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onAddColor}
          size="lg"
          className="bg-[#fc5d41] hover:bg-[#fc5d41]/90 text-white px-6"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة لون
        </Button>
      </div>

      {/* إعدادات بسيطة */}
      <Card className="p-6 border-2 border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          إعدادات المنتج
        </h3>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#fc5d41]/10 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-[#fc5d41] rounded"></div>
              </div>
              <div>
                <Label htmlFor="use-variant-prices" className="text-base font-medium text-gray-900 dark:text-white">
                  أسعار متغيرة
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  سعر مختلف لكل لون
                </p>
              </div>
            </div>
            <Switch
              checked={useVariantPrices}
              onCheckedChange={onUseVariantPricesChange}
              id="use-variant-prices"
              className="data-[state=checked]:bg-[#fc5d41] scale-110"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#fc5d41]/10 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-[#fc5d41] rounded"></div>
              </div>
              <div>
                <Label htmlFor="use-sizes" className="text-base font-medium text-gray-900 dark:text-white">
                  إدارة المقاسات
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  مقاسات متعددة للألوان
                </p>
              </div>
            </div>
            <Switch
              checked={useSizes}
              onCheckedChange={onUseSizesChange}
              id="use-sizes"
              className="data-[state=checked]:bg-[#fc5d41] scale-110"
            />
          </div>
        </div>
      </Card>

      {/* قائمة الألوان */}
      {colors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/20">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <Palette className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            لا توجد ألوان بعد
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-base">
            أضف الألوان المختلفة لمنتجك لتوفير خيارات متنوعة للعملاء
          </p>
          <Button 
            onClick={onAddColor}
            size="lg"
            className="bg-[#fc5d41] hover:bg-[#fc5d41]/90 px-8"
          >
            <Plus className="h-5 w-5 ml-2" />
            إضافة أول لون
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              الألوان ({colors.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
