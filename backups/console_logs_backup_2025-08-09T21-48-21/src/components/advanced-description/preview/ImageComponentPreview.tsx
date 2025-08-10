import React, { useState } from 'react';
import { ImageComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, ZoomIn, ImageIcon } from 'lucide-react';

interface ImageComponentPreviewProps {
  component: ImageComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const ImageComponentPreview: React.FC<ImageComponentPreviewProps> = ({
  component,
  onEdit,
  onDelete,
  className
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showEnlarged, setShowEnlarged] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleZoomClick = () => {
    if (component.settings.enableLightbox && component.data.url) {
      setShowEnlarged(true);
    }
  };

  // دالة لحساب عرض الصورة حسب الاستجابة
  const getResponsiveWidth = () => {
    const breakpoints = component.settings?.responsiveBreakpoints || { mobile: 100, tablet: 80, desktop: 60 };
    // في المعاينة نستخدم قيمة افتراضية للحاسوب
    return breakpoints.desktop;
  };

  // دالة لحساب أنماط CSS حسب إعدادات الحجم
  const getImageStyles = () => {
    const styles: React.CSSProperties = {
      borderRadius: `${component.data.borderRadius || 8}px`,
      objectFit: component.data.fitMode || 'contain',
      objectPosition: component.data.objectPosition || 'center',
    };

    // تطبيق نسبة الأبعاد
    if (component.data.aspectRatio && component.data.aspectRatio !== 'auto') {
      styles.aspectRatio = component.data.aspectRatio;
    }

    // تطبيق أنماط الحجم المختلفة
    switch (component.data.sizeMode || 'responsive') {
      case 'full-width':
        styles.width = '100%';
        styles.height = 'auto';
        break;
      case 'contain':
        styles.maxWidth = '100%';
        styles.height = 'auto';
        break;
      case 'cover':
        styles.width = '100%';
        styles.height = '300px'; // ارتفاع ثابت للتغطية
        break;
      case 'custom':
        if (component.data.maxWidth) {
          styles.maxWidth = `${component.data.maxWidth}px`;
        }
        if (component.data.maxHeight) {
          styles.maxHeight = `${component.data.maxHeight}px`;
        }
        break;
      case 'responsive':
      default:
        const responsiveWidth = getResponsiveWidth();
        styles.maxWidth = `${responsiveWidth}%`;
        styles.height = 'auto';
        break;
    }

    return styles;
  };

  // دالة لحساب classes حسب إعدادات الحجم
  const getImageClasses = () => {
    return cn(
      "transition-all duration-300",
      imageLoaded ? "opacity-100" : "opacity-0",
      component.data.shadow && "shadow-lg hover:shadow-xl",
      component.settings?.enableLightbox && "cursor-zoom-in hover:scale-[1.02]",
      // تطبيق classes حسب وضع الحجم
      (component.data.sizeMode || 'responsive') === 'full-width' && "w-full",
      (component.data.sizeMode || 'responsive') === 'contain' && "max-w-full h-auto",
      (component.data.sizeMode || 'responsive') === 'cover' && "w-full h-48",
      (component.data.sizeMode || 'responsive') === 'custom' && "max-w-full h-auto",
      (component.data.sizeMode || 'responsive') === 'responsive' && "max-w-full h-auto"
    );
  };

  return (
    <>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        "border-border/50 bg-card/50 backdrop-blur-sm",
        className
      )}>
        {/* Action buttons */}
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Component type badge */}
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-xs bg-background/90">
            <ImageIcon className="w-3 h-3 mr-1" />
            صورة
          </Badge>
        </div>

        <div className="p-4">
          <div 
            className={cn(
              "relative overflow-hidden",
              component.data.alignment === 'left' && "text-left",
              component.data.alignment === 'center' && "text-center",
              component.data.alignment === 'right' && "text-right"
            )}
            style={{ borderRadius: `${component.data.borderRadius}px` }}
          >
            {component.data.url ? (
              <div className="relative">
                {!imageLoaded && !imageError && (
                  <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg animate-pulse">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {imageError && (
                  <div className="flex flex-col items-center justify-center h-48 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      خطأ في تحميل الصورة
                    </p>
                  </div>
                )}

                <img
                  src={component.data.url}
                  alt={component.data.alt || 'صورة المنتج'}
                  className={getImageClasses()}
                  style={getImageStyles()}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  onClick={handleZoomClick}
                  loading={component.settings.lazyLoad ? "lazy" : "eager"}
                />

                {component.settings?.enableLightbox && imageLoaded && (
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/70 text-white p-1 rounded text-xs flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      اضغط للتكبير
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  لم يتم تحديد صورة
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onEdit}
                  className="mt-2"
                >
                  إضافة صورة
                </Button>
              </div>
            )}

            {/* Caption */}
            {component.settings.showCaption && component.data.caption && (
              <div className="mt-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {component.data.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Enlarged image modal */}
      {showEnlarged && component.data.url && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowEnlarged(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={component.data.url}
              alt={component.data.alt || 'صورة المنتج'}
              className={cn(
                "max-w-full max-h-full object-contain rounded-lg",
                component.settings?.lightboxZoom && "cursor-zoom-in"
              )}
              style={{
                objectFit: component.data.fitMode || 'contain',
                objectPosition: component.data.objectPosition || 'center',
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setShowEnlarged(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
