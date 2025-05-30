// إعدادات محسنة للحركات - تحسين الأداء
export const motionConfig = {
  // حركات أساسية محسنة
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" }
  },
  
  slideUpFast: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: "easeOut" }
  },
  
  // للكروت والمكونات التفاعلية
  cardHover: {
    whileHover: { scale: 1.02 },
    transition: { duration: 0.2, ease: "easeOut" }
  },
  
  // للمكونات التي تظهر عند السكرول
  viewportAnimation: {
    viewport: { once: true, margin: "-50px", amount: 0.3 },
    transition: { duration: 0.5, ease: "easeOut" }
  },
  
  // حركات مبسطة للموبايل
  mobileOptimized: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  }
};

// تحديد ما إذا كنا على جهاز موبايل لتبسيط الحركات
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

// دالة للحصول على إعدادات الحركة المناسبة
export const getMotionProps = (animationType: keyof typeof motionConfig) => {
  if (isMobile()) {
    return motionConfig.mobileOptimized;
  }
  return motionConfig[animationType];
};