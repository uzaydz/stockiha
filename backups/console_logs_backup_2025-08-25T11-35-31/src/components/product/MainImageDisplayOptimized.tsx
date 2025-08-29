import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MainImageDisplayOptimizedProps {
  currentImage: string;
  productName: string;
  currentIndex: number;
  onImageLoad: () => void;
  onImageError: () => void;
  hasError?: boolean;
  isLoaded: boolean;
  className?: string;
}

/**
 * مكون عرض الصورة الرئيسية المحسن للغاية - بدون تعقيدات
 * مصمم خصيصاً للأداء العالي في الهواتف
 */
const MainImageDisplayOptimized = memo<MainImageDisplayOptimizedProps>(({
  currentImage,
  productName,
  currentIndex,
  onImageLoad,
  onImageError,
  hasError = false,
  isLoaded,
  className
}) => {
  
  const handleLoad = useCallback(() => {
    onImageLoad();
  }, [onImageLoad]);

  const handleError = useCallback(() => {
    onImageError();
  }, [onImageError]);

  if (hasError) {
    return (
      <div className={cn(
        "w-full h-full flex items-center justify-center bg-muted/20 rounded-xl",
        className
      )}>
        <div className="text-center text-muted-foreground">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">فشل في تحميل الصورة</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* مؤشر التحميل البسيط */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* الصورة */}
      <img
        src={currentImage}
        alt={`${productName} - صورة ${currentIndex + 1}`}
        className={cn(
          "w-full h-full object-contain transition-opacity duration-200",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={currentIndex === 0 ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        style={{
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  );
});

MainImageDisplayOptimized.displayName = 'MainImageDisplayOptimized';

export default MainImageDisplayOptimized;
