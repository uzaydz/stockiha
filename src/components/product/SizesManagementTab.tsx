import React, { useState } from 'react';
import { 
  Ruler, Palette, Plus, ArrowLeft, AlertCircle, Eye, BarChart3, Settings, Package
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
  onAddColor: (e?: React.MouseEvent) => void;
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
        <Button type="button" onClick={onBackToVariants} variant="outline">
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
    <div className="space-y-4">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" onClick={onBackToVariants} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">إدارة المقاسات</h2>
            <p className="text-sm text-muted-foreground">
              إدارة مقاسات ومخزون جميع الألوان
            </p>
          </div>
        </div>
        
        <Button type="button" onClick={(e) => onAddColor(e)} size="sm">
          <Plus className="h-4 w-4 ml-2" />
          إضافة لون
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      {colors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">الألوان</p>
                <p className="text-lg font-bold">{sizesStats.totalColors}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">بمقاسات</p>
                <p className="text-lg font-bold">{sizesStats.colorsWithSizes}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">المقاسات</p>
                <p className="text-lg font-bold">{sizesStats.totalSizes}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">القطع</p>
                <p className="text-lg font-bold">{sizesStats.totalQuantity}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">مخزون قليل</p>
                <p className="text-lg font-bold">{sizesStats.lowStockColors}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* تبويبات العرض */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">
            <Eye className="h-4 w-4 ml-2" />
            جميع الألوان
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Settings className="h-4 w-4 ml-2" />
            تعديل المقاسات
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-4">
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
            <Button type="button" onClick={(e) => onAddColor(e)}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة لون
            </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.map((color) => (
                <Card 
                  key={color.id} 
                  className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
                  onClick={() => {
                    onSelectColor(color.id);
                    setActiveTab('manage');
                  }}
                >
                  <CardContent className="p-0">
                    {/* رأس البطاقة */}
                    <div 
                      className="h-20 flex items-center justify-center relative"
                      style={{ backgroundColor: color.color_code }}
                    >
                      {color.image_url ? (
                        <img src={color.image_url} alt={color.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <span className="text-white/90 font-bold text-2xl drop-shadow-lg">
                          {color.name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    {/* محتوى البطاقة */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base">{color.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {color.has_sizes && color.sizes?.length 
                            ? `${color.sizes.length} مقاسات`
                            : 'بدون مقاسات'
                          }
                        </p>
                      </div>

                      {/* إحصائيات */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {color.has_sizes && color.sizes?.length 
                              ? color.sizes.reduce((sum, size) => sum + size.quantity, 0)
                              : color.quantity || 0
                            }
                          </span>
                          <span className="text-muted-foreground text-xs">قطعة</span>
                        </div>
                      </div>
                      
                      {/* المقاسات */}
                      {color.has_sizes && color.sizes && color.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t">
                          {color.sizes.slice(0, 6).map((size, index) => (
                            <span 
                              key={size.id || index}
                              className="text-xs px-2 py-1 bg-muted rounded font-medium"
                            >
                              {size.size_name}
                            </span>
                          ))}
                          {color.sizes.length > 6 && (
                            <span className="text-xs px-2 py-1 bg-muted rounded font-medium">
                              +{color.sizes.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="manage" className="space-y-4 mt-4">
          {!selectedColorId ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">اختر لوناً من الأسفل</h3>
              <p className="text-muted-foreground mb-6">اختر اللون الذي تريد إدارة مقاساته</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => onSelectColor(color.id)}
                    className="group flex flex-col items-center gap-2 p-3 rounded-lg border-2 hover:border-primary hover:bg-accent transition-all"
                  >
                    <div 
                      className="w-16 h-16 rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                      style={{ backgroundColor: color.color_code }}
                    >
                      {color.image_url && (
                        <img src={color.image_url} alt={color.name} className="w-full h-full object-cover rounded-lg" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium truncate max-w-full">{color.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {color.has_sizes && color.sizes?.length 
                          ? `${color.sizes.length} مقاس`
                          : 'بدون مقاسات'
                        }
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* رأس اللون المحدد */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={() => onSelectColor(null)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div 
                        className="w-14 h-14 rounded-lg shadow-md border-2 border-white"
                        style={{ backgroundColor: selectedColor?.color_code }}
                      >
                        {selectedColor?.image_url && (
                          <img src={selectedColor.image_url} alt={selectedColor.name} className="w-full h-full object-cover rounded-lg" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          {selectedColor?.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedColor?.sizes?.length || 0} مقاسات • {selectedColor?.sizes?.reduce((sum, s) => sum + s.quantity, 0) || 0} قطعة
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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