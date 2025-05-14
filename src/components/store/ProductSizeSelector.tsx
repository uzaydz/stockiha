import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";
import type { ProductSize } from '@/lib/api/products';
import { cn } from '@/lib/utils';

interface ProductSizeSelectorProps {
  sizes: ProductSize[];
  selectedSize: ProductSize | null;
  onSelectSize: (size: ProductSize) => void;
}

const ProductSizeSelector = ({
  sizes,
  selectedSize,
  onSelectSize,
}: ProductSizeSelectorProps) => {
  if (!sizes || sizes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => {
        const isSelected = selectedSize?.id === size.id;
        
        return (
          <Tooltip key={size.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`
                  px-4 py-2 rounded-md border
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                  ${size.quantity <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  transition-all duration-200
                `}
                onClick={() => size.quantity > 0 && onSelectSize(size)}
                disabled={size.quantity <= 0}
              >
                {size.size_name}
                
                {isSelected && (
                  <span className="mr-1">
                    <Check className="h-4 w-4 inline-block" />
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-medium">{size.size_name}</p>
                {size.price !== undefined && (
                  <p className="text-sm text-muted-foreground">{size.price.toLocaleString()} د.ج</p>
                )}
                {size.quantity <= 0 ? (
                  <p className="text-xs text-red-500">غير متوفر</p>
                ) : (
                  <p className="text-xs text-green-500">متوفر ({size.quantity})</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default ProductSizeSelector; 