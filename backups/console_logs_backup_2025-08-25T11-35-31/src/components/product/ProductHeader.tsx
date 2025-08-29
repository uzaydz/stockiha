import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // تحسين الـ badges بالـ useMemo مع الترجمة والتصميم المحدث
  const badges = useMemo(() => {
    const badgeList = [];

    if (status.is_new) {
      badgeList.push({
        key: 'new',
        label: productHeader.new(),
        icon: SparklesIcon,
        className: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm"
      });
    }

    if (status.is_featured) {
      badgeList.push({
        key: 'featured',
        label: productHeader.featured(),
        icon: StarIcon,
        className: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm"
      });
    }

    if (availableStock > 0 && availableStock <= 5) {
      badgeList.push({
        key: 'limited',
        label: productHeader.limitedQuantity(),
        icon: ClockIcon,
        className: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm animate-pulse"
      });
    } else if (availableStock > 0) {
      badgeList.push({
        key: 'available',
        label: productHeader.available(),
        icon: CheckCircleIcon,
        className: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm"
      });
    }

    return badgeList;
  }, [status.is_new, status.is_featured, availableStock, productHeader]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* العنوان الرئيسي */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-2"
      >
        {/* البادجات */}
        <AnimatePresence>
          {badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="flex flex-wrap justify-start gap-1.5"
            >
              {badges.map((badge, index) => {
                const IconComponent = badge.icon;
                return (
                  <motion.div
                    key={badge.key}
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.15 + (index * 0.1),
                      ease: "easeOut"
                    }}
                  >
                    <Badge className={badge.className}>
                      <IconComponent className="w-3.5 h-3.5 mr-1.5" />
                      <span className="font-medium">{badge.label}</span>
                    </Badge>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* اسم المنتج */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          className="space-y-1"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {name}
          </h1>
          {brand && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-sm text-muted-foreground font-medium"
            >
              by {brand}
            </motion.p>
          )}
        </motion.div>
      </motion.div>

      {/* معلومات المنتج الإضافية */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        className="space-y-2"
      >
        {/* العلامة التجارية */}
        {brand && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="group relative bg-gradient-to-r from-muted/20 to-muted/10 border border-border/50 rounded-2xl p-3 backdrop-blur-sm hover:shadow-sm transition-all duration-300"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center ring-1 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                  <ShieldCheckIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1">
                  {productHeader.brand()}
                </span>
                <span className="text-base font-semibold text-foreground truncate block">
                  {brand}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* حالة المخزون */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="group relative bg-gradient-to-r from-muted/20 to-muted/10 border border-border/50 rounded-2xl p-3 backdrop-blur-sm hover:shadow-sm transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className={cn(
                  "w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all duration-300",
                  availableStock > 0
                    ? "bg-emerald-500 ring-emerald-200 group-hover:ring-emerald-300"
                    : "bg-red-500 ring-red-200 group-hover:ring-red-300"
                )}>
                  {availableStock > 0 && (
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {productHeader.stockStatus()}
              </span>
            </div>
            <div className="text-right">
              {availableStock > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {availableStock}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {productHeader.piecesAvailable()}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {productHeader.outOfStock()}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

ProductHeader.displayName = 'ProductHeader';

export { ProductHeader };
