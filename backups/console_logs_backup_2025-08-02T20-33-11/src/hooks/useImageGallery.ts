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

  // تحسين قائمة الصور مع تصنيف أفضل
  const allImages = useMemo(() => {
    const imageList: ImageInfo[] = [];
    
    // إضافة صورة اللون المختار أولاً إذا كان لديه صورة فعلية
    if (selectedColor?.image_url && 
        selectedColor.image_url.trim() !== '' && 
        selectedColor.image_url !== '/images/placeholder-product.jpg') {
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
        !imageList.some(img => img.url === product.images?.thumbnail_image)) {
      imageList.push({
        url: product.images.thumbnail_image,
        type: 'main'
      });
    }
    
    // إضافة الصور الإضافية
    product.images?.additional_images?.forEach(img => {
      if (img.url && img.url.trim() !== '' && 
          !imageList.some(item => item.url === img.url)) {
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
            !imageList.some(img => img.url === color.image_url)) {
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

  const imageUrls = allImages.map(img => img.url);
  const currentIndex = imageUrls.indexOf(activeImage);

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

  // معالجة تحميل الصور
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback((imageUrl: string) => {
    setImageLoadError(prev => new Set([...prev, imageUrl]));
    setImageLoaded(true);
  }, []);

  // التنقل بين الصور
  const goToNext = useCallback(() => {
    if (imageUrls.length <= 1) return;
    const nextIndex = (currentIndex + 1) % imageUrls.length;
    setActiveImage(imageUrls[nextIndex]);
    setImageLoaded(false);
    setUserManuallySelected(true); // المستخدم تنقل يدوياً
  }, [currentIndex, imageUrls]);

  const goToPrevious = useCallback(() => {
    if (imageUrls.length <= 1) return;
    const prevIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    setActiveImage(imageUrls[prevIndex]);
    setImageLoaded(false);
    setUserManuallySelected(true); // المستخدم تنقل يدوياً
  }, [currentIndex, imageUrls]);

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < imageUrls.length && index !== currentIndex) {
      setActiveImage(imageUrls[index]);
      setImageLoaded(false);
      setUserManuallySelected(true); // المستخدم حدد صورة يدوياً
    }
  }, [imageUrls, currentIndex]);

  const selectImage = useCallback((url: string) => {
    if (url !== activeImage && imageUrls.includes(url)) {
      setActiveImage(url);
      setImageLoaded(false);
      setUserManuallySelected(true); // المستخدم حدد صورة يدوياً
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

  const currentImageInfo = allImages.find(img => img.url === activeImage);
  const hasError = imageLoadError.has(activeImage);

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
    
    // Actions
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
