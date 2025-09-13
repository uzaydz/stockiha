import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getCdnImageUrl, deviceAdjustedWidth } from '@/lib/image-cdn';

// =================================================================
// 🚀 PERFORMANCE OPTIMIZED IMAGE COMPONENT
// 
// يحل مشاكل PageSpeed Insights:
// ✅ Properly size images
// ✅ Serve images in next-gen formats
// ✅ Defer offscreen images
// ✅ Image elements have explicit width and height
// =================================================================

interface PerformanceOptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // للصور المهمة above-the-fold
  sizes?: string; // للـ responsive images
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: React.CSSProperties['objectPosition'];
  quality?: number; // 1-100
  fallbackSrc?: string; // صورة احتياطية في حالة الفشل
  onLoadComplete?: () => void;
  onError?: () => void;
  /**
   * عندما تكون true، يتم ملء حاوية الصورة 100% من عرض وارتفاع الأب
   * مفيد عندما يكون لديك عنصر أب مع aspect-ratio وتريد أن تغطي الصورة كامل البطاقة
   */
  fill?: boolean;
}

const PerformanceOptimizedImage = React.memo(({
  src,
  alt,
  width = 400,
  height = 300,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder = 'blur',
  blurDataURL,
  className,
  objectFit = 'cover',
  objectPosition = 'center',
  quality = 75,
  fallbackSrc,
  onLoadComplete,
  onError,
  fill = false,
  ...props
}: PerformanceOptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // =================================================================
  // 🎯 Intersection Observer for lazy loading
  // =================================================================
  useEffect(() => {
    if (priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Load 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, isInView]);

  // =================================================================
  // 🎯 Optimized image source generation - معطل مؤقتاً بسبب Free Plan
  // =================================================================
  const generateOptimizedSrc = useCallback((originalSrc: string, w: number, q: number = quality) => {
    const adjusted = deviceAdjustedWidth(w || width);
    // Route via Cloudflare Worker image CDN when possible
    return getCdnImageUrl(originalSrc, { width: adjusted, quality: q, fit: objectFit === 'contain' ? 'contain' : 'cover', format: 'auto' });
  }, [objectFit, quality, width]);

  // =================================================================
  // 🎯 Responsive image sources
  // =================================================================
  const generateSrcSet = useCallback((originalSrc: string) => {
    const widths = [320, 480, 640, 768, 1024, 1280];
    return widths
      .filter(w => w <= (width ? width * 2 : 1024))
      .map(w => `${generateOptimizedSrc(originalSrc, w)} ${w}w`)
      .join(', ');
  }, [generateOptimizedSrc, width]);

  // =================================================================
  // 🎯 Event handlers
  // =================================================================
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // =================================================================
  // 🎯 Placeholder blur data URL
  // =================================================================
  const defaultBlurDataURL = `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f0f0f0" offset="0%"/>
          <stop stop-color="#e0e0e0" offset="50%"/>
          <stop stop-color="#f0f0f0" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
    </svg>
  `)}`;

  // =================================================================
  // 🎯 Styles
  // =================================================================
  const containerStyles = {
    position: 'relative' as const,
    width: fill ? '100%' : (width ? `${width}px` : '100%'),
    height: fill ? '100%' : (height ? `${height}px` : 'auto'),
    overflow: 'hidden' as const,
    backgroundColor: placeholder === 'blur' ? '#f0f0f0' : 'transparent',
  };

  const imageStyles = {
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  };

  const placeholderStyles = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
    filter: 'blur(2px)',
    transform: 'scale(1.05)', // Slight scale to hide blur edges
  };

  // =================================================================
  // 🚀 Rendering
  // =================================================================

  // Error state with fallback
  if (hasError && fallbackSrc) {
    return (
      <div style={containerStyles} className={cn('overflow-hidden', className)}>
        <img
          src={fallbackSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          style={imageStyles}
          loading="lazy"
        />
      </div>
    );
  }

  // Error state without fallback
  if (hasError) {
    return (
      <div 
        style={{
          ...containerStyles,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666'
        }}
        className={cn('text-sm', className)}
        role="img"
        aria-label={alt}
      >
        صورة غير متاحة
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      style={containerStyles}
      className={cn('overflow-hidden', className)}
    >
      {/* Placeholder/Blur image */}
      {placeholder === 'blur' && !isLoaded && (
        <img
          src={blurDataURL || defaultBlurDataURL}
          alt=""
          style={placeholderStyles}
          aria-hidden="true"
        />
      )}
      
      {/* Main optimized image */}
      {isInView && (
        <img
          src={generateOptimizedSrc(src, width)}
          srcSet={generateSrcSet(src)}
          sizes={sizes}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          style={imageStyles}
          loading={priority ? 'eager' : 'lazy'}
          // تحسين LCP: إعطاء أولوية عالية للصورة الحرجة
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
      
      {/* Loading placeholder for non-blur mode */}
      {placeholder === 'empty' && !isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoaded ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
          aria-hidden="true"
        >
          <div 
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid #ddd',
              borderTop: '2px solid #666',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}
      
             {/* CSS for loading spinner */}
       <style>{`
         @keyframes spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
         }
       `}</style>
    </div>
  );
});

PerformanceOptimizedImage.displayName = 'PerformanceOptimizedImage';

export default PerformanceOptimizedImage;

// =================================================================
// 🎯 Usage Examples:
// =================================================================

/*
// 1. Hero image (priority)
<PerformanceOptimizedImage
  src="/hero-image.jpg"
  alt="صورة البطل"
  width={1200}
  height={600}
  priority={true}
  className="w-full h-auto"
  sizes="100vw"
/>

// 2. Product image (lazy loaded)
<PerformanceOptimizedImage
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  sizes="(max-width: 768px) 100vw, 300px"
  fallbackSrc="/placeholder-product.jpg"
/> */
