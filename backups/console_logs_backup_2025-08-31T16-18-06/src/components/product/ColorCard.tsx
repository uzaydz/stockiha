import React, { useState } from 'react';
import { Edit2, Trash2, Ruler, MoreHorizontal, Eye, Package2, Tag } from 'lucide-react';
import { ProductColor } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  const [isHovered, setIsHovered] = useState(false);
  
  // تحديد السعر المعروض بناءً على إعدادات الأسعار المتغيرة
  const displayPrice = useVariantPrices ? color.price : (basePrice ?? color.price);
  const displayPurchasePrice = useVariantPrices ? color.purchase_price : (basePurchasePrice ?? color.purchase_price);
  
  // حساب كمية اللون إما من المقاسات أو من الكمية المباشرة
  const totalQuantity = color.has_sizes && color.sizes?.length > 0
    ? color.sizes.reduce((sum, size) => sum + size.quantity, 0)
    : color.quantity || 0;

  return (
    <div 
      className={cn(
        "relative bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 h-full flex flex-col",
        color.is_default 
          ? "border-[#fc5d41] shadow-sm" 
          : "border-gray-200 dark:border-gray-700",
        isHovered
          ? "shadow-md scale-[1.01] border-[#fc5d41]/50" 
          : "hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* شارة الافتراضي */}
      {color.is_default && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-4 h-4 bg-[#fc5d41] rounded-full border border-white shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>اللون الافتراضي</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* رأس البطاقة مع معاينة اللون */}
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="relative flex-shrink-0">
            {color.image_url ? (
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={color.image_url} alt={color.name} className="w-full h-full object-cover" />
                <div 
                  className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color.color_code }}
                />
              </div>
            ) : (
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white font-medium text-xs sm:text-sm shadow-sm"
                style={{ backgroundColor: color.color_code }}
              >
                {color.name.slice(0, 2)}
              </div>
            )}
          </div>
          
          {/* معلومات اللون الأساسية */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1 sm:mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                {color.name}
              </h3>
              
              {/* قائمة الإجراءات - دائماً مرئية */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                  >
                    <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 sm:w-40">
                  <DropdownMenuItem onClick={() => onEdit(color)} className="text-xs sm:text-sm">
                    <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                    تعديل اللون
                  </DropdownMenuItem>
                  {useSizes && onManageSizes && (
                    <DropdownMenuItem 
                      onClick={() => onManageSizes(color.id)} 
                      className="text-xs sm:text-sm"
                      disabled={!color.has_sizes && totalQuantity === 0}
                    >
                      <Ruler className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                      {color.has_sizes ? "إدارة المقاسات" : "إضافة مقاسات"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(color.id)} className="text-red-600 dark:text-red-400 text-xs sm:text-sm">
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                    حذف اللون
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* كود اللون */}
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
              {color.color_code}
            </div>
          </div>
        </div>
        
        {/* معلومات اضافية */}
        <div className="space-y-2 sm:space-y-3 flex-1">
          {/* السعر والكمية */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2 text-[#fc5d41]">
              <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-bold text-base sm:text-lg">{displayPrice} دج</span>
              {useVariantPrices && displayPurchasePrice > 0 && (
                <span className="text-gray-500 text-[10px] sm:text-xs">({displayPurchasePrice})</span>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-400">
              <Package2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-medium text-sm sm:text-base">{totalQuantity}</span>
            </div>
          </div>
          
          {/* شارة المقاسات */}
          {color.has_sizes && (
            <div className="flex justify-center mt-auto">
              <Badge 
                variant="outline" 
                className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 h-5 sm:h-6 font-medium border-[#fc5d41]/30 text-[#fc5d41] bg-[#fc5d41]/5"
              >
                {color.sizes?.length || 0} مقاس
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {/* شريط الإجراءات السفلي */}
      {useSizes && onManageSizes && (
        <div className="border-t border-gray-100 dark:border-gray-800 mt-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onManageSizes(color.id)}
            className="h-8 sm:h-10 w-full rounded-none rounded-b-lg text-xs sm:text-sm text-[#fc5d41] hover:bg-[#fc5d41]/5 border-0 font-medium"
          >
            <Ruler className="h-3 w-3 sm:h-4 sm:w-4 ml-1.5 sm:ml-2" />
            {color.has_sizes ? "إدارة المقاسات" : "إضافة مقاسات"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ColorCard;
