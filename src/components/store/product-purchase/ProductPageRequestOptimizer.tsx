import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import { requestCache, createCacheKey } from '@/lib/cache/requestCache';

// أنواع البيانات المطلوبة لصفحة المنتج
interface ProductPageData {
  provinces: any[];
  shippingProviders: any[];
  shippingClones: any[];
  services: any[];
  users: any[];
  orders: any[];
  products: any[];
  organizations: any[];
  productConfig: any;
  shippingSettings: any[];
}

interface ProductPageContextType {
  data: ProductPageData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getProvinces: () => any[];
  getShippingProvider: (id: number) => any | null;
  getShippingClone: (id: number) => any | null;
  getProductConfig: (productId: string) => any | null;
}

const ProductPageContext = createContext<ProductPageContextType | null>(null);

interface ProductPageRequestOptimizerProps {
  children: React.ReactNode;
  organizationId: string;
  productId?: string;
}

// مدير طلبات صفحة المنتج المحسن
export const ProductPageRequestOptimizer: React.FC<ProductPageRequestOptimizerProps> = ({
  children,
  organizationId,
  productId
}) => {
  const [data, setData] = useState<ProductPageData>({
    provinces: [],
    shippingProviders: [],
    shippingClones: [],
    services: [],
    users: [],
    orders: [],
    products: [],
    organizations: [],
    productConfig: null,
    shippingSettings: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // دالة تحميل جميع البيانات المطلوبة دفعة واحدة
  const loadAllData = useCallback(async () => {
    if (!organizationId) return;
    
    const cacheKey = createCacheKey('product_page_all_data', organizationId, productId || 'no-product');
    
    try {
      setIsLoading(true);
      setError(null);

      // التحقق من الـ cache أولاً
      try {
        const cached = await requestCache.get(cacheKey, async () => null);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // لا يوجد cache، متابعة التحميل
      }

      console.log('🔄 تحميل بيانات صفحة المنتج بشكل محسن...');

      // تحميل البيانات بشكل متوازي مع تجميع الطلبات
      const promises = [];

      // 1. الولايات العامة (مرة واحدة فقط)
      promises.push(
        supabase
          .from('yalidine_provinces_global')
          .select('id, name, is_deliverable')
          .eq('is_deliverable', true)
          .then(({ data, error }) => ({ provinces: data || [], error }))
      );

      // 2. إعدادات شركة الشحن
      promises.push(
        supabase
          .from('shipping_provider_settings')
          .select('provider_id')
          .eq('organization_id', organizationId)
          .eq('is_enabled', true)
          .order('created_at.desc')
          .limit(1)
          .then(({ data, error }) => ({ shippingSettings: data || [], error }))
      );

      // 3. الخدمات
      promises.push(
        supabase
          .from('services')
          .select('*')
          .eq('organization_id', organizationId)
          .then(({ data, error }) => ({ services: data || [], error }))
      );

      // 4. نسخ شركات الشحن النشطة
      promises.push(
        supabase
          .from('shipping_provider_clones')
          .select('id, name, provider_code, settings')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at.desc')
          .then(({ data, error }) => ({ shippingClones: data || [], error }))
      );

      // 5. شركات الشحن (فقط إذا كان هناك إعدادات)
      promises.push(
        supabase
          .from('shipping_providers')
          .select('id, code, name')
          .then(({ data, error }) => ({ shippingProviders: data || [], error }))
      );

      // 6. إعدادات المنتج (إذا كان productId موجود)
      if (productId) {
        promises.push(
          supabase
            .from('products')
            .select('shipping_clone_id, purchase_page_config, shipping_provider_id, shipping_method_type')
            .eq('id', productId)
            .single()
            .then(({ data, error }) => ({ productConfig: data, error }))
        );
      }

      // تنفيذ جميع الطلبات بشكل متوازي
      const results = await Promise.allSettled(promises);
      
      // تجميع النتائج
      const newData: ProductPageData = {
        provinces: [],
        shippingProviders: [],
        shippingClones: [],
        services: [],
        users: [],
        orders: [],
        products: [],
        organizations: [],
        productConfig: null,
        shippingSettings: []
      };

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value as any;
          if (data.provinces) newData.provinces = data.provinces;
          if (data.shippingSettings) newData.shippingSettings = data.shippingSettings;
          if (data.services) newData.services = data.services;
          if (data.shippingClones) newData.shippingClones = data.shippingClones;
          if (data.shippingProviders) newData.shippingProviders = data.shippingProviders;
          if (data.productConfig) newData.productConfig = data.productConfig;
        } else {
          console.warn(`فشل طلب ${index}:`, result.reason);
        }
      });

      // حفظ في الـ cache
      await requestCache.set(cacheKey, newData, 10 * 60 * 1000); // 10 دقائق

      setData(newData);
      console.log('✅ تم تحميل بيانات صفحة المنتج بنجاح');

    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات صفحة المنتج:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, productId]);

  // تحميل البيانات عند تحميل المكون
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // دوال مساعدة للوصول للبيانات
  const getProvinces = useCallback(() => data.provinces, [data.provinces]);
  
  const getShippingProvider = useCallback((id: number) => {
    return data.shippingProviders.find(provider => provider.id === id) || null;
  }, [data.shippingProviders]);
  
  const getShippingClone = useCallback((id: number) => {
    return data.shippingClones.find(clone => clone.id === id) || null;
  }, [data.shippingClones]);
  
  const getProductConfig = useCallback((productId: string) => {
    return data.productConfig?.id === productId ? data.productConfig : null;
  }, [data.productConfig]);

  // قيمة السياق
  const contextValue = useMemo(() => ({
    data,
    isLoading,
    error,
    refetch: loadAllData,
    getProvinces,
    getShippingProvider,
    getShippingClone,
    getProductConfig
  }), [data, isLoading, error, loadAllData, getProvinces, getShippingProvider, getShippingClone, getProductConfig]);

  return (
    <ProductPageContext.Provider value={contextValue}>
      {children}
    </ProductPageContext.Provider>
  );
};

// Hook لاستخدام بيانات صفحة المنتج
export const useProductPageData = () => {
  const context = useContext(ProductPageContext);
  if (!context) {
    throw new Error('useProductPageData must be used within ProductPageRequestOptimizer');
  }
  return context;
};

// Hook محسن للولايات مع منع الطلبات المكررة
export const useOptimizedProvinces = () => {
  const { data } = useProductPageData();
  return {
    provinces: data.provinces,
    isLoading: false, // البيانات متاحة من السياق
    error: null
  };
};

// Hook محسن لشركات الشحن
export const useOptimizedShippingProviders = () => {
  const { data, getShippingProvider } = useProductPageData();
  return {
    providers: data.shippingProviders,
    getProvider: getShippingProvider,
    isLoading: false
  };
};

// Hook محسن لنسخ شركات الشحن
export const useOptimizedShippingClones = () => {
  const { data, getShippingClone } = useProductPageData();
  return {
    clones: data.shippingClones,
    getClone: getShippingClone,
    isLoading: false
  };
};

// Hook محسن لإعدادات المنتج
export const useOptimizedProductConfig = (productId?: string) => {
  const { data, getProductConfig } = useProductPageData();
  return {
    config: productId ? getProductConfig(productId) : null,
    isLoading: false
  };
};

export default ProductPageRequestOptimizer; 