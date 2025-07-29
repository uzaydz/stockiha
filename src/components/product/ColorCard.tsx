import React from 'react';
import { Edit2, Trash2, Check, Ruler, Copy, Eye, Star } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ColorCardProps {
  color: ProductColor;
  onEdit: (color: ProductColor) => void;
  onDelete: (colorId: string) => void;
  onManageSizes?: (colorId: string) => void;
  useSizes: boolean;
  useVariantPrices?: boolean;
  basePrice?: number;
  basePurchasePrice?: number;
}

const ColorCard: React.FC<ColorCardProps> = ({
  color,
  onEdit,
  onDelete,
  onManageSizes,
  useSizes,
  useVariantPrices = false,
  basePrice,
  basePurchasePrice
}) => {
  // تحديد السعر المعروض بناءً على إعدادات الأسعار المتغيرة
  const displayPrice = useVariantPrices ? color.price : (basePrice ?? color.price);
  const displayPurchasePrice = useVariantPrices ? color.purchase_price : (basePurchasePrice ?? color.purchase_price);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 border-transparent hover:border-primary/20 dark:hover:border-primary/30">
      <div className="relative overflow-hidden">
        {color.image_url ? (
          <div className="relative">
            <img 
              src={color.image_url} 
              alt={color.name} 
              className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div 
            className="w-full h-44 flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: color.color_code }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10" />
            <span className="relative text-white text-xl font-bold drop-shadow-lg z-10">
              {color.name}
            </span>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30" />
          </div>
        )}
        
        {/* شارات الحالة */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {color.is_default && (
            <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-lg backdrop-blur-sm">
              <Check className="h-3 w-3 ml-1" />
              افتراضي
            </Badge>
          )}
          {color.has_sizes && (
            <Badge variant="secondary" className="bg-white/90 dark:bg-gray-900/90 text-foreground border-0 shadow-lg backdrop-blur-sm">
              <Ruler className="h-3 w-3 ml-1" />
              {color.sizes?.length ? `${color.sizes.length} مقاس` : 'مقاسات'}
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-5 space-y-4">
        {/* معلومات اللون الأساسية */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground mb-1">{color.name}</h3>
            <div className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded-full border shadow-sm ring-1 ring-gray-200 dark:ring-gray-600"
                style={{ 
                  backgroundColor: color.color_code,
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <span className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">{color.color_code}</span>
            </div>
          </div>
        </div>
        
        {/* معلومات السعر والكمية */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 border border-primary/20 dark:border-primary/30">
            <div className="text-xs text-muted-foreground mb-1">السعر</div>
            <div className="text-lg font-bold text-primary">{displayPrice} دج</div>
            {!useVariantPrices && color.price !== displayPrice && (
              <div className="text-xs text-muted-foreground mt-1">
                (محفوظ: {color.price} دج)
              </div>
            )}
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
            <div className="text-xs text-muted-foreground mb-1">الكمية</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {color.has_sizes && color.sizes && color.sizes.length > 0 
                ? `${color.sizes.reduce((sum, size) => sum + size.quantity, 0)} (محسوبة)`
                : color.quantity
              }
            </div>
          </div>
        </div>
        
        {/* معلومات إضافية */}
        {(color.purchase_price || color.barcode) && (
          <div className="pt-2 space-y-2">
            {displayPurchasePrice && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">سعر الشراء:</span>
                <span className="font-medium">{displayPurchasePrice} دج</span>
                {!useVariantPrices && color.purchase_price !== displayPurchasePrice && (
                  <span className="text-xs text-muted-foreground">
                    (محفوظ: {color.purchase_price} دج)
                  </span>
                )}
              </div>
            )}
            {color.barcode && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">الباركود:</span>
                <code className="bg-muted/50 px-2 py-1 rounded text-xs">{color.barcode}</code>
              </div>
            )}
          </div>
        )}
        
        <Separator className="my-4" />
        
        {/* أزرار الإجراءات */}
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(color)}
            className="flex-1 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary hover:text-primary transition-all duration-200"
          >
            <Edit2 className="h-4 w-4 ml-2" />
            تعديل
          </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>تعديل معلومات اللون</p>
              </TooltipContent>
            </Tooltip>
          
          {useSizes && color.has_sizes && onManageSizes && (
              <Tooltip>
                <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageSizes(color.id)}
              className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200"
            >
              <Ruler className="h-4 w-4 ml-1" />
              مقاسات
            </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>إدارة مقاسات هذا اللون</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(color.color_code);
                    toast.success('تم نسخ كود اللون');
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>نسخ كود اللون</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(color.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>حذف اللون</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorCard;
