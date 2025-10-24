import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Gem, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImageProps } from './types';

/**
 * مكون صورة محسّن ومبسط مع fallback قوي
 * يحل مشكلة الصور البيضاء
 */
const OptimizedImage = React.memo<OptimizedImageProps>(({ 
  src, 
  alt, 
  className, 
  onLoad,
  widths = [360, 512, 768, 1024, 1280],
  baseWidth,
  quality = 75,
  priority = true,
  sizes,
  fit = 'contain',
  objectPosition = 'top'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [imgSrcSet, setImgSrcSet] = useState<string | undefined>(undefined);
  const [fallbackAttempts, setFallbackAttempts] = useState(0);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad, currentSrc]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
  }, [currentSrc]);

  // تحويل رابط Supabase إلى render مع fallback قوي
  const computeTransformed = useCallback((inputSrc: string) => {
    try {
      if (!inputSrc || typeof inputSrc !== 'string') {
        return { href: '', srcSet: undefined };
      }

      // إذا كان الرابط فارغاً أو غير صالح
      if (inputSrc.trim() === '' || inputSrc === 'null' || inputSrc === 'undefined') {
        return { href: '', srcSet: undefined };
      }

      // إذا كان SVG، استخدمه مباشرة
      if (inputSrc.includes('.svg') || inputSrc.includes('data:')) {
        return { href: inputSrc, srcSet: undefined };
      }

      // إذا كان رابط Supabase storage
      if (inputSrc.includes('/storage/v1/object/public/')) {
        try {
          const url = new URL(inputSrc);
          const pathAfterPublic = url.pathname.split('/storage/v1/object/public/')[1];
          
          if (!pathAfterPublic) {
            return { href: inputSrc, srcSet: undefined };
          }

          const encodedPath = pathAfterPublic
            .split('/')
            .map(seg => encodeURIComponent(seg))
            .join('/');
          
          const base = `${url.origin}/storage/v1/render/image/public/${encodedPath}`;
          const chosenBase = baseWidth || (typeof window !== 'undefined' && window.innerWidth < 768 ? 512 : 800);
          
          const srcSet = widths
            .map(w => `${base}?width=${w}&quality=${quality} ${w}w`)
            .join(', ');
          
          return { 
            href: `${base}?width=${chosenBase}&quality=${quality}`, 
            srcSet 
          };
        } catch (urlError) {
          return { href: inputSrc, srcSet: undefined };
        }
      }

      // إذا كان رابط عادي، استخدمه مباشرة
      return { href: inputSrc, srcSet: undefined };
    } catch (error) {
      return { href: inputSrc || '', srcSet: undefined };
    }
  }, [baseWidth, widths, quality]);

  // إعداد الصورة مع fallback
  useEffect(() => {
    if (!src) {
      setCurrentSrc('');
      setIsLoaded(false);
      setHasError(false);
      return;
    }
    
    const transformed = computeTransformed(src);
    
    // لا نعيد تعيين isLoaded إذا كانت الصورة نفسها
    if (transformed.href !== currentSrc) {
      setCurrentSrc(transformed.href);
      setImgSrcSet(transformed.srcSet);
      setIsLoaded(false);
      setHasError(false);
      setFallbackAttempts(0);
    }
  }, [src, computeTransformed, currentSrc]);

  // معالجة الخطأ مع fallback محسن
  const handleImageError = useCallback(() => {
    // إذا كان هذا أول محاولة وكان الرابط محول، جرب الرابط الأصلي
    if (fallbackAttempts === 0 && currentSrc !== src && src) {
      setFallbackAttempts(1);
      setCurrentSrc(src);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    
    // إذا كان هذا fallback ثاني وكان رابط Supabase، جرب بدون تحويل
    if (fallbackAttempts === 1 && src && src.includes('/storage/v1/object/public/')) {
      setFallbackAttempts(2);
      // إزالة أي معاملات من الرابط
      const cleanUrl = src.split('?')[0];
      setCurrentSrc(cleanUrl);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    
    // محاولة ثالثة: إضافة timestamp لتجاوز cache
    if (fallbackAttempts === 2 && src) {
      setFallbackAttempts(3);
      const urlWithTimestamp = src + (src.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      setCurrentSrc(urlWithTimestamp);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    
    // إذا فشلت جميع المحاولات
    setHasError(true);
    setIsLoaded(false);
  }, [currentSrc, src, fallbackAttempts]);

  // إذا لم يكن هناك رابط صورة
  if (!src || src.trim() === '') {
    return (
      <div className={cn(
        "w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl",
        className
      )}>
        <div className="text-center text-muted-foreground/60">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد صورة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full optimized-image-container">
      {/* Skeleton loader - يظهر أثناء التحميل */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse rounded-2xl flex items-center justify-center z-10">
          <div className="w-8 h-8 bg-muted/40 rounded-full animate-pulse" />
        </div>
      )}
      
      {/* الصورة الرئيسية */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "optimized-image w-full h-full transition-all duration-500 ease-out",
            fit === 'contain' ? "object-contain" : "object-cover",
            isLoaded ? "opacity-100" : "opacity-0",
            "bg-white", // خلفية بيضاء للصور الشفافة
            className
          )}
          style={{ 
            objectPosition,
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onLoad={handleLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes || "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 512px"}
          srcSet={imgSrcSet}
          crossOrigin="anonymous"
        />
      )}

      {/* حالة الخطأ */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-2xl z-20">
          <div className="text-center text-red-600 dark:text-red-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium">فشل في تحميل الصورة</p>
            <p className="text-xs opacity-70 mt-1">يرجى المحاولة مرة أخرى</p>
            {/* إظهار رابط الصورة للتشخيص */}
            <p className="text-xs opacity-50 mt-2 break-all max-w-xs">{currentSrc}</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
