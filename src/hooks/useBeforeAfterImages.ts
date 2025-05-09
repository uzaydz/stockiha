import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook محسن لإدارة تحميل الصور في مكون قبل وبعد
 * تم تحسينه للحصول على سرعة أفضل وتجربة مستخدم محسنة
 * يشمل التحسينات:
 * - تحميل الصور المصغرة أولاً (thumb-first approach)
 * - تخزين مؤقت للصور
 * - تحميل كسول للصور
 * - تحميل تدريجي (من صورة منخفضة الجودة لصورة عالية الجودة)
 * - تقنيات محسنة لعام 2024-2025
 */
export function useBeforeAfterImages(images: string[]) {
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  
  // إضافة نظام تخزين مؤقت متقدم (MemoryCache)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadQueue = useRef<string[]>([]);

  // وظيفة تحويل رابط الصورة إلى رابط للصورة المصغرة
  const getThumbnailUrl = useCallback((imageUrl: string): string => {
    if (!imageUrl) return '';
    
    // استخدام CDN لتحويل الصور عند الإمكان
    if (imageUrl.includes('supabase.co/storage/v1/object/public')) {
      // صيغة أكثر حداثة مع دعم WebP/AVIF إذا كان المتصفح يدعمها
      if ('createImageBitmap' in window && 'OffscreenCanvas' in window) {
        return `${imageUrl}?width=100&quality=50&format=auto`;
      }
      return `${imageUrl}?width=100&quality=50`;
    }
    
    return imageUrl;
  }, []);

  // دالة جديدة: تحميل مسبق للصور القادمة
  const preloadNextImages = useCallback((count: number = 3) => {
    // إذا كان لدينا صور متبقية في قائمة الانتظار، نقوم بتحميلها
    const remainingImages = images.filter(img => !loadedImages[img] && !loadQueue.current.includes(img));
    
    // اختيار الصور المطلوب تحميلها
    const imagesToPreload = remainingImages.slice(0, count);
    
    // لا تقم بتحميل الصور إذا كانت قائمة الانتظار ممتلئة أو لا توجد صور إضافية
    if (loadQueue.current.length > 5 || imagesToPreload.length === 0) return;
    
    // أضف الصور إلى قائمة الانتظار
    imagesToPreload.forEach(img => {
      if (!loadQueue.current.includes(img)) {
        loadQueue.current.push(img);
      }
    });
    
    // تحميل الصور في الخلفية بطريقة لا تؤثر على الأداء
    imagesToPreload.forEach(imageSrc => {
      // تحقق مما إذا كانت الصورة في ذاكرة التخزين المؤقت
      if (imageCache.current.has(imageSrc)) return;
      
      const img = new Image();
      
      // إعداد خصائص تحميل الصورة المحسنة
      img.decoding = 'async';
      img.loading = 'lazy';
      
      img.onload = () => {
        // تخزين الصورة في الذاكرة المؤقتة
        imageCache.current.set(imageSrc, img);
        setLoadedImages(prev => ({ ...prev, [imageSrc]: true }));
        
        // إزالة الصورة من قائمة الانتظار
        loadQueue.current = loadQueue.current.filter(src => src !== imageSrc);
      };
      
      img.onerror = () => {
        setErrors(prev => ({ ...prev, [imageSrc]: true }));
        loadQueue.current = loadQueue.current.filter(src => src !== imageSrc);
      };
      
      img.src = imageSrc;
    });
  }, [images, loadedImages]);

  // تحميل الصور المصغرة أولاً ثم الصور كاملة الجودة
  useEffect(() => {
    // إذا لم تكن هناك صور، نعيّن isLoading على false
    if (!images || images.length === 0) {
      setIsLoading(false);
      return;
    }

    // استراتيجية تحميل متقدمة - طريقة 1-2-4
    const validImages = images.filter(img => !!img);
    
    // لا حاجة للانتظار فترة طويلة إذا كان لدينا عدد قليل من الصور
    const fastLoadThreshold = validImages.length <= 4 ? 0.5 : 0.3;
    
    // أولاً: تحميل الصور المصغرة بسرعة
    const thumbsMap: Record<string, string> = {};
    let loadedThumbs = 0;
    const totalThumbs = validImages.length;
    
    // تحميل جميع الصور المصغرة بالتوازي وتطبيق مبدأ الكسر النسبي للتحميل
    validImages.forEach(imageSrc => {
      const thumbSrc = getThumbnailUrl(imageSrc);
      thumbsMap[imageSrc] = thumbSrc;
      
      // استخدام تقنية Promise.any للتحميل المتوازي
      const thumbImg = new Image();
      thumbImg.onload = () => {
        setThumbnails(prev => ({ ...prev, [imageSrc]: thumbSrc }));
        loadedThumbs++;
        
        // عندما يتم تحميل نسبة من الصور المصغرة، نبدأ عملية العرض
        if (loadedThumbs >= totalThumbs * fastLoadThreshold) {
          setIsLoading(false);
          loadFullSizeImages(validImages);
        }
      };
      thumbImg.onerror = () => {
        loadedThumbs++;
        if (loadedThumbs >= totalThumbs * fastLoadThreshold) {
          setIsLoading(false);
          loadFullSizeImages(validImages);
        }
      };
      // الاستفادة من التحميل المتزامن مع fetchpriority للصورتين الأولى والثانية
      if (validImages.indexOf(imageSrc) < 2) {
        thumbImg.setAttribute('fetchpriority', 'high');
      }
      thumbImg.src = thumbSrc;
    });

    // عرض الصور المصغرة فوراً حتى قبل اكتمال تحميلها
    setThumbnails(thumbsMap);
    
    // عرض المحتوى بشكل أسرع (بدون انتظار طويل) - تحسين 2024
    // زمن فائق السرعة للاستجابة
    const timeout = setTimeout(() => {
      setIsLoading(false);
      loadFullSizeImages(validImages);
    }, 200); // نقليل زمن الانتظار من 500 إلى 200 مللي ثانية

    return () => clearTimeout(timeout);
  }, [images, getThumbnailUrl]);

  // تحميل الصور كاملة الحجم في الخلفية بشكل متوازٍ
  const loadFullSizeImages = (imageSrcs: string[]) => {
    // زيادة التوازي لتحسين الأداء 2024-2025
    const MAX_PARALLEL_LOADS = 6; // زيادة من 4 إلى 6 للمتصفحات الحديثة
    let activeLoads = 0;
    let index = 0;
    
    const loadNextImage = () => {
      if (index >= imageSrcs.length) return;
      
      const src = imageSrcs[index++];
      if (!src || loadedImages[src]) {
        loadNextImage();
        return;
      }
      
      activeLoads++;
      
      // تحقق مما إذا كانت الصورة مخزنة مؤقتًا
      if (imageCache.current?.has(src)) {
        setLoadedImages(prev => ({ ...prev, [src]: true }));
        activeLoads--;
        loadNextImage();
        return;
      }
      
      const img = new Image();
      
      // تحسين خيارات التحميل
      img.decoding = 'async';
      
      img.onload = () => {
        // تخزين في الذاكرة المؤقتة
        imageCache.current?.set(src, img);
        setLoadedImages(prev => ({ ...prev, [src]: true }));
        activeLoads--;
        loadNextImage();
      };
      
      img.onerror = () => {
        setErrors(prev => ({ ...prev, [src]: true }));
        activeLoads--;
        loadNextImage();
      };
      
      img.src = src;
    };
    
    // بدء تحميل عدة صور بالتوازي - مع التأكد من وجود أولوية لأول صورتين
    for (let i = 0; i < Math.min(MAX_PARALLEL_LOADS, imageSrcs.length); i++) {
      loadNextImage();
    }
  };

  /**
   * التحقق من اكتمال تحميل صورة محددة
   */
  const isImageLoaded = (imageSrc: string) => {
    return !!loadedImages[imageSrc];
  };

  /**
   * التحقق مما إذا كانت صورة محددة بها خطأ
   */
  const hasImageError = (imageSrc: string) => {
    return !!errors[imageSrc];
  };

  /**
   * الحصول على صورة مصغرة لصورة محددة (لعرض سريع أثناء التحميل)
   */
  const getThumbnail = (imageSrc: string) => {
    return thumbnails[imageSrc] || imageSrc;
  };

  /**
   * الحصول على مسار صورة احتياطية في حالة حدوث خطأ
   */
  const getFallbackImage = (type: 'before' | 'after') => {
    return type === 'before' 
      ? '/assets/images/before-placeholder.jpg' 
      : '/assets/images/after-placeholder.jpg';
  };

  return {
    isLoading,
    loadedImages,
    errors,
    isImageLoaded,
    hasImageError,
    getThumbnail,
    getFallbackImage,
    preloadNextImages
  };
} 