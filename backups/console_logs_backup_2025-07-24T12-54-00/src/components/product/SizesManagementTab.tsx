import React, { useState } from 'react';
import { Ruler, Palette, Plus, Check, ArrowLeft } from 'lucide-react';
import { ProductColor, ProductSize } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProductSizeManager from './ProductSizeManager';

interface SizesManagementTabProps {
  colors: ProductColor[];
  selectedColorId: string | null;
  onSelectColor: (colorId: string | null) => void;
  onSizesChange: (sizes: ProductSize[]) => void;
  onBackToVariants: () => void;
  onAddColor: () => void;
  onChange: (colors: ProductColor[]) => void;
  useSizes: boolean;
  basePrice: number;
  productId: string;
  useVariantPrices: boolean;
}

const SizesManagementTab: React.FC<SizesManagementTabProps> = ({
  colors,
  selectedColorId,
  onSelectColor,
  onSizesChange,
  onBackToVariants,
  onAddColor,
  onChange,
  useSizes,
  basePrice,
  productId,
  useVariantPrices,
}) => {
  const selectedColor = colors.find(c => c.id === selectedColorId);

  // التحقق من حالة عدم تفعيل المقاسات
  if (!useSizes) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <Ruler className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            المقاسات غير مفعلة
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            يجب تفعيل استخدام المقاسات أولاً من تبويبة الألوان والمتغيرات
          </p>
          <Button
            variant="outline"
            onClick={onBackToVariants}
            className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border-primary/30 dark:border-primary/40 text-primary dark:text-primary"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة للألوان
          </Button>
        </CardContent>
      </Card>
    );
  }

  // التحقق من حالة عدم وجود ألوان
  if (colors.length === 0) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <Palette className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            لا توجد ألوان
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            يجب إضافة لون واحد على الأقل قبل إدارة المقاسات
          </p>
          <div className="flex gap-3">
            <Button
              onClick={onAddColor}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة لون
            </Button>
            <Button
              variant="outline"
              onClick={onBackToVariants}
              className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border-primary/30 dark:border-primary/40 text-primary dark:text-primary"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة للألوان
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Ruler className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">إدارة المقاسات</h3>
                <p className="text-sm text-muted-foreground">
                  إدارة المقاسات المختلفة لكل لون من ألوان المنتج
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={onBackToVariants}
              className="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة للألوان
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* اختيار اللون */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Palette className="h-5 w-5" />
            اختر اللون لإدارة مقاساته
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {colors.map((color) => (
              <button
                key={color.id}
                className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-right ${
                  selectedColorId === color.id
                    ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg ring-2 ring-primary/30 scale-105'
                    : 'border-border hover:border-primary/50 hover:shadow-md hover:bg-card/50 dark:hover:bg-card/30 hover:scale-102'
                }`}
                onClick={() => {
                  onSelectColor(color.id);
                  // تحديث has_sizes للون المحدد إذا لم يكن مفعلاً
                  if (!color.has_sizes) {
                    const updatedColors = colors.map(c => 
                      c.id === color.id ? { ...c, has_sizes: true } : c
                    );
                    onChange(updatedColors);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {color.image_url ? (
                      <div className="relative w-12 h-12">
                        <img 
                          src={color.image_url} 
                          alt={color.name} 
                          className="w-full h-full object-cover rounded-lg border-2 border-white dark:border-gray-700 shadow-sm"
                        />
                        <div 
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700"
                          style={{ backgroundColor: color.color_code }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-white dark:border-gray-700 shadow-sm flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: color.color_code }}
                      >
                        {color.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{color.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {color.has_sizes ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          مقاسات مفعلة
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">بدون مقاسات</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      الكمية: {color.quantity} | السعر: {color.price} دج
                    </div>
                  </div>
                  
                  {selectedColorId === color.id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* حلقة متحركة للون المحدد */}
                {selectedColorId === color.id && (
                  <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse opacity-50"></div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* إدارة المقاسات للون المحدد */}
      {selectedColorId && selectedColor && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-primary" />
                  مقاسات {selectedColor.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  إدارة المقاسات المختلفة وكمياتها لهذا اللون
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectColor(null)}
                  className="bg-muted/50 hover:bg-muted"
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>
            
            {/* معلومات اللون المحدد */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/20 mt-4">
              <div className="relative">
                {selectedColor.image_url ? (
                  <img 
                    src={selectedColor.image_url} 
                    alt={selectedColor.name} 
                    className="w-16 h-16 object-cover rounded-lg border-2 border-white dark:border-gray-700 shadow-sm"
                  />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-lg border-2 border-white dark:border-gray-700 shadow-sm flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedColor.color_code }}
                  >
                    {selectedColor.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-bold text-lg text-foreground">{selectedColor.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-white dark:border-gray-700"
                    style={{ backgroundColor: selectedColor.color_code }}
                  />
                  <span className="text-sm text-muted-foreground font-mono">{selectedColor.color_code}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="text-sm">
                  السعر: {selectedColor.price} دج
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  الكمية: {selectedColor.quantity}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ProductSizeManager
              sizes={selectedColor.sizes || []}
              onChange={onSizesChange}
              basePrice={selectedColor.price || basePrice}
              colorId={selectedColorId}
              productId={productId}
              useVariantPrices={useVariantPrices}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SizesManagementTab;
