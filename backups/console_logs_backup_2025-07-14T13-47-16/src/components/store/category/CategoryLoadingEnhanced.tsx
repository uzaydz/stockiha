import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * مكون تحميل محسّن للفئات
 * يعرض skeleton loading أكثر واقعية وجاذبية
 */
const CategoryLoadingEnhanced = memo(({ count = 6 }: { count?: number }) => {
  // انيميشن متدرج للـ skeleton
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  // مكون Skeleton محسّن
  const SkeletonBox = ({ className = "", animated = true }: { className?: string; animated?: boolean }) => (
    <div 
      className={`bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 rounded ${animated ? 'animate-pulse' : ''} ${className}`}
      style={{
        backgroundSize: '200% 100%',
        animation: animated ? 'shimmer 2s ease-in-out infinite' : undefined
      }}
    />
  );

  return (
    <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden">
      {/* خلفية متدرجة مثل المكون الأصلي */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/10 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-secondary/3" />
      
      {/* عناصر زخرفية */}
      <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-tr from-secondary/5 to-primary/5 rounded-full blur-2xl animate-pulse" />
      
      <div className="container px-4 mx-auto relative z-10">
        {/* رأس القسم */}
        <motion.div 
          className="text-center mb-12 md:mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <SkeletonBox className="h-12 w-80 mx-auto mb-4 rounded-lg" />
            <div className="w-16 h-1 bg-gradient-to-r from-primary/30 to-secondary/30 mx-auto mb-6 rounded-full animate-pulse" />
            <SkeletonBox className="h-6 w-96 mx-auto mb-2 rounded-md" />
            <SkeletonBox className="h-6 w-80 mx-auto rounded-md" />
          </motion.div>
        </motion.div>
        
        {/* شبكة الفئات */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {Array.from({ length: count }, (_, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="group"
            >
              <div className="rounded-3xl overflow-hidden shadow-lg border border-border/20 bg-gradient-to-b from-card/80 to-card/60 backdrop-blur-md relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none">
                {/* قسم الصورة */}
                <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-background/50 to-muted/20">
                  <SkeletonBox className="w-full h-full" />
                  
                  {/* تأثير shimmer إضافي */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-shimmer"
                    style={{
                      animation: 'shimmer 2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                </div>
                
                {/* قسم النص */}
                <div className="p-4 space-y-3 bg-gradient-to-t from-background/50 to-transparent">
                  <div className="flex items-center justify-between">
                    <SkeletonBox className="h-5 w-3/4 rounded-md" />
                    <SkeletonBox className="h-4 w-8 rounded-full" />
                  </div>
                  <SkeletonBox className="h-4 w-full rounded-sm" />
                  <SkeletonBox className="h-4 w-5/6 rounded-sm" />
                  
                  {/* زر التصفح */}
                  <div className="pt-2">
                    <SkeletonBox className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* إضافة CSS للانيميشن */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
});

CategoryLoadingEnhanced.displayName = 'CategoryLoadingEnhanced';

export { CategoryLoadingEnhanced }; 