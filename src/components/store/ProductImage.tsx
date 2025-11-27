import React, { useState, useRef, memo, useCallback } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  productName: string;
  priority?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Cache للصور المحملة لتجنب إعادة التحميل
const imageCache = new Map<string, boolean>();

const ProductImage = memo(({
  src,
  alt,
  className,
  containerClassName,
  productName,
  priority = false,
  size = 'medium'
}: ProductImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(() => imageCache.has(src));
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const { isOnline } = useNetworkStatus();

  // تحسين بسيط للصور - تقليل الجودة للصور الكبيرة فقط + دعم Base64 للـ Offline
  const optimizedSrc = React.useMemo(() => {
    if (!src) return '';

    // ⚡ إذا كانت الصورة Base64 (للعمل Offline)، استخدمها مباشرة
    if (src.startsWith('data:')) {
      return src;
    }

    // إذا كانت الصورة من Supabase، أضف معاملات تحسين بسيطة
    if (src.includes('supabase.co') || src.includes('supabase.in')) {
      try {
        const url = new URL(src);
        // تقليل الجودة قليلاً لتسريع التحميل
        url.searchParams.set('quality', '80');
        // تحديد عرض أقصى للمنتجات
        url.searchParams.set('width', '400');
        return url.toString();
      } catch {
        return src;
      }
    }

    return src;
  }, [src]);

  // معالج تحميل الصورة
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    imageCache.set(src, true);
  }, [src]);

  // معالج خطأ التحميل
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  // تحديد أحجام الأيقونات حسب الحجم
  const iconSizes = {
    small: 'h-8 w-8',
    medium: 'h-16 w-16',
    large: 'h-24 w-24'
  };

  const placeholderIconSizes = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  if (imageError || !optimizedSrc) {
    return (
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10",
        containerClassName
      )}>
        <div className="text-muted-foreground/50 flex flex-col items-center p-4">
          <Package className={cn(iconSizes[size], "mb-3")} />
          <span className="text-sm font-medium text-center line-clamp-2">{productName}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Skeleton placeholder أثناء التحميل */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-muted/20 animate-pulse flex items-center justify-center">
          <div className={cn(
            "bg-muted/60 rounded-full animate-pulse flex items-center justify-center",
            iconSizes[size]
          )}>
            <Package className={cn(placeholderIconSizes[size], "text-muted-foreground/40")} />
          </div>
        </div>
      )}

      {/* الصورة الفعلية */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-contain p-4 transition-all duration-300",
          imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
          className
        )}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          imageRendering: 'crisp-edges',
          willChange: imageLoaded ? 'auto' : 'opacity, transform'
        }}
      />
    </>
  );
});

ProductImage.displayName = 'ProductImage';

export default ProductImage;
