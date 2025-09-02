import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ExclamationTriangleIcon, 
  HomeIcon, 
  ArrowPathIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface ProductErrorPageProps {
  error?: string;
  onRetry?: () => void;
  className?: string;
  retryCount?: number;
  maxRetries?: number;
  productId?: string;
  organizationId?: string;
}

// تحسين الانميشن للأداء
const containerVariants: any = {
  hidden: { 
    opacity: 0, 
    y: 30, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.15
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

const iconVariants: any = {
  initial: { scale: 1, rotate: 0 },
  animate: { 
    scale: [1, 1.1, 1],
    rotate: [0, -10, 10, -5, 0],
    transition: { 
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut"
    }
  }
};

const ProductErrorPage = memo(({
  error,
  onRetry,
  className,
  retryCount = 0,
  maxRetries = 3,
  productId,
  organizationId
}: ProductErrorPageProps) => {
  const navigate = useNavigate();
  
  // استخدام الترجمة المخصصة
  const { productErrorPage } = useProductPurchaseTranslation();

  // تحسين الوظائف بـ useCallback
  const handleGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleGoToProducts = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  // تحسين النصوص بـ useMemo مع الترجمة
  const errorContent = useMemo(() => ({
    title: error || productErrorPage.productNotFound(),
    description: productErrorPage.errorMessage(),
    suggestions: [
      productErrorPage.suggestions.checkLink(),
      productErrorPage.suggestions.reloadPage(), 
      productErrorPage.suggestions.browseProducts(),
      productErrorPage.suggestions.goHome()
    ]
  }), [error, productErrorPage]);

  // معلومات التشخيص
  const diagnosticInfo = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      return {
        productId,
        organizationId,
        retryCount,
        maxRetries,
        timestamp: new Date().toISOString()
      };
    }
    return null;
  }, [productId, organizationId, retryCount, maxRetries]);

  return (
    <div className={cn(
      "min-h-screen bg-background flex items-center justify-center p-4",
      "bg-gradient-to-br from-background via-muted/20 to-background",
      className
    )}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg"
      >
        <Card className={cn(
          "border-2 shadow-2xl overflow-hidden",
          "bg-card/80 backdrop-blur-xl dark:bg-card/50",
          "border-border/50 dark:border-border/30",
          "relative"
        )}>
          {/* خلفية متدرجة */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-background to-orange-50/30 dark:from-red-900/10 dark:via-background dark:to-orange-900/10" />
          
          <CardContent className="relative text-center py-12 px-8">
            {/* الأيقونة */}
            <motion.div 
              variants={itemVariants}
              className={cn(
                "w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-red-100 to-orange-100",
                "dark:from-red-900/30 dark:to-orange-900/30",
                "border-4 border-red-200/50 dark:border-red-800/50",
                "shadow-lg"
              )}
            >
              <motion.div
                variants={iconVariants}
                initial="initial"
                animate="animate"
              >
                <ExclamationTriangleIcon className={cn(
                  "w-12 h-12",
                  "text-red-600 dark:text-red-400"
                )} />
              </motion.div>
            </motion.div>
            
            {/* العنوان */}
            <motion.h2 
              variants={itemVariants}
              className={cn(
                "text-2xl lg:text-3xl font-black mb-4",
                "bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text",
                "dark:from-white dark:to-gray-200"
              )}
            >
              {errorContent.title}
            </motion.h2>
            
            {/* الوصف */}
            <motion.p 
              variants={itemVariants}
              className={cn(
                "text-muted-foreground mb-8 leading-relaxed text-base",
                "dark:text-gray-300"
              )}
            >
              {errorContent.description}
            </motion.p>

            {/* اقتراحات سريعة */}
            <motion.div 
              variants={itemVariants}
              className="mb-8 p-4 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/30"
            >
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                {productErrorPage.tryTheseSolutions()}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {errorContent.suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    transition={{ delay: 0.1 * index }}
                    className="text-left text-muted-foreground/80"
                  >
                    {suggestion}
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* الأزرار */}
            <motion.div 
              variants={itemVariants}
              className="space-y-4"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleRetry}
                  className={cn(
                    "w-full h-12 font-bold text-base",
                    "bg-gradient-to-r from-primary via-primary/90 to-primary/80",
                    "hover:from-primary/90 hover:via-primary hover:to-primary/90",
                    "shadow-lg hover:shadow-xl",
                    "transition-all duration-300 ease-out",
                    "relative overflow-hidden group"
                  )}
                  size="lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  <ArrowPathIcon className="w-5 h-5 ml-2" />
                  {productErrorPage.buttons.retry()}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleGoToProducts}
                  variant="outline"
                  className={cn(
                    "w-full h-12 font-semibold text-base",
                    "border-2 border-border/50 hover:border-primary/50",
                    "bg-background/50 hover:bg-primary/10 backdrop-blur-sm",
                    "text-foreground hover:text-primary",
                    "shadow-sm hover:shadow-lg",
                    "transition-all duration-300 ease-out"
                  )}
                  size="lg"
                >
                  <ShoppingBagIcon className="w-5 h-5 ml-2" />
                  {productErrorPage.buttons.browseProducts()}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button 
                  variant="ghost" 
                  onClick={handleGoHome}
                  className={cn(
                    "w-full h-10 font-medium",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-muted/30",
                    "transition-colors duration-200"
                  )}
                >
                  <HomeIcon className="w-4 h-4 ml-2" />
                  {productErrorPage.buttons.goHome()}
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>

        {/* معلومات إضافية */}
        <motion.div
          variants={itemVariants}
          className="mt-6 text-center"
        >
          <p className="text-xs text-muted-foreground/60">
            إذا استمرت المشكلة، تواصل مع فريق الدعم
          </p>
          
          {/* معلومات التشخيص */}
          {diagnosticInfo && (
            <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/30">
              <p className="text-xs font-mono text-muted-foreground/80 mb-2">
                معلومات التشخيص (التطوير فقط):
              </p>
              <div className="text-xs text-muted-foreground/60 space-y-1">
                <div>Product ID: {diagnosticInfo.productId || 'غير محدد'}</div>
                <div>Organization ID: {diagnosticInfo.organizationId || 'غير محدد'}</div>
                <div>المحاولات: {diagnosticInfo.retryCount}/{diagnosticInfo.maxRetries}</div>
                <div>الوقت: {new Date(diagnosticInfo.timestamp).toLocaleTimeString('ar-SA')}</div>
              </div>
            </div>
          )}
          
          {/* عرض عدد المحاولات */}
          {retryCount > 0 && (
            <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
              <p className="text-xs text-orange-700 dark:text-orange-300">
                تمت المحاولة {retryCount} من {maxRetries} مرات
              </p>
              {retryCount >= maxRetries && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  تم استنفاذ جميع المحاولات. سيتم إعادة تحميل الصفحة تلقائياً.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
});

ProductErrorPage.displayName = 'ProductErrorPage';

export { ProductErrorPage };
