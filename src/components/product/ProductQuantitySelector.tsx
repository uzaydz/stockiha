import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ProductQuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  disabled?: boolean;
  className?: string;
  basePrice?: number; // إضافة السعر الأساسي لحساب المجموع
}

const ProductQuantitySelector = memo<ProductQuantitySelectorProps>(({ 
  quantity, 
  onQuantityChange, 
  maxQuantity, 
  disabled = false,
  className,
  basePrice = 0
}) => {
  const { t } = useTranslation();
  
  // تحسين معالجات الأحداث بـ useCallback
  const handleDecrease = useCallback(() => {
    if (quantity > 1 && !disabled) {
      onQuantityChange(quantity - 1);
    }
  }, [quantity, disabled, onQuantityChange]);

  const handleIncrease = useCallback(() => {
    if (quantity < maxQuantity && !disabled) {
      onQuantityChange(quantity + 1);
    }
  }, [quantity, maxQuantity, disabled, onQuantityChange]);

  const isMinQuantity = quantity <= 1;
  const isMaxQuantity = quantity >= maxQuantity;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-3", className)}
    >
      {/* العنوان مع الحالة */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center">
          <span className="inline-block w-1 h-4 bg-primary rounded-full ml-2"></span>
          {t('productOptions.quantity')}
        </h3>
        <span className="text-xs text-primary font-medium px-3 py-1 bg-primary/5 rounded-full">
          {maxQuantity > 0 ? t('productOptions.available', { count: maxQuantity }) : t('productOptions.unavailable')}
        </span>
      </div>

      {/* البطاقة الرئيسية */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col items-center gap-4">
          {/* أزرار التحكم والعرض */}
          <div className="flex items-center justify-center w-full gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all"
              onClick={handleDecrease}
              disabled={disabled || isMinQuantity}
            >
              <MinusIcon className="h-4 w-4 text-primary" />
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
              onClick={handleIncrease}
              disabled={disabled || isMaxQuantity}
            >
              <PlusIcon className="h-4 w-4 text-primary" />
            </Button>
          </div>

          {/* معلومات إضافية في الأسفل */}
          {basePrice > 0 && (
            <div className="text-muted-foreground text-sm text-center w-full border-t border-border pt-3 mt-1">
              {t('productOptions.totalPrice', { 
                price: (quantity * basePrice).toLocaleString() 
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ProductQuantitySelector.displayName = 'ProductQuantitySelector';

export default ProductQuantitySelector;
