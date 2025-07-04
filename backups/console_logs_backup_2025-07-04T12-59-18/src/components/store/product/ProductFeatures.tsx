import { Truck, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductFeaturesProps {
  hasFastShipping?: boolean;
  hasMoneyBack?: boolean;
  hasQualityGuarantee?: boolean;
  fastShippingText?: string;
  moneyBackText?: string;
  qualityGuaranteeText?: string;
}

const ProductFeatures = ({ 
  hasFastShipping,
  hasMoneyBack,
  hasQualityGuarantee,
  fastShippingText,
  moneyBackText,
  qualityGuaranteeText
}: ProductFeaturesProps) => {
  // إذا لم يكن هناك ميزات محددة، استخدم الميزات الافتراضية
  const showDefaultFeatures = !hasFastShipping && !hasMoneyBack && !hasQualityGuarantee;

  // لا تعرض أي شيء إذا لم تكن هناك ميزات
  if (!showDefaultFeatures && !hasFastShipping && !hasMoneyBack && !hasQualityGuarantee) {
    return null;
  }
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="grid grid-cols-1 md:grid-cols-3 gap-3"
    >
      {(hasFastShipping || showDefaultFeatures) && (
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="shrink-0 bg-primary/5 p-2.5 rounded-full">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">شحن سريع</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fastShippingText || 'توصيل سريع إلى جميع الولايات'}
            </p>
          </div>
        </motion.div>
      )}
      
      {(hasMoneyBack || showDefaultFeatures) && (
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="shrink-0 bg-primary/5 p-2.5 rounded-full">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">استرداد الأموال</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {moneyBackText || 'ضمان استرداد خلال 14 يوم'}
            </p>
          </div>
        </motion.div>
      )}
      
      {(hasQualityGuarantee || showDefaultFeatures) && (
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="shrink-0 bg-primary/5 p-2.5 rounded-full">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">ضمان الجودة</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {qualityGuaranteeText || 'ضمان أصالة وجودة المنتج'}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProductFeatures;
