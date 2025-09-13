import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
import { CompleteProduct, ProductColor } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCdnImageUrl } from '@/lib/image-cdn';

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
 * - عرض الصور بشكل كامل مع خيارات التكبير
 */

const ProductImageGalleryV2 = memo<ProductImageGalleryV2Props>(({ 
  product, 
  selectedColor,
  className
}) => {
  // تبسيط: إزالة التعقيدات وجعل التحميل أسرع
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // كشف الهاتف مرة واحدة فقط
  const isMobile = useMemo(() => 
    typeof window !== 'undefined' && window.innerWidth < 768, []
  );

  // تهيئة حجم وجودة الصور حسب الشبكة والجهاز
  const imageParams = useMemo(() => {
    try {
      const conn = (navigator as any)?.connection?.effectiveType as string | undefined;
      const slow = conn === '2g' || conn === 'slow-2g';
      const medium = conn === '3g';
      const baseWidth = isMobile ? 640 : 800;
      const width = slow ? Math.round(baseWidth * 0.6) : medium ? Math.round(baseWidth * 0.8) : baseWidth;
      const quality = slow ? 60 : medium ? 68 : 75;
      const thumbWidth = 64; // يكفي للمصغرات
      const thumbQuality = 45; // تقليل الجودة للمصغرات لتقليل الحجم
      return { width, quality, thumbWidth, thumbQuality };
    } catch {
      return { width: isMobile ? 640 : 800, quality: 75, thumbWidth: 64, thumbQuality: 45 };
    }
  }, [isMobile]);

  // مساعد بسيط لاكتشاف سلاسل base64 الكبيرة (لا يمكن ضغطها عبر CDN)
  const isLikelyLargeDataUrl = (url?: string) => {
    if (!url) return false;
    if (!url.startsWith('data:')) return false;
    // عتبة تقريبية: إذا تجاوزت السلسلة 120KB نعتبرها ثقيلة
    try { return url.length > 120_000; } catch { return true; }
  };

  // إعداد قائمة الصور المحسنة - تركيز على أولية العرض وتقليل الحمولة
  const images = useMemo(() => {
    const list: string[] = [];

    const pushIfValid = (u?: string) => {
      if (!u) return;
      const url = u.trim();
      if (!url) return;
      if (list.includes(url)) return;
      // تجنب إدخال صور base64 الثقيلة في القائمة الأولية
      if (isLikelyLargeDataUrl(url)) return;
      list.push(url);
    };

    // 1) أولوية لصورة اللون المختار إن وجدت (حتى لو كانت base64، نسمح بها لأنها مطلوبة للعرض الفوري)
    if (selectedColor?.image_url && selectedColor.image_url.trim() !== '') {
      if (!list.includes(selectedColor.image_url)) list.unshift(selectedColor.image_url);
    }

    // 2) الصورة الرئيسية
    pushIfValid(product.images?.thumbnail_image);

    // 3) أول 4 صور إضافية فقط لتقليل العدد
    const extras = Array.isArray(product.images?.additional_images) ? product.images!.additional_images.slice(0, 4) : [];
    extras.forEach(img => pushIfValid(img?.url));

    // 4) صور ألوان أخرى (حد أقصى 4) مع تجاهل base64 الثقيلة
    let addedColors = 0;
    if (Array.isArray(product.variants?.colors)) {
      for (const color of product.variants!.colors) {
        if (!color?.image_url) continue;
        if (selectedColor && color.id === selectedColor.id) continue;
        if (addedColors >= 4) break;
        if (isLikelyLargeDataUrl(color.image_url)) continue;
        pushIfValid(color.image_url);
        addedColors++;
      }
    }

    return list.length > 0 ? list : ['/images/placeholder-product.jpg'];
  }, [product, selectedColor]);

  const currentImage = images[currentIndex] || images[0];

  // إلغاء التحميل المسبق الشامل؛ سنقوم فقط بتحميل الصورة الحالية وما جاورها

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
          img.src = getCdnImageUrl(url, { width: Math.min(512, imageParams.width), quality: Math.min(70, imageParams.quality), fit: 'cover' });
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

  // معالجة تحميل الصورة محسنة مع منع التكرار
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const imageUrl = e.currentTarget.src;
    
    // منع التحميل المتكرر لنفس الصورة
    if (imageRefs.current.has(imageUrl)) {
      return;
    }

    // إضافة الصورة لقائمة المعالجة
    const img = new Image();
    img.src = imageUrl;
    img.loading = 'eager';
    imageRefs.current.set(imageUrl, img);
    
    // تحديث فوري لحالة التحميل
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const imageUrl = e.currentTarget.src;
    
    // تحسين: إضافة fallback للصور الفاشلة
    if (imageUrl !== '/images/placeholder-product.jpg') {
      const img = e.currentTarget;
      img.src = '/images/placeholder-product.jpg';
      img.alt = 'صورة بديلة';
      
      // تعيين حالة التحميل كـ true حتى مع الصورة البديلة
    } else {
      // إذا كانت الصورة البديلة أيضاً فشلت، اعتبرها محملة
    }
  }, []);

  // تبسيط: إزالة المنطق المعقد وإضافة منطق بسيط وسريع
  useEffect(() => {
    if (images.length > 0 && currentIndex < images.length) {
      const newImage = images[currentIndex];
      if (newImage && newImage !== currentImage) {
        // تحميل مسبق للصورة الجديدة
        if (!imageRefs.current.has(newImage)) {
          const img = new Image();
          img.src = getCdnImageUrl(newImage, { width: Math.min(512, imageParams.width), quality: Math.min(70, imageParams.quality), fit: 'cover' });
          img.loading = 'eager';
          imageRefs.current.set(newImage, img);
        }
      }
    }
  }, [currentIndex, images, currentImage, imageParams.width, imageParams.quality]);

  // تحديث الصورة المعروضة عند تغيير اللون المختار
  useEffect(() => {
    if (selectedColor?.image_url) {
      const colorImageIndex = images.findIndex(img => img === selectedColor.image_url);
      if (colorImageIndex !== -1) {
        setCurrentIndex(colorImageIndex);
      }
    }
  }, [selectedColor?.id, images]);

  // إزالة المنطق المعقد
  const handleImageChange = useCallback((newIndex: number) => {
    if (newIndex === currentIndex || isTransitioning) return;
    setCurrentIndex(newIndex);
  }, [currentIndex, isTransitioning]);

  // التنقل بالأزرار
  const goToNext = useCallback(() => {
    if (images.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    handleImageChange((currentIndex + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 200);
  }, [images.length, isTransitioning, currentIndex, handleImageChange]);

  const goToPrevious = useCallback(() => {
    if (images.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    handleImageChange((currentIndex - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 200);
  }, [images.length, isTransitioning, currentIndex, handleImageChange]);

  // تبديل نوع عرض الصورة
  const toggleImageFit = useCallback(() => {
    setImageFit(prev => prev === 'contain' ? 'cover' : 'contain');
  }, []);

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
          {/* مؤشر التحميل المحسن */}
          {/* الصورة الرئيسية */}
          <div className="relative w-full h-full">
            {/* تبسيط: عرض الصورة مباشرة */}
            {currentImage && (
              <img
                src={getCdnImageUrl(currentImage, { width: imageParams.width, quality: imageParams.quality, fit: imageFit === 'contain' ? 'contain' : 'cover', format: 'auto' })}
                srcSet={[360, 480, 640, 800]
                  .map(w => `${getCdnImageUrl(currentImage, { width: w, quality: Math.min(imageParams.quality, 72), fit: imageFit === 'contain' ? 'contain' : 'cover', format: 'auto' })} ${w}w`)
                  .join(', ')}
                alt={`${product.name} - صورة ${currentIndex + 1}`}
                className={cn(
                  "w-full h-full transition-opacity duration-200",
                  imageFit === 'contain' ? 'object-contain' : 'object-cover',
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={imageParams.width}
                height={imageParams.width}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
                draggable={false}
              />
            )}
            
            {/* fallback للصور */}
            {!currentImage && images.length > 0 && (
              <img
                src={getCdnImageUrl(images[0], { width: imageParams.width, quality: imageParams.quality, fit: 'cover' })}
                alt={`${product.name} - صورة بديلة`}
                className="w-full h-full object-cover opacity-100"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.src = '/images/placeholder-product.jpg';
                }}
              />
            )}
          </div>

          {/* أزرار التنقل - تظهر فقط على سطح المكتب */}
          {!isMobile && images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg touch-target"
                disabled={isTransitioning}
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg touch-target"
                disabled={isTransitioning}
                aria-label="الصورة التالية"
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
                  onClick={() => !isTransitioning && handleImageChange(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-200",
                    idx === currentIndex 
                      ? "bg-primary w-4" 
                      : "bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  )}
                  disabled={isTransitioning}
                  aria-label={`الانتقال إلى الصورة ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* الصور المصغرة المحسنة - في المنتصف */}
        {images.length > 1 && (
          <div className="flex justify-center">
            <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar max-w-fit">
              {images.slice(0, 6).map((imageUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => !isTransitioning && handleImageChange(idx)}
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200",
                    idx === currentIndex 
                      ? "border-primary scale-105" 
                      : "border-border/30 opacity-70 hover:opacity-100"
                  )}
                  disabled={isTransitioning}
                >
                  <img
                    src={getCdnImageUrl(imageUrl, { width: imageParams.thumbWidth, quality: imageParams.thumbQuality, fit: 'cover', format: 'auto' })}
                    alt={`صورة مصغرة ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading={idx < 3 ? "eager" : "lazy"}
                    decoding="async"
                    onLoad={(e) => handleImageLoad(e)}
                    onError={(e) => handleImageError(e)}
                    width={imageParams.thumbWidth}
                    height={imageParams.thumbWidth}
                  />
                </button>
              ))}
              {images.length > 6 && (
                <div className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center bg-muted/50">
                  <span className="text-xs text-muted-foreground">+{images.length - 6}</span>
                </div>
              )}
            </div>
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
