import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getProductById } from '@/lib/api/products';
import { getProductColors } from '@/lib/api/productVariants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import { useTenant } from '@/context/TenantContext';
import StoreLayout from '@/components/StoreLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ShoppingCart, Printer, Download, Tag, Settings } from 'lucide-react';
import type { Product } from '@/lib/api/products';
import type { ProductColor } from '@/types/product';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ProductFeatures } from '@/components/store/ProductFeatures';

interface ProductWithColors extends Product {
  colors?: ProductColor[];
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
}

const ProductDetails = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const [product, setProduct] = useState<ProductWithColors | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      
      setIsLoading(true);
      try {
        const productData = await getProductById(productId);
        
        if (!productData) {
          toast.error('لم يتم العثور على المنتج');
          setIsLoading(false);
          return;
        }
        
        // استدعاء API للحصول على ألوان المنتج
        const colors = await getProductColors(productId);
        
        const productWithColors: ProductWithColors = {
          ...productData,
          colors
        };
        
        setProduct(productWithColors);
        
        // إذا كان للمنتج ألوان، حدد اللون الافتراضي
        if (colors && colors.length > 0) {
          const defaultColor = colors.find(c => c.is_default);
          if (defaultColor) {
            setSelectedColorId(defaultColor.id);
          } else {
            setSelectedColorId(colors[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading product details:', error);
        toast.error('حدث خطأ أثناء تحميل تفاصيل المنتج');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // استخراج معلومات اللون المحدد
  const selectedColor = product?.colors?.find(c => c.id === selectedColorId);
  
  // معالجة عرض الباركود المناسب (باركود المنتج أو باركود اللون)
  const getBarcodeToDisplay = () => {
    if (selectedColor?.barcode) {
      return selectedColor.barcode;
    }
    return product?.barcode || '';
  };

  // معالجة عرض الـ SKU المناسب
  const getSkuToDisplay = () => {
    return product?.sku || '';
  };

  // دالة يتم استدعاؤها بعد تحديث مميزات المنتج
  const handleFeaturesUpdated = async () => {
    if (!productId) return;
    
    try {
      // إعادة تحميل بيانات المنتج
      const updatedProduct = await getProductById(productId);
      const colors = product?.colors || [];
      
      setProduct({
        ...updatedProduct,
        colors
      });
      
      toast.success('تم تحديث مميزات المنتج بنجاح');
      setIsFeatureDialogOpen(false);
    } catch (error) {
      console.error('Error reloading product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج');
    }
  };

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-1/3" />
            </div>
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-2xl font-medium">لم يتم العثور على المنتج</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate('/store/products')}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة إلى قائمة المنتجات
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/store/products')}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة إلى قائمة المنتجات
          </Button>
          
          <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Settings className="ml-2 h-4 w-4" />
                تعديل ميزات المنتج
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>تعديل ميزات المنتج {product?.name}</DialogTitle>
              </DialogHeader>
              {product && (
                <ProductFeatures
                  productId={product.id}
                  initialFeatures={{
                    hasFastShipping: product.has_fast_shipping || false,
                    hasMoneyBack: product.has_money_back || false,
                    hasQualityGuarantee: product.has_quality_guarantee || false,
                    fastShippingText: product.fast_shipping_text || 'شحن سريع لجميع الولايات (1-3 أيام)',
                    moneyBackText: product.money_back_text || 'ضمان استرداد المال خلال 14 يوم',
                    qualityGuaranteeText: product.quality_guarantee_text || 'ضمان جودة المنتج'
                  }}
                  onFeaturesUpdated={handleFeaturesUpdated}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* صور المنتج */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-xl border bg-white flex items-center justify-center">
              <img
                src={selectedColor?.image_url || product.thumbnail_image}
                alt={product.name}
                className="object-contain max-h-full max-w-full p-4"
              />
            </div>
            
            {/* صور إضافية أو ألوان */}
            {product.colors && product.colors.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.id}
                    className={`aspect-square overflow-hidden rounded-md border ${selectedColorId === color.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedColorId(color.id)}
                  >
                    {color.image_url ? (
                      <img
                        src={color.image_url}
                        alt={color.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{ backgroundColor: color.color_code }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* معلومات المنتج */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {product.brand && (
                <p className="text-muted-foreground">{product.brand}</p>
              )}
            </div>

            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-2xl font-bold">{product.price.toLocaleString()} دج</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-lg text-muted-foreground line-through">
                  {product.compare_at_price.toLocaleString()} دج
                </span>
              )}
            </div>

            {product.stock_quantity > 0 ? (
              <div className="text-green-600 font-medium">
                متوفر في المخزون ({product.stock_quantity} قطعة)
              </div>
            ) : (
              <div className="text-red-600 font-medium">غير متوفر في المخزون</div>
            )}

            {selectedColor && (
              <div className="flex items-center space-x-2 space-x-reverse border p-2 rounded-md bg-gray-50">
                <span>اللون:</span>
                <span className="font-medium">{selectedColor.name}</span>
                <div
                  className="h-6 w-6 rounded-full border"
                  style={{ backgroundColor: selectedColor.color_code }}
                />
                {selectedColor.quantity > 0 ? (
                  <span className="text-xs text-green-600">
                    (متوفر: {selectedColor.quantity} قطعة)
                  </span>
                ) : (
                  <span className="text-xs text-red-600">(غير متوفر)</span>
                )}
              </div>
            )}

            <Separator />

            <div>
              <h2 className="text-lg font-medium mb-2">رموز المنتج</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm flex items-center">
                      <Tag className="h-4 w-4 ml-1" />
                      رمز المنتج (SKU)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <span className="font-mono text-lg">{getSkuToDisplay()}</span>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm flex items-center">
                      <Printer className="h-4 w-4 ml-1" />
                      الباركود
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <span className="font-mono text-lg">{getBarcodeToDisplay() || 'غير محدد'}</span>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {getBarcodeToDisplay() && (
              <BarcodeDisplay 
                value={getBarcodeToDisplay()} 
                title={`باركود ${selectedColor ? selectedColor.name : product.name}`}
                height={70}
                width={1.5}
                fontSize={14}
              />
            )}

            <Separator />

            <Button className="w-full" size="lg">
              <ShoppingCart className="ml-2 h-4 w-4" />
              إضافة إلى السلة
            </Button>
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-8">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details">التفاصيل</TabsTrigger>
            <TabsTrigger value="specifications">المواصفات</TabsTrigger>
            <TabsTrigger value="barcodes">الباركود ورموز المنتج</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">وصف المنتج</h3>
                <div className="prose max-w-none">
                  <p>{product.description}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">مواصفات المنتج</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">الفئة:</span>
                      <div className="font-medium">{product.category || 'غير محدد'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">العلامة التجارية:</span>
                      <div className="font-medium">{product.brand || 'غير محدد'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">الكمية المتاحة:</span>
                      <div className="font-medium">{product.stock_quantity} قطعة</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">رمز المنتج (SKU):</span>
                      <div className="font-medium font-mono">{product.sku}</div>
                    </div>
                    {product.barcode && (
                      <div>
                        <span className="text-sm text-muted-foreground">الباركود:</span>
                        <div className="font-medium font-mono">{product.barcode}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="barcodes" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">رموز المنتج والباركود</h3>
                <div className="space-y-6">
                  {/* باركود المنتج الرئيسي */}
                  <div>
                    <h4 className="font-medium mb-2">باركود المنتج الرئيسي</h4>
                    <BarcodeDisplay 
                      value={product.barcode || ''} 
                      title="الباركود الرئيسي"
                      height={80}
                      width={2}
                    />
                  </div>

                  {/* باركود المتغيرات (الألوان) */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="mt-8">
                      <h4 className="font-medium mb-2">باركود الألوان والمتغيرات</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.colors.map((color) => (
                          <div key={color.id}>
                            <BarcodeDisplay 
                              value={color.barcode || ''} 
                              title={`باركود ${color.name}`}
                              height={60}
                              width={1.5}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8">
                    <h4 className="font-medium mb-2">رمز المنتج (SKU)</h4>
                    <Card className="p-4 text-center">
                      <span className="font-mono text-lg">{product.sku}</span>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StoreLayout>
  );
};

export default ProductDetails; 