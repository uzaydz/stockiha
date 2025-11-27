import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Trash2,
  Plus,
  Minus,
  Edit3
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
}

interface CartItemComponentProps {
  item: CartItem;
  index: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onUpdatePrice?: (index: number, price: number) => void;
  isReturn?: boolean;
}

const CartItemComponent: React.FC<CartItemComponentProps> = ({
  item,
  index,
  onUpdateQuantity,
  onRemove,
  onUpdatePrice,
  isReturn = false
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');

  const currentPrice = item.customPrice || item.variantPrice || item.product.price || 0;
  const originalPrice = item.variantPrice || item.product.price || 0;
  const isPriceModified = item.customPrice && item.customPrice !== originalPrice;

  const handlePriceEdit = useCallback(() => {
    setTempPrice(currentPrice.toString());
    setIsEditingPrice(true);
  }, [currentPrice]);

  const handlePriceSave = useCallback(() => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0 && onUpdatePrice) {
      onUpdatePrice(index, newPrice);
    }
    setIsEditingPrice(false);
  }, [tempPrice, index, onUpdatePrice]);

  const handlePriceBlur = useCallback(() => {
    // حفظ تلقائي عند الخروج من الحقل
    handlePriceSave();
  }, [handlePriceSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceSave();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setTempPrice('');
    }
  }, [handlePriceSave]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity > 0) {
      onUpdateQuantity(index, newQuantity);
    }
  }, [index, onUpdateQuantity]);

  return (
    <div className={cn(
      "group relative border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm p-3",
      isReturn
        ? "border-r-2 border-r-amber-500 bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/50"
        : "border-r-2 border-r-primary bg-card border-border/40"
    )}>
        <div className="flex items-start gap-3">
          {/* Product Image - Simplified */}
          {/* ⚡ إضافة دعم thumbnail_base64 للعمل Offline */}
          {(() => {
            const imageSrc = item.variantImage || 
              (item.product as any).thumbnail_base64 || 
              item.product.thumbnail_image || 
              item.product.thumbnailImage || 
              (item.product.images && item.product.images[0]);
            return (
              <div className="relative w-14 h-14 flex-shrink-0 bg-muted rounded-lg overflow-hidden border border-border/50">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={cn(
                  "w-full h-full flex items-center justify-center",
                  imageSrc ? "hidden" : ""
                )}>
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            );
          })()}

          {/* Product Details - Simplified */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header with name and remove button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground">
                  {String(item.product.name || '')}
                </h4>
                {/* Variants - Simplified */}
                {(item.colorName || item.sizeName) && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {item.colorName && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 border border-border/50">
                        {item.colorCode && (
                          <div
                            className="w-2.5 h-2.5 rounded-full border border-border"
                            style={{ backgroundColor: item.colorCode }}
                          />
                        )}
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {String(item.colorName || '')}
                        </span>
                      </div>
                    )}
                    {item.sizeName && (
                      <span className="text-[10px] bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        {String(item.sizeName || '')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-7 w-7 p-0 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex-shrink-0 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Bottom Row: Quantity & Price */}
            <div className="flex items-center justify-between gap-2">
              {/* Quantity Controls - Simplified */}
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/50 border border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuantityChange(Math.max(1, item.quantity - 1))}
                  className="h-7 w-7 p-0 rounded hover:bg-background"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value) || 1;
                    handleQuantityChange(newQuantity);
                  }}
                  className="w-10 h-7 text-center text-xs font-bold border-0 bg-background rounded p-0"
                  min="1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuantityChange(item.quantity + 1)}
                  className="h-7 w-7 p-0 rounded hover:bg-background"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Price - Moved here */}
              {onUpdatePrice && (
                <div className="flex-1 max-w-[140px]">
                  {isEditingPrice ? (
                    <div className="bg-background border border-primary rounded-md p-1">
                      <Input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onBlur={handlePriceBlur}
                        onKeyDown={handleKeyDown}
                        className="h-7 w-full text-xs font-semibold rounded border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        min="0"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className={cn(
                        "group/price flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all hover:scale-105 active:scale-95 w-full",
                        isPriceModified
                          ? "text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/60"
                          : "text-primary bg-primary/10 border border-primary/20 hover:bg-primary/15"
                      )}
                      onClick={handlePriceEdit}
                      title="انقر لتعديل السعر"
                    >
                      <Edit3 className="h-3 w-3 transition-transform group-hover/price:rotate-12" />
                      <span className="text-sm font-bold">
                        {(currentPrice * item.quantity).toLocaleString()}
                      </span>
                      {isPriceModified && <span className="text-amber-600 dark:text-amber-400 font-bold">*</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default React.memo(CartItemComponent);
