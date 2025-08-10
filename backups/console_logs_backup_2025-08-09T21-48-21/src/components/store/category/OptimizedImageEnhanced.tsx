import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptimizedImageProps } from './types';

// إعدادات الكاش المحسّنة
const MAX_CACHE_SIZE = 150;
const imageCache = new Map<string, HTMLImageElement>();
const loadingImages = new Set<string>();
const preloadedImages = new Set<string>();
const errorCache = new Set<string>();

// تنظيف الكاش بذكاء
const cleanupCache = () => {
  if (imageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    const oldEntries = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 3));
    oldEntries.forEach(([key]) => {
      imageCache.delete(key);
      preloadedImages.delete(key);
      errorCache.delete(key);
    });
  }
};

// تحميل سريع مع معالجة محسّنة للأخطاء
const preloadImageInstantly = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    // التحقق من الكاش
    if (imageCache.has(src)) {
      resolve(imageCache.get(src)!);
      return;
    }

    // التحقق من أخطاء سابقة
    if (errorCache.has(src)) {
      reject(new Error('Image previously failed to load'));
      return;
    }

    // التحقق من التحميل الجاري
    if (loadingImages.has(src)) {
      const checkInterval = setInterval(() => {
        if (imageCache.has(src)) {
          clearInterval(checkInterval);
          resolve(imageCache.get(src)!);
        } else if (errorCache.has(src)) {
          clearInterval(checkInterval);
          reject(new Error('Image failed to load'));
        }
      }, 10);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Image load timeout'));
      }, 5000);
      return;
    }

    loadingImages.add(src);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const cleanup = () => {
      loadingImages.delete(src);
      img.onload = null;
      img.onerror = null;
      img.onabort = null;
    };

    img.onload = () => {
      cleanup();
      imageCache.set(src, img);
      preloadedImages.add(src);
      cleanupCache();
      resolve(img);
    };

    img.onerror = img.onabort = () => {
      cleanup();
      errorCache.add(src);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
};

/**
 * مكون صورة محسّن مع دعم كامل للخصائص الجديدة
 */
const OptimizedImageEnhanced = memo<OptimizedImageProps>(({ 
  src, 
  alt, 
  className, 
  fallbackColor,
  priority = false,
  lazy = false,
  onLoad,
  onError,
  quality = 'auto',
  placeholder = 'skeleton',
  aspectRatio
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const [didFallback, setDidFallback] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer للتحميل التدريجي
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // بدء التحميل قبل الوصول بـ 50px
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // معالجة تحميل الصورة
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback((error: Error) => {
    setImageError(true);
    setImageLoaded(false);
    onError?.(error);
  }, [onError]);

  // بناء رابط محسّن لـ Supabase (render + مقاسات) مع ترميز المسار، بدون فرض format
  const buildOptimizedSrc = useCallback((input: string) => {
    try {
      if (!input) return input;
      const isSvg = /\.svg(\?|$)/i.test(input);
      if (isSvg) return input;
      if (input.includes('/storage/v1/object/public/')) {
        const url = new URL(input);
        const pathAfterPublic = url.pathname.split('/storage/v1/object/public/')[1];
        const encodedPath = pathAfterPublic
          .split('/')
          .map(seg => encodeURIComponent(seg))
          .join('/');
        const base = `${url.origin}/storage/v1/render/image/public/${encodedPath}`;
        const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const width = mobile ? 512 : 800;
        const qmap: any = { low: 60, medium: 80, high: 95 };
        const q = quality === 'auto' ? 75 : (qmap[quality] || 75);
        // لا نضيف format=webp لتفادي 400 على بعض الامتدادات/المسارات
        return `${base}?width=${width}&quality=${q}`;
      }
      return input;
    } catch {
      return input;
    }
  }, [quality]);

  // تحميل الصورة
  useEffect(() => {
    if (!src || !isInView) return;

    let isMounted = true;

    const loadImage = async () => {
      try {
        let optimizedSrc = buildOptimizedSrc(src);

        if (!isMounted) return;
        setCurrentSrc(optimizedSrc);
        setImageLoaded(false);
        setImageError(false);

        await preloadImageInstantly(optimizedSrc);
        
        if (isMounted) {
          handleImageLoad();
        }
      } catch (error) {
        if (isMounted) {
          handleImageError(error as Error);
        }
      }
    };

    if (priority) {
      // تحميل فوري للصور ذات الأولوية
      loadImage();
    } else {
      // تأخير بسيط للصور العادية
      const timer = setTimeout(loadImage, 50);
      return () => clearTimeout(timer);
    }

    return () => {
      isMounted = false;
    };
  }, [src, isInView, priority, quality, handleImageLoad, handleImageError, buildOptimizedSrc]);

  // تحديد نمط العنصر
  const containerStyle = aspectRatio ? { aspectRatio } : {};

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full", className)}
      style={containerStyle}
    >
      {/* Placeholder */}
      {!imageLoaded && !imageError && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          placeholder === 'skeleton' && "bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse",
          placeholder === 'blur' && "bg-muted/20 backdrop-blur-sm",
          placeholder === 'color' && fallbackColor && `bg-[${fallbackColor}]/20`
        )}>
          {placeholder === 'skeleton' && (
            <div className="w-8 h-8 bg-muted/40 rounded-full animate-pulse" />
          )}
        </div>
      )}

      {/* الصورة الرئيسية */}
      {isInView && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-all duration-500 ease-out",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={() => {
            // جرب العودة للرابط الأصلي (object) إذا فشل render لمرة واحدة
            if (!didFallback && src && currentSrc !== src) {
              setDidFallback(true);
              setImageLoaded(false);
              setImageError(false);
              setCurrentSrc(src);
            } else {
              handleImageError(new Error('Image load failed'));
            }
          }}
          loading={priority ? "eager" : "lazy"}
          // eslint-disable-next-line react/no-unknown-property
          fetchpriority={priority ? 'high' : undefined}
          decoding="async"
        />
      )}

      {/* حالة الخطأ */}
      {imageError && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          fallbackColor ? `bg-[${fallbackColor}]/20` : "bg-muted/20"
        )}>
          <div className="text-muted-foreground text-center">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">فشل في تحميل الصورة</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImageEnhanced.displayName = 'OptimizedImageEnhanced';

export { OptimizedImageEnhanced };
