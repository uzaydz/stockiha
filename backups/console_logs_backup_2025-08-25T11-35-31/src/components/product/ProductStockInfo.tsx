import React from 'react';
import { motion } from 'framer-motion';

interface ProductStockInfoProps {
  availableStock: number;
}

const ProductStockInfo: React.FC<ProductStockInfoProps> = React.memo(({
  availableStock
}) => {
  if (availableStock <= 0) {
    return null;
  }

  return (
    <motion.div 
      className="p-4 bg-green-50 rounded-lg border border-green-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-green-700 font-medium">
          متوفر في المخزون
        </span>
        <span className="text-green-600">
          {availableStock} قطعة متبقية
        </span>
      </div>
    </motion.div>
  );
});

ProductStockInfo.displayName = 'ProductStockInfo';

export default ProductStockInfo;
