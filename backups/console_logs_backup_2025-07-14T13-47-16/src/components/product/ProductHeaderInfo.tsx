import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface ProductHeaderInfoProps {
  product: {
    name: string;
    brand?: string;
    sku?: string;
    description?: string;
    status: {
      is_new: boolean;
      is_featured: boolean;
    };
  };
  availableStock: number;
}

const ProductHeaderInfo: React.FC<ProductHeaderInfoProps> = React.memo(({
  product,
  availableStock
}) => {
  const badges = useMemo(() => {
    const badgeList = [];
    
    if (product.status.is_new) {
      badgeList.push(
        <Badge key="new" variant="secondary" className="bg-green-100 text-green-700 border-green-200">
          <CheckCircleIcon className="w-3 h-3 ml-1" />
          جديد
        </Badge>
      );
    }
    
    if (product.status.is_featured) {
      badgeList.push(
        <Badge key="featured" variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
          مميز
        </Badge>
      );
    }
    
    if (availableStock > 0) {
      badgeList.push(
        <Badge key="available" variant="secondary" className="bg-green-100 text-green-700 border-green-200">
          متوفر
        </Badge>
      );
    }
    
    if (availableStock <= 5 && availableStock > 0) {
      badgeList.push(
        <Badge key="limited" variant="destructive" className="bg-red-100 text-red-700 border-red-200">
          كمية محدودة
        </Badge>
      );
    }
    
    return badgeList;
  }, [product.status.is_new, product.status.is_featured, availableStock]);

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          {product.name}
        </h1>
        
        {product.brand && (
          <p className="text-sm text-gray-600 mb-2">
            العلامة التجارية: <span className="font-medium">{product.brand}</span>
          </p>
        )}
        
        {product.sku && (
          <p className="text-xs text-gray-500">
            رمز المنتج: {product.sku}
          </p>
        )}
      </div>

      {/* الشارات والميزات */}
      {badges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {badges}
        </div>
      )}

      {/* الوصف */}
      {product.description && (
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600 leading-relaxed">
            {product.description}
          </p>
        </div>
      )}
    </motion.div>
  );
});

ProductHeaderInfo.displayName = 'ProductHeaderInfo';

export default ProductHeaderInfo; 