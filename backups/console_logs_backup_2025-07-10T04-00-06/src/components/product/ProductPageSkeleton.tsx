import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProductPageSkeletonProps {
  className?: string;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  }
};

const skeletonVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// مكون Skeleton محسن
const OptimizedSkeleton = memo(({ 
  className, 
  variant = 'default' 
}: { 
  className?: string; 
  variant?: 'default' | 'shimmer' | 'pulse';
}) => (
  <div className={cn(
    "relative overflow-hidden rounded-lg",
    variant === 'default' && "bg-muted/40 dark:bg-muted/20",
    variant === 'shimmer' && "bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 dark:from-muted/20 dark:via-muted/30 dark:to-muted/20",
    variant === 'pulse' && "bg-muted/40 dark:bg-muted/20 animate-pulse",
    className
  )}>
    {variant === 'shimmer' && (
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear"
        }}
      />
    )}
  </div>
));

const ProductPageSkeleton = memo(({ className }: ProductPageSkeletonProps) => {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <motion.div 
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* قسم الصور */}
          <motion.div 
            className="space-y-4"
            variants={skeletonVariants}
          >
            {/* الصورة الرئيسية */}
            <OptimizedSkeleton 
              variant="shimmer"
              className="aspect-square w-full rounded-2xl shadow-lg"
            />
            
            {/* الصور المصغرة */}
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={skeletonVariants}
                  transition={{ delay: i * 0.1 }}
                >
                  <OptimizedSkeleton 
                    variant="pulse"
                    className="aspect-square rounded-xl"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* قسم المعلومات */}
          <motion.div 
            className="space-y-8"
            variants={skeletonVariants}
          >
            {/* العنوان والمعلومات الأساسية */}
            <div className="space-y-4">
              <OptimizedSkeleton 
                variant="shimmer"
                className="h-10 lg:h-12 w-4/5 rounded-xl"
              />
              <OptimizedSkeleton 
                variant="pulse"
                className="h-5 w-2/3 rounded-lg"
              />
              <OptimizedSkeleton 
                variant="pulse"
                className="h-4 w-1/2 rounded-lg"
              />
              
              {/* الشارات */}
              <div className="flex gap-2 pt-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    variants={skeletonVariants}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <OptimizedSkeleton 
                      variant="pulse"
                      className="h-7 w-16 rounded-full"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* خط فاصل */}
            <div className="h-px bg-border/30 rounded-full" />
            
            {/* السعر */}
            <motion.div 
              className="space-y-4"
              variants={skeletonVariants}
            >
              <OptimizedSkeleton 
                variant="shimmer"
                className="h-14 w-2/3 rounded-xl"
              />
              <div className="space-y-2">
                <OptimizedSkeleton 
                  variant="pulse"
                  className="h-4 w-full rounded-lg"
                />
                <OptimizedSkeleton 
                  variant="pulse"
                  className="h-4 w-3/4 rounded-lg"
                />
              </div>
            </motion.div>
            
            {/* خط فاصل */}
            <div className="h-px bg-border/30 rounded-full" />
            
            {/* المتغيرات */}
            <motion.div 
              className="space-y-4"
              variants={skeletonVariants}
            >
              <OptimizedSkeleton 
                variant="pulse"
                className="h-6 w-24 rounded-lg"
              />
              <div className="flex gap-3">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    variants={skeletonVariants}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <OptimizedSkeleton 
                      variant="pulse"
                      className="w-14 h-14 rounded-full"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* معلومات المخزون */}
            <motion.div variants={skeletonVariants}>
              <OptimizedSkeleton 
                variant="shimmer"
                className="h-20 w-full rounded-xl"
              />
            </motion.div>
            
            {/* الأزرار */}
            <motion.div 
              className="space-y-3 pt-4"
              variants={skeletonVariants}
            >
              <OptimizedSkeleton 
                variant="shimmer"
                className="h-14 lg:h-16 w-full rounded-xl shadow-lg"
              />
              <OptimizedSkeleton 
                variant="pulse"
                className="h-12 lg:h-14 w-full rounded-xl"
              />
            </motion.div>

            {/* معلومات إضافية */}
            <motion.div 
              className="space-y-4 pt-4"
              variants={skeletonVariants}
            >
              <OptimizedSkeleton 
                variant="pulse"
                className="h-6 w-32 rounded-lg"
              />
              <OptimizedSkeleton 
                variant="shimmer"
                className="h-24 w-full rounded-xl"
              />
              
              {/* مزيد من المعلومات */}
              <div className="grid grid-cols-2 gap-4">
                <OptimizedSkeleton 
                  variant="pulse"
                  className="h-16 rounded-xl"
                />
                <OptimizedSkeleton 
                  variant="pulse"
                  className="h-16 rounded-xl"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* قسم إضافي في الأسفل */}
        <motion.div 
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          transition={{ delay: 0.8 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              variants={skeletonVariants}
              transition={{ delay: 0.9 + i * 0.1 }}
            >
              <OptimizedSkeleton 
                variant="shimmer"
                className="h-32 rounded-xl"
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
});

ProductPageSkeleton.displayName = 'ProductPageSkeleton';

export { ProductPageSkeleton };
