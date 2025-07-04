import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TruckIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  StarIcon,
  SparklesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { CompleteProduct } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface ProductFeaturesProps {
  product: CompleteProduct;
  className?: string;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1
    }
  }
};

const featureVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const specVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const ProductFeatures = memo<ProductFeaturesProps>(({ product, className }) => {
  
  const { productFeatures } = useProductPurchaseTranslation();
  
  // تحسين معالجة الميزات بـ useMemo
  const featuresData = useMemo(() => {
    if (!product?.features_and_specs) {
      return { features: [], specifications: {}, hasContent: false };
    }

    const featuresSpec = product.features_and_specs;
    const features = [];

    // إضافة الميزات المختلفة
    if (featuresSpec.has_fast_shipping) {
      features.push({
        id: 'fast_shipping',
        icon: TruckIcon,
        title: productFeatures.shipping(),
        description: featuresSpec.fast_shipping_text || 'شحن سريع لجميع الولايات',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50/80 dark:bg-blue-900/20',
        borderColor: 'border-blue-200/50 dark:border-blue-700/30'
      });
    }

    if (featuresSpec.has_money_back) {
      features.push({
        id: 'money_back',
        icon: ShieldCheckIcon,
        title: productFeatures.returns(),
        description: featuresSpec.money_back_text || 'ضمان استرداد المال خلال 7 أيام',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50/80 dark:bg-green-900/20',
        borderColor: 'border-green-200/50 dark:border-green-700/30'
      });
    }

    if (featuresSpec.has_quality_guarantee) {
      features.push({
        id: 'quality_guarantee',
        icon: CheckCircleIcon,
        title: productFeatures.warranty(),
        description: featuresSpec.quality_guarantee_text || 'ضمان جودة المنتج لمدة سنة',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50/80 dark:bg-purple-900/20',
        borderColor: 'border-purple-200/50 dark:border-purple-700/30'
      });
    }

    // إضافة الميزات من قائمة features
    if (featuresSpec.features && Array.isArray(featuresSpec.features)) {
      featuresSpec.features.forEach((feature, index) => {
        features.push({
          id: `feature_${index}`,
          icon: StarIcon,
          title: feature,
          description: '',
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50/80 dark:bg-amber-900/20',
          borderColor: 'border-amber-200/50 dark:border-amber-700/30'
        });
      });
    }

    return {
      features,
      specifications: featuresSpec.specifications || {},
      hasContent: features.length > 0 || Object.keys(featuresSpec.specifications || {}).length > 0
    };
  }, [product]);

  if (!featuresData.hasContent) {
    return null;
  }

  return (
    <motion.div 
      className={cn("space-y-8", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* قسم الميزات */}
      {featuresData.features.length > 0 && (
        <motion.div 
          className="space-y-6"
          variants={featureVariants}
        >
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-foreground dark:text-white">
              {productFeatures.features()}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuresData.features.map((feature, index) => (
              <motion.div
                key={feature.id}
                className={cn(
                  "group relative p-4 rounded-xl border-2 transition-all duration-300",
                  "hover:shadow-lg hover:-translate-y-1",
                  feature.bgColor,
                  feature.borderColor
                )}
                variants={featureVariants}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* الخلفية المتدرجة */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative flex items-start gap-3">
                  <motion.div
                    className={cn(
                      "p-2 rounded-lg",
                      "bg-white/50 dark:bg-background/50",
                      "border border-current/20"
                    )}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.3 }}
                  >
                    <feature.icon className={cn("w-5 h-5", feature.color)} />
                  </motion.div>
                  
                  <div className="flex-1 space-y-1">
                    <h4 className={cn(
                      "font-semibold text-sm",
                      feature.color
                    )}>
                      {feature.title}
                    </h4>
                    {feature.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* قسم المواصفات */}
      {Object.keys(featuresData.specifications).length > 0 && (
        <motion.div 
          className="space-y-6"
          variants={featureVariants}
        >
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-primary" />
            <h4 className="text-xl font-bold text-foreground dark:text-white">
              {productFeatures.specifications()}
            </h4>
          </div>
          
          <motion.div 
            className={cn(
              "p-6 rounded-xl border-2",
              "bg-gradient-to-br from-muted/20 to-muted/30",
              "border-border/30 dark:border-border/20",
              "dark:bg-gradient-to-br dark:from-muted/10 dark:to-muted/20"
            )}
            variants={specVariants}
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(featuresData.specifications).map(([key, value], index) => (
                <motion.div 
                  key={key} 
                  className={cn(
                    "flex flex-col sm:flex-row sm:justify-between gap-2",
                    "p-3 rounded-lg bg-background/50 border border-border/20",
                    "hover:bg-background/80 transition-colors duration-200"
                  )}
                  variants={specVariants}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <dt className="text-sm font-semibold text-muted-foreground">
                    {key}:
                  </dt>
                  <dd className="text-sm font-medium text-foreground dark:text-white">
                    {String(value)}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      )}

      {/* ملاحظة إضافية */}
      <motion.div 
        className={cn(
          "p-4 rounded-lg text-center",
          "bg-primary/5 border border-primary/20",
          "dark:bg-primary/10"
        )}
        variants={specVariants}
      >
        <p className="text-sm text-primary font-medium">
          ✨ جميع المنتجات مضمونة الجودة ومطابقة للمواصفات المذكورة
        </p>
      </motion.div>
    </motion.div>
  );
});

ProductFeatures.displayName = 'ProductFeatures';

export default ProductFeatures;
