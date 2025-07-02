import React, { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CompleteProduct, ProductColor } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';

interface ProductImageGalleryV2Props {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  className?: string;
}

const ProductImageGalleryV2 = memo<ProductImageGalleryV2Props>(({ 
  product, 
  selectedColor,
  className
}) => {
  const [activeImage, setActiveImage] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(1);
  const [imageLoadError, setImageLoadError] = useState<Set<string>>(new Set());
  const [followMode, setFollowMode] = useState<'static' | 'following'>('static');
  const [fixedPosition, setFixedPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const originalPositionRef = useRef<DOMRect | null>(null);

  // تحسين قائمة الصور بـ useMemo
  const allImages = useMemo(() => {
    const imageList: string[] = [];
    
    // إضافة صورة اللون المختار أولاً
    if (selectedColor?.image_url && !imageList.includes(selectedColor.image_url)) {
      imageList.push(selectedColor.image_url);
    }
    
    // إضافة الصورة الرئيسية
    if (product.images.thumbnail_image && !imageList.includes(product.images.thumbnail_image)) {
      imageList.push(product.images.thumbnail_image);
    }
    
    // إضافة باقي الصور
    product.images.additional_images.forEach(img => {
      if (!imageList.includes(img.url)) {
        imageList.push(img.url);
      }
    });

    return imageList.length > 0 ? imageList : ['/images/placeholder-product.jpg'];
  }, [product, selectedColor]);

  const currentIndex = allImages.indexOf(activeImage);

  // تحديث الصورة النشطة عندما تتغير الصورة الرئيسية (عند تغيير اللون)
  useEffect(() => {
    const newActiveImage = selectedColor?.image_url || allImages[0];
    setActiveImage(newActiveImage);
    setImageLoaded(false);
  }, [selectedColor, allImages]);

  // تحميل الصورة
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // معالجة أخطاء التحميل
  const handleImageError = useCallback((imageUrl: string) => {
    setImageLoadError(prev => new Set([...prev, imageUrl]));
    setImageLoaded(true); // تحديد كمحملة حتى لو فشلت
  }, []);

  // معالجة حركة الماوس للزوم
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imageRef.current || !isHovering) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setHoverPosition({ 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    });
  }, [isHovering]);

  // دخول الماوس للحاوية
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    setZoomScale(2);
  }, []);

  // خروج الماوس من الحاوية
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setZoomScale(1);
  }, []);

  // التنقل بين الصور
  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % allImages.length;
    setActiveImage(allImages[nextIndex]);
    setImageLoaded(false);
  }, [currentIndex, allImages]);

  const goToPrevious = useCallback(() => {
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    setActiveImage(allImages[prevIndex]);
    setImageLoaded(false);
  }, [currentIndex, allImages]);

  // تتبع التمرير مع positioning ذكي (للحاسوب فقط)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !galleryRef.current) return;
      
      // التحقق من أن الشاشة كبيرة (حاسوب) - أكبر من 1024px
      const isDesktop = window.innerWidth >= 1024;
      
      if (!isDesktop) {
        // في الهاتف أو الطابلت، استخدم الوضع الثابت دائماً
        setFollowMode('static');
        return;
      }
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const galleryRect = galleryRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      
      // حفظ الموضع الأصلي في المرة الأولى (بالنسبة للصفحة)
      if (!originalPositionRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        originalPositionRef.current = {
          ...rect,
          top: rect.top + scrollY // الموضع الفعلي في الصفحة
        } as DOMRect;
      }
      
      const originalTop = originalPositionRef.current.top;
      const currentTop = originalTop - scrollY;
      const followStartPoint = -100; // بدء التتبع عندما يصبح الجاليري فوق الشاشة بـ 100px
      
      if (currentTop > followStartPoint) {
        // لا يزال الجاليري ظاهراً في موضعه الطبيعي
        setFollowMode('static');
      } else {
        // الجاليري خرج من الشاشة، نبدأ التتبع
        setFollowMode('following');
        
        // حساب الموضع المناسب للجاليري
        const galleryHeight = galleryRect.height || 400;
        const maxTop = windowHeight - galleryHeight - 20;
        const idealTop = Math.min(20, maxTop);
        
        setFixedPosition({
          top: Math.max(idealTop, 10),
          left: Math.max(containerRect.left, 20), // الحد الأدنى 20px من الجانب
          width: Math.min(containerRect.width, window.innerWidth - 40) // أقصى عرض مع هوامش
        });
      }
    };

    const handleResize = () => {
      // التحقق من حجم الشاشة الجديد
      const isDesktop = window.innerWidth >= 1024;
      
      if (!isDesktop) {
        // إذا أصبحت الشاشة صغيرة، إيقاف التتبع
        setFollowMode('static');
        originalPositionRef.current = null;
        return;
      }
      
      // إعادة تعيين الموضع الأصلي وإعادة حساب التتبع للحاسوب
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollY = window.scrollY;
        originalPositionRef.current = {
          ...rect,
          top: rect.top + scrollY
        } as DOMRect;
      }
      handleScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // تشغيل فوري مع تأخير قصير للتأكد من اكتمال الرندر
    setTimeout(handleScroll, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // التحكم بلوحة المفاتيح
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToNext();
      } else if (e.key === 'ArrowRight') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious]);

  const currentImage = activeImage;
  const hasError = imageLoadError.has(currentImage);
  const isFollowing = followMode === 'following';

  return (
    <div 
      ref={containerRef}
      className={cn("w-full", className)}
    >
      {/* Placeholder للحفاظ على المساحة عندما تكون الجالري في وضع التتبع */}
      {isFollowing && (
        <div style={{ height: galleryRef.current?.offsetHeight || 'auto' }} />
      )}
      
      <div 
        ref={galleryRef}
        className={cn(
          "space-y-6 transition-all duration-500 ease-out",
          isFollowing && [
            "fixed z-50 bg-background/98 backdrop-blur-md rounded-3xl p-6",
            "shadow-xl border border-border/40",
            "ring-1 ring-black/5 dark:ring-white/5"
          ]
        )}
        style={isFollowing ? {
          top: `${fixedPosition.top}px`,
          left: `${fixedPosition.left}px`,
          width: `${fixedPosition.width}px`,
        } : undefined}
      >
        {/* صورة المنتج الرئيسية مع الزوم */}
        <motion.div 
          ref={containerRef}
          className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-background via-muted/5 to-background border border-border/50 shadow-xl group cursor-zoom-in"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", damping: 25 }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* طبقة الخلفية المتدرجة */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0, scale: 0.9, rotateY: 5 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateY: -5 }}
              transition={{ duration: 0.5, type: "spring", damping: 20 }}
              className="h-full w-full flex items-center justify-center relative"
            >
              {/* مؤشر التحميل */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              
              <img
                ref={imageRef}
            src={hasError ? '/images/placeholder-product.jpg' : currentImage}
                alt={`${product.name} - الصورة ${currentIndex + 1}`}
                onLoad={handleImageLoad}
            onError={() => handleImageError(currentImage)}
                className={cn(
                  "h-full w-full object-contain transition-all duration-500 ease-out",
                  imageLoaded ? "opacity-100" : "opacity-0",
                  isHovering ? "cursor-zoom-in" : ""
                )}
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: `${hoverPosition.x}% ${hoverPosition.y}%`,
                }}
                loading="lazy"
                draggable={false}
              />
              
              {/* مؤشر الزوم المحسن */}
              {(isHovering || zoomScale > 1) && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* خطوط توجيهية */}
                  <div 
                    className="absolute w-px h-full bg-white/20 transition-all duration-300"
                    style={{ left: `${hoverPosition.x}%` }}
                  />
                  <div 
                    className="absolute w-full h-px bg-white/20 transition-all duration-300"
                    style={{ top: `${hoverPosition.y}%` }}
                  />
                  
                  {/* دائرة التركيز */}
                  <div 
                    className={cn(
                      "absolute w-12 h-12 border-2 border-white/60 rounded-full",
                      "transition-all duration-300 ease-out -translate-x-1/2 -translate-y-1/2"
                    )}
                    style={{ 
                      left: `${hoverPosition.x}%`, 
                      top: `${hoverPosition.y}%`,
                      transform: `translate(-50%, -50%) scale(${isHovering || zoomScale > 1 ? 1 : 0})`
                    }}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* أزرار التنقل المحسنة */}
          {allImages.length > 1 && (
            <>
              <motion.button 
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-background/95 backdrop-blur-xl shadow-lg border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background hover:shadow-xl"
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="h-6 w-6 text-foreground" />
              </motion.button>
              
              <motion.button 
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-background/95 backdrop-blur-xl shadow-lg border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background hover:shadow-xl"
                whileHover={{ scale: 1.05, x: 2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="h-6 w-6 text-foreground" />
              </motion.button>
            </>
          )}

          {/* مؤشر الموقع المحسن */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background/95 backdrop-blur-xl px-4 py-2 rounded-2xl border border-border/50 shadow-lg">
              {allImages.map((_, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => {
                    setActiveImage(allImages[idx]);
                    setImageLoaded(false);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                    idx === currentIndex 
                      ? "bg-primary w-6" 
                      : "bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  )}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`الصورة ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* الصور المصغرة المحسنة */}
        {allImages.length > 1 && (
          <motion.div 
            className={cn(
              "flex justify-center gap-2 sm:gap-3 overflow-x-auto pb-3 no-scrollbar px-2",
              isFollowing ? "max-w-full" : "mt-4 sm:mt-6"
            )}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, type: "spring", damping: 25 }}
          >
            {allImages.slice(0, isFollowing ? 4 : allImages.length).map((image, index) => {
              const isSelected = activeImage === image;
              const hasThumbError = imageLoadError.has(image);
              
              return (
                <motion.button
                  key={index}
                  onClick={() => {
                    setActiveImage(image);
                    setImageLoaded(false);
                  }}
                  className={cn(
                    "relative min-w-16 sm:min-w-20 h-16 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-500",
                    isSelected 
                      ? "border-primary ring-2 sm:ring-4 ring-primary/10 shadow-xl scale-105 sm:scale-110 z-10" 
                      : "border-border/30 opacity-70 hover:opacity-100 hover:border-border hover:shadow-lg hover:scale-105"
                  )}
                  whileHover={{ 
                    scale: isSelected ? 1.1 : 1.05,
                    y: isSelected ? 0 : -2
                  }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    type: "spring",
                    damping: 20
                  }}
                >
                  {/* خلفية متدرجة */}
                  <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/5 to-background" />
                  
                  <img
                    src={hasThumbError ? '/images/placeholder-product.jpg' : image}
                    alt={`${product.name} - ${index + 1}`}
                    className="relative h-full w-full object-cover transition-transform duration-300"
                    onError={() => handleImageError(image)}
                    loading="lazy"
                  />
                  
                  {/* مؤشر الصورة النشطة */}
                  {isSelected && (
                    <motion.div 
                      className="absolute inset-0 bg-primary/10 border-2 border-primary/30 rounded-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  
                  {/* رقم الصورة */}
                  <div className="absolute bottom-1 right-1 bg-background/90 backdrop-blur-sm text-xs px-1.5 py-0.5 rounded-lg text-foreground/70">
                    {index + 1}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
});

ProductImageGalleryV2.displayName = 'ProductImageGalleryV2';

export default ProductImageGalleryV2;

// إضافة الأنماط المخصصة
const styles = `
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  .cursor-zoom-in {
    cursor: zoom-in;
  }
`;

// إضافة الأنماط إلى الصفحة إذا لم تكن موجودة
if (typeof document !== 'undefined' && !document.getElementById('product-gallery-v2-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'product-gallery-v2-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
