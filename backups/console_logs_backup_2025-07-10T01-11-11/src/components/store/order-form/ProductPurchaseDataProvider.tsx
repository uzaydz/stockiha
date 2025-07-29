import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { getProvinces } from '@/api/yalidine/service';
import { supabase } from '@/lib/supabase-client';

// أنواع البيانات
interface ProductPurchaseData {
  // بيانات الولايات
  provinces: any[];
  isProvincesLoading: boolean;
  
  // بيانات مزودي الشحن
  shippingProviders: any[];
  isShippingProvidersLoading: boolean;
  
  // بيانات إعدادات مزودي الشحن
  shippingSettings: any[];
  isShippingSettingsLoading: boolean;
  
  // بيانات الخدمات
  services: any[];
  isServicesLoading: boolean;
  
  // بيانات فئات المنتجات
  productCategories: any[];
  isProductCategoriesLoading: boolean;
}

const ProductPurchaseDataContext = createContext<ProductPurchaseData | null>(null);

interface ProductPurchaseDataProviderProps {
  children: ReactNode;
  productId?: string;
}

export const ProductPurchaseDataProvider: React.FC<ProductPurchaseDataProviderProps> = ({ 
  children, 
  productId 
}) => {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // 1. بيانات الولايات - تحميل أولي
  const {
    data: provinces = [],
    isLoading: isProvincesLoading
  } = useQuery({
    queryKey: ['product-purchase-provinces'],
    queryFn: () => getProvinces(),
    enabled: true, // هذه البيانات لا تحتاج orgId
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 60 * 60 * 1000, // ساعة
    refetchOnWindowFocus: false,
  });

  // استعلام لجلب مزودي الشحن
  const {
    data: shippingProviders = [],
    isLoading: isLoadingProviders,
    error: providersError
  } = useQuery({
    queryKey: ['shipping-providers', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('shipping_providers')
        .select('code, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
  });

  // استعلام لجلب إعدادات مزودي الشحن للمؤسسة
  const {
    data: shippingSettings = [],
    isLoading: isLoadingSettings,
    error: settingsError
  } = useQuery({
    queryKey: ['shipping-provider-settings', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('shipping_provider_settings')
        .select('provider_id')
        .eq('organization_id', orgId)
        .eq('is_enabled', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // 5. بيانات الخدمات - طلب موحد للنوعين
  const {
    data: servicesData,
    isLoading: isServicesLoading
  } = useQuery({
    queryKey: ['product-purchase-services', orgId],
    queryFn: async () => {
      // طلب واحد يحصل على جميع الخدمات، ثم نفلترها محلياً
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', orgId!);
      
      if (error) throw error;
      
      // إرجاع البيانات مع تصنيف مسبق
      return {
        all: data || [],
        available: data?.filter(service => service.is_available === true) || []
      };
    },
    enabled: !!orgId && !isLoadingSettings,
    staleTime: 20 * 60 * 1000,
    gcTime: 40 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // استخراج البيانات من servicesData
  const services = servicesData?.all || [];

  // 6. بيانات فئات المنتجات - آخر تحميل
  const {
    data: productCategories = [],
    isLoading: isProductCategoriesLoading
  } = useQuery({
    queryKey: ['product-purchase-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !isServicesLoading, // آخر تحميل
    staleTime: 25 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const contextValue: ProductPurchaseData = {
    provinces,
    isProvincesLoading,
    shippingProviders,
    isShippingProvidersLoading: isLoadingProviders,
    shippingSettings,
    isShippingSettingsLoading: isLoadingSettings,
    services,
    isServicesLoading,
    productCategories,
    isProductCategoriesLoading,
  };

  return (
    <ProductPurchaseDataContext.Provider value={contextValue}>
      {children}
    </ProductPurchaseDataContext.Provider>
  );
};

// Hook لاستخدام البيانات
export const useProductPurchaseData = (): ProductPurchaseData => {
  const context = useContext(ProductPurchaseDataContext);
  
  if (!context) {
    throw new Error('useProductPurchaseData must be used within ProductPurchaseDataProvider');
  }
  
  return context;
};

// Hook للولايات فقط
export const useProductPurchaseProvinces = () => {
  const { provinces, isProvincesLoading } = useProductPurchaseData();
  return { provinces, isLoading: isProvincesLoading };
};

// Hook لمزودي الشحن فقط
export const useProductPurchaseShippingProviders = () => {
  const { shippingProviders, isShippingProvidersLoading } = useProductPurchaseData();
  return { shippingProviders, isLoading: isShippingProvidersLoading };
};

export default ProductPurchaseDataProvider;
