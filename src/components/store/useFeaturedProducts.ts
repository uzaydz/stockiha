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

  // استخدام البيانات من الـ context الموحد
  const { featuredProducts: preloadedFeaturedProducts } = useSharedStoreDataContext();

  // جلب المنتجات حسب الطريقة المحددة (يدوي أو تلقائي)
  // منع حلقات إعادة الجلب: نعتمد توقيعاً مستقراً لمحتوى preloadedFeaturedProducts
  const preloadedSig = useMemo(() => {
    try {
      if (!preloadedFeaturedProducts || preloadedFeaturedProducts.length === 0) return '';
      // استخدام JSON.stringify للمقارنة العميقة مع تحسين الأداء
      return JSON.stringify(preloadedFeaturedProducts.map((p: any) => ({
        id: p?.id,
        name: p?.name,
        featured: p?.is_featured
      })));
    } catch { return ''; }
  }, [preloadedFeaturedProducts?.length]); // استخدام length فقط لتجنب التغيير المستمر

  const usedPreloadedOnceRef = (globalThis as any).__USED_PRELOADED_FEATURED_ONCE__ || { current: false };
  (globalThis as any).__USED_PRELOADED_FEATURED_ONCE__ = usedPreloadedOnceRef;

  useEffect(() => {
    const fetchProducts = async () => {
      // أولاً، تحقق من البيانات المحملة مسبقاً
      if (preloadedFeaturedProducts && preloadedFeaturedProducts.length > 0) {
        // إذا سبق استخدام بيانات preload بنفس التوقيع، لا تعيد التعيين لتجنب حلقة الرندر
        if (usedPreloadedOnceRef.current && fetchedProducts.length > 0) {
          return;
        }

        // تحويل البيانات المحملة مسبقاً إلى تنسيق Product[]
        const convertedPreloadedProducts = preloadedFeaturedProducts.map((dbProd: any) => {
          try {
            return convertDatabaseProductToStoreProduct(dbProd);
          } catch {
            // fallback بسيط إذا فشل التحويل
            return {
              id: dbProd.id,
              name: dbProd.name || 'منتج',
              description: dbProd.description || '',
              price: Number(dbProd.price || 0),
              discount_price: dbProd.compare_at_price ? Number(dbProd.compare_at_price) : undefined,
              imageUrl: dbProd.thumbnail_url || dbProd.thumbnail_image || dbProd.imageUrl || '',
              category: dbProd.product_categories?.name || dbProd.category || '',
              is_new: !!dbProd.is_new,
              is_featured: !!dbProd.is_featured,
              stock_quantity: Number(dbProd.stock_quantity || 0),
              slug: dbProd.slug || dbProd.id,
              rating: 4.5
            };
          }
        });
        // عيّن مرة واحدة فقط
        setFetchedProducts(convertedPreloadedProducts);
        usedPreloadedOnceRef.current = true;
        return;
      }

      // إذا كانت هناك منتجات من props، استخدمها ولا تجلب من API
      if (initialProducts.length > 0) {
        return;
      }

      // إذا لم يكن هناك organizationId ولا بيانات محملة مسبقاً، حاول جلب البيانات باستخدام store identifier
      if (!organizationId) {
        
        // سنحاول استخدام الـ API المباشر بدلاً من getProducts
      }

      setLoading(true);
      try {
        
        
        // تحديد store identifier من النطاق الحالي
        const hostname = window.location.hostname;
        let storeIdentifier = hostname;
        
        // إزالة www. إذا كان موجوداً
        if (storeIdentifier.startsWith('www.')) {
          storeIdentifier = storeIdentifier.substring(4);
        }
        
        
        
        // استخدام RPC للحصول على بيانات المتجر
        const { getStoreInitData } = await import('@/lib/api/deduplicatedApi');
        const storeData = await getStoreInitData(storeIdentifier);
        
        if (storeData && storeData.featured_products && Array.isArray(storeData.featured_products)) {
          let filteredProducts = storeData.featured_products;

          if (selectionMethod === 'manual' && selectedProducts.length > 0) {
            // فلترة المنتجات المحددة يدوياً
            filteredProducts = storeData.featured_products.filter((product: any) =>
              selectedProducts.includes(product.id)
            );
          } else if (selectionMethod === 'automatic') {
            // فلترة المنتجات حسب المعايير التلقائية
            switch (selectionCriteria) {
              case 'featured':
                filteredProducts = storeData.featured_products.filter((product: any) => product.is_featured);
                break;
              case 'newest':
                filteredProducts = storeData.featured_products.filter((product: any) => product.is_new);
                break;
              case 'discounted':
                filteredProducts = storeData.featured_products.filter((product: any) =>
                  product.compare_at_price && product.compare_at_price > product.price
                );
                break;
              case 'best_selling':
                // يمكن إضافة منطق المبيعات هنا لاحقاً
                filteredProducts = storeData.featured_products.filter((product: any) => product.is_featured);
                break;
              default:
                filteredProducts = storeData.featured_products.filter((product: any) => product.is_featured);
            }
          }

          // تحويل البيانات إلى تنسيق Product[]
          const convertedProducts = filteredProducts.map((dbProd: any) => {
            try {
              return convertDatabaseProductToStoreProduct(dbProd);
            } catch {
              // fallback بسيط إذا فشل التحويل
              return {
                id: dbProd.id,
                name: dbProd.name || 'منتج',
                description: dbProd.description || '',
                price: Number(dbProd.price || 0),
                discount_price: dbProd.compare_at_price ? Number(dbProd.compare_at_price) : undefined,
                imageUrl: dbProd.thumbnail_url || dbProd.thumbnail_image || dbProd.imageUrl || '',
                category: dbProd.category_name || dbProd.category || '',
                is_new: !!dbProd.is_new,
                is_featured: !!dbProd.is_featured,
                stock_quantity: Number(dbProd.stock_quantity || 0),
                slug: dbProd.slug || dbProd.id,
                rating: 4.5
              };
            }
          });
          
          
          setFetchedProducts(convertedProducts);
        } else {
          
          setFetchedProducts([]);
        }
      } catch (error) {
        console.error(`❌ [useFeaturedProducts] خطأ في جلب البيانات من RPC:`, error);
        setFetchedProducts([]);
      }
      setLoading(false);
    };

    fetchProducts();
    // ملاحظة: نعتمد على preloadedSig بدلاً من المرجع المباشر لتجنب تغيّر المرجع كل رندر
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
