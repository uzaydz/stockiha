import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ImageComponentPreviewProps {
  settings: {
    imageUrl?: string;
    altText?: string;
    caption?: string;
    maxWidth?: string;
    alignment?: string;
    border?: boolean;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    shadow?: boolean;
    shadowIntensity?: string;
    overlay?: boolean;
    overlayColor?: string;
    overlayOpacity?: number;
    onClick?: string;
    linkUrl?: string;
    hoverEffect?: string;
    [key: string]: any;
  };
  isEditing?: boolean;
}

/**
 * مكون معاينة للصورة محسن مع تأثيرات حركية وتفاعلية
 */
const ImageComponentPreview: React.FC<ImageComponentPreviewProps> = ({ settings, isEditing = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  
  // تعامل مع الصورة البديلة في حالة فشل تحميل الصورة الأصلية
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0zMTAuNSAyMTkuNUwzNjUuNSAxNzVMMzc0LjUgMTgzLjVMNDAwIDIwM0w0NjkgMTQ5LjVMNDk2LjUgMTc1TDUyNS41IDE0Ni41TDUzNC41IDE2My41TDYwMCAyMzAuNUw0MDAgMjgwTDMxMC41IDIxOS41WiIgZmlsbD0iI2UyZThmMCIvPjxjaXJjbGUgY3g9IjM0NyIgY3k9IjE0NiIgcj0iMTgiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMjM4LjUgMjQ5LjVDMjM4LjUgMjQ5LjUgMjYwLjUgMjA1IDMwMi41IDE5NC41QzM0NC41IDE4NCA0MDAuNSAyMTMgNDAwLjUgMjEzTDIzOC41IDI1NS41VjI0OS41WiIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTQ5NDk0Ij7LktmI2LHYqTwvdGV4dD48L3N2Zz4=';
  
  // معالجة إعدادات الصورة
  const containerStyle: React.CSSProperties = {
    textAlign: settings.alignment as any || 'center',
    padding: '16px',
  };
  
  // تعريف أنماط الظل حسب الشدة
  const shadowStyles = {
    light: '0 4px 14px rgba(0, 0, 0, 0.1)',
    medium: '0 6px 20px rgba(0, 0, 0, 0.15)',
    heavy: '0 12px 40px rgba(0, 0, 0, 0.2)'
  };
  
  // تحديد نوع التأثير عند التحويم
  const getHoverVariants = (): Variants => {
    switch (settings.hoverEffect) {
      case 'zoom':
        return {
          initial: { scale: 1 },
          hover: { scale: 1.05, transition: { duration: 0.3 } }
        };
      case 'lift':
        return {
          initial: { y: 0, boxShadow: settings.shadow ? shadowStyles[settings.shadowIntensity || 'medium'] : 'none' },
          hover: { 
            y: -10, 
            boxShadow: settings.shadow 
              ? '0 20px 30px rgba(0, 0, 0, 0.2)' 
              : '0 15px 25px rgba(0, 0, 0, 0.1)'
          }
        };
      case 'glow':
        return {
          initial: { 
            boxShadow: settings.shadow ? shadowStyles[settings.shadowIntensity || 'medium'] : 'none'
          },
          hover: { 
            boxShadow: `0 0 20px 5px ${settings.borderColor || '#3b82f6'}80`
          }
        };
      default:
        return {
          initial: {},
          hover: {}
        };
    }
  };
  
  // تعريف تأثيرات التكبير في وضع ملء الشاشة
  const enlargeVariants: Variants = {
    initial: { 
      scale: 1 
    },
    enlarged: { 
      scale: 1.5,
      transition: { duration: 0.3 }
    }
  };
  
  // معالجة النقر على الصورة
  const handleImageClick = () => {
    if (isEditing) return;
    
    if (settings.onClick === 'enlarge') {
      setIsEnlarged(!isEnlarged);
    } else if (settings.onClick === 'link' && settings.linkUrl) {
      window.open(settings.linkUrl, '_blank');
    }
  };
  
  // معالجة نقرة خارج الصورة المكبرة
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEnlarged(false);
  };
  
  return (
    <section className="py-4 relative">
      <div className="container mx-auto" style={containerStyle}>
        <motion.div 
          className={cn(
            "inline-block relative",
            isEditing ? "pointer-events-none" : "",
            settings.onClick === 'enlarge' ? "cursor-pointer" : "",
            settings.onClick === 'link' && settings.linkUrl ? "cursor-pointer" : ""
          )}
          style={{ maxWidth: settings.maxWidth || '100%' }}
          variants={getHoverVariants()}
          initial="initial"
          animate={isHovered ? "hover" : "initial"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* خلفية الصورة المكبرة */}
          {isEnlarged && (
            <motion.div 
              className="fixed inset-0 bg-black/80 z-[9998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleBackdropClick}
            />
          )}
          
          {/* الصورة */}
          <motion.div
            className={cn(
              "relative overflow-hidden",
              isEnlarged && "fixed top-1/2 left-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2"
            )}
            style={{
              borderRadius: settings.border ? `${settings.borderRadius || 0}px` : 0,
              border: settings.border ? `${settings.borderWidth || 1}px solid ${settings.borderColor || '#000000'}` : 'none',
              boxShadow: settings.shadow ? shadowStyles[settings.shadowIntensity || 'medium'] : 'none',
            }}
            onClick={handleImageClick}
            variants={enlargeVariants}
            initial="initial"
            animate={isEnlarged ? "enlarged" : "initial"}
          >
            <motion.img 
              src={settings.imageUrl || fallbackImage}
              alt={settings.altText || 'صورة'} 
              className="max-w-full h-auto block"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
              whileHover={
                settings.hoverEffect === 'zoom-in' 
                  ? { scale: 1.1, transition: { duration: 0.4 } }
                  : {}
              }
            />
            
            {/* طبقة التغطية الملونة */}
            {settings.overlay && (
              <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: (settings.overlayOpacity || 50) / 100 }}
                whileHover={{ opacity: ((settings.overlayOpacity || 50) / 100) - 0.1 }}
                style={{
                  backgroundColor: settings.overlayColor || '#000000',
                }}
              />
            )}
            
            {/* تأثير إضاءة الحواف عند التحويم */}
            {settings.hoverEffect === 'glow' && (
              <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.3 }}
                style={{
                  boxShadow: `inset 0 0 30px ${settings.borderColor || '#3b82f6'}`,
                }}
              />
            )}
          </motion.div>
          
          {/* تعليق الصورة */}
          {settings.caption && (
            <motion.p 
              className="text-sm text-center mt-3 text-muted-foreground"
              initial={{ opacity: 0.8 }}
              whileHover={{ opacity: 1 }}
            >
              {settings.caption}
            </motion.p>
          )}
          
          {/* رسالة تفاعلية */}
          {(settings.onClick === 'enlarge' || (settings.onClick === 'link' && settings.linkUrl)) && isHovered && !isEnlarged && !isEditing && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white px-3 py-2 rounded-md text-sm font-medium bg-black/30 backdrop-blur-md">
                {settings.onClick === 'enlarge' 
                  ? 'انقر لتكبير الصورة' 
                  : 'انقر لفتح الرابط'}
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ImageComponentPreview;
