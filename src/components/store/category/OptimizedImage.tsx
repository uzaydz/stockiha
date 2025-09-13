import { useState, useEffect, useRef, memo } from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCdnImageUrl } from '@/lib/image-cdn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackColor?: string;
  priority?: boolean;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// إنشاء مخزن للصور مع preloading فوري
const MAX_CACHE_SIZE = 100;
const imageCache = new Map<string, HTMLImageElement>();
const loadingImages = new Set<string>();
const preloadedImages = new Set<string>();

// تنظيف الكاش عند الوصول للحد الأقصى
const cleanupCache = () => {
  if (imageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    const oldEntries = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 3));
    oldEntries.forEach(([key]) => {
      imageCache.delete(key);
      preloadedImages.delete(key);
    });
  }
};

// دالة تحميل سريعة جداً مع preloading فوري
const preloadImageInstantly = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    // التحقق من الكاش أولاً
    if (imageCache.has(src)) {
      resolve(imageCache.get(src)!);
      return;
    }

    // التحقق من التحميل الجاري
    if (loadingImages.has(src)) {
      const checkInterval = setInterval(() => {
        if (imageCache.has(src)) {
          clearInterval(checkInterval);
          resolve(imageCache.get(src)!);
        }
      }, 10); // فحص سريع جداً كل 10ms
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!imageCache.has(src)) {
          reject(new Error('Timeout loading image'));
        }
      }, 5000);
      return;
    }

    loadingImages.add(src);
    
    const img = new Image();
    
    img.onload = () => {
      cleanupCache();
      imageCache.set(src, img);
      preloadedImages.add(src);
      loadingImages.delete(src);
      resolve(img);
    };
    
    img.onerror = () => {
      loadingImages.delete(src);
      reject(new Error('Failed to load image'));
    };
    
    // تحسينات للسرعة القصوى
    img.crossOrigin = 'anonymous';
    img.decoding = 'sync'; // تغيير إلى sync للسرعة
    img.loading = 'eager'; // تحميل فوري
    
    img.src = src;
  });
};

// preload جميع الصور في الخلفية فوراً
const preloadAllVisibleImages = (images: string[]) => {
  images.forEach(src => {
    if (!preloadedImages.has(src) && !loadingImages.has(src)) {
      preloadImageInstantly(src).catch(() => {
        // تجاهل الأخطاء في preloading
      });
    }
  });
};

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  fallbackColor,
  priority = false
}: OptimizedImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  // بدء التحميل فوراً بدون انتظار
  useEffect(() => {
    if (!src) return;

    let isMounted = true;

    const loadImageImmediately = async () => {
      try {
        // تحضير الـ src
        let optimizedSrc = getCdnImageUrl(src, { width: 512, quality: 75, fit: 'cover' });

        if (!isMounted) return;
        setCurrentSrc(optimizedSrc);

        // تحميل فوري
        setImageLoaded(false);
        setImageError(false);

        const loadedImage = await preloadImageInstantly(optimizedSrc);
        
        if (isMounted) {
          setImageLoaded(true);
          setImageError(false);
        }
      } catch (error) {
        if (isMounted) {
          setImageError(true);
          setImageLoaded(false);
        }
      }
    };

    // تحميل فوري بدون تأخير
    loadImageImmediately();

    return () => {
      isMounted = false;
    };
  }, [src]);

  // preload الصور المجاورة للسرعة الإضافية
  useEffect(() => {
    if (typeof window !== 'undefined' && src) {
      // محاولة العثور على الصور المجاورة وتحميلها مسبقاً
      const findNearbyImages = () => {
        const allImages = Array.from(document.querySelectorAll('img[src*="categories"]'))
          .map(img => (img as HTMLImageElement).src)
          .filter(imgSrc => imgSrc && imgSrc !== src);
        
        if (allImages.length > 0) {
          // preload أول 5 صور مجاورة
          preloadAllVisibleImages(allImages.slice(0, 5));
        }
      };

      // تأخير قصير جداً لإيجاد الصور المجاورة
      const timeoutId = setTimeout(findNearbyImages, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [src]);

  // معالجة تحديثات الفئات مع سرعة
  useEffect(() => {
    const handleCategoriesUpdate = (event: CustomEvent) => {
      if (src && event.detail?.operation === 'update') {
        // إزالة من الكاش وإعادة التحميل فوراً
        imageCache.delete(src);
        imageCache.delete(currentSrc);
        preloadedImages.delete(src);
        preloadedImages.delete(currentSrc);
        setImageLoaded(false);
        
        // إعادة تحميل فورية
        const newSrc = `${src.split('?')[0]}?v=${Date.now()}`;
        setCurrentSrc(newSrc);
        
        preloadImageInstantly(newSrc)
          .then(() => setImageLoaded(true))
          .catch(() => setImageError(true));
      }
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdate as EventListener);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdate as EventListener);
  }, [src, currentSrc]);

  // تنظيف الذاكرة
  useEffect(() => {
    return () => {
      if (Math.random() < 0.05) { // 5% احتمال التنظيف
        cleanupCache();
      }
    };
  }, []);

  // مكون التعامل مع الأخطاء
  if (imageError || !src) {
    return (
      <div className={cn(
        "w-full h-full bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
        fallbackColor || 'from-primary/15 via-secondary/10 to-primary/5'
      )}>
        {/* تأثيرات خلفية راقية */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-radial from-white/10 to-transparent rounded-full -translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-radial from-primary/10 to-transparent rounded-full translate-x-12 translate-y-12" />
        
        <div className="relative w-28 h-28 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
          <Layers className="relative h-14 w-14 text-white drop-shadow-xl" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      className="w-full h-full relative bg-gradient-to-br from-muted/5 to-muted/5 overflow-hidden"
    >
      {/* Skeleton سريع - فقط عند التحميل */}
      {!imageLoaded && currentSrc && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-background/10 to-muted/10">
          {/* تأثير shimmer سريع */}
          <div 
            className="absolute inset-0 opacity-50" 
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 1s infinite'
            }} 
          />
          
          {/* نقاط متحركة سريعة */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex space-x-1">
              {[0, 0.1, 0.2].map((delay, i) => (
                <div 
                  key={i}
                  className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" 
                  style={{animationDelay: `${delay}s`, animationDuration: '0.8s'}} 
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* الصورة الفعلية */}
      {currentSrc && (
        <div className="w-full h-full flex items-center justify-center p-3 relative"> {/* تقليل padding */}
          <div className={cn(
            "relative w-full h-full rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 bg-gradient-to-br from-white/10 to-white/5", // تحسين التصميم
            imageLoaded ? "scale-100 opacity-100" : "scale-95 opacity-0",
            "transition-all duration-300 ease-out"
          )}>
            {/* خلفية ناعمة للصورة */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-background/30 to-muted/10" />
            
            {/* حاوية الصورة مع padding داخلي */}
            <div className="relative w-full h-full p-2 flex items-center justify-center"> {/* padding أقل */}
              <img 
                src={currentSrc} 
                alt={alt}
                className={cn(
                  "max-w-full max-h-full object-contain transition-all duration-200", // object-contain لعرض كامل
                  imageLoaded ? "opacity-100" : "opacity-0",
                  "group-hover:scale-105",
                  className
                )}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                onLoad={() => {
                  setImageLoaded(true);
                }}
                onError={() => {
                  setImageError(true);
                }}
                style={{
                  willChange: 'auto',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain' // مهم: عرض كامل للصورة
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };
