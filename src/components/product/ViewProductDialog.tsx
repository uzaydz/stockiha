import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ScrollArea,
  ScrollBar
} from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Tag, 
  Barcode, 
  CircleDollarSign, 
  ShoppingBasket, 
  Clock, 
  History,
  Building, 
  AlignLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/api/products';
import { formatPrice } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getProductImages } from '@/lib/api/productVariants';

interface ViewProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ViewProductDialog = ({ product, open, onOpenChange }: ViewProductDialogProps) => {
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  
  // تحميل الصور الإضافية من جدول product_images
  useEffect(() => {
    if (open && product.id) {
      const loadAdditionalImages = async () => {
        try {
          const images = await getProductImages(product.id);
          if (images && images.length > 0) {
            // ترتيب الصور حسب sort_order
            const sortedImages = images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            const imageUrls = sortedImages.map(img => img.image_url);
            
            setAdditionalImages(imageUrls);
          }
        } catch (error) {
          console.error('خطأ في تحميل الصور الإضافية:', error);
        }
      };
      
      loadAdditionalImages();
    }
  }, [product.id, open]);

  // Format date in localized format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {product.name}
            {product.is_new && (
              <Badge variant="secondary" className="ml-2">جديد</Badge>
            )}
            {product.is_featured && (
              <Badge className="ml-2">مميز</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-hidden flex-1 -mx-6">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <div className="px-6 border-b">
              <TabsList>
                <TabsTrigger value="details">تفاصيل المنتج</TabsTrigger>
                <TabsTrigger value="images">الصور</TabsTrigger>
                <TabsTrigger value="specifications">المواصفات</TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <TabsContent value="details" className="mt-0 h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">معلومات المنتج الأساسية</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-muted-foreground">
                            <Package className="h-4 w-4 ml-2" />
                            <span>الاسم</span>
                          </div>
                          <div className="text-right font-medium">{product.name}</div>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-muted-foreground">
                            <CircleDollarSign className="h-4 w-4 ml-2" />
                            <span>السعر</span>
                          </div>
                          <div className="text-right font-medium">{formatPrice(product.price)}</div>
                        </div>
                        
                        {product.compare_at_price && (
                          <div className="flex justify-between items-start">
                            <div className="flex items-center text-muted-foreground">
                              <CircleDollarSign className="h-4 w-4 ml-2" />
                              <span>السعر قبل الخصم</span>
                            </div>
                            <div className="text-right font-medium line-through text-muted-foreground">
                              {formatPrice(product.compare_at_price)}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-muted-foreground">
                            <Tag className="h-4 w-4 ml-2" />
                            <span>SKU</span>
                          </div>
                          <div className="text-right font-medium">{product.sku}</div>
                        </div>
                        
                        {product.barcode && (
                          <div className="flex justify-between items-start">
                            <div className="flex items-center text-muted-foreground">
                              <Barcode className="h-4 w-4 ml-2" />
                              <span>الباركود</span>
                            </div>
                            <div className="text-right font-medium">{product.barcode}</div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-muted-foreground">
                            <ShoppingBasket className="h-4 w-4 ml-2" />
                            <span>المخزون</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{product.stock_quantity}</span>
                            {' '}
                            {product.stock_quantity <= 0 ? (
                              <Badge variant="destructive">نفذ من المخزون</Badge>
                            ) : product.stock_quantity <= 5 ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">منخفض</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">متوفر</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-muted-foreground">
                            <Tag className="h-4 w-4 ml-2" />
                            <span>الفئة</span>
                          </div>
                          <div className="text-right font-medium">{product.category}</div>
                        </div>
                        
                        {product.subcategory && (
                          <div className="flex justify-between items-start">
                            <div className="flex items-center text-muted-foreground">
                              <Tag className="h-4 w-4 ml-2" />
                              <span>الفئة الفرعية</span>
                            </div>
                            <div className="text-right font-medium">{product.subcategory}</div>
                          </div>
                        )}
                        
                        {product.brand && (
                          <div className="flex justify-between items-start">
                            <div className="flex items-center text-muted-foreground">
                              <Building className="h-4 w-4 ml-2" />
                              <span>العلامة التجارية</span>
                            </div>
                            <div className="text-right font-medium">{product.brand}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">وصف المنتج</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <div className="flex items-start gap-2">
                          <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          <p className="whitespace-pre-wrap">{product.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">تفاصيل إضافية</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">السعر:</span>
                          <span className="font-medium">{formatPrice(product.price)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">الكمية المتاحة:</span>
                          <span className="font-medium">{product.stock_quantity}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">تاريخ الإضافة:</span>
                          <span className="font-medium">{formatDate(product.created_at)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">آخر تحديث:</span>
                          <span className="font-medium">{formatDate(product.updated_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="images" className="mt-0 h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* عرض الصورة الرئيسية أولاً */}
                  <div className="overflow-hidden rounded-md border">
                    <img
                      src={product.thumbnail_image}
                      alt={`${product.name} - الصورة الرئيسية`}
                      className="w-full h-auto"
                    />
                    <div className="p-2 bg-muted/20 text-xs text-center">الصورة الرئيسية</div>
                  </div>
                  
                  {/* عرض الصور الإضافية من جدول product_images */}
                  {additionalImages.length > 0 ? (
                    additionalImages.map((image, index) => (
                      <div key={index} className="overflow-hidden rounded-md border">
                        <img
                          src={image}
                          alt={`${product.name} - ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    ))
                  ) : product.images && product.images.length > 1 ? (
                    // عرض الصور من حقل images إذا لم تكن هناك صور في جدول product_images
                    product.images.slice(1).map((image, index) => (
                      <div key={index} className="overflow-hidden rounded-md border">
                        <img
                          src={image}
                          alt={`${product.name} - ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-1 md:col-span-2 text-center py-12 text-muted-foreground">
                      لا توجد صور إضافية لهذا المنتج
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="specifications" className="mt-0 h-full">
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        {Object.entries(product.specifications as Record<string, any>).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2 py-2">
                            <div className="text-muted-foreground text-sm">{key}</div>
                            <div className="font-medium text-sm">{String(value)}</div>
                            <Separator className="col-span-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    لا توجد مواصفات متاحة لهذا المنتج
                  </div>
                )}
              </TabsContent>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewProductDialog; 