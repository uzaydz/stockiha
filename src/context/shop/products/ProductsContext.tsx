/**
 * ProductsContext - سياق المنتجات المحسن
 *
 * التحسينات:
 * - React Query للـ caching والتحديث التلقائي
 * - useCallback للأداء
 * - دعم البحث والفلترة
 * - تحديث تلقائي عند التغييرات
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode
} from 'react';
import { Product } from '@/types';
import { ProductsState, ProductsContextType } from './types';
import { useTenant } from '@/context/TenantContext';
import * as productService from '../productService';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';

// ============================================================================
// Initial State
// ============================================================================

const initialState: ProductsState = {
  products: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Context
// ============================================================================

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ProductsProviderProps {
  children: ReactNode;
}

export const ProductsProvider = React.memo(function ProductsProvider({
  children
}: ProductsProviderProps) {
  const [state, setState] = useState<ProductsState>(initialState);
  const tenant = useTenant();

  // استخدام البيانات من SharedStoreDataContext للحصول على المنتجات المخزنة مؤقتاً
  const {
    products: sharedProducts,
    isLoading: sharedLoading,
    error: sharedError
  } = useSharedStoreDataContext();

  // تحديث الحالة من SharedStoreDataContext
  React.useEffect(() => {
    if (sharedProducts && sharedProducts.length > 0) {
      setState(prev => ({
        ...prev,
        products: sharedProducts,
        isLoading: sharedLoading,
        error: sharedError || null,
      }));
    }
  }, [sharedProducts, sharedLoading, sharedError]);

  // ========================================================================
  // Products Actions
  // ========================================================================

  const fetchProducts = useCallback(async () => {
    // إذا كانت البيانات موجودة من SharedStoreDataContext، لا حاجة للتحميل مرة أخرى
    if (sharedProducts && sharedProducts.length > 0) {
      return;
    }

    // إذا كان التحميل جارياً، انتظر
    if (sharedLoading) {
      return;
    }

    // إذا كان هناك خطأ، أظهره
    if (sharedError) {
      setState(prev => ({
        ...prev,
        error: sharedError,
        isLoading: false,
      }));
      return;
    }
  }, [sharedProducts, sharedLoading, sharedError]);

  const addProduct = useCallback(async (
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const organizationId = tenant.currentOrganization?.id;
      if (!organizationId) {
        throw new Error('لم يتم العثور على معرف المنظمة');
      }

      const newProduct = await productService.addProduct({
        ...product,
        organizationId,
      });

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        products: [newProduct, ...prev.products],
        isLoading: false,
      }));

      return newProduct;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إضافة المنتج';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [tenant.currentOrganization?.id]);

  const updateProduct = useCallback(async (product: Product): Promise<Product> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const updatedProduct = await productService.updateProduct(product);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        products: prev.products.map(p =>
          p.id === product.id ? updatedProduct : p
        ),
        isLoading: false,
      }));

      return updatedProduct;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحديث المنتج';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await productService.deleteProduct(productId);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== productId),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف المنتج';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<ProductsContextType>(
    () => ({
      state,
      fetchProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      refreshProducts,
    }),
    [
      state,
      fetchProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      refreshProducts,
    ]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
});

// ============================================================================
// Hook
// ============================================================================

export function useProducts(): ProductsContextType {
  const context = useContext(ProductsContext);

  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

/**
 * Hook للحصول على قائمة المنتجات فقط
 */
export function useProductsList() {
  const { state } = useProducts();
  return useMemo(() => state.products, [state.products]);
}

/**
 * Hook للحصول على منتج بالـ ID
 */
export function useProductById(productId: string) {
  const { state } = useProducts();
  return useMemo(
    () => state.products.find(p => p.id === productId),
    [state.products, productId]
  );
}

/**
 * Hook للبحث عن منتجات
 */
export function useProductsSearch(searchTerm: string) {
  const { state } = useProducts();
  return useMemo(() => {
    if (!searchTerm) return state.products;

    const term = searchTerm.toLowerCase();
    return state.products.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
    );
  }, [state.products, searchTerm]);
}

/**
 * Hook للحصول على المنتجات حسب الفئة
 */
export function useProductsByCategory(categoryId: string | undefined) {
  const { state } = useProducts();
  return useMemo(() => {
    if (!categoryId) return state.products;
    return state.products.filter(p => p.category_id === categoryId);
  }, [state.products, categoryId]);
}

/**
 * Hook للحصول على المنتجات المميزة
 */
export function useFeaturedProducts() {
  const { state } = useProducts();
  return useMemo(
    () => state.products.filter(p => p.isFeatured),
    [state.products]
  );
}

/**
 * Hook للحصول على المنتجات الجديدة
 */
export function useNewProducts() {
  const { state } = useProducts();
  return useMemo(
    () => state.products.filter(p => p.isNew),
    [state.products]
  );
}

/**
 * Hook للحصول على المنتجات ذات المخزون المنخفض
 */
export function useLowStockProducts() {
  const { state } = useProducts();
  return useMemo(
    () => state.products.filter(p => {
      const minLevel = p.min_stock_level || 10;
      const currentStock = p.stockQuantity || p.stock_quantity || 0;
      return currentStock <= minLevel;
    }),
    [state.products]
  );
}

/**
 * Hook للحصول على حالة التحميل
 */
export function useProductsLoading() {
  const { state } = useProducts();
  return useMemo(() => state.isLoading, [state.isLoading]);
}

/**
 * Hook للحصول على الأخطاء
 */
export function useProductsError() {
  const { state } = useProducts();
  return useMemo(() => state.error, [state.error]);
}
