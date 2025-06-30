import React from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';

interface ProductVariantSelectorProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  onColorSelect: (color: ProductColor) => void;
  onSizeSelect: (size: ProductSize) => void;
}

const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  product,
  selectedColor,
  selectedSize,
  onColorSelect,
  onSizeSelect
}) => {
  // إذا لم يكن للمنتج متغيرات، لا نعرض شيئاً
  if (!product?.variants?.has_variants || !product.variants.colors || product.variants.colors.length === 0) {
    return null;
  }

  const colors = product.variants.colors;

  return (
    <div className="space-y-6">
      {/* اختيار اللون */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          اللون: {selectedColor?.name && (
            <span className="text-gray-600">{selectedColor.name}</span>
          )}
        </Label>
        
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <motion.button
              key={color.id}
              onClick={() => onColorSelect(color)}
              className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                selectedColor?.id === color.id 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={color.name}
            >
              {color.color_code ? (
                <div 
                  className="w-8 h-8 rounded-full border border-gray-200"
                  style={{ backgroundColor: color.color_code }}
                />
              ) : (
                <span className="text-xs text-center px-1">
                  {color.name.slice(0, 3)}
                </span>
              )}
              
              {selectedColor?.id === color.id && (
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-blue-500"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* اختيار المقاس */}
      {selectedColor?.has_sizes && selectedColor.sizes && selectedColor.sizes.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">المقاس</Label>
          
          <div className="flex flex-wrap gap-2">
            {selectedColor.sizes.map((size) => (
              <motion.button
                key={size.id}
                onClick={() => onSizeSelect(size)}
                className={`px-4 py-2 border rounded-lg transition-all ${
                  selectedSize?.id === size.id 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {size.size_name}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductVariantSelector; 