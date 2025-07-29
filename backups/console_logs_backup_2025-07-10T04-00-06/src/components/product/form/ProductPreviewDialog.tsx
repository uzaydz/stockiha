import React, { memo, useState } from 'react';
import { 
  Eye, 
  Monitor, 
  Tablet, 
  Smartphone,
  Package,
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Minus,
  Plus,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface ProductPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productData: {
    name: string;
    description: string;
    price: number;
    thumbnail_image: string;
    additional_images?: string[];
    colors?: Array<{ name: string; hex_color: string; quantity: number }>;
    is_featured?: boolean;
    is_new?: boolean;
    brand?: string;
    category_name?: string;
    stock_quantity?: number;
  };
}

const ProductPreviewDialog = memo<ProductPreviewDialogProps>(({ 
  open, 
  onOpenChange, 
  productData 
}) => {
  const [currentViewport, setCurrentViewport] = useState<ViewportMode>('desktop');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const allImages = productData.additional_images && productData.additional_images.length > 0
    ? [productData.thumbnail_image, ...productData.additional_images]
    : [productData.thumbnail_image];

  const getViewportStyles = () => {
    switch (currentViewport) {
      case 'mobile':
        return 'max-w-sm mx-auto';
      case 'tablet':
        return 'max-w-2xl mx-auto';
      case 'desktop':
      default:
        return 'max-w-4xl mx-auto';
    }
  };

  const getGridLayout = () => {
    switch (currentViewport) {
      case 'mobile':
        return 'flex flex-col space-y-4';
      case 'tablet':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 'desktop':
      default:
        return 'grid grid-cols-1 lg:grid-cols-2 gap-8';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", getViewportStyles())}>
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة المنتج
            </DialogTitle>
            
            {/* Viewport Toggle */}
            <div className="flex items-center border rounded-md p-1">
              <Button
                variant={currentViewport === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentViewport('desktop')}
                className="h-8 w-8 p-0"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={currentViewport === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentViewport('tablet')}
                className="h-8 w-8 p-0"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={currentViewport === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentViewport('mobile')}
                className="h-8 w-8 p-0"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <DialogDescription>
            كيف سيظهر المنتج للعملاء في المتجر على {currentViewport === 'desktop' ? 'سطح المكتب' : currentViewport === 'tablet' ? 'التابلت' : 'الهاتف المحمول'}
          </DialogDescription>
        </DialogHeader>

        {/* Product Preview Content */}
        <div className="space-y-6">
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="p-6">
              <div className={getGridLayout()}>
                {/* Product Images */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    {allImages[currentImageIndex] ? (
                      <img
                        src={allImages[currentImageIndex]}
                        alt={productData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  {/* Image Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {allImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={cn(
                            "flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors",
                            currentImageIndex === index 
                              ? "border-primary" 
                              : "border-muted-foreground/20 hover:border-muted-foreground/40"
                          )}
                        >
                          <img
                            src={image}
                            alt={`${productData.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h1 className={cn(
                        "font-bold leading-tight",
                        currentViewport === 'mobile' ? 'text-xl' : 'text-2xl lg:text-3xl'
                      )}>
                        {productData.name || 'اسم المنتج'}
                      </h1>
                      <Button variant="ghost" size="sm">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {productData.is_new && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          جديد
                        </Badge>
                      )}
                      {productData.is_featured && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          مميز
                        </Badge>
                      )}
                      {productData.category_name && (
                        <Badge variant="outline">
                          {productData.category_name}
                        </Badge>
                      )}
                    </div>

                    {/* Brand */}
                    {productData.brand && (
                      <p className="text-sm text-muted-foreground">
                        العلامة التجارية: <span className="font-medium">{productData.brand}</span>
                      </p>
                    )}
                  </div>

                  {/* Rating (Mock) */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className="h-4 w-4 fill-amber-400 text-amber-400" 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">(24 تقييم)</span>
                  </div>

                  <Separator />

                  {/* Price */}
                  <div className="space-y-2">
                    <div className={cn(
                      "font-bold text-primary",
                      currentViewport === 'mobile' ? 'text-2xl' : 'text-3xl'
                    )}>
                      {formatPrice(productData.price || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      شامل الضريبة • شحن مجاني للطلبات فوق 5000 د.ج
                    </p>
                  </div>

                  <Separator />

                  {/* Stock */}
                  {productData.stock_quantity !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        productData.stock_quantity > 0 ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span className="text-sm font-medium">
                        {productData.stock_quantity > 0 
                          ? `متوفر (${productData.stock_quantity} قطعة)`
                          : 'غير متوفر'
                        }
                      </span>
                    </div>
                  )}

                  {/* Colors */}
                  {productData.colors && productData.colors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium">الألوان المتوفرة:</h3>
                      <div className="flex flex-wrap gap-2">
                        {productData.colors.map((color, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full border border-muted-foreground/20"
                              style={{ backgroundColor: color.hex_color }}
                            />
                            <span className="text-sm">{color.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity & Add to Cart */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">الكمية:</label>
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[3rem] text-center">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className={cn(
                      "flex gap-3",
                      currentViewport === 'mobile' ? 'flex-col' : 'flex-row'
                    )}>
                      <Button 
                        size={currentViewport === 'mobile' ? 'lg' : 'default'}
                        className="flex-1"
                        disabled={productData.stock_quantity === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        إضافة إلى السلة
                      </Button>
                      <Button 
                        variant="outline" 
                        size={currentViewport === 'mobile' ? 'lg' : 'default'}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        مشاركة
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="font-medium">وصف المنتج:</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {productData.description || 'لا يوجد وصف متوفر للمنتج حالياً.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            هذه معاينة لكيفية ظهور المنتج للعملاء
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            إغلاق المعاينة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ProductPreviewDialog.displayName = 'ProductPreviewDialog';

export default ProductPreviewDialog;
