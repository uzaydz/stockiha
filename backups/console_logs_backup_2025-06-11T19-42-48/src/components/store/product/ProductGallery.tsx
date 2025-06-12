import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  mainImage: string;
  additionalImages?: string[];
  productName: string;
}

const ProductGallery = ({ mainImage, additionalImages = [], productName }: ProductGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const allImages = [mainImage, ...(additionalImages || [])];
  const currentIndex = allImages.indexOf(activeImage);
  
  // تحديث الصورة النشطة عندما تتغير الصورة الرئيسية (عند تغيير اللون)
  useEffect(() => {
    setActiveImage(mainImage);
    setImageLoaded(false);
  }, [mainImage]);

  // تحميل الصورة
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // معالجة حركة الماوس للزوم
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imageRef.current || !isHovering) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setHoverPosition({ x, y });
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

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % allImages.length;
    setActiveImage(allImages[nextIndex]);
  };

  const goToPrevious = () => {
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    setActiveImage(allImages[prevIndex]);
  };

  return (
    <>
      <div className="space-y-6">
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
                src={activeImage}
                alt={productName}
                onLoad={handleImageLoad}
                className={cn(
                  "h-full w-full object-contain transition-all duration-500 ease-out",
                  imageLoaded ? "opacity-100" : "opacity-0",
                  isHovering ? "cursor-zoom-in" : ""
                )}
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: `${hoverPosition.x}% ${hoverPosition.y}%`,
                }}
              />
              
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
                  onClick={() => setActiveImage(allImages[idx])}
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
            className="flex justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 overflow-x-auto pb-3 no-scrollbar px-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, type: "spring", damping: 25 }}
          >
            {allImages.map((image, index) => (
              <motion.button
                key={index}
                onClick={() => setActiveImage(image)}
                className={cn(
                  "relative min-w-16 sm:min-w-20 h-16 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-500",
                  activeImage === image 
                    ? "border-primary ring-2 sm:ring-4 ring-primary/10 shadow-xl scale-105 sm:scale-110 z-10" 
                    : "border-border/30 opacity-70 hover:opacity-100 hover:border-border hover:shadow-lg hover:scale-105"
                )}
                whileHover={{ 
                  scale: activeImage === image ? 1.1 : 1.05,
                  y: activeImage === image ? 0 : -2
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
                  src={image} 
                  alt={`${productName} - ${index + 1}`}
                  className="relative h-full w-full object-cover transition-transform duration-300"
                />
                
                {/* مؤشر الصورة النشطة */}
                {activeImage === image && (
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
            ))}
          </motion.div>
        )}
      </div>
      
    </>
  );
};

export default ProductGallery;

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
if (typeof document !== 'undefined' && !document.getElementById('product-gallery-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'product-gallery-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
