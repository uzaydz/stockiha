import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
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

interface CompactCartItemProps {
  item: CartItem;
  index: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onUpdatePrice?: (index: number, price: number) => void;
  isReturn?: boolean;
}

const CompactCartItem: React.FC<CompactCartItemProps> = ({
  item,
  index,
  onUpdateQuantity,
  onRemove,
  onUpdatePrice,
  isReturn = false
}) => {
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');

  const currentPrice = item.customPrice || item.variantPrice || item.product.price || 0;
  const originalPrice = item.variantPrice || item.product.price || 0;
  const isPriceModified = item.customPrice && item.customPrice !== originalPrice;

  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity > 0) {
      onUpdateQuantity(index, newQuantity);
    }
  }, [index, onUpdateQuantity]);

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
    handlePriceSave();
  }, [handlePriceSave]);

  const handlePriceKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceSave();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setTempPrice('');
    }
  }, [handlePriceSave]);

  return (
    <div className={cn(
      "group relative flex items-center gap-2 p-2 rounded-lg border transition-all hover:shadow-sm",
      isReturn
        ? "border-r-4 border-r-amber-500 bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-800/40"
        : "border-r-4 border-r-primary bg-primary/[0.02] dark:bg-primary/[0.03] border-border/40"
    )}>
      {/* Product Name & Variants */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-xs leading-tight line-clamp-1 text-foreground">
          {String(item.product.name || '')}
        </h4>
        {(item.colorName || item.sizeName) && (
          <div className="flex items-center gap-1 mt-0.5">
            {item.colorName && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                {item.colorCode && (
                  <div
                    className="w-2 h-2 rounded-full border border-border"
                    style={{ backgroundColor: item.colorCode }}
                  />
                )}
                {String(item.colorName || '')}
              </span>
            )}
            {item.sizeName && (
              <span className="text-[10px] text-muted-foreground">
                • {String(item.sizeName || '')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quantity Controls - Compact */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5 border border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuantityChange(Math.max(1, item.quantity - 1))}
          className="h-6 w-6 p-0 rounded hover:bg-background"
        >
          <Minus className="h-3 w-3" />
        </Button>
        {isEditingQuantity ? (
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value) || 1;
              handleQuantityChange(newQuantity);
            }}
            onBlur={() => setIsEditingQuantity(false)}
            className="w-8 h-6 text-center text-xs font-bold border-0 bg-background p-0"
            min="1"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setIsEditingQuantity(true)}
            className="w-8 h-6 flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-background rounded"
          >
            {item.quantity}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuantityChange(item.quantity + 1)}
          className="h-6 w-6 p-0 rounded hover:bg-background"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Price with Edit - Minimal */}
      {onUpdatePrice && (
        <div className="flex-shrink-0">
          {isEditingPrice ? (
            <div className="bg-background border border-primary rounded-md p-1">
              <Input
                type="number"
                value={tempPrice}
                onChange={(e) => setTempPrice(e.target.value)}
                onBlur={handlePriceBlur}
                onKeyDown={handlePriceKeyDown}
                className="h-6 w-16 text-xs font-semibold rounded border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-center p-0"
                min="0"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={handlePriceEdit}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded transition-all hover:scale-105",
                isPriceModified
                  ? "text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/30"
                  : "text-primary bg-primary/10"
              )}
              title="انقر لتعديل السعر"
            >
              <Edit3 className="h-3 w-3" />
              <span className="text-xs font-bold whitespace-nowrap">
                {(currentPrice * item.quantity).toLocaleString()}
              </span>
              {isPriceModified && <span className="font-bold text-sm">*</span>}
            </button>
          )}
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="h-6 w-6 p-0 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex-shrink-0"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default React.memo(CompactCartItem);
