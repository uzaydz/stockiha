import React, { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      type: "spring",
      stiffness: 400,
      damping: 25,
      duration: 0.5
    }
  },
  exit: {
    opacity: 0,
    y: 100,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
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
      ease: "easeInOut"
    }
  }
};

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
      // البحث عن النموذج في الصفحة
      const formElement = document.querySelector('form') || 
                         document.querySelector('[data-form]') ||
                         document.querySelector('.form-container') ||
                         document.querySelector('[id*="form"]') ||
                         document.querySelector('[class*="form"]');
      
      if (!formElement) {
        setIsVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // إخفاء الزر العائم عندما يصبح النموذج مرئيًا
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
              setIsAtForm(true);
              setIsVisible(false);
            } else {
              setIsAtForm(false);
              setIsVisible(true);
            }
          });
        },
        {
          threshold: [0, 0.1, 0.25],
          rootMargin: '-50px 0px -50px 0px'
        }
      );

      observer.observe(formElement);

      return () => observer.disconnect();
    };

    const cleanup = observeForm();
    return cleanup;
  }, []);

  // معالج النقر - الانتقال للنموذج أو الشراء المباشر
  const handleAction = useCallback(() => {
    // إذا كان النموذج موجود، انتقل إليه
    const formElement = document.querySelector('form') || 
                       document.querySelector('[data-form]') ||
                       document.querySelector('.form-container') ||
                       document.querySelector('[id*="form"]') ||
                       document.querySelector('[class*="form"]');
    
    if (formElement) {
      formElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      // إخفاء الزر بعد الانتقال
      setIsVisible(false);
      setTimeout(() => setIsAtForm(true), 500);
    } else {
      // إذا لم يوجد نموذج، قم بالشراء المباشر
      if (!buyingNow && canPurchase) {
        onBuyNow();
      }
    }
  }, [buyingNow, canPurchase, onBuyNow]);

  // تحسين حالة التحميل
  const LoadingSpinner = memo(() => (
    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
  ));

  return (
    <AnimatePresence>
      {isVisible && !isAtForm && (
        <motion.div 
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md",
            "md:max-w-lg lg:max-w-xl",
            className
          )}
          variants={floatingVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* الحاوية الرئيسية */}
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-black/10">
            
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
              animate={canPurchase && !buyingNow ? "animate" : "initial"}
            >
              <button
                onClick={handleAction}
                disabled={buyingNow || (!canPurchase && !document.querySelector('form'))}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300",
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
                    ) : document.querySelector('form') ? (
                      <ArrowDownIcon className="h-6 w-6" />
                    ) : (
                      <SparklesIcon className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {buyingNow ? productActions.calculating() : 
                       isCalculatingDelivery ? productActions.calculating() : 
                       document.querySelector('form') ? productActions.orderNow() :
                       productActions.buyNow()}
                    </div>
                    <div className="text-sm opacity-90">
                      {buyingNow ? productActions.calculating() : 
                       isCalculatingDelivery ? productActions.calculating() : 
                       document.querySelector('form') ? productActions.scrollToForm() :
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
            {!canPurchase && !document.querySelector('form') && (
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
