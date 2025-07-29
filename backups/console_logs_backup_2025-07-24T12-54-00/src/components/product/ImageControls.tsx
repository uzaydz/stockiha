import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageControlsProps } from '@/types/imageGallery';

const ImageControls: React.FC<ImageControlsProps> = ({
  totalImages,
  currentIndex,
  onNext,
  onPrevious,
  onGoToImage,
  isMobile,
  className
}) => {
  if (totalImages <= 1) return null;

  return (
    <div className={cn("relative", className)}>
      {/* أزرار التنقل */}
      <motion.button 
        onClick={onPrevious}
        className={cn(
          "absolute left-2 md:left-4 top-1/2 -translate-y-1/2 rounded-xl md:rounded-2xl",
          "bg-background/95 backdrop-blur-xl shadow-lg border border-border/50",
          "flex items-center justify-center transition-all duration-300",
          "opacity-0 group-hover:opacity-100 hover:bg-background hover:shadow-xl",
          isMobile ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="الصورة السابقة"
      >
        <ChevronRight className={cn("text-foreground", isMobile ? "h-4 w-4" : "h-5 w-5 md:h-6 md:w-6")} />
      </motion.button>
      
      <motion.button 
        onClick={onNext}
        className={cn(
          "absolute right-2 md:right-4 top-1/2 -translate-y-1/2 rounded-xl md:rounded-2xl",
          "bg-background/95 backdrop-blur-xl shadow-lg border border-border/50",
          "flex items-center justify-center transition-all duration-300",
          "opacity-0 group-hover:opacity-100 hover:bg-background hover:shadow-xl",
          isMobile ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="الصورة التالية"
      >
        <ChevronLeft className={cn("text-foreground", isMobile ? "h-4 w-4" : "h-5 w-5 md:h-6 md:w-6")} />
      </motion.button>

      {/* مؤشر الموقع */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-background/95 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-border/50 shadow-lg">
        {Array.from({ length: totalImages }, (_, idx) => (
          <motion.button
            key={idx}
            onClick={() => onGoToImage(idx)}
            className={cn(
              "rounded-full transition-all duration-300 cursor-pointer",
              idx === currentIndex 
                ? "bg-primary w-4 h-1.5" 
                : "bg-muted-foreground/40 hover:bg-muted-foreground/70 w-1.5 h-1.5"
            )}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`الصورة ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageControls; 