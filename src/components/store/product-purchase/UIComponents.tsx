import React from 'react';
import { Loader2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/lib/api/products';
import ProductInfo from '@/components/store/product/ProductInfo';
import ProductGallery from '@/components/store/product/ProductGallery';
import ProductFeatures from '@/components/store/product/ProductFeatures';
import ProductOptions from '@/components/store/product/ProductOptions';
import PurchaseTimer from '@/components/store/PurchaseTimer';

// مكون فرعي لعرض جزء المعلومات الرئيسية للمنتج
export const ProductMainInfo = ({ product, calculatePrice }: { product: Product | null, calculatePrice: () => number }) => {
  if (!product) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProductInfo 
        product={product as any}
        currentPrice={calculatePrice()}
      />
    </motion.div>
  );
};

// مكون فرعي لعرض العداد التنازلي
export const ProductTimerSection = ({ timerConfig }: { timerConfig: any }) => {
  // إذا لم يكن هناك تكوين للمؤقت أو لم يكن مفعلاً
  if (!timerConfig || !timerConfig.enabled || !timerConfig.endDate) {
    return null;
  }
  
  // استخدام textAbove أو message أو النص الافتراضي
  const timerTextAbove = timerConfig.textAbove || timerConfig.message || "العرض ينتهي خلال:";
  const timerTextBelow = timerConfig.textBelow || "سارع بالطلب قبل انتهاء العرض - الكمية محدودة";
  
  // استخدام تعليمة key لإجبار React على إعادة رسم المكون عند تغير البيانات
  return (
    <motion.div
      key={`timer-${timerConfig.endDate}`}
      className="mb-6 border border-primary/20 rounded-xl overflow-hidden shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PurchaseTimer 
        endDate={timerConfig.endDate} 
        textAbove={timerTextAbove} 
        textBelow={timerTextBelow} 
      />
    </motion.div>
  );
};

// مكون الصورة مع تأثيرات
export const ProductGalleryWithAnimation = ({ mainImage, additionalImages, productName }: { mainImage: string, additionalImages: string[], productName: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <ProductGallery 
        mainImage={mainImage}
        additionalImages={additionalImages}
        productName={productName}
      />
    </motion.div>
  );
};

// مكون لعرض جزء المميزات مع تأثيرات
export const ProductFeaturesWithAnimation = ({
  hasFastShipping,
  hasMoneyBack,
  hasQualityGuarantee,
  fastShippingText,
  moneyBackText,
  qualityGuaranteeText
}: {
  hasFastShipping: boolean;
  hasMoneyBack: boolean;
  hasQualityGuarantee: boolean;
  fastShippingText?: string;
  moneyBackText?: string;
  qualityGuaranteeText?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <ProductFeatures 
        hasFastShipping={hasFastShipping}
        hasMoneyBack={hasMoneyBack}
        hasQualityGuarantee={hasQualityGuarantee}
        fastShippingText={fastShippingText}
        moneyBackText={moneyBackText}
        qualityGuaranteeText={qualityGuaranteeText}
      />
    </motion.div>
  );
};

// مكون لعرض خيارات المنتج (الألوان والمقاسات) مع تأثيرات
export const ProductOptionsWithAnimation = (props: any) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <ProductOptions {...props} />
    </motion.div>
  );
};

// مكون لعرض شريط التقدم عند التحميل
export const LoadingProgressBar = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed top-0 left-0 right-0 h-1 z-50 bg-primary-foreground overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ 
              width: ["0%", "30%", "70%", "90%"],
              transition: { 
                times: [0, 0.3, 0.7, 0.9],
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Fallback component for Suspense
export const SuspenseFallback = () => (
  <div className="flex items-center justify-center p-8 w-full">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <span className="ml-2 text-sm text-muted-foreground">جاري التحميل...</span>
  </div>
);

// مكون لعرض حالة التحميل
export const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-[60vh]">
    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
    <motion.span 
      className="text-muted-foreground text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      جاري تحميل المنتج...
    </motion.span>
  </div>
);

// مكون لعرض حالة الخطأ
export const ErrorState = ({ error, onBack }: { error: string, onBack: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[60vh]">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <h2 className="text-2xl font-bold text-destructive mb-4">عذراً، حدث خطأ</h2>
      <p className="text-muted-foreground mb-6">{error}</p>
      <button 
        onClick={onBack}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        العودة للخلف
      </button>
    </motion.div>
  </div>
);

// مكون للزر اللاصق
export const StickyButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-4 right-4 z-50 md:hidden"
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <div className="relative">
        {/* تأثير التوهج في الخلفية */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-xl blur-lg animate-pulse" />
        
        <button
          onClick={onClick}
          className="relative w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-primary to-primary-darker text-primary-foreground rounded-xl shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
        >
          {/* تأثير الموجة عند الضغط */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          
          {/* محتوى الزر */}
          <div className="relative flex items-center gap-3">
            <div className="p-1 bg-white/20 rounded-full">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">{t("إرسال الطلب")}</span>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
          
          {/* تأثير الحدود المتحركة */}
          <div className="absolute inset-0 rounded-xl border-2 border-white/30 animate-pulse" />
        </button>
      </div>
    </motion.div>
  );
};
