import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageControlsProps } from '@/types/imageGallery';

const ImageControls: React.FC<ImageControlsProps> = ({
  totalImages,
  currentIndex,
  onNext,
  onPrevious,
  onGoToImage,
  isMobile,
  className
}) => {
  // معالجة محسنة للأزرار
  const handleNext = useCallback(() => {
    onNext();
    // إضافة haptic feedback
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(10);
    }
  }, [onNext, isMobile]);
  
  const handlePrevious = useCallback(() => {
    onPrevious();
    // إضافة haptic feedback
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(10);
    }
  }, [onPrevious, isMobile]);
  
  const handleGoToImage = useCallback((index: number) => {
    onGoToImage(index);
    // إضافة haptic feedback
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(5);
    }
  }, [onGoToImage, isMobile]);
  
  if (totalImages <= 1) return null;

  return (
    <div className={cn("relative", className)}>
      {/* أزرار التنقل المحسنة */}
      <motion.button 
        onClick={handlePrevious}
        className={cn(
          "absolute left-2 md:left-4 top-1/2 -translate-y-1/2 rounded-xl md:rounded-2xl",
          "bg-background/95 backdrop-blur-xl shadow-lg border border-border/50",
          "flex items-center justify-center transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
          isMobile 
            ? "w-10 h-10 opacity-90 hover:opacity-100 hover:scale-105" 
            : "w-10 h-10 md:w-12 md:h-12 opacity-0 group-hover:opacity-100 hover:bg-background hover:shadow-xl hover:scale-105"
        )}
        disabled={currentIndex === 0 && totalImages > 1 ? false : currentIndex === 0}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="الصورة السابقة"
      >
        <ChevronRight className={cn("text-foreground", isMobile ? "h-4 w-4" : "h-5 w-5 md:h-6 md:w-6")} />
      </motion.button>
      
      <motion.button 
        onClick={handleNext}
        className={cn(
          "absolute right-2 md:right-4 top-1/2 -translate-y-1/2 rounded-xl md:rounded-2xl",
          "bg-background/95 backdrop-blur-xl shadow-lg border border-border/50",
          "flex items-center justify-center transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
          isMobile 
            ? "w-10 h-10 opacity-90 hover:opacity-100 hover:scale-105" 
            : "w-10 h-10 md:w-12 md:h-12 opacity-0 group-hover:opacity-100 hover:bg-background hover:shadow-xl hover:scale-105"
        )}
        disabled={currentIndex === totalImages - 1 && totalImages > 1 ? false : currentIndex === totalImages - 1}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="الصورة التالية"
      >
        <ChevronLeft className={cn("text-foreground", isMobile ? "h-4 w-4" : "h-5 w-5 md:h-6 md:w-6")} />
      </motion.button>

      {/* مؤشر الموقع المحسن */}
      <div className={cn(
        "absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-background/95 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-border/50 shadow-lg",
        "transition-all duration-300",
        isMobile ? "opacity-90" : "opacity-0 group-hover:opacity-100"
      )}>
        {Array.from({ length: totalImages }, (_, idx) => (
          <motion.button
            key={idx}
            onClick={() => handleGoToImage(idx)}
            className={cn(
              "rounded-full transition-all duration-300 cursor-pointer",
              "focus:outline-none focus:ring-1 focus:ring-primary/30",
              idx === currentIndex 
                ? "bg-primary w-4 h-1.5 shadow-sm" 
                : "bg-muted-foreground/40 hover:bg-muted-foreground/70 hover:scale-125 w-1.5 h-1.5"
            )}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`الصورة ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(ImageControls, (prevProps, nextProps) => {
  // تحسين الأداء بمنع re-render غير ضرورية
  return (
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.totalImages === nextProps.totalImages &&
    prevProps.isMobile === nextProps.isMobile
  );
});
