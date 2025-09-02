import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/api/store';
// import { useStorePage } from '@/context/StorePageContext';
import { getProducts } from '@/lib/api/products';
import { useTranslation } from 'react-i18next';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { getDefaultProducts, convertDatabaseProductToStoreProduct } from './productUtils';
import { loadCriticalImages, loadLazyImages } from '@/lib/imageOptimization';
import { 
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

  // جلب المنتجات حسب الطريقة المحددة (يدوي أو تلقائي)
  useEffect(() => {
    const fetchProducts = async () => {
      if (!organizationId || initialProducts.length > 0) {
        // لا نحتاج للجلب إذا كانت هناك منتجات من props أو لا يوجد organizationId
        return;
      }

      setLoading(true);
      try {
        const response = await getProducts(organizationId);

        if (response && Array.isArray(response)) {
          let filteredProducts: DBProduct[] = response;

          if (selectionMethod === 'manual' && selectedProducts.length > 0) {
            // فلترة المنتجات المحددة يدوياً
            filteredProducts = response.filter((product: DBProduct) =>
              selectedProducts.includes(product.id)
            );
          } else if (selectionMethod === 'automatic') {
            // فلترة المنتجات حسب المعايير التلقائية
            switch (selectionCriteria) {
              case 'featured':
                filteredProducts = response.filter((product: DBProduct) => product.is_featured);
                break;
              case 'newest':
                filteredProducts = response.filter((product: DBProduct) => product.is_new);
                break;
              case 'discounted':
                filteredProducts = response.filter((product: DBProduct) =>
                  product.compare_at_price && product.compare_at_price > product.price
                );
                break;
              case 'best_selling':
                // يمكن إضافة منطق المبيعات هنا لاحقاً
                filteredProducts = response.filter((product: DBProduct) => product.is_featured);
                break;
              default:
                filteredProducts = response.filter((product: DBProduct) => product.is_featured);
            }
          }

          const convertedProducts = filteredProducts.map(convertDatabaseProductToStoreProduct);
          setFetchedProducts(convertedProducts);
        } else {
          setFetchedProducts([]);
        }
      } catch (error) {
        setFetchedProducts([]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectionMethod, selectionCriteria, selectedProducts, organizationId, initialProducts.length]);

  // منطق عرض المنتجات المحسن
  const displayedProducts = useMemo(() => {
    // إذا كانت هناك منتجات مجلبة حسب الإعدادات المحددة، استخدمها أولاً
    if (fetchedProducts && fetchedProducts.length > 0) {
      return fetchedProducts.slice(0, displayCount);
    }

    // إذا كانت هناك منتجات محددة من props، استخدمها كخيار ثاني
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts.slice(0, displayCount);
    }

    // إذا لم تكن هناك منتجات مجلبة ولا منتجات من props، استخدم منتجات فارغة

    // استخدم المنتجات الافتراضية كخيار أخير
    const defaultProducts = getDefaultProducts(t).slice(0, displayCount);

    // إذا كانت المنتجات الافتراضية فارغة، استخدم منتجات ثابتة
    if (!defaultProducts || defaultProducts.length === 0) {
      const staticFallbackProducts = [
        {
          id: 'fallback-1',
          name: 'منتج تجريبي 1',
          price: 99.99,
          discount_price: undefined,
          imageUrl: '/placeholder-product.jpg',
          category: 'فئة تجريبية',
          is_new: true,
          stock_quantity: 100,
          slug: 'test-product-1',
          description: 'وصف تجريبي للمنتج',
          rating: 4.9
        },
        {
          id: 'fallback-2',
          name: 'منتج تجريبي 2',
          price: 149.99,
          discount_price: 129.99,
          imageUrl: '/placeholder-product.jpg',
          category: 'فئة تجريبية',
          is_featured: true,
          stock_quantity: 50,
          slug: 'test-product-2',
          description: 'وصف تجريبي آخر للمنتج',
          rating: 4.8
        }
      ].slice(0, displayCount);

      return staticFallbackProducts;
    }

    return defaultProducts;
  }, [fetchedProducts, initialProducts, displayCount, selectionCriteria, t, selectionMethod, loading]);

  // Preload صور المنتجات المهمة
  useEffect(() => {
    const preloadProductImages = (products: Product[]) => {
      const imageUrls = products
        .slice(0, 4)
        .map(product => product.imageUrl)
        .filter(Boolean);
      
      if (imageUrls.length > 0) {
        // تحميل فوري للصور المهمة
        const priorityImages = imageUrls.slice(0, 2);
        const lazyImages = imageUrls.slice(2);
        
        loadCriticalImages(priorityImages);
        
        if (lazyImages.length > 0) {
          loadLazyImages(lazyImages, 1000);
        }
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
