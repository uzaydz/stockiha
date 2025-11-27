import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  loadProductsToCache, 
  searchProductsInCache, 
  getCacheInfo,
  clearCache
} from '@/lib/api/products-simple-cache';
import { useTenant } from '@/context/TenantContext';

interface UseProductsCacheOptions {
  searchQuery?: string;
  categoryFilter?: string;
  stockFilter?: string;
  sortOption?: string;
  page?: number;
  limit?: number;
  autoLoad?: boolean;
  // فلاتر الفئات المتقدمة
  selectedCategories?: string[];
  selectedSubcategories?: string[];
}

interface UseProductsCacheResult {
  products: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: string | null;
  cacheInfo: {
    productsCount: number;
    isExpired: boolean;
    ageInMinutes: number;
    organizationId: string;
  };
  refreshCache: () => Promise<void>;
  clearProductsCache: () => void;
}

export const useProductsCache = (options: UseProductsCacheOptions = {}): UseProductsCacheResult => {
  const {
    searchQuery = '',
    categoryFilter = '',
    stockFilter = 'all',
    sortOption = 'name-asc',
    page = 1,
    limit = 12,
    autoLoad = true,
    // فلاتر الفئات المتقدمة
    selectedCategories = [],
    selectedSubcategories = []
  } = options;

  const { currentOrganization } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // دالة لتحميل الـ cache
  const loadCache = useCallback(async () => {
    if (!currentOrganization?.id || loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      await loadProductsToCache(currentOrganization.id);
    } catch (err) {
      console.error('خطأ في تحميل المنتجات:', err);
      setError('فشل في تحميل المنتجات');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [currentOrganization?.id]);

  // دالة لتحديث الـ cache
  const refreshCache = useCallback(async () => {
    clearCache();
    await loadCache();
  }, [loadCache]);

  // دالة لمسح الـ cache
  const clearProductsCache = useCallback(() => {
    clearCache();
  }, []);

  // تحميل الـ cache عند التحميل الأول
  useEffect(() => {
    if (autoLoad && currentOrganization?.id) {
      loadCache();
    }
  }, [autoLoad, currentOrganization?.id, loadCache]);

  // ⚡ الاستماع لحدث تحديث الصور وإعادة تحميل الـ cache
  useEffect(() => {
    const handleImagesUpdated = () => {
      console.log('[useProductsCache] 📡 Received products-images-updated event, refreshing cache...');
      loadCache();
    };

    const handleProductOperationCompleted = () => {
      console.log('[useProductsCache] 📡 Received product-operation-completed event, refreshing cache...');
      loadCache();
    };

    window.addEventListener('products-images-updated', handleImagesUpdated);
    window.addEventListener('product-operation-completed', handleProductOperationCompleted);

    return () => {
      window.removeEventListener('products-images-updated', handleImagesUpdated);
      window.removeEventListener('product-operation-completed', handleProductOperationCompleted);
    };
  }, [loadCache]);

  // البحث في الـ cache
  const searchResults = searchProductsInCache(searchQuery, {
    categoryFilter,
    stockFilter,
    sortOption,
    page,
    limit,
    // فلاتر الفئات المتقدمة
    selectedCategories,
    selectedSubcategories
  });

  // معلومات الـ cache
  const cacheInfo = getCacheInfo();

  return {
    ...searchResults,
    isLoading,
    error,
    cacheInfo,
    refreshCache,
    clearProductsCache
  };
};
