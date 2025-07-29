import React, { memo, useMemo } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  FireIcon
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface ProductStockInfoProps {
  availableStock: number;
  lowStockThreshold?: number;
  className?: string;
}

const ProductStockInfo = memo(({
  availableStock,
  lowStockThreshold = 5,
  className
}: ProductStockInfoProps) => {
  
  const stockStatus = useMemo(() => {
    if (availableStock <= 0) {
      return {
        type: 'out-of-stock',
        icon: ExclamationTriangleIcon,
        title: 'نفدت الكمية',
        bgColor: "bg-red-50 dark:bg-red-950/30",
        textColor: "text-red-700 dark:text-red-400",
        iconColor: "text-red-500",
        borderLeft: "border-l-red-500"
      };
    }
    
    const isLowStock = availableStock <= lowStockThreshold;
    
    if (isLowStock) {
      return {
        type: 'low-stock',
        icon: FireIcon,
        title: `${availableStock} قطع متبقية فقط!`,
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        textColor: "text-amber-700 dark:text-amber-400",
        iconColor: "text-amber-500",
        borderLeft: "border-l-amber-500"
      };
    }
    
    return {
      type: 'in-stock',
      icon: CheckCircleIcon,
      title: `متوفر (${availableStock} قطعة)`,
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      textColor: "text-emerald-700 dark:text-emerald-400",
      iconColor: "text-emerald-500",
      borderLeft: "border-l-emerald-500"
    };
  }, [availableStock, lowStockThreshold]);

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg border-l-4",
      stockStatus.bgColor,
      stockStatus.borderLeft,
      className
    )}>
      {/* الأيقونة */}
      <stockStatus.icon className={cn("w-4 h-4", stockStatus.iconColor)} />
      
      {/* النص */}
      <span className={cn("text-sm font-medium", stockStatus.textColor)}>
        {stockStatus.title}
      </span>
      
      {/* نقطة نابضة للكمية المحدودة فقط */}
      {stockStatus.type === 'low-stock' && (
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse ml-auto"></div>
      )}
    </div>
  );
});

ProductStockInfo.displayName = 'ProductStockInfo';

export { ProductStockInfo };
