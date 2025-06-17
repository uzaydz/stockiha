import React, { useState, useEffect, useRef, ImgHTMLAttributes, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

// =================================================================
// الواجهات والأنواع
// =================================================================
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // للصور المهمة التي تحتاج تحميل فوري
  placeholder?: string; // صورة placeholder
  onLoad?: () => void;
  onError?: () => void;
  ref?: React.ForwardedRef<HTMLImageElement>;
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
// مكون الصورة المحسنة مع دعم WebP و Lazy Loading
// =================================================================
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  placeholder,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { supportsWebP } = useImageFormatSupport();

  // تحسين مسار الصورة لدعم WebP
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    if (!originalSrc || typeof originalSrc !== 'string') return '';
    
    // إذا كانت الصورة بالفعل WebP، استخدمها مباشرة
    if (originalSrc.includes('.webp')) {
      return originalSrc;
    }
    
    // إذا كان المتصفح يدعم WebP، حاول العثور على نسخة WebP
    if (supportsWebP) {
      // استبدال امتداد الصورة بـ WebP
      const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return webpSrc;
    }
    
    return originalSrc;
  }, [supportsWebP]);

  // Intersection Observer للـ lazy loading
  useEffect(() => {
    if (!src || typeof src !== 'string') {
      return;
    }

    if (priority) {
      // تحميل فوري للصور المهمة
      setImageSrc(getOptimizedSrc(src));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(getOptimizedSrc(src));
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // بدء التحميل قبل 50px من ظهور الصورة
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, priority, getOptimizedSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    // fallback إلى الصورة الأصلية إذا فشل تحميل WebP
    if (imageSrc && typeof imageSrc === 'string' && imageSrc.includes('.webp') && src && typeof src === 'string') {
      setImageSrc(src);
    } else {
      onError?.();
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${hasError ? 'opacity-50' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      
      {/* مؤشر التحميل */}
      {!isLoaded && !hasError && imageSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      )}
      
      {/* مؤشر الخطأ */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
    </div>
  );
}

// =================================================================
// مكون الصورة المحسنة مع forwardRef للتوافق مع الكود الموجود
// =================================================================
export const OptimizedImageWithRef = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (props, ref) => {
    return <OptimizedImage {...props} />;
  }
);

OptimizedImageWithRef.displayName = 'OptimizedImageWithRef';

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
