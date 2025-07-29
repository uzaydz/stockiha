import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProductDescriptionProps {
  description: string;
  className?: string;
}

const ProductDescription = memo(({
  description,
  className
}: ProductDescriptionProps) => {
  
  // تحسين الحسابات بالـ useMemo
  const textData = useMemo(() => {
    const trimmedDescription = description?.trim() || '';
    
    return {
      displayText: trimmedDescription,
      isEmpty: !trimmedDescription
    };
  }, [description]);

  // Early return للحالات الفارغة
  if (textData.isEmpty) {
    return null;
  }

  return (
    <motion.div 
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* محتوى الوصف */}
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
            {textData.displayText}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
});

ProductDescription.displayName = 'ProductDescription';

export { ProductDescription };
