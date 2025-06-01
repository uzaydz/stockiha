import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ImageEditor from '../../../controls/ImageEditor';
import { CommonProps } from '../types';
import { getImageVariants, rotateVariants, zoomInVariants } from '../animations';
import { imageStyles } from '../styles';

interface ImageContentProps extends CommonProps {
  imageUrl: string;
}

const ImageContent: React.FC<ImageContentProps> = ({
  section,
  isEditing,
  updateProps,
  imageUrl
}) => {
  // استخراج الخصائص من القسم
  const imageStyle = section.props?.imageStyle || 'standard';
  const layoutStyle = section.props?.layoutStyle || 'standard';
  const enableParallax = section.props?.enableParallax || false;
  
  // تحديد أنماط CSS للصورة
  const imageStyleClass = imageStyles[imageStyle as keyof typeof imageStyles];
  
  // تحديد تأثيرات الحركة المناسبة
  const getAnimation = () => {
    if (imageStyle === 'angled') {
      return rotateVariants;
    } else if (layoutStyle === 'overlapping') {
      return zoomInVariants;
    } else {
      return getImageVariants(layoutStyle);
    }
  };
  
  // تحديد فئات حاوية الصورة
  const getContainerClasses = () => {
    let baseClasses = "relative";
    
    if (layoutStyle === 'overlapping') {
      baseClasses += " h-full w-full";
    } else if (layoutStyle === 'centered') {
      baseClasses += " w-full";
    }
    
    if (imageStyle === 'phone') {
      baseClasses += " mx-auto max-w-xs";
    } else if (imageStyle === 'browser' || imageStyle === 'laptop') {
      baseClasses += " mx-auto max-w-3xl";
    }
    
    return baseClasses;
  };
  
  // تحديد العناصر المحيطة بالصورة حسب النمط
  const renderWrapper = (children: React.ReactNode) => {
    switch (imageStyle) {
      case 'browser':
        return (
          <div className="relative rounded-lg overflow-hidden shadow-md dark:shadow-lg border-4 border-card dark:border-card/80 mx-auto max-w-3xl">
            <div className="h-7 bg-muted dark:bg-muted/80 flex items-center px-3 border-b dark:border-border/30">
              <div className="flex space-x-2 rtl:space-x-reverse">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
              </div>
            </div>
            {children}
          </div>
        );
      
      case 'laptop':
        return (
          <div className="relative mx-auto max-w-3xl">
            <div className="rounded-lg overflow-hidden shadow-md dark:shadow-lg border-8 border-t-8 border-neutral-800 dark:border-neutral-900 bg-neutral-800 dark:bg-neutral-900 pt-4">
              {children}
            </div>
            <div className="h-4 bg-neutral-800 dark:bg-neutral-900 rounded-b-xl mx-auto w-1/3"></div>
          </div>
        );
      
      case 'phone':
        return (
          <div className="relative mx-auto max-w-[280px]">
            <div className="rounded-[32px] overflow-hidden shadow-md dark:shadow-lg border-[10px] border-neutral-800 dark:border-neutral-900">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-20 bg-neutral-800 dark:bg-neutral-900 rounded-b-lg z-10"></div>
              {children}
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full border-2 border-neutral-700 dark:border-neutral-800"></div>
          </div>
        );
      
      case 'floating':
        return (
          <div className="relative mx-auto max-w-2xl">
            <div className="rounded-xl overflow-hidden shadow-md dark:shadow-lg border-4 border-card dark:border-card/80">
              {children}
            </div>
            <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 blur-sm bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 dark:from-primary/20 dark:via-primary/10 dark:to-secondary/20 rounded-xl"></div>
          </div>
        );
      
      case 'angled':
        return (
          <div className="relative mx-auto transform rotate-3 hover:rotate-0 transition-transform duration-300 max-w-2xl">
            <div className="rounded-xl overflow-hidden shadow-md dark:shadow-lg border-4 border-card dark:border-card/80">
              {children}
            </div>
            <div className="absolute inset-0 -z-10 -rotate-3 blur-sm bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 dark:from-primary/20 dark:via-primary/10 dark:to-secondary/20 rounded-xl"></div>
          </div>
        );
      
      default:
        return (
          <div className="rounded-xl overflow-hidden shadow-md dark:shadow-lg border-4 border-card dark:border-card/80 group-hover:scale-[1.02] transition-transform duration-500 ease-out mx-auto max-w-2xl">
            {children}
          </div>
        );
    }
  };
  
  return (
    <motion.div
      className={cn("group", getContainerClasses())}
      variants={getAnimation()}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {isEditing ? (
        <div className={cn("relative", imageStyleClass)}>
          <ImageEditor
            value={imageUrl}
            onChange={(url) => updateProps({ imageUrl: url })}
            onRemove={() => updateProps({ imageUrl: '' })}
            placeholder="/placeholder.svg"
            aspectRatio={imageStyle === 'phone' ? '9/16' : imageStyle === 'browser' || imageStyle === 'laptop' ? '16/9' : '4/3'}
            className="rounded-none w-full h-full"
          />
        </div>
      ) : (
        renderWrapper(
          <div className={cn("relative", imageStyleClass)}>
            <img
              src={imageUrl || "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop"}
              alt="Hero image"
              className={cn(
                "w-full h-full object-cover",
                enableParallax && "parallax-image"
              )}
            />
            
            {/* إضافة طبقة تظليل خفيفة */}
            {layoutStyle !== 'overlapping' && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-40"></div>
            )}
          </div>
        )
      )}
    </motion.div>
  );
};

export default ImageContent; 