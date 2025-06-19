import { useState } from 'react';
import { ChevronRight, ChevronLeft, Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import ProductColorSelector from '@/components/store/ProductColorSelector';
import ProductSizeSelector from '@/components/store/ProductSizeSelector';
import type { ProductColor, ProductSize } from '@/lib/api/products';
import { motion } from 'framer-motion';

interface ProductOptionsProps {
  colors?: ProductColor[];
  selectedColor: ProductColor | null;
  onColorSelect: (color: ProductColor) => void;
  sizes?: ProductSize[];
  selectedSize: ProductSize | null;
  onSizeSelect: (size: ProductSize) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  loadingSizes?: boolean;
  useSizes?: boolean;
}

const ProductOptions = ({
  colors = [],
  selectedColor,
  onColorSelect,
  sizes = [],
  selectedSize,
  onSizeSelect,
  quantity,
  onQuantityChange,
  maxQuantity,
  loadingSizes = false,
  useSizes = false
}: ProductOptionsProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* اختيار اللون */}
      {colors.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center">
              <span className="inline-block w-1 h-4 bg-primary rounded-full ml-2"></span>
              {t('productOptions.color')}
            </h3>
            {selectedColor && (
              <span className="text-xs text-primary font-medium px-3 py-1 bg-primary/5 rounded-full">
                {selectedColor.name}
              </span>
            )}
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <ProductColorSelector
              colors={colors}
              selectedColor={selectedColor}
              onSelectColor={onColorSelect}
            />
          </div>
        </motion.div>
      )}
      
      {/* اختيار المقاس */}
      {useSizes && selectedColor && selectedColor.has_sizes && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center">
              <span className="inline-block w-1 h-4 bg-primary rounded-full ml-2"></span>
              {t('productOptions.size')}
            </h3>
            {selectedSize && (
              <span className="text-xs text-primary font-medium px-3 py-1 bg-primary/5 rounded-full">
                {selectedSize.size_name}
              </span>
            )}
          </div>
          
          {loadingSizes ? (
            <div className="flex items-center justify-center py-8 bg-card rounded-xl border border-border shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />
              <span className="text-sm text-muted-foreground">{t('productOptions.loadingSizes')}</span>
            </div>
          ) : sizes.length > 0 ? (
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
              <ProductSizeSelector
                sizes={sizes}
                selectedSize={selectedSize}
                onSelectSize={onSizeSelect}
              />
            </div>
          ) : (
            <div className="text-center py-6 bg-card rounded-xl border border-border shadow-sm text-muted-foreground text-sm">
              {t('productOptions.noSizesAvailable')}
            </div>
          )}
        </motion.div>
      )}
      
      {/* اختيار الكمية */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground flex items-center">
            <span className="inline-block w-1 h-4 bg-primary rounded-full ml-2"></span>
            {t('productOptions.quantity')}
          </h3>
          <span className="text-xs text-primary font-medium px-3 py-1 bg-primary/5 rounded-full">
            {maxQuantity > 0 ? t('productOptions.available', { count: maxQuantity }) : t('productOptions.unavailable')}
          </span>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-full gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all"
                onClick={() => onQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4 text-primary" />
              </Button>
              
              <div className="flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground min-w-16 text-center">
                  {quantity}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all"
                onClick={() => onQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="h-4 w-4 text-primary" />
              </Button>
            </div>

            <div className="text-muted-foreground text-sm text-center w-full border-t border-border pt-3 mt-1">
              {t('productOptions.totalPrice', { price: (quantity * (selectedSize?.price || selectedColor?.price || 0)).toLocaleString() })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductOptions;
