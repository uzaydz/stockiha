import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { requestCache, createCacheKey } from '@/lib/cache/requestCache';

// أنواع البيانات المطلوبة لصفحة المنتج
export interface ProductPageData {
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

export interface ProductPageContextType {
  data: ProductPageData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getProvinces: () => any[];
  getShippingProvider: (id: number) => any | null;
  getShippingClone: (id: number) => any | null;
  getProductConfig: (productId: string) => any | null;
}

interface UseProductPageDataOptions {
  organizationId?: string;
  productId?: string;
}

export const useProductPageData = ({
  organizationId,
  productId
}: UseProductPageDataOptions = {}): ProductPageContextType => {
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
      } catch (cacheError) {
        // لا يوجد cache، متابعة التحميل
      }

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
            .select('purchase_page_config, shipping_provider_id, shipping_method_type')
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
          const resultData = result.value as any;
          if (resultData.provinces) newData.provinces = resultData.provinces;
          if (resultData.shippingSettings) newData.shippingSettings = resultData.shippingSettings;
          if (resultData.services) newData.services = resultData.services;
          if (resultData.shippingClones) newData.shippingClones = resultData.shippingClones;
          if (resultData.shippingProviders) newData.shippingProviders = resultData.shippingProviders;
          if (resultData.productConfig) newData.productConfig = resultData.productConfig;
        } else {
          console.warn(`Request ${index} failed:`, result.reason);
        }
      });

      // حفظ في الـ cache
      await requestCache.set(cacheKey, newData, 10 * 60 * 1000); // 10 دقائق

      setData(newData);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, productId]);

  // تحميل البيانات عند تغيير organizationId أو productId
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

  return {
    data,
    isLoading,
    error,
    refetch: loadAllData,
    getProvinces,
    getShippingProvider,
    getShippingClone,
    getProductConfig
  };
};
