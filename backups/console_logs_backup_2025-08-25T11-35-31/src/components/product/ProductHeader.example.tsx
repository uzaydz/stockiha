import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircleIcon, 
  StarIcon, 
  SparklesIcon,
  ClockIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface ProductHeaderProps {
  name: string;
  brand?: string;
  status: {
    is_new?: boolean;
    is_featured?: boolean;
  };
  availableStock: number;
  className?: string;
}

const ProductHeader = memo(({
  name,
  brand,
  status,
  availableStock,
  className
}: ProductHeaderProps) => {
  
  // استخدام الترجمة المخصصة
  const { productHeader } = useProductPurchaseTranslation();
  
  // تحسين الـ badges بالـ useMemo مع الترجمة
  const badges = useMemo(() => {
    const badgeList = [];
    
    if (status.is_new) {
      badgeList.push({
        key: 'new',
        label: productHeader.new(),
        icon: SparklesIcon,
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
      });
    }
    
    if (status.is_featured) {
      badgeList.push({
        key: 'featured',
        label: productHeader.featured(),
        icon: StarIcon,
        className: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
      });
    }
    
    if (availableStock > 0 && availableStock <= 5) {
      badgeList.push({
        key: 'limited',
        label: productHeader.limitedQuantity(),
        icon: ClockIcon,
        className: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 animate-pulse"
      });
    } else if (availableStock > 0) {
      badgeList.push({
        key: 'available',
        label: productHeader.available(),
        icon: CheckCircleIcon,
        className: "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
      });
    }
    
    return badgeList;
  }, [status.is_new, status.is_featured, availableStock, productHeader]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* البطاقة الرئيسية للمعلومات */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl p-6 space-y-4"
      >
        {/* العنوان مع خط ملون */}
        <div className="flex items-start gap-3">
          <span className="inline-block w-1 h-8 bg-primary rounded-full flex-shrink-0 mt-1"></span>
          <div className="space-y-3 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-foreground">
              {name}
            </h1>
            
            {/* البادجات */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => {
                  const IconComponent = badge.icon;
                  return (
                    <Badge key={badge.key} className={badge.className}>
                      <IconComponent className="w-3 h-3 ml-1" />
                      {badge.label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* معلومات إضافية */}
        {brand && (
          <div className="pt-4 border-t border-border">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheckIcon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{productHeader.brand()}</span>
              </div>
              <span className="text-base font-semibold text-foreground mt-1 block">
                {brand}
              </span>
            </div>
          </div>
        )}

        {/* معلومات المخزون */}
        <div className="bg-background/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{productHeader.stockStatus()}</span>
            <div className="flex items-center gap-2">
              {availableStock > 0 ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">
                    {productHeader.piecesAvailable(availableStock)}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">
                    {productHeader.outOfStock()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

ProductHeader.displayName = 'ProductHeader';

export { ProductHeader };
