import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThumbnailGridProps } from '@/types/imageGallery';

const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  images,
  activeImage,
  onImageSelect,
  onImageError,
  imageLoadError,
  isMobile,
  isCompact = false,
  className
}) => {
  const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // حساب عدد الصور المصغرة المعروضة مع memoization
  const maxVisibleThumbnails = useMemo(() => {
    return isMobile || isCompact ? 4 : 6;
  }, [isMobile, isCompact]);
  
  const { visibleThumbnails, hasMoreImages } = useMemo(() => {
    const visible = showAllThumbnails ? images : images.slice(0, maxVisibleThumbnails);
    const hasMore = images.length > maxVisibleThumbnails;
    return { visibleThumbnails: visible, hasMoreImages: hasMore };
  }, [showAllThumbnails, images, maxVisibleThumbnails]);
  
  // معالجة محسنة لاختيار الصورة
  const handleImageSelect = useCallback((url: string) => {
    onImageSelect(url);
  }, [onImageSelect]);
  
  const handleShowAll = useCallback(() => {
    setShowAllThumbnails(true);
  }, []);
  
  const handleHideExtra = useCallback(() => {
    setShowAllThumbnails(false);
  }, []);

  if (images.length <= 1) return null;

  return (
    <motion.div 
      className={cn("space-y-2", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* شريط الصور المصغرة */}
      <div 
        ref={thumbnailsRef}
        className={cn(
          "flex gap-1.5 md:gap-2 overflow-x-auto pb-2 no-scrollbar",
          isMobile || isCompact ? "px-1" : "justify-center"
        )}
      >
        {visibleThumbnails.map((imageInfo, index) => {
          const isSelected = activeImage === imageInfo.url;
          const hasThumbError = imageLoadError.has(imageInfo.url);
          
          return (
            <motion.button
              key={`${imageInfo.url}-${index}`}
              onClick={() => handleImageSelect(imageInfo.url)}
              className={cn(
                "relative flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden border-2 transition-all duration-300",
                isSelected 
                  ? "border-primary ring-2 ring-primary/20 shadow-lg scale-105 z-10" 
                  : "border-border/30 opacity-70 hover:opacity-100 hover:border-border hover:shadow-md hover:scale-105",
                isMobile || isCompact ? "w-12 h-12" : "w-14 h-14 md:w-16 md:h-16"
              )}
              whileHover={{ scale: isSelected ? 1.05 : 1.08 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.4, 
                delay: Math.min(index * 0.03, 0.2), // تقليل التأخير للعناصر اللاحقة
                type: "spring",
                damping: 25,
                stiffness: 120
              }}
              title={
                imageInfo.type === 'color' && imageInfo.colorInfo 
                  ? `لون ${imageInfo.colorInfo.name}${imageInfo.colorInfo.isDefault ? ' (افتراضي)' : ''}`
                  : imageInfo.type === 'main'
                  ? 'الصورة الرئيسية'
                  : `صورة إضافية ${index + 1}`
              }
            >
              {/* خلفية متدرجة */}
              <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/5 to-background" />
              
              {/* مؤشر اللون */}
              {imageInfo.type === 'color' && imageInfo.colorInfo && (
                <div 
                  className={cn(
                    "absolute top-1 left-1 rounded-full border border-white/50 shadow-sm",
                    isMobile || isCompact ? "w-2 h-2" : "w-2.5 h-2.5"
                  )}
                  style={{ backgroundColor: imageInfo.colorInfo.colorCode }}
                />
              )}
              
              <img
                src={hasThumbError ? '/images/placeholder-product.jpg' : imageInfo.url}
                alt={`صورة مصغرة ${index + 1}`}
                className="relative h-full w-full object-cover transition-all duration-300 hover:scale-105"
                onError={() => onImageError(imageInfo.url)}
                loading={index < 4 ? "eager" : "lazy"}
                decoding="async"
                sizes="(max-width: 768px) 12vw, 8vw"
              />
              
              {/* مؤشر الصورة النشطة */}
              {isSelected && (
                <motion.div 
                  className="absolute inset-0 bg-primary/10 border-2 border-primary/30 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              
              {/* نوع الصورة */}
              <div className={cn(
                "absolute bottom-0.5 right-0.5 bg-background/90 backdrop-blur-sm text-xs px-1 py-0.5 rounded text-foreground/70",
                isMobile || isCompact ? "text-[10px]" : "text-xs"
              )}>
                {imageInfo.type === 'color' && imageInfo.colorInfo?.isDefault && '★'}
                {imageInfo.type === 'main' && 'M'}
                {imageInfo.type === 'additional' && (index + 1)}
                {imageInfo.type === 'color' && !imageInfo.colorInfo?.isDefault && 'C'}
              </div>
            </motion.button>
          );
        })}
        
        {/* زر عرض المزيد */}
        {hasMoreImages && !showAllThumbnails && (
          <motion.button
            onClick={handleShowAll}
            className={cn(
              "flex-shrink-0 rounded-lg md:rounded-xl border-2 border-dashed border-border/50",
              "flex items-center justify-center bg-muted/50 hover:bg-muted/70 transition-all duration-300",
              isMobile || isCompact ? "w-12 h-12" : "w-14 h-14 md:w-16 md:h-16"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-center">
              <Grid3X3 className={cn("mx-auto text-muted-foreground", isMobile || isCompact ? "w-3 h-3" : "w-4 h-4")} />
              <div className={cn("text-muted-foreground font-medium", isMobile || isCompact ? "text-[10px]" : "text-xs")}>
                +{images.length - maxVisibleThumbnails}
              </div>
            </div>
          </motion.button>
        )}
      </div>
      
      {/* زر إخفاء الصور الإضافية */}
      {showAllThumbnails && hasMoreImages && (
        <div className="flex justify-center">
          <motion.button
            onClick={handleHideExtra}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-muted/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            إخفاء الصور الإضافية
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(ThumbnailGrid, (prevProps, nextProps) => {
  // تحسين الأداء بمنع re-render غير ضرورية
  return (
    prevProps.activeImage === nextProps.activeImage &&
    prevProps.images.length === nextProps.images.length &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.images.every((img, index) => img.url === nextProps.images[index]?.url)
  );
});
