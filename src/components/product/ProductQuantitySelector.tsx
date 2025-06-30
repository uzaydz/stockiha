import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProductQuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  disabled?: boolean;
}

const ProductQuantitySelector: React.FC<ProductQuantitySelectorProps> = ({ 
  quantity, 
  onQuantityChange, 
  maxQuantity, 
  disabled = false 
}) => {
  
  const handleDecrease = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const validValue = Math.min(Math.max(value, 1), maxQuantity);
    onQuantityChange(validValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">الكمية</Label>
      
      <div className="flex items-center space-x-2 space-x-reverse">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={disabled || quantity <= 1}
          className="w-8 h-8 p-0"
        >
          -
        </Button>
        
        <Input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          disabled={disabled}
          min={1}
          max={maxQuantity}
          className="w-16 text-center"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          disabled={disabled || quantity >= maxQuantity}
          className="w-8 h-8 p-0"
        >
          +
        </Button>
        
        <span className="text-sm text-gray-500 mr-2">
          متوفر: {maxQuantity}
        </span>
      </div>
    </div>
  );
};

export default ProductQuantitySelector;
