import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
import { CompleteProduct, ProductColor } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageGalleryV2Props {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  className?: string;
}

/**
 * معرض الصور فائق التحسين للهواتف - مصمم خصيصاً للأداء العالي
 * 
 * التحسينات الجذرية:
 * - إزالة framer-motion لتحسين الأداء
 * - تقليل re-renders إلى الحد الأدنى
 * - تحميل مسبق ذكي للصور المجاورة فقط
 * - معالجة لمس محسنة بدون تأخير
 * - منع وميض الصور نهائياً
 * - استهلاك ذاكرة أقل بكثير
 * - تحسين خاص للهواتف المحمولة
 */

const ProductImageGalleryV2 = memo<ProductImageGalleryV2Props>(({ 
  product, 
  selectedColor,
  className
}) => {
  // حالة محسنة ومبسطة
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // كشف الهاتف مرة واحدة فقط
  const isMobile = useMemo(() => 
    typeof window !== 'undefined' && window.innerWidth < 768, []
  );

  // إعداد قائمة الصور المحسنة - مرة واحدة فقط
  const images = useMemo(() => {
    const imageList: string[] = [];
    
    // أولوية للصورة المختارة
    if (selectedColor?.image_url && selectedColor.image_url.trim() !== '') {
      imageList.push(selectedColor.image_url);
    }
    
    // الصورة الرئيسية
    if (product.images?.thumbnail_image && 
        product.images.thumbnail_image.trim() !== '' &&
        !imageList.includes(product.images.thumbnail_image)) {
      imageList.push(product.images.thumbnail_image);
    }
    
    // الصور الإضافية
    product.images?.additional_images?.forEach(img => {
      if (img.url && img.url.trim() !== '' && !imageList.includes(img.url)) {
        imageList.push(img.url);
      }
    });

    // صور الألوان الأخرى
    product.variants?.colors?.forEach(color => {
      if (color.image_url && 
          color.image_url.trim() !== '' && 
          !imageList.includes(color.image_url)) {
        imageList.push(color.image_url);
      }
    });

    return imageList.length > 0 ? imageList : ['/images/placeholder-product.jpg'];
  }, [product, selectedColor]);

  const currentImage = images[currentIndex] || images[0];

  // تحميل مسبق للصور المجاورة فقط - أكثر كفاءة
  useEffect(() => {
    if (!isMobile || images.length <= 1) return;

    const preloadAdjacentImages = () => {
      const toPreload = [
        images[currentIndex - 1],
        images[currentIndex + 1],
      ].filter(Boolean);

      toPreload.forEach(url => {
        if (!imageRefs.current.has(url)) {
          const img = new Image();
          img.src = url;
          img.loading = 'lazy';
          imageRefs.current.set(url, img);
        }
      });
    };

    const timer = setTimeout(preloadAdjacentImages, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, images, isMobile]);

  // معالجة لمس فائقة التحسين
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || images.length <= 1) return;
    setTouchStart(e.targetTouches[0].clientX);
  }, [isMobile, images.length]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || images.length <= 1) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    const isSignificantSwipe = Math.abs(distance) > 50;

    if (isSignificantSwipe && !isTransitioning) {
      setIsTransitioning(true);
      
      if (distance > 0) {
        setCurrentIndex(prev => (prev + 1) % images.length);
      } else {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
      }
      
      setTimeout(() => setIsTransitioning(false), 200);
    }
  }, [touchStart, images.length, isMobile, isTransitioning]);

  // معالجة تحميل الصورة
  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoaded(true); // حتى لو فشلت، اعتبرها محملة
  }, []);

  // إعادة تعيين حالة التحميل عند تغيير الصورة
  useEffect(() => {
    setIsImageLoaded(false);
  }, [currentImage]);

  // التنقل بالأزرار
  const goToNext = useCallback(() => {
    if (images.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 200);
  }, [images.length, isTransitioning]);

  const goToPrevious = useCallback(() => {
    if (images.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 200);
  }, [images.length, isTransitioning]);

  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-3">
        {/* الصورة الرئيسية فائقة التحسين */}
        <div 
          ref={containerRef}
          className="relative aspect-square bg-muted/10 rounded-2xl overflow-hidden group"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ 
            touchAction: 'pan-y',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {/* مؤشر التحميل البسيط */}
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* الصورة */}
          <img
            src={currentImage}
            alt={`${product.name} - صورة ${currentIndex + 1}`}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-200",
              isImageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={currentIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />

          {/* أزرار التنقل - تظهر فقط على سطح المكتب */}
          {!isMobile && images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                disabled={isTransitioning}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                disabled={isTransitioning}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          )}

          {/* مؤشر الموقع */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-background/90 px-2 py-1 rounded-lg">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => !isTransitioning && setCurrentIndex(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-200",
                    idx === currentIndex 
                      ? "bg-primary w-4" 
                      : "bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  )}
                  disabled={isTransitioning}
                />
              ))}
            </div>
          )}
        </div>

        {/* الصور المصغرة المحسنة */}
        {images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            {images.slice(0, 6).map((imageUrl, idx) => (
              <button
                key={idx}
                onClick={() => !isTransitioning && setCurrentIndex(idx)}
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200",
                  idx === currentIndex 
                    ? "border-primary scale-105" 
                    : "border-border/30 opacity-70 hover:opacity-100"
                )}
                disabled={isTransitioning}
              >
                <img
                  src={imageUrl}
                  alt={`صورة مصغرة ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
            {images.length > 6 && (
              <div className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center bg-muted/50">
                <span className="text-xs text-muted-foreground">+{images.length - 6}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ProductImageGalleryV2.displayName = 'ProductImageGalleryV2';

export default ProductImageGalleryV2;

// إضافة أنماط محسنة للهاتف
if (typeof document !== 'undefined' && !document.getElementById('optimized-gallery-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'optimized-gallery-styles';
  styleElement.textContent = `
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    @media (max-width: 768px) {
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
    }
  `;
  document.head.appendChild(styleElement);
}