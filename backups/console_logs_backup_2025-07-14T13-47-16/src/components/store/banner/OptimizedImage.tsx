import React, { useState, useCallback } from 'react';
import { Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImageProps } from './types';

/**
 * مكون صورة محسّن مع lazy loading وإدارة الحالات
 * يتضمن skeleton loader وحالة الخطأ
 */
const OptimizedImage = React.memo<OptimizedImageProps>(({ 
  src, 
  alt, 
  className, 
  onLoad 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Skeleton loader - يظهر أثناء التحميل */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse rounded-2xl" />
      )}
      
      {/* الصورة الرئيسية */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-700 ease-out",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
      
      {/* حالة الخطأ - تظهر عند فشل تحميل الصورة */}
      {hasError && (
        <div className="absolute inset-0 bg-muted/20 flex items-center justify-center rounded-2xl">
          <div className="text-muted-foreground text-center">
            <Gem className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">فشل في تحميل الصورة</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage; 