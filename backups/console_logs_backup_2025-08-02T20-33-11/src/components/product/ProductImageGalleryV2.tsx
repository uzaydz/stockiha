import React, { useState, useEffect, memo } from 'react';
import { CompleteProduct, ProductColor } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { useImageGallery } from '@/hooks/useImageGallery';
import { useScrollFollow } from '@/hooks/useScrollFollow';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import MainImageDisplay from './MainImageDisplay';
import ThumbnailGrid from './ThumbnailGrid';
import ImageControls from './ImageControls';

interface ProductImageGalleryV2Props {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  disableAutoColorSwitch?: boolean;
  enableScrollFollow?: boolean;
  className?: string;
}

/**
 * معرض الصور المحسن للمنتجات - الإصدار الثالث المطور
 * 
 * التحسينات الجديدة:
 * - تقسيم المكون إلى عدة مكونات منفصلة
 * - تحسين الأداء وتقليل الثقل
 * - إصلاح مشاكل التبديل بين الصور
 * - تحسين تجربة المستخدم
 * - تصميم أبسط وأكثر قابلية للصيانة
 * - إضافة خيار لتعطيل التبديل التلقائي للألوان
 * - إضافة ميزة التتبع عند التمرير (للحاسوب)
 * - تحسين تحميل الصور مع التحميل المسبق
 * - إصلاح مشاكل الزوم والتتبع العمودي
 */
const ProductImageGalleryV2 = memo<ProductImageGalleryV2Props>(({ 
  product, 
  selectedColor,
  disableAutoColorSwitch = false,
  enableScrollFollow = true,
  className
}) => {
  // استخدام الhooks المخصصة لإدارة حالة المعرض
  const {
    activeImage,
    allImages,
    imageUrls,
    currentIndex,
    currentImageInfo,
    imageLoaded,
    hasError,
    imageLoadError,
    handleImageLoad,
    handleImageError,
    goToNext,
    goToPrevious,
    goToImage,
    selectImage,
    userManuallySelected,
    resetManualSelection
  } = useImageGallery({ product, selectedColor, disableAutoColorSwitch });

  // استخدام hook التتبع عند التمرير
  const {
    isFollowing,
    position,
    containerRef,
    galleryRef,
    isMobile,
    resetFollow,
    getDebugInfo
  } = useScrollFollow({
    enabled: enableScrollFollow,
    offset: 20,
    stickyMode: true // تفعيل الوضع sticky دائماً
  });

  // استخدام hook التحميل المسبق للصور
  const {
    isImageLoaded: isPreloaded,
    hasImageError: hasPreloadError,
    isImageLoading: isPreloading,
    loadingStats,
    retryImage
  } = useImagePreloader({
    imageUrls,
    priority: 3
  });

  // دمج حالة التحميل من النظامين
  const getEffectiveImageState = (url: string) => ({
    loaded: imageLoaded && isPreloaded(url),
    error: hasError || hasPreloadError(url),
    loading: !imageLoaded || isPreloading(url)
  });

  // إعادة تعيين الاختيار اليدوي عند تغيير اللون إذا كان التبديل التلقائي مُعطل
  useEffect(() => {
    if (disableAutoColorSwitch && userManuallySelected) {
      // يمكن إضافة منطق إضافي هنا حسب الحاجة
    }
  }, [selectedColor, disableAutoColorSwitch, userManuallySelected, resetManualSelection]);

  // التحكم بلوحة المفاتيح
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToNext();
      else if (e.key === 'ArrowRight') goToPrevious();
      else if (e.key === 'Escape' && isFollowing) resetFollow();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious, isFollowing, resetFollow]);

  const effectiveImageState = getEffectiveImageState(activeImage);
  const debugInfo = getDebugInfo();

  return (
    <div className={cn("w-full", className)}>
      {/* Placeholder للحفاظ على المساحة عندما تكون الجالري في وضع التتبع */}
      {isFollowing && (
        <div 
          style={{ height: galleryRef.current?.offsetHeight || 'auto' }} 
          className="transition-all duration-300"
        />
      )}
      
      <div 
        ref={galleryRef}
        className={cn(
          "transition-all duration-300 ease-out",
          isMobile ? "space-y-3" : "space-y-4",
          isFollowing && [
            "fixed z-50 bg-background/98 backdrop-blur-md rounded-3xl p-4 md:p-6",
            "shadow-2xl border border-border/40",
            "ring-1 ring-black/5 dark:ring-white/5",
            // إضافة تحسينات بصرية عند التتبع
            "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)]",
            "backdrop-saturate-150"
          ]
        )}
        style={isFollowing ? {
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          // إضافة z-index عالي للتأكد من الظهور فوق كل شيء
          zIndex: 9999
        } : undefined}
      >
        {/* الصورة الرئيسية مع التحكمات */}
        <div className="relative" ref={containerRef}>
          <MainImageDisplay
            currentImage={activeImage}
            imageInfo={currentImageInfo}
            productName={product.name}
            currentIndex={currentIndex}
            onImageLoad={handleImageLoad}
            onImageError={handleImageError}
            hasError={effectiveImageState.error}
            isLoaded={effectiveImageState.loaded}
            isMobile={isMobile}
          />
          
          {/* تحكمات التنقل */}
          <ImageControls
            totalImages={imageUrls.length}
            currentIndex={currentIndex}
            onNext={goToNext}
            onPrevious={goToPrevious}
            onGoToImage={goToImage}
            isMobile={isMobile}
            className="absolute inset-0"
          />
        </div>

        {/* الصور المصغرة */}
        <ThumbnailGrid
          images={allImages}
          activeImage={activeImage}
          onImageSelect={selectImage}
          onImageError={handleImageError}
          imageLoadError={imageLoadError}
          isMobile={isMobile}
          isCompact={isFollowing}
        />
      </div>
    </div>
  );
});

ProductImageGalleryV2.displayName = 'ProductImageGalleryV2';

export default ProductImageGalleryV2;

// الأنماط المخصصة
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

// إضافة الأنماط
if (typeof document !== 'undefined' && !document.getElementById('product-gallery-v2-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'product-gallery-v2-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
