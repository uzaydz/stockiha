import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { CompleteProduct, ProductColor } from '@/lib/api/productComplete';
import { ImageInfo } from '@/types/imageGallery';

interface UseImageGalleryProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  disableAutoColorSwitch?: boolean;
}

export const useImageGallery = ({ 
  product, 
  selectedColor, 
  disableAutoColorSwitch = false 
}: UseImageGalleryProps) => {
  const [activeImage, setActiveImage] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<Set<string>>(new Set());
  const [userManuallySelected, setUserManuallySelected] = useState(false);
  const lastSelectedColorRef = useRef<string | undefined>();

  // تحسين قائمة الصور مع تصنيف أفضل وcaching
  const allImages = useMemo(() => {
    const imageList: ImageInfo[] = [];
    const seenUrls = new Set<string>(); // لمنع التكرار
    
    // إضافة صورة اللون المختار أولاً إذا كان لديه صورة فعلية
    if (selectedColor?.image_url && 
        selectedColor.image_url.trim() !== '' && 
        selectedColor.image_url !== '/images/placeholder-product.jpg' &&
        !seenUrls.has(selectedColor.image_url)) {
      
      seenUrls.add(selectedColor.image_url);
      imageList.push({
        url: selectedColor.image_url,
        type: 'color',
        colorInfo: {
          name: selectedColor.name,
          colorCode: selectedColor.color_code,
          isDefault: selectedColor.is_default,
          isSelected: true
        }
      });
    }
    
    // إضافة الصورة الرئيسية إذا لم تكن مضافة
    if (product.images?.thumbnail_image && 
        product.images.thumbnail_image.trim() !== '' &&
        !seenUrls.has(product.images.thumbnail_image)) {
      
      seenUrls.add(product.images.thumbnail_image);
      imageList.push({
        url: product.images.thumbnail_image,
        type: 'main'
      });
    }
    
    // إضافة الصور الإضافية
    product.images?.additional_images?.forEach(img => {
      if (img.url && img.url.trim() !== '' && 
          !seenUrls.has(img.url)) {
        
        seenUrls.add(img.url);
        imageList.push({
          url: img.url,
          type: 'additional'
        });
      }
    });

    // إضافة صور الألوان الأخرى
    if (product.variants?.colors && product.variants?.colors.length > 0) {
      const sortedColors = [...product.variants.colors].sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return a.name.localeCompare(b.name);
      });
      
      sortedColors.forEach(color => {
        if (color.image_url && 
            color.image_url.trim() !== '' && 
            color.image_url !== '/images/placeholder-product.jpg' &&
            !seenUrls.has(color.image_url)) {
          
          seenUrls.add(color.image_url);
          imageList.push({
            url: color.image_url,
            type: 'color',
            colorInfo: {
              name: color.name,
              colorCode: color.color_code,
              isDefault: color.is_default,
              isSelected: selectedColor?.id === color.id
            }
          });
        }
      });
    }

    return imageList.length > 0 ? imageList : [{
      url: '/images/placeholder-product.jpg',
      type: 'main' as const
    }];
  }, [product, selectedColor]);

  const imageUrls = useMemo(() => allImages.map(img => img.url), [allImages]);
  const currentIndex = useMemo(() => imageUrls.indexOf(activeImage), [imageUrls, activeImage]);

  // تهيئة الصورة النشطة
  useEffect(() => {
    if (!activeImage && imageUrls.length > 0) {
      setActiveImage(imageUrls[0]);
      setImageLoaded(false);
      setUserManuallySelected(false);
    }
  }, [imageUrls, activeImage]);

  // تحديث الصورة النشطة عند تغيير اللون - مع مراعاة إعدادات التبديل التلقائي
  useEffect(() => {
    const selectedColorId = selectedColor?.id;
    const previousColorId = lastSelectedColorRef.current;
    
    // تحديث المرجع
    lastSelectedColorRef.current = selectedColorId;
    
    // إذا تغير اللون فعلياً (وليس مجرد إعادة رندر)
    if (selectedColorId !== previousColorId) {
      const selectedColorImage = allImages.find(img => 
        img.type === 'color' && img.colorInfo?.isSelected
      );
      
      // التحقق من شروط التبديل التلقائي
      const shouldAutoSwitch = !disableAutoColorSwitch && (
        !userManuallySelected || !imageUrls.includes(activeImage)
      );
      
      if (selectedColorImage && shouldAutoSwitch) {
        setActiveImage(selectedColorImage.url);
        setImageLoaded(false);
        setUserManuallySelected(false); // إعادة تعيين عند تغيير اللون
      }
    }
  }, [selectedColor, allImages, activeImage, imageUrls, userManuallySelected, disableAutoColorSwitch]);

  // معالجة محسنة لتحميل الصور مع debouncing
  const handleImageLoad = useCallback(() => {
    // استخدام requestAnimationFrame لتحسين الأداء
    requestAnimationFrame(() => {
      setImageLoaded(true);
    });
  }, []);

  const handleImageError = useCallback((imageUrl: string) => {
    requestAnimationFrame(() => {
      setImageLoadError(prev => {
        if (prev.has(imageUrl)) return prev; // تجنب التحديث غير الضروري
        return new Set([...prev, imageUrl]);
      });
      setImageLoaded(true);
    });
  }, []);

  // التنقل المحسن بين الصور مع validation
  const goToNext = useCallback(() => {
    if (imageUrls.length <= 1) return;
    
    requestAnimationFrame(() => {
      const nextIndex = (currentIndex + 1) % imageUrls.length;
      const nextImage = imageUrls[nextIndex];
      
      if (nextImage && nextImage !== activeImage) {
        setActiveImage(nextImage);
        setImageLoaded(false);
        setUserManuallySelected(true);
      }
    });
  }, [currentIndex, imageUrls, activeImage]);

  const goToPrevious = useCallback(() => {
    if (imageUrls.length <= 1) return;
    
    requestAnimationFrame(() => {
      const prevIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
      const prevImage = imageUrls[prevIndex];
      
      if (prevImage && prevImage !== activeImage) {
        setActiveImage(prevImage);
        setImageLoaded(false);
        setUserManuallySelected(true);
      }
    });
  }, [currentIndex, imageUrls, activeImage]);

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < imageUrls.length && index !== currentIndex) {
      const targetImage = imageUrls[index];
      
      if (targetImage && targetImage !== activeImage) {
        requestAnimationFrame(() => {
          setActiveImage(targetImage);
          setImageLoaded(false);
          setUserManuallySelected(true);
        });
      }
    }
  }, [imageUrls, currentIndex, activeImage]);

  const selectImage = useCallback((url: string) => {
    if (url && url !== activeImage && imageUrls.includes(url)) {
      requestAnimationFrame(() => {
        setActiveImage(url);
        setImageLoaded(false);
        setUserManuallySelected(true);
      });
    }
  }, [activeImage, imageUrls]);

  // دالة لإعادة تعيين الاختيار اليدوي (يمكن استخدامها عند الحاجة)
  const resetManualSelection = useCallback(() => {
    setUserManuallySelected(false);
  }, []);

  // دالة لإجبار التبديل إلى صورة اللون (تتجاهل الاختيار اليدوي)
  const forceColorImageSwitch = useCallback(() => {
    const selectedColorImage = allImages.find(img => 
      img.type === 'color' && img.colorInfo?.isSelected
    );
    
    if (selectedColorImage) {
      setActiveImage(selectedColorImage.url);
      setImageLoaded(false);
      setUserManuallySelected(false);
    }
  }, [allImages]);

  const currentImageInfo = useMemo(() => 
    allImages.find(img => img.url === activeImage), 
    [allImages, activeImage]
  );
  
  const hasError = useMemo(() => 
    imageLoadError.has(activeImage), 
    [imageLoadError, activeImage]
  );

  return {
    // State
    activeImage,
    allImages,
    imageUrls,
    currentIndex,
    currentImageInfo,
    imageLoaded,
    hasError,
    imageLoadError,
    userManuallySelected,
    
    // Actions (memoized)
    handleImageLoad,
    handleImageError,
    goToNext,
    goToPrevious,
    goToImage,
    selectImage,
    setActiveImage,
    resetManualSelection,
    forceColorImageSwitch
  };
};
