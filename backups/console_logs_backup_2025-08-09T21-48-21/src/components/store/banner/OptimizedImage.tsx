import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // تحويل رابط Supabase إلى render (مع أحجام متعددة)
  const computeTransformed = useCallback((inputSrc: string) => {
    try {
      if (!inputSrc) return { href: inputSrc, srcSet: undefined as string | undefined };
      const isSvg = /\.svg(\?|$)/i.test(inputSrc);
      if (isSvg) return { href: inputSrc, srcSet: undefined };
      if (inputSrc.includes('/storage/v1/object/public/')) {
        const url = new URL(inputSrc);
        const pathAfterPublic = url.pathname.split('/storage/v1/object/public/')[1];
        const encodedPath = pathAfterPublic
          .split('/')
          .map(seg => encodeURIComponent(seg))
          .join('/');
        const base = `${url.origin}/storage/v1/render/image/public/${encodedPath}`;
        const chosenBase = baseWidth || (typeof window !== 'undefined' && window.innerWidth < 768 ? 512 : 800);
        const srcSet = widths
          .map(w => `${base}?width=${w}&quality=${quality} ${w}w`).join(', ');
        return { href: `${base}?width=${chosenBase}&quality=${quality}`, srcSet };
      }
      return { href: inputSrc, srcSet: undefined };
    } catch {
      return { href: inputSrc, srcSet: undefined };
    }
  }, []);

  const originalSrc = src;
  const transformed = computeTransformed(src);

  const [imgSrc, setImgSrc] = useState<string>(transformed.href);
  const [imgSrcSet, setImgSrcSet] = useState<string | undefined>(transformed.srcSet);

  useEffect(() => {
    const t = computeTransformed(src);
    setImgSrc(t.href);
    setImgSrcSet(t.srcSet);
    setIsLoaded(false);
    setHasError(false);
  }, [src, computeTransformed]);

  return (
    <div className="relative w-full h-full">
      {/* Skeleton loader - يظهر أثناء التحميل */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse rounded-2xl" />
      )}
      
      {/* الصورة الرئيسية */}
      <img
        src={imgSrc}
        alt={alt}
        className={cn(
          "w-full h-full transition-all duration-700 ease-out",
          fit === 'contain' ? "object-contain" : "object-cover",
          `object-${objectPosition}`,
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        style={{ objectPosition }}
        onLoad={handleLoad}
        onError={() => {
          // جرّب الرجوع للرابط الأصلي إذا فشل render
          if (imgSrc !== originalSrc) {
            setImgSrc(originalSrc);
            setImgSrcSet(undefined);
            setHasError(false);
            setIsLoaded(false);
          } else {
            handleError();
          }
        }}
        loading={priority ? 'eager' : 'lazy'}
        // React لا يدعم fetchPriority مُعرّفاً بشكله القياسي بعد؛ المعيار يتطلب lowercase
        // eslint-disable-next-line react/no-unknown-property
        fetchpriority={priority ? 'high' : undefined}
        decoding="async"
        sizes={sizes || "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 512px"}
        srcSet={imgSrcSet}
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
