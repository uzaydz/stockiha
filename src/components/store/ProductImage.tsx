import React, { memo } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import PerformanceOptimizedImage from '@/components/ui/PerformanceOptimizedImage';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  productName: string;
  priority?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ProductImage = memo(({ 
  src, 
  alt, 
  className,
  containerClassName,
  productName,
  priority = false,
  size = 'medium'
}: ProductImageProps) => {
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

  if (!src) {
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
    <PerformanceOptimizedImage
      src={src}
      alt={alt}
      priority={priority}
      /*
       * نملأ مساحة البطاقة مع الحفاظ على الصورة كاملة (contain)
       * البطاقة لديها aspect-ratio، لذا لا نحتاج أبعاد ثابتة هنا
       */
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
      className={cn("w-full h-full", className)}
      placeholder="blur"
      objectFit="contain"
      objectPosition="center"
    />
  );
});

ProductImage.displayName = 'ProductImage';

export default ProductImage;
