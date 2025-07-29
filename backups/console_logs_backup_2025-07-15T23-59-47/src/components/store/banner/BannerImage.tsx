import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BannerImageProps } from './types';
import OptimizedImage from './OptimizedImage';

/**
 * مكون صورة البانر
 * يتضمن الصورة مع التحسينات البصرية والعناصر الزخرفية
 */
const BannerImage = React.memo<BannerImageProps>(({
  imageUrl,
  title,
  isRTL = false,
  onImageLoad
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // انيميشن للصورة
  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.6, 
        ease: "easeOut"
      } 
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    onImageLoad?.();
  };

  return (
    <motion.div 
      className={cn(
        "relative",
        isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"
      )}
      variants={imageVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="relative aspect-square w-full max-w-md mx-auto">
        {/* الصورة الرئيسية */}
        <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-border/20 group">
          <OptimizedImage
            src={imageUrl}
            alt={title}
            className="group-hover:scale-105 transition-transform duration-700"
            onLoad={handleImageLoad}
          />
          
          {/* طبقة تحسين بصرية */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
          
          {/* تأثير hover إضافي */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* العناصر الزخرفية */}
        <motion.div 
          className="absolute -top-4 -right-4 w-8 h-8 bg-primary/20 rounded-full blur-sm"
          animate={imageLoaded ? { 
            scale: [1, 1.2, 1], 
            opacity: [0.6, 0.8, 0.6] 
          } : {}}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute -bottom-4 -left-4 w-12 h-12 bg-secondary/20 rounded-full blur-sm"
          animate={imageLoaded ? { 
            scale: [1, 1.1, 1], 
            opacity: [0.4, 0.6, 0.4] 
          } : {}}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1 
          }}
        />
        
        {/* عنصر زخرفي إضافي */}
        <motion.div 
          className="absolute top-1/2 -left-2 w-6 h-6 bg-accent/30 rounded-full blur-sm"
          animate={imageLoaded ? { 
            y: [-10, 10, -10],
            opacity: [0.3, 0.5, 0.3] 
          } : {}}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2 
          }}
        />
      </div>
    </motion.div>
  );
});

BannerImage.displayName = 'BannerImage';

export default BannerImage;
