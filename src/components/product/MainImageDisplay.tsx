import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, Palette, Grid3X3, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainImageDisplayProps } from '@/types/imageGallery';

const MainImageDisplay: React.FC<MainImageDisplayProps> = ({
  currentImage,
  imageInfo,
  productName,
  currentIndex,
  onImageLoad,
  onImageError,
  hasError,
  isLoaded,
  isMobile,
  className
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 50, y: 50 });
  const [zoomScale, setZoomScale] = useState(1);
  const [imageRetries, setImageRetries] = useState(0);
  const [isZoomEnabled, setIsZoomEnabled] = useState(true);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // معالجة الزوم المحسنة (للحاسوب فقط)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imageRef.current || isMobile || !isLoaded || hasError || !isZoomEnabled) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // التأكد من أن القيم ضمن الحدود المقبولة
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setHoverPosition({ x: clampedX, y: clampedY });
  }, [isMobile, isLoaded, hasError, isZoomEnabled]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMobile && isLoaded && !hasError && isZoomEnabled) {
      setIsHovering(true);
      setZoomScale(2.5);
      
      // تحديد موضع الزوم الأولي بناءً على نقطة دخول الماوس
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setHoverPosition({ 
          x: Math.max(0, Math.min(100, x)), 
          y: Math.max(0, Math.min(100, y)) 
        });
      }
    }
  }, [isMobile, isLoaded, hasError, isZoomEnabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setZoomScale(1);
    // إعادة تعيين الموضع للوسط
    setHoverPosition({ x: 50, y: 50 });
  }, []);

  // تعطيل الزوم مؤقتاً عند حدوث خطأ أو أثناء التحميل
  React.useEffect(() => {
    setIsZoomEnabled(isLoaded && !hasError);
  }, [isLoaded, hasError]);

  // معالجة إعادة المحاولة
  const handleRetry = useCallback(() => {
    if (imageRetries < 3) {
      setImageRetries(prev => prev + 1);
      // إنشاء timestamp فريد لإجبار إعادة التحميل
      const timestamp = Date.now();
      const separator = currentImage.includes('?') ? '&' : '?';
      const newSrc = `${currentImage}${separator}retry=${timestamp}`;
      
      const img = imageRef.current;
      if (img) {
        img.src = newSrc;
      }
    }
  }, [currentImage, imageRetries]);

  // إعادة تعيين عداد المحاولات عند تغيير الصورة
  React.useEffect(() => {
    setImageRetries(0);
    setIsHovering(false);
    setZoomScale(1);
    setHoverPosition({ x: 50, y: 50 });
  }, [currentImage]);

  return (
    <motion.div 
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-background via-muted/5 to-background",
        "border border-border/50 shadow-lg group",
        isMobile ? "aspect-square rounded-2xl" : "aspect-square rounded-3xl",
        !isMobile && isZoomEnabled && "cursor-zoom-in",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: "spring", damping: 25 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: !isMobile && isZoomEnabled ? 'zoom-in' : 'default' }}
    >
      {/* طبقة الخلفية */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* معلومات الصورة الحالية */}
      {imageInfo && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-background/95 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-foreground/70 flex items-center gap-1.5">
            {imageInfo.type === 'color' && imageInfo.colorInfo && (
              <>
                <Palette className="w-3 h-3" />
                <div 
                  className="w-2 h-2 rounded-full border border-white/30"
                  style={{ backgroundColor: imageInfo.colorInfo.colorCode }}
                />
                <span>{imageInfo.colorInfo.name}</span>
                {imageInfo.colorInfo.isDefault && <span>★</span>}
              </>
            )}
            {imageInfo.type === 'main' && (
              <>
                <Grid3X3 className="w-3 h-3" />
                <span>الصورة الرئيسية</span>
              </>
            )}
            {imageInfo.type === 'additional' && (
              <>
                <Grid3X3 className="w-3 h-3" />
                <span>صورة إضافية</span>
              </>
            )}
          </div>
        </div>
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentImage}-${imageRetries}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, type: "spring", damping: 20 }}
          className="h-full w-full flex items-center justify-center relative"
        >
          {/* مؤشر التحميل المحسن */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 md:w-12 md:h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="text-xs text-muted-foreground">جاري التحميل...</div>
              </div>
            </div>
          )}

          {/* رسالة الخطأ مع إمكانية إعادة المحاولة */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  فشل في تحميل الصورة
                </div>
                {imageRetries < 3 && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:bg-primary/90 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    إعادة المحاولة ({imageRetries + 1}/3)
                  </button>
                )}
                {imageRetries >= 3 && (
                  <div className="text-xs text-muted-foreground">
                    تم تجاوز الحد الأقصى للمحاولات
                  </div>
                )}
              </div>
            </div>
          )}
          
          <img
            ref={imageRef}
            src={hasError ? '/images/placeholder-product.jpg' : currentImage}
            alt={`${productName} - الصورة ${currentIndex + 1}`}
            onLoad={onImageLoad}
            onError={() => onImageError(currentImage)}
            className={cn(
              "h-full w-full object-contain transition-all duration-300 ease-out",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            style={!isMobile && isZoomEnabled && isHovering ? {
              transform: `scale(${zoomScale})`,
              transformOrigin: `${hoverPosition.x}% ${hoverPosition.y}%`,
            } : {
              transform: 'scale(1)',
              transformOrigin: 'center center'
            }}
            loading="lazy"
            draggable={false}
          />

          {/* طبقة زوم شفافة لتغطية كامل المساحة */}
          {!isMobile && isZoomEnabled && (
            <div 
              className="absolute inset-0 z-10 cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{ background: 'transparent' }}
            />
          )}
          
          {/* مؤشر الزوم المحسن (للحاسوب فقط) */}
          {!isMobile && isHovering && isZoomEnabled && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* دائرة التركيز */}
              <div 
                className="absolute w-12 h-12 border-2 border-white/80 rounded-full transition-all duration-200 -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm"
                style={{ 
                  left: `${hoverPosition.x}%`, 
                  top: `${hoverPosition.y}%`
                }}
              />
              {/* خطوط التوجيه */}
              <div 
                className="absolute w-full h-px bg-white/30 transition-all duration-200"
                style={{ top: `${hoverPosition.y}%` }}
              />
              <div 
                className="absolute w-px h-full bg-white/30 transition-all duration-200"
                style={{ left: `${hoverPosition.x}%` }}
              />
            </div>
          )}

          {/* أيقونة الزوم */}
          {!isMobile && isZoomEnabled && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-background/95 backdrop-blur-sm p-2 rounded-lg">
                <ZoomIn className="w-4 h-4 text-foreground/70" />
              </div>
            </div>
          )}

          {/* مؤشر مستوى الزوم */}
          {!isMobile && isHovering && isZoomEnabled && (
            <div className="absolute bottom-3 right-3 bg-background/95 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-foreground/70">
              {Math.round(zoomScale * 100)}%
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default MainImageDisplay;
