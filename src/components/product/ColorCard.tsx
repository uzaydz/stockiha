import React, { useState } from 'react';
import { Edit2, Trash2, Ruler, MoreHorizontal } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* رأس البطاقة مع معاينة اللون */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            {color.image_url ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border shadow-sm">
                <img src={color.image_url} alt={color.name} className="w-full h-full object-cover" />
                <div 
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color.color_code }}
                />
              </div>
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-sm"
                style={{ backgroundColor: color.color_code }}
              >
                {color.name.slice(0, 2)}
              </div>
            )}
          </div>
          
          {/* معلومات اللون الأساسية */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-base truncate">
                {color.name}
              </h3>
              
              {/* قائمة الإجراءات */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(color)}>
                    <Edit2 className="h-4 w-4 ml-2" />
                    تعديل اللون
                  </DropdownMenuItem>
                  {useSizes && onManageSizes && (
                    <DropdownMenuItem 
                      onClick={() => onManageSizes(color.id)}
                    >
                      <Ruler className="h-4 w-4 ml-2" />
                      {color.has_sizes ? "إدارة المقاسات" : "إضافة مقاسات"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(color.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف اللون
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* كود اللون */}
            <div className="text-sm text-muted-foreground font-mono">
              {color.color_code}
            </div>
          </div>
        </div>
        
        {/* معلومات اضافية */}
        <div className="space-y-3">
          {/* السعر والكمية */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-primary">{displayPrice} دج</span>
              {useVariantPrices && displayPurchasePrice > 0 && (
                <span className="text-muted-foreground text-xs">({displayPurchasePrice})</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">{totalQuantity}</span>
            </div>
          </div>
          
          {/* زر إدارة المقاسات */}
          {useSizes && onManageSizes && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onManageSizes(color.id)}
              className="w-full"
            >
              <Ruler className="h-4 w-4 ml-2" />
              {color.has_sizes ? "إدارة المقاسات" : "إضافة مقاسات"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorCard;