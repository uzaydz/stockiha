import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// =================================================================
// 🚀 ULTRA OPTIMIZED IMAGE - مكون الصور فائق التحسين
// =================================================================

interface UltraOptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  placeholder?: 'blur' | 'empty' | 'skeleton';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

// =================================================================
// 🎯 Image Optimization Utilities
// =================================================================
const optimizeImageUrl = (
  src: string, 
  width?: number, 
  height?: number, 
  quality = 85, 
  format: 'webp' | 'avif' | 'auto' = 'auto'
): string => {
  if (!src) return '';
  
  try {
    // إذا كان الرابط نسبي، أضف البروتوكول
    const imageUrl = src.startsWith('http') ? src : `https:${src}`;
    const url = new URL(imageUrl);
    
    // إضافة معاملات التحسين
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    
    // تحديد التنسيق
    if (format === 'auto') {
      // استخدام WebP كافتراضي مع fallback
      if (supportsWebP()) {
        url.searchParams.set('f', 'webp');
      }
    } else {
      url.searchParams.set('f', format);
    }
    
    return url.toString();
  } catch (error) {
    return src;
  }
};

// فحص دعم WebP
const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// إنشاء placeholder SVG
const createPlaceholderSVG = (width: number, height: number, text: string): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="14">
        ${text}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// =================================================================
// 🎯 Intersection Observer Hook للتحميل المؤجل
// =================================================================
const useLazyLoading = (priority: boolean) => {
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || isInView) return;

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

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  return { isInView, imgRef };
};

// =================================================================
// 🚀 MAIN COMPONENT
// =================================================================
const UltraOptimizedImage: React.FC<UltraOptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  format = 'auto',
  placeholder = 'skeleton',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  fallbackSrc,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const { isInView, imgRef } = useLazyLoading(priority);

  // =================================================================
  // 🎯 تحسين الصورة
  // =================================================================
  const optimizedSrc = useMemo(() => {
    if (!src || !isInView) return '';
    return optimizeImageUrl(src, width, height, quality, format);
  }, [src, width, height, quality, format, isInView]);

  // =================================================================
  // 🎯 Placeholder
  // =================================================================
  const placeholderSrc = useMemo(() => {
    if (blurDataURL) return blurDataURL;
    
    if (placeholder === 'skeleton' && width && height) {
      return createPlaceholderSVG(width, height, alt || 'جاري التحميل...');
    }
    
    return '';
  }, [blurDataURL, placeholder, width, height, alt]);

  // =================================================================
  // 🎯 معالجات الأحداث
  // =================================================================
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    
    // محاولة استخدام fallback
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      return;
    }
    
    onError?.();
  }, [fallbackSrc, currentSrc, onError]);

  // =================================================================
  // 🎯 تحديث المصدر
  // =================================================================
  useEffect(() => {
    if (optimizedSrc && !hasError) {
      setCurrentSrc(optimizedSrc);
    }
  }, [optimizedSrc, hasError]);

  // =================================================================
  // 🎯 حالة الخطأ
  // =================================================================
  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={cn(
          "bg-gray-200 flex items-center justify-center text-gray-500 text-sm",
          className
        )}
        style={{ width, height }}
      >
        فشل تحميل الصورة
      </div>
    );
  }

  // =================================================================
  // 🎯 حالة عدم الرؤية (Lazy Loading)
  // =================================================================
  if (!isInView) {
    return (
      <div 
        ref={imgRef}
        className={cn("bg-gray-100", className)}
        style={{ width, height }}
      >
        {placeholderSrc && (
          <img
            src={placeholderSrc}
            alt=""
            className="w-full h-full object-cover opacity-50"
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  // =================================================================
  // 🚀 MAIN RENDER
  // =================================================================
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder أثناء التحميل */}
      {!isLoaded && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}
      
      {/* الصورة الرئيسية */}
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      
      {/* مؤشر التحميل */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

// =================================================================
// 🎯 مكون مبسط للاستخدام السريع
// =================================================================
export const FastImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, className, priority = false }) => (
  <UltraOptimizedImage
    src={src}
    alt={alt}
    className={className}
    priority={priority}
    placeholder="skeleton"
    quality={85}
    format="auto"
  />
);

// =================================================================
// 🎯 مكون للصور المربعة
// =================================================================
export const SquareImage: React.FC<{
  src: string;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, size, className, priority = false }) => (
  <UltraOptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={cn("aspect-square", className)}
    priority={priority}
    placeholder="skeleton"
    quality={90}
    format="auto"
  />
);

// =================================================================
// 🎯 مكون للصور المستطيلة
// =================================================================
export const RectangleImage: React.FC<{
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, width, height, className, priority = false }) => (
  <UltraOptimizedImage
    src={src}
    alt={alt}
    width={width}
    height={height}
    className={className}
    priority={priority}
    placeholder="skeleton"
    quality={85}
    format="auto"
  />
);

UltraOptimizedImage.displayName = 'UltraOptimizedImage';

export default UltraOptimizedImage;
