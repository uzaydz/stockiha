import React, { useState } from 'react';
import { 
  Ruler, Palette, Plus, ArrowLeft, AlertCircle, Eye, BarChart3, Settings
} from 'lucide-react';
import { ProductColor, ProductSize } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Ruler className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          المقاسات غير مفعلة
        </h3>
        <p className="text-muted-foreground mb-4">
          يجب تفعيل استخدام المقاسات أولاً من إعدادات المنتج
        </p>
        <Button onClick={onBackToVariants} variant="outline">
          <ArrowLeft className="h-4 w-4 ml-2" />
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
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Ruler className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">إدارة المقاسات</h2>
            <p className="text-sm text-muted-foreground">
              إدارة مقاسات ومخزون جميع الألوان
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onAddColor} size="sm">
            <Plus className="h-4 w-4 ml-2" />
            إضافة لون
          </Button>
          <Button onClick={onBackToVariants} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
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
        
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* إحصائيات سريعة */}
          {colors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Palette className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xl font-bold">{sizesStats.totalColors}</div>
                <div className="text-xs text-muted-foreground">الألوان</div>
              </Card>
              
              <Card className="p-3 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Ruler className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xl font-bold">{sizesStats.colorsWithSizes}</div>
                <div className="text-xs text-muted-foreground">بمقاسات</div>
              </Card>
              
              <Card className="p-3 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-bold">{sizesStats.totalSizes}</div>
                <div className="text-xs text-muted-foreground">المقاسات</div>
              </Card>
              
              <Card className="p-3 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-xl font-bold">{sizesStats.lowStockColors}</div>
                <div className="text-xs text-muted-foreground">مخزون قليل</div>
              </Card>
            </div>
          )}

          {/* قائمة الألوان مع مقاساتها */}
          {colors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Palette className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                لا توجد ألوان
              </h3>
              <p className="text-muted-foreground mb-4">
                أضف ألوان أولاً لإدارة مقاساتها
              </p>
              <Button onClick={onAddColor}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة لون
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  جميع الألوان ومقاساتها
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {colors.map((color) => (
                  <Card 
                    key={color.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      onSelectColor(color.id);
                      setActiveTab('manage');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg border shadow-sm"
                          style={{ backgroundColor: color.color_code }}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{color.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {color.has_sizes && color.sizes?.length 
                              ? `${color.sizes.length} مقاس`
                              : 'بدون مقاسات'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">الكمية:</span>
                          <span className="font-medium">
                            {color.has_sizes && color.sizes?.length 
                              ? color.sizes.reduce((sum, size) => sum + size.quantity, 0)
                              : color.quantity || 0
                            }
                          </span>
                        </div>
                        
                        {color.has_sizes && color.sizes?.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground mb-1">المقاسات:</div>
                            <div className="flex flex-wrap gap-1">
                              {color.sizes.map((size, index) => (
                                <span 
                                  key={size.id || index}
                                  className="text-xs px-2 py-1 bg-muted rounded"
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
        
        <TabsContent value="manage" className="space-y-6 mt-4">
          {/* اختيار اللون لإدارة مقاساته */}
          {!selectedColorId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  اختر لون لإدارة مقاساته
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {colors.map((color) => (
                  <Card 
                    key={color.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelectColor(color.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg border shadow-sm"
                          style={{ backgroundColor: color.color_code }}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{color.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {color.has_sizes && color.sizes?.length 
                              ? `${color.sizes.length} مقاس`
                              : 'بدون مقاسات'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">الكمية:</span>
                        <span className="font-medium">
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
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onSelectColor(null)}
                    className="p-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl border shadow-sm"
                      style={{ backgroundColor: selectedColor?.color_code }}
                    />
                    <div>
                      <h2 className="text-xl font-bold">
                        مقاسات {selectedColor?.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
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