import React, { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, easeInOut, type Variants } from 'framer-motion';
import { SparklesIcon, CheckIcon, CurrencyDollarIcon, TruckIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface ProductActionsProps {
  totalPrice: number;
  deliveryFee?: number;
  canPurchase: boolean;
  buyingNow: boolean;
  onBuyNow: () => void;
  currency?: string;
  isCalculatingDelivery?: boolean;
  className?: string;
}

// تحسين الانميشن للأداء
const floatingVariants = {
  hidden: { 
    opacity: 0, 
    y: 100,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 180,
      damping: 20
    }
  },
  exit: {
    opacity: 0,
    y: 100,
    scale: 0.95,
    transition: {
      duration: 0.25,
      ease: easeInOut
    }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easeInOut
    }
  }
};

// البحث عن عنصر النموذج بأولوية محددة
const findPurchaseFormElement = (): Element | null => {
  return (
    document.querySelector('#product-purchase-form') ||
    document.querySelector('[data-form="product-form"]') ||
    document.querySelector('[data-form]') ||
    document.querySelector('form[onsubmit]') ||
    document.querySelector('form')
  );
};

// سبينر تحميل خفيف
const LoadingSpinner: React.FC = () => (
  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
);

const ProductActions = memo(({
  totalPrice,
  deliveryFee = 0,
  canPurchase,
  buyingNow,
  onBuyNow,
  currency = 'دج',
  isCalculatingDelivery = false,
  className
}: ProductActionsProps) => {
  
  const [isVisible, setIsVisible] = useState(true);
  const [isAtForm, setIsAtForm] = useState(false);
  const [hasForm, setHasForm] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  
  // استخدام الترجمة المخصصة
  const { productActions } = useProductPurchaseTranslation();

  // تحسين الحسابات بالـ useMemo
  const { formattedTotalPrice, formattedProductPrice, formattedDeliveryFee } = useMemo(() => {
    const finalTotal = totalPrice + deliveryFee;
    
    const formatter = new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    return {
      formattedTotalPrice: formatter.format(finalTotal),
      formattedProductPrice: formatter.format(totalPrice),
      formattedDeliveryFee: formatter.format(deliveryFee)
    };
  }, [totalPrice, deliveryFee]);

  // مراقبة موقع النموذج ومركز الصفحة
  useEffect(() => {
    const observeForm = () => {
      // البحث عن النموذج في الصفحة بأولوية محددة
      const formElement = findPurchaseFormElement();

      if (!formElement) {
        setIsVisible(true);
        setIsAtForm(false);
        setHasForm(false);
        return;
      }

      setHasForm(true);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const isFormVisible = entry.isIntersecting && entry.intersectionRatio > 0.15;

            // تحديث الحالات فقط عند التغيير لتقليل إعادة التصيير
            setIsAtForm((prev) => {
              if (prev !== isFormVisible) {
                setIsVisible(!isFormVisible);
                return isFormVisible;
              }
              return prev;
            });
          });
        },
        {
          threshold: [0.15],
          rootMargin: '-12px 0px -12px 0px'
        }
      );

      observer.observe(formElement);

      return () => observer.disconnect();
    };

    // تأخير قصير للتأكد من تحميل DOM بالكامل
    const timer = setTimeout(observeForm, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // التحقق من وجود نموذج عند التحميل لأول مرة
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasForm(Boolean(findPurchaseFormElement()));
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // معالج النقر - الانتقال للنموذج أو الشراء المباشر
  const handleAction = useCallback(() => {
    // البحث عن النموذج بنفس الأولوية المستخدمة في useEffect
    const formElement = findPurchaseFormElement();

    if (formElement) {
      formElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      // إخفاء الزر فوراً عند النقر
      setIsVisible(false);
      setIsAtForm(true);
      setHasForm(true);
    } else {
      // إذا لم يوجد نموذج، قم بالشراء المباشر
      if (!buyingNow && canPurchase) {
        onBuyNow();
      }
    }
  }, [buyingNow, canPurchase, onBuyNow]);

  // تهيئة الانميشن حسب تفضيل تقليل الحركة
  const computedFloatingVariants: Variants = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, y: 0, scale: 1, transition: { duration: 0.15 } }
      };
    }
    return floatingVariants;
  }, [prefersReducedMotion]);

  return (
    <AnimatePresence>
      {isVisible && !isAtForm && (
        <motion.div 
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md pb-[env(safe-area-inset-bottom)]",
            "md:max-w-lg lg:max-w-xl",
            className
          )}
          variants={computedFloatingVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* الحاوية الرئيسية */}
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm md:backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg md:shadow-2xl shadow-black/10">
            
            {/* تفاصيل السعر المدمجة */}
            {deliveryFee > 0 && (
              <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 space-x-reverse text-gray-600 dark:text-gray-400">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>{productActions.product()} {formattedProductPrice} {currency}</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse text-gray-600 dark:text-gray-400">
                    <TruckIcon className="h-4 w-4" />
                    <span>
                      {productActions.delivery()} {isCalculatingDelivery ? (
                        <LoadingSpinner />
                      ) : (
                        `${formattedDeliveryFee} ${currency}`
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* زر الإجراء الرئيسي */}
            <motion.div 
              className="p-4"
              variants={pulseVariants}
              initial="initial"
              animate={canPurchase && !buyingNow && !prefersReducedMotion ? "animate" : "initial"}
              style={{ willChange: 'transform' }}
            >
              <button
                onClick={handleAction}
                disabled={buyingNow || (!canPurchase && !hasForm)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200",
                  "bg-gradient-to-r from-primary to-primary-darker",
                  "hover:from-primary-darker hover:to-primary",
                  "text-white font-bold text-lg",
                  "shadow-lg hover:shadow-xl",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                  "transform hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {/* الجانب الأيسر - الأيقونة والنص */}
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    {buyingNow ? (
                      <LoadingSpinner />
                    ) : isCalculatingDelivery ? (
                      <LoadingSpinner />
                    ) : hasForm ? (
                      <ArrowDownIcon className="h-6 w-6" />
                    ) : (
                      <SparklesIcon className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {buyingNow ? productActions.calculating() :
                       isCalculatingDelivery ? productActions.calculating() :
                       hasForm ? productActions.orderNow() :
                       productActions.buyNow()}
                    </div>
                    <div className="text-sm opacity-90">
                      {buyingNow ? productActions.calculating() :
                       isCalculatingDelivery ? productActions.calculating() :
                       hasForm ? productActions.scrollToForm() :
                       productActions.completeOrder()}
                    </div>
                  </div>
                </div>

                                 {/* الجانب الأيمن - السعر */}
                 <div className="text-left">
                   <div className="text-2xl font-bold">
                     {formattedTotalPrice} {currency}
                   </div>
                 </div>
              </button>
            </motion.div>

            {/* رسالة عدم التوفر */}
            {!canPurchase && !hasForm && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2 space-x-reverse text-red-600 dark:text-red-400">
                    <CheckIcon className="h-5 w-5" />
                    <span className="font-medium">غير متوفر حالياً</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ProductActions.displayName = 'ProductActions';

export { ProductActions };
