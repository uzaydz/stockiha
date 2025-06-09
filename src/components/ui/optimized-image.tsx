import React, { useState, useEffect, useRef, ImgHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// =================================================================
// مكون محسن للصور مع التحميل المؤجل والضغط
// =================================================================

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading' | 'onError'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  quality?: number; // 1-100
  width?: number;
  height?: number;
  priority?: boolean; // تحميل فوري للصور المهمة
  placeholder?: 'blur' | 'empty' | React.ReactNode;
  blurDataURL?: string;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

// =================================================================
// مولد رابط صورة محسن (يمكن تخصيصه لخدمات CDN)
// =================================================================
function getOptimizedImageUrl(src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}): string {
  // إذا كان الرابط خارجي، نعيده كما هو
  if (src.startsWith('http') && !src.includes(window.location.hostname)) {
    return src;
  }

  // إذا كان الرابط من Supabase، نضيف معاملات التحسين
  if (src.includes('supabase')) {
    const url = new URL(src);
    
    if (options.width) {
      url.searchParams.set('width', options.width.toString());
    }
    if (options.height) {
      url.searchParams.set('height', options.height.toString());
    }
    if (options.quality) {
      url.searchParams.set('quality', options.quality.toString());
    }
    if (options.format) {
      url.searchParams.set('format', options.format);
    }
    
    return url.toString();
  }

  return src;
}

// =================================================================
// Hook للتحقق من دعم تنسيقات الصور الحديثة
// =================================================================
function useImageFormatSupport() {
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [supportsAVIF, setSupportsAVIF] = useState(false);

  useEffect(() => {
    // فحص دعم WebP
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = webpCanvas.height = 1;
    const webpSupported = webpCanvas.toDataURL('image/webp').startsWith('data:image/webp');
    setSupportsWebP(webpSupported);

    // فحص دعم AVIF
    const avifImage = new Image();
    avifImage.onload = () => setSupportsAVIF(true);
    avifImage.onerror = () => setSupportsAVIF(false);
    avifImage.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  }, []);

  return { supportsWebP, supportsAVIF };
}

// =================================================================
// Hook للتحميل المؤجل
// =================================================================
function useLazyLoading(ref: React.RefObject<HTMLElement>, enabled: boolean = true) {
  const [isInView, setIsInView] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !ref.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [enabled, ref]);

  return isInView;
}

// =================================================================
// المكون الرئيسي
// =================================================================
export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(({
  src,
  alt,
  fallbackSrc,
  quality = 85,
  width,
  height,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  objectFit = 'cover',
  className,
  onLoadStart,
  onLoadComplete,
  onError,
  ...props
}, ref) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const { supportsWebP, supportsAVIF } = useImageFormatSupport();
  const shouldLoad = useLazyLoading(containerRef, !priority);

  // تحديد أفضل تنسيق صورة مدعوم
  const bestFormat = supportsAVIF ? 'avif' : supportsWebP ? 'webp' : 'jpg';

  // إنشاء رابط الصورة المحسن
  useEffect(() => {
    if (!shouldLoad) return;

    const optimizedSrc = getOptimizedImageUrl(src, {
      width,
      height,
      quality,
      format: bestFormat,
    });

    setImageSrc(optimizedSrc);
  }, [src, width, height, quality, bestFormat, shouldLoad]);

  // معالج تحميل الصورة
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    onLoadComplete?.();
  };

  // معالج خطأ الصورة
  const handleImageError = () => {
    setImageError(true);
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setImageError(false);
    } else {
      const error = new Error(`Failed to load image: ${src}`);
      onError?.(error);
    }
  };

  // معالج بداية التحميل
  const handleLoadStart = () => {
    onLoadStart?.();
  };

  // رندر العنصر النائب
  const renderPlaceholder = () => {
    if (placeholder === 'empty') return null;
    
    if (placeholder === 'blur' && blurDataURL) {
      return (
        <img
          src={blurDataURL}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-300',
            objectFit && `object-${objectFit}`,
            imageLoaded ? 'opacity-0' : 'opacity-100'
          )}
          aria-hidden="true"
        />
      );
    }

    if (React.isValidElement(placeholder)) {
      return (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}>
          {placeholder}
        </div>
      );
    }

    // placeholder افتراضي
    return (
      <div className={cn(
        'absolute inset-0 bg-muted animate-pulse transition-opacity duration-300',
        imageLoaded ? 'opacity-0' : 'opacity-100'
      )} />
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {/* العنصر النائب */}
      {!imageLoaded && renderPlaceholder()}

      {/* الصورة الرئيسية */}
      {shouldLoad && imageSrc && (
        <img
          ref={ref || imgRef}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          onLoadStart={handleLoadStart}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFit && `object-${objectFit}`,
            imageLoaded ? 'opacity-100' : 'opacity-0',
            imageError && 'hidden'
          )}
          {...props}
        />
      )}

      {/* رسالة خطأ */}
      {imageError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          <div className="text-center">
            <div className="mb-2">⚠️</div>
            <div>فشل تحميل الصورة</div>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// =================================================================
// Hook مساعد للحصول على أحجام الصور المحسنة
// =================================================================
export function useResponsiveImageSizes(breakpoints: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}) {
  const { mobile = 320, tablet = 768, desktop = 1200 } = breakpoints;
  
  return `(max-width: ${tablet}px) ${mobile}px, (max-width: ${desktop}px) ${tablet}px, ${desktop}px`;
}

// =================================================================
// مكون للصور مع نسب عرض إلى ارتفاع ثابتة
// =================================================================
interface AspectRatioImageProps extends OptimizedImageProps {
  aspectRatio: number; // مثل 16/9 أو 4/3
}

export const AspectRatioImage = forwardRef<HTMLImageElement, AspectRatioImageProps>(({
  aspectRatio,
  className,
  ...props
}, ref) => {
  return (
    <div 
      className={cn('relative w-full', className)}
      style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
    >
      <OptimizedImage
        ref={ref}
        {...props}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
});

AspectRatioImage.displayName = 'AspectRatioImage';

export default OptimizedImage; 