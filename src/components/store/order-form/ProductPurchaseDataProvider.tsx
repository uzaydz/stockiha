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
  
  // بيانات كلونات الشحن
  shippingClones: any[];
  isShippingClonesLoading: boolean;
  
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

  // 2. بيانات مزودي الشحن - بعد الولايات
  const {
    data: shippingProviders = [],
    isLoading: isShippingProvidersLoading
  } = useQuery({
    queryKey: ['product-purchase-shipping-providers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_providers')
        .select('code, name')
        .eq('id', 1); // المزود الافتراضي
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !isProvincesLoading,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 3. بيانات كلونات الشحن - بعد مزودي الشحن
  const {
    data: shippingClones = [],
    isLoading: isShippingClonesLoading
  } = useQuery({
    queryKey: ['product-purchase-shipping-clones', orgId],
    queryFn: async () => {
      // طلب واحد موحد للحصول على جميع البيانات المطلوبة
      const [activeClones, specificClone] = await Promise.all([
        supabase
          .from('shipping_provider_clones')
          .select('id')
          .eq('organization_id', orgId!)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1),
        
        // إذا كان لدينا clone_id محدد، نجلبه أيضاً
        supabase
          .from('shipping_provider_clones')
          .select('*')
          .eq('id', 47) // القيمة من console log
          .maybeSingle()
      ]);

      const result = [];
      
      if (activeClones.data && activeClones.data.length > 0) {
        result.push(...activeClones.data);
      }
      
      if (specificClone.data) {
        result.push(specificClone.data);
      }
      
      return result;
    },
    enabled: !!orgId && !isShippingProvidersLoading,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 4. بيانات إعدادات مزودي الشحن
  const {
    data: shippingSettings = [],
    isLoading: isShippingSettingsLoading
  } = useQuery({
    queryKey: ['product-purchase-shipping-settings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_provider_settings')
        .select('provider_id')
        .eq('organization_id', orgId!)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !isShippingClonesLoading,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 5. بيانات الخدمات - طلب موحد للنوعين
  const {
    data: services = [],
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
    enabled: !!orgId && !isShippingSettingsLoading,
    staleTime: 20 * 60 * 1000,
    gcTime: 40 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

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
    isShippingProvidersLoading,
    shippingClones,
    isShippingClonesLoading,
    shippingSettings,
    isShippingSettingsLoading,
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

// Hook لكلونات الشحن فقط
export const useProductPurchaseShippingClones = () => {
  const { shippingClones, isShippingClonesLoading } = useProductPurchaseData();
  return { shippingClones, isLoading: isShippingClonesLoading };
};

export default ProductPurchaseDataProvider; 