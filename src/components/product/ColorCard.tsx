import React from 'react';
import { Edit2, Trash2, Ruler, Package, DollarSign, Star } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  
  // حساب كمية اللون إما من المقاسات أو من الكمية المباشرة
  const totalQuantity = color.has_sizes && color.sizes?.length > 0
    ? color.sizes.reduce((sum, size) => sum + size.quantity, 0)
    : color.quantity || 0;

  return (
    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* رأس البطاقة مع اللون */}
        <div className="relative h-24 flex items-center justify-center" style={{ backgroundColor: color.color_code }}>
          {color.image_url ? (
            <img src={color.image_url} alt={color.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="text-white/90 font-bold text-3xl drop-shadow-lg">
              {color.name.slice(0, 2)}
            </div>
          )}
          
          {/* شارة الافتراضي */}
          {color.is_default && (
            <Badge className="absolute top-2 left-2 bg-white/90 text-slate-900 border-0 shadow-sm">
              <Star className="h-3 w-3 ml-1 fill-current text-amber-500" />
              افتراضي
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* اسم اللون */}
          <div>
            <h3 className="font-semibold text-lg truncate">{color.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{color.color_code}</p>
          </div>
          
          {/* الإحصائيات */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{totalQuantity}</span>
              <span className="text-muted-foreground text-xs">قطعة</span>
            </div>
            
            {useVariantPrices && (
              <div className="flex items-center gap-1.5 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{displayPrice}</span>
                <span className="text-muted-foreground text-xs">دج</span>
              </div>
            )}
          </div>

          {/* المقاسات */}
          {color.has_sizes && color.sizes && color.sizes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {color.sizes.slice(0, 5).map((size, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs h-6">
                  {size.size_name}
                </Badge>
              ))}
              {color.sizes.length > 5 && (
                <Badge variant="secondary" className="text-xs h-6">
                  +{color.sizes.length - 5}
                </Badge>
              )}
            </div>
          )}
          
          {/* الأزرار */}
          <div className="flex gap-1.5 pt-2 border-t">
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(color);
              }}
              className="flex-1 h-8"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            
            {useSizes && onManageSizes && (
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onManageSizes(color.id);
                }}
                className="flex-1 h-8"
              >
                <Ruler className="h-3.5 w-3.5" />
              </Button>
            )}
            
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(color.id);
              }}
              className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorCard;
