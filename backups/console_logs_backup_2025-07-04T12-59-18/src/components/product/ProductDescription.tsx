import React, { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductDescriptionProps {
  description: string;
  maxLength?: number;
  className?: string;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.1
    }
  }
};

const textVariants = {
  collapsed: { 
    opacity: 0,
    height: 0,
    transition: { duration: 0.3, ease: "easeInOut" }
  },
  expanded: { 
    opacity: 1,
    height: "auto",
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

const ProductDescription = memo(({
  description,
  maxLength = 200,
  className
}: ProductDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // تحسين الحسابات بالـ useMemo
  const textData = useMemo(() => {
    const trimmedDescription = description?.trim() || '';
    const shouldTruncate = trimmedDescription.length > maxLength;
    const displayText = isExpanded || !shouldTruncate 
      ? trimmedDescription 
      : `${trimmedDescription.slice(0, maxLength)}...`;
    
    return {
      shouldTruncate,
      displayText,
      isEmpty: !trimmedDescription
    };
  }, [description, maxLength, isExpanded]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Early return للحالات الفارغة
  if (textData.isEmpty) {
    return null;
  }

  return (
    <motion.div 
      className={cn("space-y-4", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* محتوى الوصف */}
      <div className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-muted/30 border border-border/30 backdrop-blur-sm",
        "dark:bg-muted/20 dark:border-border/20",
        "p-4 lg:p-6"
      )}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div 
            key={isExpanded ? 'expanded' : 'collapsed'}
            variants={textVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
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
        </AnimatePresence>

        {/* تأثير التدرج للنص المقطوع */}
        {textData.shouldTruncate && !isExpanded && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-8",
            "bg-gradient-to-t from-muted/30 via-muted/20 to-transparent",
            "dark:from-muted/20 dark:via-muted/10",
            "pointer-events-none"
          )} />
        )}
      </div>

      {/* زر التوسيع */}
      {textData.shouldTruncate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className={cn(
                "h-auto px-4 py-2 font-medium text-primary hover:text-primary/80",
                "bg-background/50 hover:bg-background/80 border border-border/30",
                "backdrop-blur-sm shadow-sm hover:shadow-md",
                "transition-all duration-300 ease-out",
                "hover:scale-105 active:scale-95",
                "dark:bg-background/30 dark:hover:bg-background/50",
                "dark:text-primary-foreground dark:hover:text-primary-foreground/80"
              )}
          >
            <motion.span 
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {isExpanded ? (
                <>
                  <span>عرض أقل</span>
                  <ChevronUpIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>اقرأ المزيد</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </>
              )}
            </motion.span>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
});

ProductDescription.displayName = 'ProductDescription';

export { ProductDescription };
