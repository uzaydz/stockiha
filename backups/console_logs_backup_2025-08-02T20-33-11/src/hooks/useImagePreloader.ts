import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseImagePreloaderProps {
  imageUrls: string[];
  priority?: number; // عدد الصور ذات الأولوية للتحميل المسبق
}

interface ImageState {
  loaded: boolean;
  error: boolean;
  loading: boolean;
}

export const useImagePreloader = ({ 
  imageUrls, 
  priority = 3 
}: UseImagePreloaderProps) => {
  const [imageStates, setImageStates] = useState<Map<string, ImageState>>(new Map());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // تصنيف الصور حسب الأولوية
  const { priorityImages, regularImages } = useMemo(() => {
    return {
      priorityImages: imageUrls.slice(0, priority),
      regularImages: imageUrls.slice(priority)
    };
  }, [imageUrls, priority]);

  // دالة لتحميل صورة واحدة
  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!url || url.trim() === '') {
        reject(new Error('Invalid URL'));
        return;
      }

      // تحقق من الذاكرة المؤقتة
      setImageStates(prev => {
        const currentState = prev.get(url);
        if (currentState?.loaded) {
          resolve();
          return prev;
        }

        const newState = new Map(prev);
        newState.set(url, {
          loaded: false,
          error: false,
          loading: true
        });
        return newState;
      });

      const img = new Image();
      
      img.onload = () => {
        setImageStates(prev => {
          const newState = new Map(prev);
          newState.set(url, {
            loaded: true,
            error: false,
            loading: false
          });
          return newState;
        });
        setPreloadedImages(prev => new Set([...prev, url]));
        resolve();
      };

      img.onerror = () => {
        setImageStates(prev => {
          const newState = new Map(prev);
          newState.set(url, {
            loaded: false,
            error: true,
            loading: false
          });
          return newState;
        });
        reject(new Error(`Failed to load image: ${url}`));
      };

      // بدء التحميل
      img.src = url;
    });
  }, []); // إزالة preloadedImages من dependencies لمنع الحلقة اللانهائية

  // تحميل الصور ذات الأولوية أولاً
  useEffect(() => {
    if (priorityImages.length === 0) return;

    const loadPriorityImages = async () => {
      const promises = priorityImages.map(url => 
        preloadImage(url).catch(() => {
          // تجاهل الأخطاء ومتابعة التحميل
        })
      );
      
      await Promise.allSettled(promises);
      
      // بعد تحميل الصور ذات الأولوية، ابدأ بتحميل الباقي
      regularImages.forEach((url, index) => {
        setTimeout(() => {
          preloadImage(url).catch(() => {
          });
        }, index * 100); // تأخير تدريجي لتجنب الضغط على الشبكة
      });
    };

    loadPriorityImages();
  }, [priorityImages.join(','), regularImages.join(','), preloadImage]); // استخدام join لتجنب re-render غير ضروري

  // دالة للحصول على حالة صورة معينة
  const getImageState = useCallback((url: string): ImageState => {
    return imageStates.get(url) || {
      loaded: false,
      error: false,
      loading: false
    };
  }, [imageStates]);

  // دالة للتحقق من تحميل صورة
  const isImageLoaded = useCallback((url: string): boolean => {
    return preloadedImages.has(url) || getImageState(url).loaded;
  }, [preloadedImages, getImageState]);

  // دالة للتحقق من وجود خطأ في تحميل صورة
  const hasImageError = useCallback((url: string): boolean => {
    return getImageState(url).error;
  }, [getImageState]);

  // دالة للتحقق من حالة التحميل
  const isImageLoading = useCallback((url: string): boolean => {
    return getImageState(url).loading;
  }, [getImageState]);

  // إحصائيات التحميل
  const loadingStats = useMemo(() => {
    const total = imageUrls.length;
    const loaded = imageUrls.filter(url => isImageLoaded(url)).length;
    const errors = imageUrls.filter(url => hasImageError(url)).length;
    const loading = imageUrls.filter(url => isImageLoading(url)).length;
    
    return {
      total,
      loaded,
      errors,
      loading,
      progress: total > 0 ? (loaded / total) * 100 : 0
    };
  }, [imageUrls, isImageLoaded, hasImageError, isImageLoading]);

  // دالة لإعادة تحميل صورة فاشلة
  const retryImage = useCallback((url: string) => {
    setImageStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(url);
      return newMap;
    });
    setPreloadedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
    
    return preloadImage(url);
  }, [preloadImage]);

  return {
    // حالة الصور
    isImageLoaded,
    hasImageError,
    isImageLoading,
    getImageState,
    
    // إحصائيات
    loadingStats,
    
    // إجراءات
    preloadImage,
    retryImage
  };
};
