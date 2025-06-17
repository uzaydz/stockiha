import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle } from 'lucide-react';
import type { ProductColor } from '@/lib/api/products';
import { Check } from "lucide-react";
import { cn } from '@/lib/utils';

interface ProductColorSelectorProps {
  colors: ProductColor[];
  selectedColor: ProductColor | null;
  onSelectColor: (color: ProductColor) => void;
}

const ProductColorSelector = ({
  colors,
  selectedColor,
  onSelectColor,
}: ProductColorSelectorProps) => {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => {
        const isSelected = selectedColor?.id === color.id;
        
        return (
          <Tooltip key={color.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`
                  w-12 h-12 rounded-full overflow-hidden relative
                  ${isSelected 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'hover:opacity-80 transition-opacity'
                  }
                  ${color.quantity <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => color.quantity > 0 && onSelectColor(color)}
                disabled={color.quantity <= 0}
                title={color.name}
              >
                {color.image_url ? (
                  <img 
                    src={color.image_url} 
                    alt={color.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full" 
                    style={{ backgroundColor: color.color_code }}
                  />
                )}
                
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Check className="h-5 w-5 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-medium">{color.name}</p>
                {color.price !== undefined && color.price !== null && typeof color.price === 'number' && (
                  <p className="text-sm text-muted-foreground">{color.price.toLocaleString()} د.ج</p>
                )}
                {color.quantity <= 0 && (
                  <p className="text-xs text-red-500">غير متوفر</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default ProductColorSelector;
