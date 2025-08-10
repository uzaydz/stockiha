import { useState, useEffect, useMemo, useCallback } from 'react';
import type { 
  UseCategoryDataProps, 
  UseCategoryDataResult, 
  ExtendedCategory,
  LoadingState 
} from '../types';

/**
 * Hook محسّن لإدارة بيانات الفئات - نسخة مبسطة وآمنة
 */
export const useCategoryDataOptimized = ({
  propCategories,
  useRealCategories = true,
  settings,
  performanceSettings = {}
}: UseCategoryDataProps): UseCategoryDataResult => {
  
  // إضافة console log للتشخيص
  
  // الحالات الأساسية
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [preloadedImagesCount, setPreloadedImagesCount] = useState(0);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isError: false,
    progress: 0
  });

  // معالجة البيانات بشكل مبسط مع تحويل image_url إلى imageUrl
  const processedCategories = useMemo(() => {
    // إعطاء الأولوية للـ propCategories إذا كانت متوفرة
    const categoriesToProcess = propCategories && propCategories.length > 0 ? propCategories : [];
    
    if (categoriesToProcess.length === 0) {
      return [];
    }

    let processed = [...categoriesToProcess].map(category => {
      // Type assertion للتعامل مع البيانات الواردة من قاعدة البيانات
      const rawCategory = category as any;
      
      const processedCategory = {
        ...category,
        // تحويل image_url إلى imageUrl إذا لم يكن موجود
        imageUrl: category.imageUrl || rawCategory.image_url || '',
        // التأكد من وجود الحقول المطلوبة
        description: category.description || '',
        icon: category.icon || 'layers',
        color: category.color || 'from-blue-500 to-indigo-600'
      };
      
      // تسجيل البيانات في بيئة التطوير (معطل لتقليل الضوضاء)
      // if (process.env.NODE_ENV === 'development') {
      //   console.log('Category processing:', {
      //     original: category,
      //     processed: processedCategory,
      //     hasImageUrl: !!processedCategory.imageUrl
      //   });
      // }
      
      return processedCategory;
    });
    
    // تطبيق الفلترة حسب الإعدادات
    if (settings.selectionMethod === 'popular') {
      processed.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    } else if (settings.selectionMethod === 'newest') {
      processed = processed.filter(cat => cat.isNew);
    }
    
    // تحديد الحد الأقصى للعرض
    if (settings.maxCategories) {
      processed = processed.slice(0, settings.maxCategories);
    }
    
    // إضافة أولوية التحميل
    return processed.map((category, index) => ({
      ...category,
      priority: index < 6
    }));
  }, [propCategories, settings.selectionMethod, settings.maxCategories]);

  // دالة تحميل الصور مسبقاً
  const preloadImages = useCallback((categories: ExtendedCategory[]) => {
    let loadedCount = 0;
    
    categories.forEach(category => {
      if (category.imageUrl) {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          setPreloadedImagesCount(prev => prev + 1);
        };
        img.onerror = () => {
          loadedCount++;
        };
        img.src = category.imageUrl;
      }
    });
  }, []);

  // تحميل المزيد من البيانات
  const loadMore = useCallback(() => {
    if (!loadingState.isLoading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      const displayCount = settings.displayCount || 6;
      const startIndex = (nextPage - 1) * displayCount;
      const endIndex = startIndex + displayCount;
      const pageCategories = processedCategories.slice(startIndex, endIndex);
      
      setCategories(prev => [...prev, ...pageCategories]);
      setHasMore(endIndex < processedCategories.length);
      
      // تحميل صور الصفحة الجديدة
      preloadImages(pageCategories);
    }
  }, [loadingState.isLoading, hasMore, currentPage, settings.displayCount, processedCategories, preloadImages]);

  // إعادة تحميل البيانات
  const refresh = useCallback(() => {
    const displayCount = settings.displayCount || 6;
    const initialCategories = processedCategories.slice(0, displayCount);
    
    setCurrentPage(1);
    setCategories(initialCategories);
    setHasMore(displayCount < processedCategories.length);
    setLoadingState({ isLoading: false, isError: false, progress: 100 });
    setPreloadedImagesCount(0);
    
    // تحميل الصور مسبقاً
    preloadImages(initialCategories);
  }, [processedCategories, settings.displayCount, preloadImages]);

  // تحديث البيانات عند تغيير المدخلات - مع تأخير لتجنب التحديث المتكرر
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const displayCount = settings.displayCount || 6;
      const initialCategories = processedCategories.slice(0, displayCount);

      setCategories(initialCategories);
      setHasMore(displayCount < processedCategories.length);
      setCurrentPage(1);
      setLoadingState({ isLoading: false, isError: false, progress: 100 });
      setPreloadedImagesCount(0);
      
      // تحميل الصور مسبقاً
      preloadImages(initialCategories);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [processedCategories, settings.displayCount, preloadImages]);

  // حساب البيانات المعروضة
  const displayedCategories = useMemo(() => {
    return categories;
  }, [categories]);

  // تحديد ما إذا كان يجب عرض رسالة التجريب
  const showDemoMessage = !useRealCategories || (useRealCategories && (!propCategories || propCategories.length === 0));

  return {
    displayedCategories,
    isLoading: loadingState.isLoading,
    isError: loadingState.isError,
    error: loadingState.error,
    showDemoMessage,
    loadMore: hasMore ? loadMore : undefined,
    hasMore,
    refresh,
    
    // معلومات إضافية للتطوير
    _debug: process.env.NODE_ENV === 'development' ? {
      performanceStats: {},
      loadingProgress: loadingState.progress,
      currentPage,
      totalCategories: processedCategories.length
    } : undefined
  };
};
