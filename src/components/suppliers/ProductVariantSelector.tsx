import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Package, Palette, Ruler, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface ProductColor {
  id: string;
  name: string;
  color_code: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  has_sizes: boolean;
}

interface ProductSize {
  id: string;
  size_name: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  color_id: string;
}

interface VariantPurchase {
  variant_type: 'simple' | 'color_only' | 'size_only' | 'color_size';
  color_id?: string;
  size_id?: string;
  quantity: number;
  unit_price: number;
  display_name: string;
}

interface ProductVariantSelectorProps {
  productId: string;
  productName: string;
  productPrice: number;
  productPurchasePrice?: number;
  onVariantsChange: (variants: VariantPurchase[]) => void;
  initialVariants?: VariantPurchase[];
}

export function ProductVariantSelector({
  productId,
  productName,
  productPrice,
  productPurchasePrice,
  onVariantsChange,
  initialVariants = []
}: ProductVariantSelectorProps) {
  const [product, setProduct] = useState<any>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [variants, setVariants] = useState<VariantPurchase[]>(initialVariants);
  const [loading, setLoading] = useState(true);

  // جلب بيانات المنتج والمتغيرات
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        
        // جلب بيانات المنتج
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        setProduct(productData);

        // إذا لم يكن للمنتج متغيرات، اضبط المتغير البسيط
        if (!productData.has_variants) {
          const simpleVariant: VariantPurchase = {
            variant_type: 'simple',
            quantity: 1,
            unit_price: productPurchasePrice || productPrice,
            display_name: productName
          };
          setVariants([simpleVariant]);
          onVariantsChange([simpleVariant]);
          setLoading(false);
          return;
        }

        // جلب الألوان
        const { data: colorsData, error: colorsError } = await supabase
          .from('product_colors')
          .select('*')
          .eq('product_id', productId)
          .order('name');

        if (colorsError) throw colorsError;
        setColors(colorsData || []);

        // جلب المقاسات إذا كان المنتج يستخدم مقاسات
        if (productData.use_sizes) {
          const { data: sizesData, error: sizesError } = await supabase
            .from('product_sizes')
            .select('*')
            .eq('product_id', productId)
            .order('size_name');

          if (sizesError) throw sizesError;
          setSizes(sizesData || []);
        }

      } catch (error) {
        console.error('Error fetching product data:', error);
        toast.error('خطأ في جلب بيانات المنتج');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  // دالة إضافة/تحديث متغير
  const updateVariant = (variantKey: string, updates: Partial<VariantPurchase>) => {
    setVariants(prev => {
      const existing = prev.find(v => getVariantKey(v) === variantKey);
      let newVariants;
      
      if (existing) {
        newVariants = prev.map(v => 
          getVariantKey(v) === variantKey ? { ...v, ...updates } : v
        );
      } else {
        newVariants = [...prev, updates as VariantPurchase];
      }
      
      onVariantsChange(newVariants);
      return newVariants;
    });
  };

  // دالة حذف متغير
  const removeVariant = (variantKey: string) => {
    setVariants(prev => {
      const newVariants = prev.filter(v => getVariantKey(v) !== variantKey);
      onVariantsChange(newVariants);
      return newVariants;
    });
  };

  // دالة توليد مفتاح فريد للمتغير
  const getVariantKey = (variant: VariantPurchase) => {
    return `${variant.variant_type}-${variant.color_id || 'no-color'}-${variant.size_id || 'no-size'}`;
  };

  // دالة الحصول على كمية متغير محدد
  const getVariantQuantity = (variantKey: string) => {
    const variant = variants.find(v => getVariantKey(v) === variantKey);
    return variant?.quantity || 0;
  };

  // دالة الحصول على سعر متغير محدد
  const getVariantPrice = (variantKey: string) => {
    const variant = variants.find(v => getVariantKey(v) === variantKey);
    return variant?.unit_price || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل بيانات المنتج...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // إذا لم يكن للمنتج متغيرات
  if (!product?.has_variants) {
    const variantKey = 'simple-no-color-no-size';
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            شراء المنتج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الكمية</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={getVariantQuantity(variantKey)}
                onChange={(e) => updateVariant(variantKey, {
                  variant_type: 'simple',
                  quantity: parseInt(e.target.value) || 0,
                  unit_price: getVariantPrice(variantKey) || productPurchasePrice || productPrice,
                  display_name: productName
                })}
              />
            </div>
            <div>
              <Label>سعر الوحدة</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={getVariantPrice(variantKey)}
                onChange={(e) => updateVariant(variantKey, {
                  variant_type: 'simple',
                  quantity: getVariantQuantity(variantKey) || 1,
                  unit_price: parseFloat(e.target.value) || 0,
                  display_name: productName
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          تحديد المتغيرات للشراء
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              الألوان
            </TabsTrigger>
            {product.use_sizes && (
              <TabsTrigger value="sizes" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                المقاسات
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            {colors.map(color => {
              if (product.use_sizes && color.has_sizes) {
                // عرض المقاسات لهذا اللون
                const colorSizes = sizes.filter(size => size.color_id === color.id);
                return (
                  <Card key={color.id} className="border-l-4" style={{ borderLeftColor: color.color_code }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: color.color_code }}
                          />
                          <span className="font-medium">{color.name}</span>
                          <Badge variant="outline">المخزون: {color.quantity}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {colorSizes.map(size => {
                          const variantKey = `color_size-${color.id}-${size.id}`;
                          const displayName = `${productName} - ${color.name} - ${size.size_name}`;
                          
                          return (
                            <div key={size.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{size.size_name}</span>
                                <Badge variant="secondary">المخزون: {size.quantity}</Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">الكمية</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className="h-8 text-sm"
                                    value={getVariantQuantity(variantKey)}
                                    onChange={(e) => {
                                      const quantity = parseInt(e.target.value) || 0;
                                      if (quantity > 0) {
                                        updateVariant(variantKey, {
                                          variant_type: 'color_size',
                                          color_id: color.id,
                                          size_id: size.id,
                                          quantity,
                                          unit_price: getVariantPrice(variantKey) || size.purchase_price || color.purchase_price || productPurchasePrice || productPrice,
                                          display_name: displayName
                                        });
                                      } else {
                                        removeVariant(variantKey);
                                      }
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-xs">السعر</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-8 text-sm"
                                    value={getVariantPrice(variantKey)}
                                    onChange={(e) => updateVariant(variantKey, {
                                      variant_type: 'color_size',
                                      color_id: color.id,
                                      size_id: size.id,
                                      quantity: getVariantQuantity(variantKey) || 1,
                                      unit_price: parseFloat(e.target.value) || 0,
                                      display_name: displayName
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              } else {
                // لون بدون مقاسات
                const variantKey = `color_only-${color.id}-no-size`;
                const displayName = `${productName} - ${color.name}`;
                
                return (
                  <Card key={color.id} className="border-l-4" style={{ borderLeftColor: color.color_code }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: color.color_code }}
                          />
                          <span className="font-medium">{color.name}</span>
                          <Badge variant="outline">المخزون: {color.quantity}</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>الكمية</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={getVariantQuantity(variantKey)}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 0;
                              if (quantity > 0) {
                                updateVariant(variantKey, {
                                  variant_type: 'color_only',
                                  color_id: color.id,
                                  quantity,
                                  unit_price: getVariantPrice(variantKey) || color.purchase_price || productPurchasePrice || productPrice,
                                  display_name: displayName
                                });
                              } else {
                                removeVariant(variantKey);
                              }
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label>سعر الوحدة</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getVariantPrice(variantKey)}
                            onChange={(e) => updateVariant(variantKey, {
                              variant_type: 'color_only',
                              color_id: color.id,
                              quantity: getVariantQuantity(variantKey) || 1,
                              unit_price: parseFloat(e.target.value) || 0,
                              display_name: displayName
                            })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            })}
          </TabsContent>

          {product.use_sizes && (
            <TabsContent value="sizes" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                المقاسات مربوطة بالألوان. يرجى استخدام تبويب الألوان لتحديد الكميات.
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* ملخص المتغيرات المحددة */}
        {variants.length > 0 && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h4 className="font-medium mb-3">ملخص المتغيرات المحددة:</h4>
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{variant.quantity}x</Badge>
                    <span className="text-sm">{variant.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{variant.unit_price.toFixed(2)} دج</span>
                    <span className="text-xs text-muted-foreground">
                      = {(variant.quantity * variant.unit_price).toFixed(2)} دج
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-2 border-t font-medium">
                <span>المجموع الكلي:</span>
                <span className="text-lg">
                  {variants.reduce((total, v) => total + (v.quantity * v.unit_price), 0).toFixed(2)} دج
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 