import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/api/store';
import { useStorePage } from '@/context/StorePageContext';
import { getProducts } from '@/lib/api/products';
import { useTranslation } from 'react-i18next';
import { smartPreloadImages } from '@/lib/imageOptimization';
import { 
  convertDatabaseProductToStoreProduct, 
  getDefaultProducts,
  DBProduct
} from './productUtils';

interface UseFeaturedProductsProps {
  initialProducts?: Product[];
  selectionMethod?: 'automatic' | 'manual';
  selectionCriteria?: 'featured' | 'best_selling' | 'newest' | 'discounted';
  selectedProducts?: string[];
  displayCount?: number;
  organizationId?: string;
}

export const useFeaturedProducts = ({
  initialProducts = [],
  selectionMethod = 'automatic',
  selectionCriteria = 'featured',
  selectedProducts = [],
  displayCount = 4,
  organizationId
}: UseFeaturedProductsProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { products: shopProducts } = useStorePage();

  // جلب المنتجات المحددة يدوياً إذا لم تكن البيانات مُمررة
  useEffect(() => {
    const fetchSelectedProducts = async () => {
      if (selectionMethod === 'manual' && selectedProducts.length > 0 && initialProducts.length === 0) {
        setLoading(true);
        try {
          const response = await getProducts(organizationId || '');
          
          if (response && Array.isArray(response)) {
            const filteredProducts = response.filter((product: DBProduct) => 
              selectedProducts.includes(product.id)
            );
            const convertedProducts = filteredProducts.map(convertDatabaseProductToStoreProduct);
            setFetchedProducts(convertedProducts);
          } else {
            setFetchedProducts([]);
          }
        } catch (error) {
          setFetchedProducts([]);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchSelectedProducts();
  }, [selectionMethod, selectedProducts, organizationId, initialProducts.length]);

  // منطق عرض المنتجات المحسن
  const displayedProducts = useMemo(() => {
    // إذا كانت هناك منتجات محددة من الخدمة، استخدمها
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts.slice(0, displayCount);
    }
    
    // استخدم المنتجات المجلبة إذا كانت موجودة
    if (fetchedProducts && fetchedProducts.length > 0) {
      return fetchedProducts.slice(0, displayCount);
    }
    
    // استخدم منتجات المتجر إذا كانت متاحة
    if (shopProducts && shopProducts.length > 0) {
      let filtered = [...shopProducts];
      
      if (selectionCriteria === 'featured') {
        filtered = filtered.filter(p => p.is_featured);
      } else if (selectionCriteria === 'newest') {
        filtered = filtered.filter(p => p.is_new);
      } else if (selectionCriteria === 'discounted') {
        filtered = filtered.filter(p => p.compare_at_price && p.compare_at_price < p.price);
      }
      
      return filtered.slice(0, displayCount);
    }
    
    // استخدم المنتجات الافتراضية كخيار أخير
    return getDefaultProducts(t).slice(0, displayCount);
  }, [initialProducts, fetchedProducts, shopProducts, displayCount, selectionCriteria, t]);

  // Preload صور المنتجات المهمة
  useEffect(() => {
    const preloadProductImages = (products: Product[]) => {
      const imageUrls = products
        .slice(0, 4)
        .map(product => product.imageUrl)
        .filter(Boolean);
      
      if (imageUrls.length > 0) {
        smartPreloadImages(imageUrls, { immediate: false, delay: 2000 });
      }
    };

    if (initialProducts && initialProducts.length > 0) {
      preloadProductImages(initialProducts);
    } else if (fetchedProducts && fetchedProducts.length > 0) {
      preloadProductImages(fetchedProducts);
    }
  }, [initialProducts, fetchedProducts]);

  // وظيفة إضافة/إزالة من المفضلة
  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return {
    displayedProducts,
    loading,
    favorites,
    toggleFavorite
  };
};

// Hook منفصل لإدارة حالة العرض
export const useViewMode = (initialDisplayType: 'grid' | 'list' = 'grid') => {
  const [viewType, setViewType] = useState<'grid' | 'list'>(initialDisplayType);

  return {
    viewType,
    setViewType
  };
};
