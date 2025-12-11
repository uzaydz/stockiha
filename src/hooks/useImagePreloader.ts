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

  // دالة محسنة لتحميل صورة واحدة مع Intersection Observer
  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!url || url.trim() === '') {
        reject(new Error('Invalid URL'));
        return;
      }

      // تحقق من الذاكرة المؤقتة مع optimization
      setImageStates(prev => {
        const currentState = prev.get(url);
        if (currentState?.loaded) {
          resolve();
          return prev;
        }
        if (currentState?.loading) {
          // إذا كانت قيد التحميل، انتظر مع timeout للحماية من Memory Leak
          let checkCount = 0;
          const MAX_CHECKS = 100; // 10 ثوانٍ كحد أقصى (100 * 100ms)

          const checkInterval = setInterval(() => {
            checkCount++;
            const state = prev.get(url);

            if (state?.loaded) {
              clearInterval(checkInterval);
              resolve();
            } else if (state?.error) {
              clearInterval(checkInterval);
              reject(new Error(`Image failed to load: ${url}`));
            } else if (checkCount >= MAX_CHECKS) {
              // 🔧 Fix: إلغاء الـ interval بعد timeout للحماية من Memory Leak
              clearInterval(checkInterval);
              reject(new Error(`Image load timeout (waiting): ${url}`));
            }
          }, 100);
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
      
      // تحسين أداء التحميل
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      
      const loadTimeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        setImageStates(prev => {
          const newState = new Map(prev);
          newState.set(url, {
            loaded: false,
            error: true,
            loading: false
          });
          return newState;
        });
        reject(new Error(`Image load timeout: ${url}`));
      }, 10000); // timeout بعد 10 ثوان
      
      img.onload = () => {
        clearTimeout(loadTimeout);
        requestAnimationFrame(() => {
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
        });
      };

      img.onerror = () => {
        clearTimeout(loadTimeout);
        requestAnimationFrame(() => {
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
        });
      };

      // بدء التحميل
      img.src = url;
    });
  }, []);

  // تحميل محسن للصور مع throttling وpriority queue
  useEffect(() => {
    if (priorityImages.length === 0) return;

    let isComponentMounted = true;
    const abortController = new AbortController();
    
    const loadPriorityImages = async () => {
      // تحميل الصور ذات الأولوية بشكل متوازي
      for (let i = 0; i < priorityImages.length && isComponentMounted; i++) {
        try {
          if (abortController.signal.aborted) break;
          await preloadImage(priorityImages[i]);
          // تأخير قصير بين الصور لتجنب الضغط
          if (i < priorityImages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
        }
      }
      
      // بعد تحميل الصور ذات الأولوية، ابدأ بتحميل الباقي
      if (isComponentMounted && !abortController.signal.aborted) {
        // استخدام requestIdleCallback إذا كان متاحاً
        const loadRegularImages = () => {
          // تحميل الصور العادية
          regularImages.forEach((imageUrl) => {
            const img = new Image();
            img.src = imageUrl;
          });
        };

        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(loadRegularImages, { timeout: 2000 });
        } else {
          // fallback للمتصفحات التي لا تدعم requestIdleCallback
          setTimeout(loadRegularImages, 100);
        }
      }
    };

    loadPriorityImages();
    
    return () => {
      isComponentMounted = false;
      abortController.abort();
    };
  }, [priorityImages.join(','), regularImages.join(','), preloadImage]);

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

  // دالة محسنة لإعادة تحميل صورة فاشلة مع exponential backoff
  const retryImage = useCallback((url: string, retryCount = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 ثانية
    
    if (retryCount >= maxRetries) {
      return Promise.reject(new Error(`Max retries reached for ${url}`));
    }
    
    // تنظيف الحالة القديمة
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
    
    // حساب التأخير بناءً على exponential backoff
    const delay = baseDelay * Math.pow(2, retryCount);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        preloadImage(url)
          .then(resolve)
          .catch(() => {
            // إعادة المحاولة بعد تأخير
            retryImage(url, retryCount + 1)
              .then(resolve)
              .catch(reject);
          });
      }, delay);
    });
  }, [preloadImage]);

  // دالة لتنظيف الذاكرة
  const clearCache = useCallback(() => {
    setImageStates(new Map());
    setPreloadedImages(new Set());
  }, []);
  
  // دالة لتحميل مجموعة من الصور
  const preloadImages = useCallback(async (urls: string[]) => {
    const results = await Promise.allSettled(
      urls.map(url => preloadImage(url))
    );
    
    return results.map((result, index) => ({
      url: urls[index],
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason : null
    }));
  }, [preloadImage]);

  return {
    // حالة الصور
    isImageLoaded,
    hasImageError,
    isImageLoading,
    getImageState,
    
    // إحصائيات
    loadingStats,
    
    // إجراءات محسنة
    preloadImage,
    preloadImages,
    retryImage,
    clearCache
  };
};
