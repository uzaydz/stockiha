import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AdvancedDescription } from '@/types/advanced-description';
import { AdvancedDescriptionRenderer } from '@/components/advanced-description/AdvancedDescriptionRenderer';

interface ProductDescriptionProps {
  description: string;
  advancedDescription?: AdvancedDescription | null;
  className?: string;
  product?: any; // بيانات المنتج الكاملة لمعرض الصور
}

const ProductDescription = memo(({
  description,
  advancedDescription,
  className,
  product
}: ProductDescriptionProps) => {
  
  // تحسين الحسابات بالـ useMemo
  const displayData = useMemo(() => {
    // إذا كان هناك وصف متقدم مع مكونات، أعطيه الأولوية
    const hasAdvancedDescription = advancedDescription && 
      advancedDescription.components && 
      advancedDescription.components.length > 0;
    
    const trimmedDescription = description?.trim() || '';
    const hasBasicDescription = !!trimmedDescription;
    
    return {
      hasAdvancedDescription,
      hasBasicDescription,
      basicDescription: trimmedDescription,
      isEmpty: !hasAdvancedDescription && !hasBasicDescription
    };
  }, [description, advancedDescription]);

  // Early return للحالات الفارغة
  if (displayData.isEmpty) {
    return null;
  }

  return (
    <motion.div 
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* عرض الوصف المتقدم إذا كان موجوداً */}
      {displayData.hasAdvancedDescription ? (
        <AdvancedDescriptionRenderer 
          description={advancedDescription!}
          className="w-full"
          product={product}
        />
      ) : (
        /* عرض الوصف العادي */
        <div className={cn(
          "relative overflow-hidden rounded-xl",
          "bg-muted/30 border border-border/30 backdrop-blur-sm",
          "dark:bg-muted/20 dark:border-border/20",
          "p-4 lg:p-6"
        )}>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="prose prose-sm max-w-none dark:prose-invert"
          >
            <p className={cn(
              "text-muted-foreground leading-relaxed text-sm lg:text-base",
              "transition-colors duration-300",
              "dark:text-gray-300",
              "whitespace-pre-line"
            )}>
              {displayData.basicDescription}
            </p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
});

ProductDescription.displayName = 'ProductDescription';

export { ProductDescription };
