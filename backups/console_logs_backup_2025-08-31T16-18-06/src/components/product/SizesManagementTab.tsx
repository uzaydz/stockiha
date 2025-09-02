import React, { useState } from 'react';
import { 
  Ruler, Palette, Plus, ArrowLeft, AlertCircle, Eye, BarChart3
} from 'lucide-react';
import { ProductColor, ProductSize } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductSizeManager from './ProductSizeManager';
import { toast } from 'sonner';

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
  loadingSizes?: Record<string, boolean>;
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
  loadingSizes = {},
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview');
  const selectedColor = colors.find(c => c.id === selectedColorId);

  // التحقق من حالة عدم تفعيل المقاسات
  if (!useSizes) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/20">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Ruler className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          المقاسات غير مفعلة
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-base">
          يجب تفعيل استخدام المقاسات أولاً من تبويبة الألوان
        </p>
        <Button onClick={onBackToVariants} variant="outline" size="lg">
          <ArrowLeft className="h-5 w-5 ml-2" />
          العودة للألوان
        </Button>
      </div>
    );
  }

  // حساب إحصائيات المقاسات
  const sizesStats = {
    totalColors: colors.length,
    colorsWithSizes: colors.filter(c => c.has_sizes && c.sizes?.length > 0).length,
    totalSizes: colors.reduce((sum, color) => sum + (color.sizes?.length || 0), 0),
    totalQuantity: colors.reduce((sum, color) => {
      if (color.has_sizes && color.sizes?.length) {
        return sum + color.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0);
      }
      return sum + (color.quantity || 0);
    }, 0),
    lowStockColors: colors.filter(color => {
      const qty = color.has_sizes && color.sizes?.length 
        ? color.sizes.reduce((sum, size) => sum + size.quantity, 0) 
        : color.quantity || 0;
      return qty < 10;
    }).length
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* رأس بسيط */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#fc5d41]/10 rounded-xl flex items-center justify-center">
            <Ruler className="h-6 w-6 text-[#fc5d41]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              إدارة المقاسات
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              إدارة مقاسات ومخزون جميع الألوان
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={onAddColor} className="bg-[#fc5d41] hover:bg-[#fc5d41]/90" size="lg">
            <Plus className="h-5 w-5 ml-2" />
            إضافة لون
          </Button>
          <Button onClick={onBackToVariants} variant="outline" size="lg">
            <ArrowLeft className="h-5 w-5 ml-2" />
            العودة للألوان
          </Button>
        </div>
      </div>

      {/* تبويبات العرض */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            إدارة مقاسات
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* إحصائيات سريعة */}
          {colors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Palette className="h-5 w-5 text-[#fc5d41]" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{sizesStats.totalColors}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">إجمالي الألوان</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Ruler className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{sizesStats.colorsWithSizes}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">بمقاسات</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{sizesStats.totalSizes}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">إجمالي المقاسات</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{sizesStats.lowStockColors}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">مخزون قليل</div>
              </Card>
            </div>
          )}

          {/* قائمة الألوان مع مقاساتها */}
          {colors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/20">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Palette className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                لا توجد ألوان
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-base">
                أضف ألوان أولاً لإدارة مقاساتها
              </p>
              <Button onClick={onAddColor} className="bg-[#fc5d41] hover:bg-[#fc5d41]/90" size="lg">
                <Plus className="h-5 w-5 ml-2" />
                إضافة لون
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                جميع الألوان ومقاساتها
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {colors.map((color) => (
                  <Card 
                    key={color.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-[#fc5d41]/50"
                    onClick={() => {
                      onSelectColor(color.id);
                      setActiveTab('manage');
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
                          style={{ backgroundColor: color.color_code }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {color.name}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {color.has_sizes && color.sizes?.length 
                              ? `${color.sizes.length} مقاس`
                              : 'بدون مقاسات'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">الكمية:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {color.has_sizes && color.sizes?.length 
                              ? color.sizes.reduce((sum, size) => sum + size.quantity, 0)
                              : color.quantity || 0
                            }
                          </span>
                        </div>
                        
                        {color.has_sizes && color.sizes?.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">المقاسات:</div>
                            <div className="flex flex-wrap gap-1">
                              {color.sizes.map((size, index) => (
                                <span 
                                  key={size.id || index}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300"
                                >
                                  {size.size_name}: {size.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="manage" className="space-y-6 mt-6">
          {/* اختيار اللون لإدارة مقاساته */}
          {!selectedColorId ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                اختر لون لإدارة مقاساته
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {colors.map((color) => (
                  <Card 
                    key={color.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-[#fc5d41]/50"
                    onClick={() => onSelectColor(color.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
                          style={{ backgroundColor: color.color_code }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {color.name}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {color.has_sizes && color.sizes?.length 
                              ? `${color.sizes.length} مقاس`
                              : 'بدون مقاسات'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">الكمية:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {color.has_sizes && color.sizes?.length 
                            ? color.sizes.reduce((sum, size) => sum + size.quantity, 0)
                            : color.quantity || 0
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* إدارة مقاسات لون محدد */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={() => onSelectColor(null)}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: selectedColor?.color_code }}
                    />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        مقاسات {selectedColor?.name}
                      </h2>
                      <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                        إدارة المقاسات والمخزون
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* مدير المقاسات */}
              <ProductSizeManager
                sizes={selectedColor?.sizes || []}
                onChange={onSizesChange}
                basePrice={basePrice}
                colorId={selectedColorId}
                productId={productId}
                useVariantPrices={useVariantPrices}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SizesManagementTab;
